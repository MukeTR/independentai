/**
 * Mağaza bağlantısı yaşam döngüsü: oluştur (PENDING) → kimlik bilgisi bağla + doğrula (ACTIVE)
 * → senkron → yeniden doğrula / kes / sil. Kimlik bilgisi yalnızca şifreli saklanır; API'ye
 * `publicConnectionView` döner.
 */
import type { CommerceProvider, StoreConnection } from '@independentai/db';
import { prisma } from '../prisma';
import { log } from '../logger';
import { siteUrl } from '../env';
import { audit } from '../audit';
import { publishForTenant } from '../realtime';
import { ClientError, ConflictError, NotFoundError, PlanLimitError } from '../errors';
import type { Actor } from '../authz';
import { getConnector, providerConfigured, PROVIDER_LABELS } from './registry';
import { decryptCredentials, encryptCredentials, publicConnectionView } from './credentials';
import { CommerceError, normalizeCommerceError, USER_MESSAGES } from './errors';
import { buildContext, enqueueCatalogSync } from './catalog-sync';
import { normalizeStoreDomain, type Credentials, type StoreInfo } from './types';

export function webhookCallbackUrl(provider: CommerceProvider): string {
  return `${siteUrl()}/api/integrations/${provider.toLowerCase()}/webhook`;
}

export type ConnectionView = ReturnType<typeof publicConnectionView<StoreConnection>> & {
  providerLabel: string;
  productCount: number;
  lastSync: {
    id: string;
    status: string;
    fetched: number;
    total: number | null;
    errorCode: string | null;
    finishedAt: Date | null;
    startedAt: Date | null;
  } | null;
  errorMessage: string | null;
  configured: boolean;
};

export async function listConnections(tenantId: string): Promise<ConnectionView[]> {
  const conns = await prisma.storeConnection.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
  if (!conns.length) return [];
  const [counts, syncs] = await Promise.all([
    prisma.catalogProduct.groupBy({
      by: ['connectionId'],
      where: { tenantId, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.catalogSync.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        connectionId: true,
        status: true,
        fetched: true,
        total: true,
        errorCode: true,
        finishedAt: true,
        startedAt: true,
      },
    }),
  ]);
  const countBy = new Map(counts.map((c) => [c.connectionId, c._count._all]));
  const lastBy = new Map<string, (typeof syncs)[number]>();
  for (const s of syncs) if (!lastBy.has(s.connectionId)) lastBy.set(s.connectionId, s);
  return conns.map((c) => {
    const last = lastBy.get(c.id) ?? null;
    return {
      ...publicConnectionView(c),
      providerLabel: PROVIDER_LABELS[c.provider],
      productCount: countBy.get(c.id) ?? 0,
      lastSync: last
        ? {
            id: last.id,
            status: last.status,
            fetched: last.fetched,
            total: last.total,
            errorCode: last.errorCode,
            finishedAt: last.finishedAt,
            startedAt: last.startedAt,
          }
        : null,
      errorMessage: c.lastErrorCode
        ? ((USER_MESSAGES as Record<string, string>)[c.lastErrorCode] ?? 'Bağlantı hatası')
        : null,
      configured: providerConfigured(c.provider),
    };
  });
}

export async function getOwnedConnection(actor: Actor, id: string): Promise<StoreConnection> {
  const c = await prisma.storeConnection.findFirst({ where: { id, tenantId: actor.tenantId } });
  if (!c) throw new NotFoundError('Bağlantı bulunamadı');
  return c;
}

/** Plan sınırı + tekillik kontrolüyle PENDING bağlantı (OAuth öncesi veya kimlik bilgisi formu). */
export async function createPendingConnection(
  actor: Actor,
  provider: CommerceProvider,
  rawDomain: unknown,
): Promise<StoreConnection> {
  if (!providerConfigured(provider)) throw new ClientError(USER_MESSAGES.CONFIG_MISSING);
  let storeDomain: string;
  try {
    storeDomain = normalizeStoreDomain(rawDomain);
  } catch {
    throw new ClientError('Geçersiz mağaza adresi');
  }
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Tenant" WHERE id = ${actor.tenantId} FOR UPDATE`;
    const existing = await tx.storeConnection.findUnique({
      where: { tenantId_provider_storeDomain: { tenantId: actor.tenantId, provider, storeDomain } },
    });
    if (existing) {
      if (existing.status === 'ACTIVE') throw new ConflictError('Bu mağaza zaten bağlı');
      // PENDING/ERROR/DISCONNECTED → yeniden bağlanma: satırı yeniden kullan
      return tx.storeConnection.update({
        where: { id: existing.id },
        data: { status: 'PENDING', lastErrorCode: null, lastErrorAt: null, createdById: actor.userId },
      });
    }
    const n = await tx.storeConnection.count({ where: { tenantId: actor.tenantId, status: { not: 'DISCONNECTED' } } });
    if (n >= actor.entitlement.limits.storeConnections)
      throw new PlanLimitError(`Mağaza bağlantısı sınırı (${actor.entitlement.limits.storeConnections}) doldu`);
    return tx.storeConnection.create({
      data: { tenantId: actor.tenantId, provider, storeDomain, status: 'PENDING', createdById: actor.userId },
    });
  });
}

/**
 * Kimlik bilgisi bağlar, sağlayıcıda doğrular, ACTIVE yapar, ilk senkronu kuyruğa alır ve
 * (destekleniyorsa) webhook kaydeder. Doğrulama başarısızsa bağlantı ERROR + kod döner.
 */
export async function activateConnection(
  connectionId: string,
  credentials: Credentials,
  opts: { actorUserId?: string | null; req?: Request } = {},
): Promise<{ connection: StoreConnection; info: StoreInfo }> {
  const conn = await prisma.storeConnection.findUnique({ where: { id: connectionId } });
  if (!conn) throw new NotFoundError('Bağlantı bulunamadı');
  const connector = await getConnector(conn.provider);
  const ctx = buildContext(conn, credentials);
  let info: StoreInfo;
  try {
    info = await connector.verify(ctx);
  } catch (err) {
    const ce = normalizeCommerceError(err, conn.provider);
    await prisma.storeConnection.update({
      where: { id: conn.id },
      data: { status: 'ERROR', lastErrorCode: ce.code, lastErrorAt: new Date() },
    });
    throw ce;
  }
  const scopes =
    credentials.kind === 'SHOPIFY' && credentials.scope
      ? credentials.scope
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  const updated = await prisma.storeConnection.update({
    where: { id: conn.id },
    data: {
      status: 'ACTIVE',
      credentialsEnc: encryptCredentials(credentials),
      externalStoreId: info.externalStoreId ?? conn.externalStoreId,
      displayName: info.displayName ?? conn.displayName,
      capabilities: {
        ...connector.capabilities(),
        ...(info.capabilities ?? {}),
        currency: info.currency ?? null,
        primaryDomain: info.primaryDomain ?? null,
      },
      scopes,
      tokenExpiresAt: credentials.kind === 'SHOPIFY' && credentials.expiresAt ? new Date(credentials.expiresAt) : null,
      lastErrorCode: null,
      lastErrorAt: null,
    },
  });
  await audit({
    action: 'integration.connect',
    tenantId: conn.tenantId,
    actorUserId: opts.actorUserId ?? conn.createdById,
    targetType: 'store_connection',
    targetId: conn.id,
    meta: { provider: conn.provider, storeDomain: conn.storeDomain },
    req: opts.req,
  });
  await publishForTenant(conn.tenantId, {
    event: 'integration.changed',
    entityId: conn.id,
    status: 'connected',
    provider: conn.provider,
  });
  // Webhook kaydı (best effort; başarısızsa periyodik senkron devreye girer)
  if (connector.capabilities().webhooks && connector.registerWebhooks) {
    try {
      const r = await connector.registerWebhooks(buildContext(updated, credentials), webhookCallbackUrl(conn.provider));
      await prisma.storeConnection.update({
        where: { id: conn.id },
        data: { webhooksRegistered: r.registered.length > 0 },
      });
    } catch (err) {
      log.warn('integration.webhook_register_failed', { connectionId: conn.id, provider: conn.provider, err });
    }
  }
  await enqueueCatalogSync(conn.id, 'connect', { requestedBy: opts.actorUserId ?? null });
  return { connection: updated, info };
}

export async function verifyConnection(
  actor: Actor,
  id: string,
): Promise<{ ok: boolean; code: string | null; message: string | null }> {
  const conn = await getOwnedConnection(actor, id);
  if (!conn.credentialsEnc) return { ok: false, code: 'AUTH_INVALID', message: USER_MESSAGES.AUTH_INVALID };
  try {
    const connector = await getConnector(conn.provider);
    const info = await connector.verify(buildContext(conn, decryptCredentials(conn.credentialsEnc, conn.provider)));
    await prisma.storeConnection.update({
      where: { id: conn.id },
      data: {
        status: 'ACTIVE',
        lastErrorCode: null,
        lastErrorAt: null,
        displayName: info.displayName ?? conn.displayName,
        externalStoreId: info.externalStoreId ?? conn.externalStoreId,
      },
    });
    return { ok: true, code: null, message: null };
  } catch (err) {
    const ce = normalizeCommerceError(err, conn.provider);
    await prisma.storeConnection.update({
      where: { id: conn.id },
      data: { status: ce.retryable ? conn.status : 'ERROR', lastErrorCode: ce.code, lastErrorAt: new Date() },
    });
    return { ok: false, code: ce.code, message: ce.message };
  }
}

/** Kesme işleminin DB tarafı (tek transaction): kimlik bilgisi silinir, aktif senkronlar iptal, ürünler soft-delete. */
async function disconnectRow(conn: Pick<StoreConnection, 'id' | 'tenantId' | 'provider'>): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.storeConnection.update({
      where: { id: conn.id },
      data: {
        status: 'DISCONNECTED',
        credentialsEnc: null,
        webhooksRegistered: false,
        tokenExpiresAt: null,
        refreshExpiresAt: null,
      },
    });
    await tx.catalogSync.updateMany({
      where: { connectionId: conn.id, status: { in: ['PENDING', 'RUNNING'] } },
      data: { status: 'ERROR', errorCode: 'AUTH_INVALID', finishedAt: new Date(), leaseExpiresAt: null },
    });
    await tx.catalogProduct.updateMany({
      where: { connectionId: conn.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    await publishForTenant(
      conn.tenantId,
      { event: 'integration.changed', entityId: conn.id, status: 'disconnected', provider: conn.provider },
      tx,
    );
  });
}

/** Bağlantıyı keser: kimlik bilgisi silinir, katalog verisi soft-delete; satır audit için kalır. */
export async function disconnectConnection(actor: Actor, id: string, req?: Request): Promise<void> {
  const conn = await getOwnedConnection(actor, id);
  await disconnectRow(conn);
  await audit({
    action: 'integration.disconnect',
    tenantId: conn.tenantId,
    actorUserId: actor.userId,
    targetType: 'store_connection',
    targetId: conn.id,
    meta: { provider: conn.provider },
    req,
  });
}

/**
 * Sağlayıcı tarafından tetiklenen kesme (Shopify `app/uninstalled`, `shop/redact`): Actor yok, token
 * zaten geçersiz. Aynı mağazaya bağlı TÜM tenant bağlantıları kesilir (token uygulama başına iptal edilir).
 * `purgeProducts` → katalog satırları kalıcı silinir (shop/redact: mağaza verisini silme talebi).
 * Kesilen bağlantı id'lerini döndürür.
 */
export async function disconnectByProvider(
  provider: CommerceProvider,
  storeDomain: string,
  opts: { reason: 'app_uninstalled' | 'shop_redact'; purgeProducts?: boolean },
): Promise<string[]> {
  const conns = await prisma.storeConnection.findMany({
    where: { provider, storeDomain, status: { not: 'DISCONNECTED' } },
    select: { id: true, tenantId: true, provider: true },
  });
  for (const conn of conns) {
    await disconnectRow(conn);
    await audit({
      action: 'integration.uninstalled',
      tenantId: conn.tenantId,
      actorUserId: null,
      targetType: 'store_connection',
      targetId: conn.id,
      meta: { provider, reason: opts.reason },
    });
  }
  if (opts.purgeProducts) {
    const r = await prisma.catalogProduct.deleteMany({ where: { connection: { provider, storeDomain } } });
    log.info('integration.products_purged', { provider, storeDomain, count: r.count, reason: opts.reason });
  }
  return conns.map((c) => c.id);
}

/** Bağlantıyı ve tüm katalog verisini kalıcı siler (kullanıcı isteğiyle). */
export async function deleteConnection(actor: Actor, id: string, req?: Request): Promise<void> {
  const conn = await getOwnedConnection(actor, id);
  await prisma.storeConnection.delete({ where: { id: conn.id } });
  await audit({
    action: 'integration.delete',
    tenantId: conn.tenantId,
    actorUserId: actor.userId,
    targetType: 'store_connection',
    targetId: conn.id,
    meta: { provider: conn.provider },
    req,
  });
  await publishForTenant(conn.tenantId, {
    event: 'integration.changed',
    entityId: conn.id,
    status: 'deleted',
    provider: conn.provider,
  });
}

export async function triggerSync(actor: Actor, id: string) {
  const conn = await getOwnedConnection(actor, id);
  if (conn.status !== 'ACTIVE') throw new ConflictError('Bağlantı aktif değil; önce yeniden bağlanın');
  try {
    return await enqueueCatalogSync(conn.id, 'manual', { requestedBy: actor.userId });
  } catch (err) {
    if (err instanceof CommerceError) throw new ConflictError(err.message);
    throw err;
  }
}
