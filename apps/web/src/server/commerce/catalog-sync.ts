/**
 * Katalog senkron motoru — kuyruk tabanlı, idempotent, kaldığı yerden devam eden.
 *
 *  - İş = CatalogSync satırı (PENDING → RUNNING → SUCCESS|ERROR). Aynı bağlantı için aynı anda
 *    tek aktif iş (StoreConnection satırı kilitlenerek); cron işleri güne göre dedupeKey ile tekil.
 *  - İşleme: `FOR UPDATE SKIP LOCKED` ile alınır, 120 sn kira (lease); her sayfada imleç + sayaçlar
 *    yazılır, kira uzatılır. Bütçe dolunca RUNNING kalır, sonraki tetikleme imleçten devam eder.
 *  - Ürün yazımı: contentHash eşitse yalnızca syncedAt güncellenir (değişmeyen = yazma yok).
 *    Tam senkron bitince bu turda görülmeyen ürünler soft-delete (deletedAt) olur.
 *  - Hata: CommerceError.retryable → en fazla 3 deneme (retryAfter kira ile ertelenir); aksi halde
 *    ERROR + bağlantıya lastErrorCode (kullanıcıya eyleme dönük mesaj: errors.ts).
 *  - Realtime: sayfa başına en fazla ~1.5 sn'de bir `integration.sync` ilerleme olayı (payload küçük).
 */
import { createHash } from 'node:crypto';
import { Prisma, type CatalogSync, type StoreConnection } from '@independentai/db';
import { prisma } from '../prisma';
import { log } from '../logger';
import { dayBucket } from '../run-prompt';
import { computeEntitlement } from '../entitlement';
import { publishForTenant } from '../realtime';
import { getConnector } from './registry';
import { decryptCredentials, encryptCredentials } from './credentials';
import { CommerceError, normalizeCommerceError, USER_MESSAGES } from './errors';
import type { ConnectorContext, Credentials, NormalizedProduct } from './types';

export const SYNC_LEASE_MS = 120_000;
export const SYNC_MAX_ATTEMPTS = 3;
const PROGRESS_THROTTLE_MS = 1500;

export type SyncTrigger = 'manual' | 'cron' | 'webhook' | 'connect';

// ───────────── Kuyruğa alma ─────────────

/**
 * Bağlantı için senkron işi oluşturur. Aktif (PENDING/RUNNING) iş varsa onu döndürür (idempotent).
 * Cron tetiklemesi günde bir kez (dedupeKey = connectionId:cron:YYYY-MM-DD).
 */
export async function enqueueCatalogSync(
  connectionId: string,
  triggeredBy: SyncTrigger,
  opts: { requestedBy?: string | null } = {},
): Promise<{ sync: CatalogSync; created: boolean }> {
  return prisma.$transaction(async (tx) => {
    const [conn] = await tx.$queryRaw<
      StoreConnection[]
    >`SELECT * FROM "StoreConnection" WHERE id = ${connectionId} FOR UPDATE`;
    if (!conn) throw new CommerceError('NOT_FOUND', 'Bağlantı bulunamadı');
    if (conn.status === 'DISCONNECTED')
      throw new CommerceError('AUTH_INVALID', 'Bağlantı kesilmiş; yeniden bağlanın', { provider: conn.provider });
    const active = await tx.catalogSync.findFirst({
      where: { connectionId, status: { in: ['PENDING', 'RUNNING'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (active) return { sync: active, created: false };
    const dedupeKey =
      triggeredBy === 'cron'
        ? `${connectionId}:cron:${dayBucket().toISOString().slice(0, 10)}`
        : `${connectionId}:${triggeredBy}:${Date.now().toString(36)}`;
    // Bağlantı satırı kilitli → aynı dedupeKey için yarış yok; P2002 yakalamak yerine önce bak (Postgres tx içinde
    // hata sonrası tüm komutlar reddedilir).
    const dup = await tx.catalogSync.findUnique({ where: { dedupeKey } });
    if (dup) return { sync: dup, created: false };
    const sync = await tx.catalogSync.create({
      data: {
        connectionId,
        tenantId: conn.tenantId,
        status: 'PENDING',
        dedupeKey,
        triggeredBy: opts.requestedBy ? `${triggeredBy}:${opts.requestedBy}` : triggeredBy,
      },
    });
    await publishForTenant(
      conn.tenantId,
      {
        event: 'integration.sync',
        entityId: connectionId,
        jobId: sync.id,
        status: 'queued',
        progress: 0,
        provider: conn.provider,
      },
      tx,
    );
    return { sync, created: true };
  });
}

/** Günlük cron: webhook'suz veya 20 saatten eski senkronlu aktif bağlantılar için iş üretir. */
export async function enqueueDailyCatalogSyncs(): Promise<number> {
  const stale = new Date(Date.now() - 20 * 3_600_000);
  const conns = await prisma.storeConnection.findMany({
    where: {
      status: 'ACTIVE',
      OR: [{ webhooksRegistered: false }, { lastSyncAt: null }, { lastSyncAt: { lt: stale } }],
    },
    select: { id: true },
    take: 500,
  });
  let n = 0;
  for (const c of conns) {
    try {
      const r = await enqueueCatalogSync(c.id, 'cron');
      if (r.created) n += 1;
    } catch (err) {
      log.warn('catalog.enqueue_failed', { connectionId: c.id, err });
    }
  }
  return n;
}

// ───────────── İşleme ─────────────

/**
 * Ham SQL'de zaman parametresi: Prisma `DateTime` kolonlarına UTC'yi saat dilimsiz `timestamp(3)` olarak yazar,
 * ham parametreyi ise `timestamptz` tipinde gönderir. Doğrudan karşılaştırma oturum saat dilimine bağlı yanlış
 * sonuç verir (yerelde Europe/Istanbul). Bu yüzden parametre UTC naive timestamp'e çevrilir.
 */
export function utcTs(d: Date) {
  return Prisma.sql`(${d}::timestamptz AT TIME ZONE 'UTC')`;
}

async function claimSync(): Promise<CatalogSync | null> {
  const now = new Date();
  const lease = new Date(now.getTime() + SYNC_LEASE_MS);
  const rows = await prisma.$queryRaw<CatalogSync[]>`
    UPDATE "CatalogSync" SET status = 'RUNNING', "leaseExpiresAt" = ${utcTs(lease)}, "startedAt" = COALESCE("startedAt", ${utcTs(now)})
    WHERE id = (
      SELECT id FROM "CatalogSync"
      WHERE (status = 'PENDING' AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt" < ${utcTs(now)}))
         OR (status = 'RUNNING' AND "leaseExpiresAt" < ${utcTs(now)})
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *`;
  return rows[0] ?? null;
}

export function buildContext(conn: StoreConnection, credentials: Credentials): ConnectorContext {
  return {
    connectionId: conn.id,
    tenantId: conn.tenantId,
    provider: conn.provider,
    storeDomain: conn.storeDomain,
    externalStoreId: conn.externalStoreId,
    credentials,
    persistCredentials: async (c) => {
      const data: Prisma.StoreConnectionUpdateInput = { credentialsEnc: encryptCredentials(c) };
      if (c.kind === 'SHOPIFY' && c.expiresAt) data.tokenExpiresAt = new Date(c.expiresAt);
      await prisma.storeConnection.update({ where: { id: conn.id }, data });
    },
  };
}

export function contentHashOf(p: NormalizedProduct): string {
  const stable = {
    t: p.title,
    h: p.handle ?? null,
    u: p.url ?? null,
    v: p.vendor ?? null,
    pt: p.productType ?? null,
    c: [...p.categories].sort(),
    d: p.description ?? null,
    pmin: p.priceMin ?? null,
    pmax: p.priceMax ?? null,
    cur: p.currency ?? null,
    a: p.availability,
    img: p.imageUrl ?? null,
    alt: p.imageAlt ?? null,
    st: p.seoTitle ?? null,
    sd: p.seoDescription ?? null,
    id: p.identifiers ?? null,
    f: p.facts ?? null,
    s: p.status ?? null,
  };
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

function toRow(p: NormalizedProduct, conn: { id: string; tenantId: string }, hash: string, now: Date) {
  return {
    tenantId: conn.tenantId,
    connectionId: conn.id,
    externalId: p.externalId,
    handle: p.handle ?? null,
    url: p.url ?? null,
    title: p.title.slice(0, 500),
    vendor: p.vendor?.slice(0, 200) ?? null,
    productType: p.productType?.slice(0, 200) ?? null,
    categories: p.categories.slice(0, 20).map((c) => c.slice(0, 120)),
    description: p.description ? p.description.slice(0, 20_000) : null,
    priceMin: p.priceMin ?? null,
    priceMax: p.priceMax ?? null,
    currency: p.currency?.slice(0, 8) ?? null,
    availability: p.availability,
    imageUrl: p.imageUrl?.slice(0, 2000) ?? null,
    imageAlt: p.imageAlt?.slice(0, 500) ?? null,
    seoTitle: p.seoTitle?.slice(0, 500) ?? null,
    seoDescription: p.seoDescription?.slice(0, 1000) ?? null,
    identifiers: p.identifiers ? (p.identifiers as Prisma.InputJsonValue) : Prisma.JsonNull,
    facts: p.facts ? (p.facts as Prisma.InputJsonValue) : Prisma.JsonNull,
    status: p.status ?? null,
    sourceUpdatedAt: p.sourceUpdatedAt ?? null,
    contentHash: hash,
    syncedAt: now,
    deletedAt: null as Date | null,
  };
}

/** Bir sayfa ürünü yazar; {upserted, unchanged} döner. */
export async function upsertProducts(
  conn: { id: string; tenantId: string },
  items: NormalizedProduct[],
  now = new Date(),
): Promise<{ upserted: number; unchanged: number }> {
  if (!items.length) return { upserted: 0, unchanged: 0 };
  const ids = items.map((i) => i.externalId);
  const existing = await prisma.catalogProduct.findMany({
    where: { connectionId: conn.id, externalId: { in: ids } },
    select: { id: true, externalId: true, contentHash: true, deletedAt: true },
  });
  const byExt = new Map(existing.map((e) => [e.externalId, e]));
  const unchangedIds: string[] = [];
  let upserted = 0;
  await prisma.$transaction(async (tx) => {
    for (const p of items) {
      const hash = contentHashOf(p);
      const prev = byExt.get(p.externalId);
      if (prev && prev.contentHash === hash && !prev.deletedAt) {
        unchangedIds.push(prev.id);
        continue;
      }
      const row = toRow(p, conn, hash, now);
      if (prev) await tx.catalogProduct.update({ where: { id: prev.id }, data: row });
      else await tx.catalogProduct.create({ data: row });
      upserted += 1;
    }
    if (unchangedIds.length)
      await tx.catalogProduct.updateMany({ where: { id: { in: unchangedIds } }, data: { syncedAt: now } });
  });
  return { upserted, unchanged: unchangedIds.length };
}

export type SyncStats = { processed: number; failed: number; remaining: number; partial: number };

/** Kuyruktaki senkron işlerini bütçe dolana kadar işler (cron/manuel tetikleyici). */
export async function processCatalogSyncs(opts: { deadlineAt: number }): Promise<SyncStats> {
  const stats: SyncStats = { processed: 0, failed: 0, remaining: 0, partial: 0 };
  while (Date.now() < opts.deadlineAt - 5_000) {
    const job = await claimSync();
    if (!job) break;
    const r = await runSyncJob(job, opts.deadlineAt);
    if (r === 'done') stats.processed += 1;
    else if (r === 'partial') stats.partial += 1;
    else stats.failed += 1;
    if (r === 'partial') break; // bütçe bitti
  }
  stats.remaining = await prisma.catalogSync.count({ where: { status: { in: ['PENDING', 'RUNNING'] } } });
  return stats;
}

async function finishWithError(job: CatalogSync, conn: StoreConnection, err: CommerceError): Promise<'failed'> {
  // attempt = mevcut denemenin sıra numarası (şema varsayılanı 1). 3. deneme de başarısızsa ERROR.
  const canRetry = err.retryable && job.attempt < SYNC_MAX_ATTEMPTS;
  const delay = Math.max(err.retryAfterMs ?? 0, 30_000 * job.attempt);
  await prisma.$transaction(async (tx) => {
    await tx.catalogSync.update({
      where: { id: job.id },
      data: canRetry
        ? {
            status: 'PENDING',
            attempt: { increment: 1 },
            errorCode: err.code,
            leaseExpiresAt: new Date(Date.now() + delay),
          }
        : {
            status: 'ERROR',
            attempt: { increment: 1 },
            errorCode: err.code,
            finishedAt: new Date(),
            leaseExpiresAt: null,
          },
    });
    if (!canRetry) {
      await tx.storeConnection.update({
        where: { id: conn.id },
        data: {
          lastErrorCode: err.code,
          lastErrorAt: new Date(),
          ...(err.code === 'AUTH_INVALID' || err.code === 'AUTH_EXPIRED' || err.code === 'SCOPE_MISSING'
            ? { status: 'ERROR' }
            : {}),
        },
      });
    }
    await publishForTenant(
      conn.tenantId,
      {
        event: 'integration.sync',
        entityId: conn.id,
        jobId: job.id,
        status: canRetry ? 'retrying' : 'error',
        errorCode: err.code,
        provider: conn.provider,
      },
      tx,
    );
  });
  log.warn('catalog.sync_failed', {
    syncId: job.id,
    connectionId: conn.id,
    provider: conn.provider,
    code: err.code,
    retry: canRetry,
    status: err.status,
  });
  return 'failed';
}

async function runSyncJob(job: CatalogSync, deadlineAt: number): Promise<'done' | 'partial' | 'failed'> {
  const conn = await prisma.storeConnection.findUnique({
    where: { id: job.connectionId },
    include: { tenant: { select: { plan: true, trialEndsAt: true } } },
  });
  if (!conn) {
    await prisma.catalogSync.update({
      where: { id: job.id },
      data: { status: 'ERROR', errorCode: 'NOT_FOUND', finishedAt: new Date(), leaseExpiresAt: null },
    });
    return 'failed';
  }
  if (conn.status === 'DISCONNECTED') {
    await prisma.catalogSync.update({
      where: { id: job.id },
      data: { status: 'ERROR', errorCode: 'AUTH_INVALID', finishedAt: new Date(), leaseExpiresAt: null },
    });
    return 'failed';
  }
  const limit = computeEntitlement({ plan: conn.tenant.plan, trialEndsAt: conn.tenant.trialEndsAt }).limits
    .catalogProducts;
  let connector;
  let ctx: ConnectorContext;
  try {
    connector = await getConnector(conn.provider);
    ctx = buildContext(conn, decryptCredentials(conn.credentialsEnc, conn.provider));
  } catch (err) {
    return finishWithError(job, conn, normalizeCommerceError(err, conn.provider));
  }
  const caps = connector.capabilities();
  const startedAt = job.startedAt ?? new Date();
  let cursor = job.cursor;
  let page = job.page;
  let fetched = job.fetched;
  let upserted = job.upserted;
  let unchanged = job.unchanged;
  let total = job.total;
  let lastProgressAt = 0;
  let limitHit = false;

  if (page === 0 && caps.count && connector.countProducts && total == null) {
    try {
      total = await connector.countProducts(ctx);
    } catch {
      total = null;
    }
  }

  try {
    while (true) {
      if (Date.now() > deadlineAt - 15_000) {
        await prisma.catalogSync.update({
          where: { id: job.id },
          data: {
            cursor,
            page,
            fetched,
            upserted,
            unchanged,
            total,
            leaseExpiresAt: new Date(Date.now() + SYNC_LEASE_MS),
          },
        });
        return 'partial';
      }
      const res = await connector.listProducts(ctx, { cursor, limit: Math.min(caps.pageSize, 250) });
      const items = res.items.slice(0, Math.max(0, limit - fetched));
      if (items.length < res.items.length) limitHit = true;
      const w = await upsertProducts(conn, items);
      fetched += items.length;
      upserted += w.upserted;
      unchanged += w.unchanged;
      page += 1;
      cursor = limitHit ? null : res.nextCursor;
      if (res.total != null) total = res.total;
      const progress = total ? Math.min(99, Math.round((fetched / Math.max(total, 1)) * 100)) : Math.min(95, page * 5);
      await prisma.catalogSync.update({
        where: { id: job.id },
        data: {
          cursor,
          page,
          fetched,
          upserted,
          unchanged,
          total,
          leaseExpiresAt: new Date(Date.now() + SYNC_LEASE_MS),
        },
      });
      if (Date.now() - lastProgressAt > PROGRESS_THROTTLE_MS) {
        lastProgressAt = Date.now();
        await publishForTenant(conn.tenantId, {
          event: 'integration.sync',
          entityId: conn.id,
          jobId: job.id,
          status: 'running',
          progress,
          fetched,
          total: total ?? undefined,
          provider: conn.provider,
        });
      }
      if (!cursor || items.length === 0) break;
    }
  } catch (err) {
    await prisma.catalogSync
      .update({ where: { id: job.id }, data: { cursor, page, fetched, upserted, unchanged, total } })
      .catch(() => undefined);
    return finishWithError(job, conn, normalizeCommerceError(err, conn.provider));
  }

  // Tam senkron bitti: bu turda görülmeyenleri soft-delete (yalnızca limit aşılmadıysa).
  let deleted = 0;
  if (!limitHit) {
    const r = await prisma.catalogProduct.updateMany({
      where: { connectionId: conn.id, deletedAt: null, syncedAt: { lt: startedAt } },
      data: { deletedAt: new Date() },
    });
    deleted = r.count;
  }
  await prisma.$transaction(async (tx) => {
    await tx.catalogSync.update({
      where: { id: job.id },
      data: {
        status: 'SUCCESS',
        cursor: null,
        page,
        fetched,
        upserted,
        unchanged,
        deleted,
        total: total ?? fetched,
        finishedAt: new Date(),
        leaseExpiresAt: null,
        errorCode: limitHit ? 'LIMIT_EXCEEDED' : null,
      },
    });
    await tx.storeConnection.update({
      where: { id: conn.id },
      data: {
        lastSyncAt: new Date(),
        lastErrorCode: limitHit ? 'LIMIT_EXCEEDED' : null,
        lastErrorAt: limitHit ? new Date() : null,
        status: conn.status === 'PENDING' ? 'ACTIVE' : conn.status,
      },
    });
    await publishForTenant(
      conn.tenantId,
      {
        event: 'integration.sync',
        entityId: conn.id,
        jobId: job.id,
        status: 'success',
        progress: 100,
        fetched,
        upserted,
        deleted,
        provider: conn.provider,
        ...(limitHit ? { errorCode: 'LIMIT_EXCEEDED' } : {}),
      },
      tx,
    );
  });
  log.info('catalog.sync_done', {
    syncId: job.id,
    connectionId: conn.id,
    provider: conn.provider,
    fetched,
    upserted,
    unchanged,
    deleted,
    limitHit,
  });
  return 'done';
}

/** Webhook sonrası tek ürün yenileme (bağlayıcı getProduct destekliyorsa). */
export async function refreshProduct(
  connectionId: string,
  externalId: string,
  action: 'upsert' | 'delete',
): Promise<'updated' | 'deleted' | 'skipped'> {
  const conn = await prisma.storeConnection.findUnique({ where: { id: connectionId } });
  if (!conn || conn.status !== 'ACTIVE') return 'skipped';
  if (action === 'delete') {
    await prisma.catalogProduct.updateMany({
      where: { connectionId, externalId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    await publishForTenant(conn.tenantId, {
      event: 'integration.changed',
      entityId: connectionId,
      status: 'product_deleted',
      provider: conn.provider,
    });
    return 'deleted';
  }
  const connector = await getConnector(conn.provider);
  if (!connector.getProduct) {
    await enqueueCatalogSync(connectionId, 'webhook');
    return 'skipped';
  }
  const ctx = buildContext(conn, decryptCredentials(conn.credentialsEnc, conn.provider));
  const p = await connector.getProduct(ctx, externalId);
  if (!p) {
    await prisma.catalogProduct.updateMany({
      where: { connectionId, externalId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return 'deleted';
  }
  await upsertProducts(conn, [p]);
  await publishForTenant(conn.tenantId, {
    event: 'integration.changed',
    entityId: connectionId,
    status: 'product_updated',
    provider: conn.provider,
  });
  return 'updated';
}

export function syncErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return (USER_MESSAGES as Record<string, string>)[code] ?? 'Senkron hatası';
}
