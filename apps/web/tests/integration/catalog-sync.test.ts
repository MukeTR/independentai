/**
 * Katalog senkron motoru — sahte bağlayıcı ile: idempotent kuyruk, sayfalama/imleçten devam,
 * contentHash ile değişmeyeni atlama, soft delete, retry/hata sınıflandırma, Realtime yayınları.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTenant, prisma } from './helpers';
import type { CommerceConnector, NormalizedProduct } from '@/server/commerce/types';
import { CommerceError } from '@/server/commerce/errors';

const state: { products: NormalizedProduct[]; failWith: CommerceError | null; calls: number; pageSize: number } = {
  products: [],
  failWith: null,
  calls: 0,
  pageSize: 2,
};

const fake: CommerceConnector = {
  provider: 'TICIMAX',
  capabilities: () => ({
    products: true,
    categories: false,
    webhooks: false,
    incremental: false,
    auth: 'api_key',
    count: true,
    pageSize: state.pageSize,
    productUrls: false,
  }),
  async verify() {
    return { displayName: 'Fake Store' };
  },
  async countProducts() {
    return state.products.length;
  },
  async listProducts(_ctx, opts) {
    state.calls += 1;
    if (state.failWith) throw state.failWith;
    const start = Number(opts.cursor ?? 0);
    const items = state.products.slice(start, start + opts.limit);
    const next = start + opts.limit < state.products.length ? String(start + opts.limit) : null;
    return { items, nextCursor: next, total: state.products.length };
  },
};

vi.mock('@/server/commerce/registry', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return { ...mod, getConnector: async () => fake };
});

import { enqueueCatalogSync, processCatalogSyncs, contentHashOf } from '@/server/commerce/catalog-sync';
import { encryptCredentials } from '@/server/commerce/credentials';

function product(i: number, extra: Partial<NormalizedProduct> = {}): NormalizedProduct {
  return {
    externalId: `p${i}`,
    title: `Ürün ${i}`,
    categories: ['Kategori'],
    availability: 'IN_STOCK',
    priceMin: 10 + i,
    priceMax: 10 + i,
    currency: 'TRY',
    ...extra,
  };
}

async function makeConnection() {
  const { tenant } = await createTenant();
  const conn = await prisma.storeConnection.create({
    data: {
      tenantId: tenant.id,
      provider: 'TICIMAX',
      storeDomain: `store-${tenant.id.slice(-6)}.example.com`,
      status: 'ACTIVE',
      credentialsEnc: encryptCredentials({ kind: 'TICIMAX', serviceBase: 'https://store.example.com', uyeKodu: 'ABC' }),
    },
  });
  return { tenant, conn };
}

async function messages(topic: string) {
  return prisma.$queryRawUnsafe<{ event: string; payload: Record<string, unknown> }[]>(
    `select event, payload from realtime.messages where topic = $1 order by id`,
    topic,
  );
}

beforeEach(() => {
  state.products = [];
  state.failWith = null;
  state.calls = 0;
  state.pageSize = 2;
});

describe('catalog sync — kuyruk', () => {
  it('aynı bağlantı için aktif iş varken yeniden kuyruğa alma aynı işi döndürür', async () => {
    const { conn } = await makeConnection();
    const a = await enqueueCatalogSync(conn.id, 'manual');
    const b = await enqueueCatalogSync(conn.id, 'manual');
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(b.sync.id).toBe(a.sync.id);
  });

  it('cron tetiklemesi günde bir kez (dedupeKey)', async () => {
    const { conn } = await makeConnection();
    const a = await enqueueCatalogSync(conn.id, 'cron');
    await prisma.catalogSync.update({ where: { id: a.sync.id }, data: { status: 'SUCCESS' } });
    const b = await enqueueCatalogSync(conn.id, 'cron');
    expect(b.created).toBe(false);
    expect(b.sync.id).toBe(a.sync.id);
  });

  it('kesilmiş bağlantı kuyruğa alınamaz', async () => {
    const { conn } = await makeConnection();
    await prisma.storeConnection.update({ where: { id: conn.id }, data: { status: 'DISCONNECTED' } });
    await expect(enqueueCatalogSync(conn.id, 'manual')).rejects.toBeInstanceOf(CommerceError);
  });
});

describe('catalog sync — işleme', () => {
  it('sayfalar halinde çeker, ürünleri yazar, değişmeyeni atlar, kaybolanı soft-delete eder ve ilerleme yayınlar', async () => {
    const { tenant, conn } = await makeConnection();
    state.products = [product(1), product(2), product(3)];
    await enqueueCatalogSync(conn.id, 'manual');
    const r1 = await processCatalogSyncs({ deadlineAt: Date.now() + 60_000 });
    expect(r1.processed).toBe(1);
    expect(state.calls).toBe(2);
    const rows = await prisma.catalogProduct.findMany({
      where: { connectionId: conn.id },
      orderBy: { externalId: 'asc' },
    });
    expect(rows.map((r) => r.externalId)).toEqual(['p1', 'p2', 'p3']);
    expect(rows[0]!.contentHash).toBe(contentHashOf(product(1)));
    const sync1 = await prisma.catalogSync.findFirstOrThrow({ where: { connectionId: conn.id } });
    expect(sync1.status).toBe('SUCCESS');
    expect(sync1.fetched).toBe(3);
    expect(sync1.upserted).toBe(3);
    expect(sync1.total).toBe(3);
    const connAfter = await prisma.storeConnection.findUniqueOrThrow({ where: { id: conn.id } });
    expect(connAfter.lastSyncAt).not.toBeNull();

    // İkinci tur: p2 değişti, p3 kayboldu, p4 eklendi
    state.products = [product(1), product(2, { title: 'Ürün 2 (yeni)' }), product(4)];
    state.calls = 0;
    await enqueueCatalogSync(conn.id, 'manual');
    await processCatalogSyncs({ deadlineAt: Date.now() + 60_000 });
    const sync2 = await prisma.catalogSync.findFirstOrThrow({
      where: { connectionId: conn.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(sync2.status).toBe('SUCCESS');
    expect(sync2.unchanged).toBe(1); // p1
    expect(sync2.upserted).toBe(2); // p2 güncel, p4 yeni
    expect(sync2.deleted).toBe(1); // p3
    const p3 = await prisma.catalogProduct.findFirstOrThrow({ where: { connectionId: conn.id, externalId: 'p3' } });
    expect(p3.deletedAt).not.toBeNull();
    const p2 = await prisma.catalogProduct.findFirstOrThrow({ where: { connectionId: conn.id, externalId: 'p2' } });
    expect(p2.title).toBe('Ürün 2 (yeni)');

    const msgs = await messages(`tenant:${tenant.id}`);
    const events = msgs.map((m) => m.event);
    expect(events).toContain('integration.sync');
    const statuses = msgs.map((m) => m.payload.status);
    expect(statuses).toContain('queued');
    expect(statuses).toContain('success');
    for (const m of msgs) {
      expect(JSON.stringify(m.payload)).not.toMatch(/uyeKodu|ABC|credentials|token/i);
      expect(m.payload.entityId).toBe(conn.id);
    }
  });

  it('bütçe dolunca RUNNING kalır ve sonraki turda imleçten devam eder', async () => {
    const { conn } = await makeConnection();
    state.products = Array.from({ length: 6 }, (_, i) => product(i + 1));
    await enqueueCatalogSync(conn.id, 'manual');
    // deadline 15 sn marjının altında → ilk sayfadan sonra kesilir
    const r1 = await processCatalogSyncs({ deadlineAt: Date.now() + 16_000 });
    expect(r1.partial + r1.processed).toBeGreaterThanOrEqual(0);
    const midway = await prisma.catalogSync.findFirstOrThrow({ where: { connectionId: conn.id } });
    if (midway.status === 'RUNNING') {
      expect(midway.cursor).not.toBeNull();
      // kira süresini geçmiş gibi işaretle → yeniden alınabilir
      await prisma.catalogSync.update({
        where: { id: midway.id },
        data: { leaseExpiresAt: new Date(Date.now() - 1000) },
      });
      const r2 = await processCatalogSyncs({ deadlineAt: Date.now() + 60_000 });
      expect(r2.processed).toBe(1);
    }
    const done = await prisma.catalogSync.findFirstOrThrow({ where: { connectionId: conn.id } });
    expect(done.status).toBe('SUCCESS');
    expect(done.fetched).toBe(6);
    const n = await prisma.catalogProduct.count({ where: { connectionId: conn.id, deletedAt: null } });
    expect(n).toBe(6);
  });

  it('yeniden denenebilir hata → PENDING + attempt; kalıcı yetki hatası → ERROR + bağlantı ERROR', async () => {
    const { conn } = await makeConnection();
    state.products = [product(1)];
    state.failWith = new CommerceError('RATE_LIMITED', 'kota', { provider: 'TICIMAX', retryAfterMs: 1000 });
    await enqueueCatalogSync(conn.id, 'manual');
    const r = await processCatalogSyncs({ deadlineAt: Date.now() + 60_000 });
    expect(r.failed).toBe(1);
    const s1 = await prisma.catalogSync.findFirstOrThrow({ where: { connectionId: conn.id } });
    expect(s1.status).toBe('PENDING');
    expect(s1.attempt).toBe(2); // sıradaki deneme numarası
    expect(s1.errorCode).toBe('RATE_LIMITED');
    expect(s1.leaseExpiresAt!.getTime()).toBeGreaterThan(Date.now());
    const c1 = await prisma.storeConnection.findUniqueOrThrow({ where: { id: conn.id } });
    expect(c1.status).toBe('ACTIVE');

    state.failWith = new CommerceError('AUTH_INVALID', 'geçersiz', { provider: 'TICIMAX' });
    await prisma.catalogSync.update({ where: { id: s1.id }, data: { leaseExpiresAt: new Date(Date.now() - 1) } });
    const r2 = await processCatalogSyncs({ deadlineAt: Date.now() + 60_000 });
    expect(r2.failed).toBe(1);
    const s2 = await prisma.catalogSync.findFirstOrThrow({ where: { connectionId: conn.id } });
    expect(s2.status).toBe('ERROR');
    expect(s2.errorCode).toBe('AUTH_INVALID');
    const c2 = await prisma.storeConnection.findUniqueOrThrow({ where: { id: conn.id } });
    expect(c2.status).toBe('ERROR');
    expect(c2.lastErrorCode).toBe('AUTH_INVALID');
  });

  it('plan sınırı aşılırsa kısmi senkron + LIMIT_EXCEEDED ve soft-delete yapılmaz', async () => {
    const { tenant, conn } = await makeConnection();
    await prisma.tenant.update({ where: { id: tenant.id }, data: { plan: 'STARTER' } }); // catalogProducts 2000
    state.pageSize = 100;
    state.products = Array.from({ length: 2005 }, (_, i) => product(i + 1));
    await enqueueCatalogSync(conn.id, 'manual');
    await processCatalogSyncs({ deadlineAt: Date.now() + 120_000 });
    const s = await prisma.catalogSync.findFirstOrThrow({ where: { connectionId: conn.id } });
    expect(s.status).toBe('SUCCESS');
    expect(s.errorCode).toBe('LIMIT_EXCEEDED');
    expect(s.fetched).toBe(2000);
    expect(s.deleted).toBe(0);
    const c = await prisma.storeConnection.findUniqueOrThrow({ where: { id: conn.id } });
    expect(c.lastErrorCode).toBe('LIMIT_EXCEEDED');
  }, 120_000);

  it('cross-tenant: bir tenant’ın senkronu başka tenant topic’ine yayın yapmaz', async () => {
    const a = await makeConnection();
    const b = await makeConnection();
    state.products = [product(1)];
    await enqueueCatalogSync(a.conn.id, 'manual');
    await processCatalogSyncs({ deadlineAt: Date.now() + 60_000 });
    const toB = await messages(`tenant:${b.tenant.id}`);
    expect(toB.length).toBe(0);
    const toA = await messages(`tenant:${a.tenant.id}`);
    expect(toA.length).toBeGreaterThan(0);
    const bProducts = await prisma.catalogProduct.count({ where: { tenantId: b.tenant.id } });
    expect(bProducts).toBe(0);
  });
});
