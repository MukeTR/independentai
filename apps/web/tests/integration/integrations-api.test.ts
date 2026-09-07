/**
 * Entegrasyon API'si — bağlantı yaşam döngüsü, yetki/izolasyon, plan sınırı, gizli alan sızıntısı.
 * Bağlayıcı ağ çağrısı yapılmaz: senkron/doğrulama testleri kimlik bilgisi OLMAYAN bağlantıyla
 * çalışır (AUTH_INVALID deterministik ve hızlıdır); sahte şifreli metin yalnızca sızıntı kontrolü içindir.
 */
import { describe, expect, it } from 'vitest';
import { addMember, call, createTenant, flushAfter, loginAs, prisma } from './helpers';
import { GET as listIntegrations, POST as createIntegration } from '@/app/api/integrations/route';
import { DELETE as deleteIntegration } from '@/app/api/integrations/[id]/route';
import { POST as syncIntegration } from '@/app/api/integrations/[id]/sync/route';
import { POST as verifyIntegration } from '@/app/api/integrations/[id]/verify/route';
import { POST as disconnectIntegration } from '@/app/api/integrations/[id]/disconnect/route';
import { GET as listProducts } from '@/app/api/integrations/[id]/products/route';
import { GET as listSyncs } from '@/app/api/integrations/[id]/syncs/route';

const SECRET_BLOB = 'gizli-sifreli-kimlik-bilgisi-XYZ987';

async function seedConnection(
  tenantId: string,
  opts: {
    status?: 'PENDING' | 'ACTIVE' | 'ERROR' | 'DISCONNECTED';
    withCreds?: boolean;
    provider?: 'IKAS' | 'TICIMAX' | 'SHOPIFY';
    domain?: string;
  } = {},
) {
  return prisma.storeConnection.create({
    data: {
      tenantId,
      provider: opts.provider ?? 'TICIMAX',
      storeDomain: opts.domain ?? `magaza-${Math.random().toString(36).slice(2, 8)}.example.com`,
      status: opts.status ?? 'ACTIVE',
      credentialsEnc: opts.withCreds ? SECRET_BLOB : null,
    },
  });
}

async function seedProducts(tenantId: string, connectionId: string, n: number, deletedIdx: number[] = []) {
  for (let i = 0; i < n; i++) {
    await prisma.catalogProduct.create({
      data: {
        tenantId,
        connectionId,
        externalId: `ext-${i}`,
        title: `Ürün ${i} ${i % 2 === 0 ? 'Kahve' : 'Çay'}`,
        vendor: 'MarkaX',
        categories: ['İçecek'],
        description: 'x'.repeat(500),
        priceMin: 100 + i,
        priceMax: 120 + i,
        currency: 'TRY',
        availability: 'IN_STOCK',
        seoTitle: i === 0 ? 'SEO başlığı' : null,
        contentHash: `h${i}`,
        deletedAt: deletedIdx.includes(i) ? new Date() : null,
      },
    });
  }
}

describe('GET /api/integrations', () => {
  it('boş liste + sağlayıcı kataloğu + plan sınırı; gizli alan yok', async () => {
    const { user } = await createTenant();
    await loginAs(user);
    const r = await call(listIntegrations);
    expect(r.status).toBe(200);
    expect(r.json.connections).toEqual([]);
    const providers = r.json.providers as unknown as {
      provider: string;
      auth: string;
      configured: boolean;
      label: string;
    }[];
    expect(providers.map((p) => p.provider).sort()).toEqual(['IKAS', 'SHOPIFY', 'TICIMAX']);
    expect(providers.find((p) => p.provider === 'SHOPIFY')?.auth).toBe('oauth');
    expect(providers.find((p) => p.provider === 'TICIMAX')?.auth).toBe('credentials');
    expect(providers.find((p) => p.provider === 'TICIMAX')?.configured).toBe(true);
    expect((r.json.limits as unknown as { storeConnections: number; used: number }).storeConnections).toBe(2);
    expect((r.json.limits as unknown as { used: number }).used).toBe(0);
    expect(r.json.canWrite).toBe(true);
    expect(r.text).not.toContain('credentialsEnc');
  });

  it("ajans ev tenant'ında (kind AGENCY) 403 brandContext", async () => {
    const { user, tenant } = await createTenant();
    await prisma.tenant.update({ where: { id: tenant.id }, data: { kind: 'AGENCY' } });
    await loginAs(user);
    expect((await call(listIntegrations)).status).toBe(403);
    const post = await call(createIntegration, {
      method: 'POST',
      body: { provider: 'TICIMAX', storeDomain: 'magaza.example.com' },
    });
    expect(post.status).toBe(403);
    expect(post.json.code).toBe('forbidden');
  });
});

describe('POST /api/integrations', () => {
  it('geçersiz domain / sağlayıcı 400; Shopify myshopify dışı 400', async () => {
    const { user } = await createTenant();
    await loginAs(user);
    expect(
      (
        await call(createIntegration, {
          method: 'POST',
          body: { provider: 'TICIMAX', storeDomain: 'bu bir domain değil' },
        })
      ).status,
    ).toBe(400);
    expect(
      (await call(createIntegration, { method: 'POST', body: { provider: 'TICIMAX', storeDomain: 'localhost' } }))
        .status,
    ).toBe(400);
    expect(
      (
        await call(createIntegration, {
          method: 'POST',
          body: { provider: 'WOOCOMMERCE', storeDomain: 'a.example.com' },
        })
      ).status,
    ).toBe(400);
    const shop = await call(createIntegration, {
      method: 'POST',
      body: { provider: 'SHOPIFY', storeDomain: 'www.magaza.com' },
    });
    expect(shop.status).toBe(400);
    expect(String(shop.json.message)).toMatch(/myshopify/);
    expect(await prisma.storeConnection.count()).toBe(0);
  });

  it('PENDING oluşturur (201, next null, gizli alan yok); aynı PENDING domain yeniden kullanılır', async () => {
    const { user, tenant } = await createTenant();
    await loginAs(user);
    const r = await call(createIntegration, {
      method: 'POST',
      body: { provider: 'TICIMAX', storeDomain: 'https://Magaza.Example.com/anasayfa' },
    });
    expect(r.status).toBe(201);
    const conn = r.json.connection as unknown as {
      id: string;
      status: string;
      storeDomain: string;
      hasCredentials: boolean;
      tenantId: string;
    };
    expect(conn.status).toBe('PENDING');
    expect(conn.storeDomain).toBe('magaza.example.com');
    expect(conn.hasCredentials).toBe(false);
    expect(conn.tenantId).toBe(tenant.id);
    expect(r.json.next).toBeNull();
    expect(r.text).not.toContain('credentialsEnc');
    const again = await call(createIntegration, {
      method: 'POST',
      body: { provider: 'TICIMAX', storeDomain: 'magaza.example.com' },
    });
    expect(again.status).toBe(201);
    expect((again.json.connection as unknown as { id: string }).id).toBe(conn.id);
    expect(await prisma.storeConnection.count({ where: { tenantId: tenant.id } })).toBe(1);
  });

  it('plan sınırı: STARTER 1 bağlantı → ikinci 403 plan_limit; DISCONNECTED sayılmaz', async () => {
    const { user, tenant } = await createTenant({ plan: 'STARTER' });
    await loginAs(user);
    expect(
      (await call(createIntegration, { method: 'POST', body: { provider: 'TICIMAX', storeDomain: 'a.example.com' } }))
        .status,
    ).toBe(201);
    const second = await call(createIntegration, {
      method: 'POST',
      body: { provider: 'IKAS', storeDomain: 'b.myikas.com' },
    });
    expect(second.status).toBe(403);
    expect(second.json.code).toBe('plan_limit');
    await prisma.storeConnection.updateMany({ where: { tenantId: tenant.id }, data: { status: 'DISCONNECTED' } });
    expect(
      (await call(createIntegration, { method: 'POST', body: { provider: 'IKAS', storeDomain: 'b.myikas.com' } }))
        .status,
    ).toBe(201);
  });

  it('aynı domain ACTIVE ise 409 conflict', async () => {
    const { user, tenant } = await createTenant();
    await loginAs(user);
    await seedConnection(tenant.id, { provider: 'IKAS', domain: 'shop.myikas.com', status: 'ACTIVE' });
    const r = await call(createIntegration, {
      method: 'POST',
      body: { provider: 'IKAS', storeDomain: 'shop.myikas.com' },
    });
    expect(r.status).toBe(409);
    expect(r.json.code).toBe('conflict');
  });

  it('VIEWER POST 403; GET 200 ama canWrite=false', async () => {
    const { tenant } = await createTenant();
    const viewer = await addMember(tenant.id, 'VIEWER');
    await loginAs(viewer);
    const r = await call(createIntegration, {
      method: 'POST',
      body: { provider: 'TICIMAX', storeDomain: 'a.example.com' },
    });
    expect(r.status).toBe(403);
    const list = await call(listIntegrations);
    expect(list.status).toBe(200);
    expect(list.json.canWrite).toBe(false);
  });
});

describe('bağlantı alt uçları — izolasyon', () => {
  it("başka tenant'ın id'si ile sync/verify/disconnect/delete/products/syncs 404", async () => {
    const owner = await createTenant();
    const conn = await seedConnection(owner.tenant.id, { withCreds: true });
    const other = await createTenant();
    await loginAs(other.user);
    const params = { id: conn.id };
    expect((await call(syncIntegration, { method: 'POST', params })).status).toBe(404);
    expect((await call(verifyIntegration, { method: 'POST', params })).status).toBe(404);
    expect((await call(disconnectIntegration, { method: 'POST', params })).status).toBe(404);
    expect((await call(deleteIntegration, { method: 'DELETE', params })).status).toBe(404);
    expect((await call(listProducts, { params })).status).toBe(404);
    expect((await call(listSyncs, { params })).status).toBe(404);
    expect(await prisma.storeConnection.count({ where: { id: conn.id } })).toBe(1);
  });

  it('bilinmeyen id 404; VIEWER yazma uçları 403', async () => {
    const { user, tenant } = await createTenant();
    await loginAs(user);
    expect((await call(syncIntegration, { method: 'POST', params: { id: 'yok' } })).status).toBe(404);
    const conn = await seedConnection(tenant.id);
    const viewer = await addMember(tenant.id, 'VIEWER');
    await loginAs(viewer);
    expect((await call(syncIntegration, { method: 'POST', params: { id: conn.id } })).status).toBe(403);
    expect((await call(deleteIntegration, { method: 'DELETE', params: { id: conn.id } })).status).toBe(403);
    // salt-okunur uçlar Viewer'a açık
    expect((await call(listProducts, { params: { id: conn.id } })).status).toBe(200);
  });
});

describe('senkron ve doğrulama', () => {
  it('manuel sync 202 + after() işleme: kimlik bilgisi yoksa AUTH_INVALID ile ERROR; ERROR/PENDING bağlantıda 409', async () => {
    const { user, tenant } = await createTenant();
    await loginAs(user);
    const conn = await seedConnection(tenant.id, { status: 'ACTIVE', withCreds: false });
    const r = await call(syncIntegration, { method: 'POST', params: { id: conn.id } });
    expect(r.status).toBe(202);
    expect(r.json.created).toBe(true);
    const sync = r.json.sync as unknown as { id: string; status: string };
    expect(sync.status).toBe('PENDING');
    // Aynı anda ikinci tetikleme → mevcut iş döner (created:false)
    const dup = await call(syncIntegration, { method: 'POST', params: { id: conn.id } });
    expect(dup.status).toBe(202);
    expect(dup.json.created).toBe(false);
    await flushAfter();
    const job = await prisma.catalogSync.findUniqueOrThrow({ where: { id: sync.id } });
    expect(job.status).toBe('ERROR');
    expect(job.errorCode).toBe('AUTH_INVALID');
    const after = await prisma.storeConnection.findUniqueOrThrow({ where: { id: conn.id } });
    expect(after.status).toBe('ERROR');
    expect(after.lastErrorCode).toBe('AUTH_INVALID');

    const syncs = await call(listSyncs, { params: { id: conn.id } });
    expect(syncs.status).toBe(200);
    const list = syncs.json.syncs as unknown as {
      id: string;
      status: string;
      errorMessage: string | null;
      triggeredBy: string | null;
    }[];
    expect(list).toHaveLength(1);
    expect(list[0]!.errorMessage).toMatch(/kimlik bilgileri geçersiz/i);
    expect(list[0]!.triggeredBy).toBe('manual'); // kullanıcı kimliği sızmaz
    expect(syncs.text).not.toContain(user.id);

    // ERROR durumunda tekrar sync → 409
    expect((await call(syncIntegration, { method: 'POST', params: { id: conn.id } })).status).toBe(409);
    const pending = await seedConnection(tenant.id, { status: 'PENDING' });
    expect((await call(syncIntegration, { method: 'POST', params: { id: pending.id } })).status).toBe(409);

    // Realtime yayını tenant topic'ine gitti; payload'da gizli alan yok
    const rows = await prisma.$queryRawUnsafe<{ topic: string; event: string; payload: Record<string, unknown> }[]>(
      'select topic, event, payload from realtime.messages where topic = $1 order by id asc',
      `tenant:${tenant.id}`,
    );
    expect(rows.some((m) => (m.payload as { event?: string }).event === 'integration.sync')).toBe(true);
    expect(JSON.stringify(rows)).not.toContain('credentialsEnc');
  });

  it('verify: kimlik bilgisi yoksa ok:false AUTH_INVALID; sahte şifreli metin çözülemez → ERROR, yanıtta sızmaz', async () => {
    const { user, tenant } = await createTenant();
    await loginAs(user);
    const noCreds = await seedConnection(tenant.id, { status: 'ACTIVE', withCreds: false });
    const r1 = await call(verifyIntegration, { method: 'POST', params: { id: noCreds.id } });
    expect(r1.status).toBe(200);
    expect(r1.json.ok).toBe(false);
    expect(r1.json.code).toBe('AUTH_INVALID');
    const withCreds = await seedConnection(tenant.id, { status: 'ACTIVE', withCreds: true });
    const r2 = await call(verifyIntegration, { method: 'POST', params: { id: withCreds.id } });
    expect(r2.status).toBe(200);
    expect(r2.json.ok).toBe(false);
    expect(r2.text).not.toContain(SECRET_BLOB);
    expect(r2.text).not.toContain('credentialsEnc');
    expect((r2.json.connection as unknown as { hasCredentials: boolean }).hasCredentials).toBe(true);
    const row = await prisma.storeConnection.findUniqueOrThrow({ where: { id: withCreds.id } });
    expect(row.status).toBe('ERROR');
  });
});

describe('ürün listesi, kes ve sil', () => {
  it('products: deletedAt filtreli, arama, sayfalama, açıklama 200 karaktere kısaltılır', async () => {
    const { user, tenant } = await createTenant();
    await loginAs(user);
    const conn = await seedConnection(tenant.id, { withCreds: true });
    await seedProducts(tenant.id, conn.id, 4, [3]);
    const all = await call(listProducts, { params: { id: conn.id } });
    expect(all.status).toBe(200);
    expect(all.json.total).toBe(3);
    const items = all.json.items as unknown as {
      id: string;
      title: string;
      description: string;
      price: { min: number; max: number };
      hasSeoTitle: boolean;
      currency: string;
    }[];
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.description.length <= 201)).toBe(true);
    expect(items[0]!.price.min).toBe(100);
    expect(items[0]!.currency).toBe('TRY');
    expect(items.filter((i) => i.hasSeoTitle)).toHaveLength(1);
    expect(all.text).not.toContain(SECRET_BLOB);
    expect(all.text).not.toContain('credentialsEnc');

    const search = await call(listProducts, {
      params: { id: conn.id },
      url: `/api/integrations/${conn.id}/products?q=kahve`,
    });
    expect(search.json.total).toBe(2);

    const page1 = await call(listProducts, {
      params: { id: conn.id },
      url: `/api/integrations/${conn.id}/products?limit=2`,
    });
    const p1 = page1.json.items as unknown as { id: string }[];
    expect(p1).toHaveLength(2);
    expect(page1.json.nextCursor).toBe(p1[1]!.id);
    const page2 = await call(listProducts, {
      params: { id: conn.id },
      url: `/api/integrations/${conn.id}/products?limit=2&cursor=${page1.json.nextCursor}`,
    });
    const p2 = page2.json.items as unknown as { id: string }[];
    expect(p2).toHaveLength(1);
    expect(p1.map((x) => x.id)).not.toContain(p2[0]!.id);
    expect(page2.json.nextCursor).toBeNull();
    expect(
      (
        await call(listProducts, {
          params: { id: conn.id },
          url: `/api/integrations/${conn.id}/products?cursor=..;drop`,
        })
      ).status,
    ).toBe(400);
  });

  it('disconnect: kimlik bilgisi silinir, katalog arşivlenir, realtime integration.changed yayılır', async () => {
    const { user, tenant } = await createTenant();
    await loginAs(user);
    const conn = await seedConnection(tenant.id, { withCreds: true });
    await seedProducts(tenant.id, conn.id, 2);
    const r = await call(disconnectIntegration, { method: 'POST', params: { id: conn.id } });
    expect(r.status).toBe(200);
    const row = await prisma.storeConnection.findUniqueOrThrow({ where: { id: conn.id } });
    expect(row.status).toBe('DISCONNECTED');
    expect(row.credentialsEnc).toBeNull();
    expect(await prisma.catalogProduct.count({ where: { connectionId: conn.id, deletedAt: null } })).toBe(0);
    const products = await call(listProducts, { params: { id: conn.id } });
    expect(products.json.total).toBe(0);
    expect(products.json.connectionStatus).toBe('DISCONNECTED');
    const list = await call(listIntegrations);
    const view = (
      list.json.connections as unknown as {
        id: string;
        status: string;
        hasCredentials: boolean;
        productCount: number;
      }[]
    ).find((c) => c.id === conn.id)!;
    expect(view.status).toBe('DISCONNECTED');
    expect(view.hasCredentials).toBe(false);
    expect(view.productCount).toBe(0);
    expect(list.text).not.toContain(SECRET_BLOB);
    const rows = await prisma.$queryRawUnsafe<{ payload: Record<string, unknown> }[]>(
      'select payload from realtime.messages where topic = $1',
      `tenant:${tenant.id}`,
    );
    expect(
      rows.some(
        (m) =>
          (m.payload as { event?: string; status?: string }).event === 'integration.changed' &&
          (m.payload as { status?: string }).status === 'disconnected',
      ),
    ).toBe(true);
    expect(await prisma.auditLog.count({ where: { tenantId: tenant.id, action: 'integration.disconnect' } })).toBe(1);
  });

  it('DELETE cascade: CatalogProduct ve CatalogSync silinir; audit izi kalır', async () => {
    const { user, tenant } = await createTenant();
    await loginAs(user);
    const conn = await seedConnection(tenant.id, { withCreds: true });
    await seedProducts(tenant.id, conn.id, 3);
    await prisma.catalogSync.create({
      data: { connectionId: conn.id, tenantId: tenant.id, status: 'SUCCESS', dedupeKey: `${conn.id}:test` },
    });
    const r = await call(deleteIntegration, { method: 'DELETE', params: { id: conn.id } });
    expect(r.status).toBe(200);
    expect(await prisma.storeConnection.count({ where: { id: conn.id } })).toBe(0);
    expect(await prisma.catalogProduct.count({ where: { connectionId: conn.id } })).toBe(0);
    expect(await prisma.catalogSync.count({ where: { connectionId: conn.id } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { tenantId: tenant.id, action: 'integration.delete' } })).toBe(1);
    expect((await call(deleteIntegration, { method: 'DELETE', params: { id: conn.id } })).status).toBe(404);
  });
});
