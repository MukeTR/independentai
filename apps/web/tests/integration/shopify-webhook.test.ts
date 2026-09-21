import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, createTenant, flushAfter, loginAs, prisma } from './helpers';
import { POST as webhook } from '@/app/api/integrations/shopify/webhook/route';
import { GET as install } from '@/app/api/integrations/shopify/install/route';
import { encryptCredentials } from '@/server/commerce/credentials';
import { signWebhookBody } from '@/server/commerce/shopify-oauth';

const SECRET = 'shpss_integration_test_secret';
const SHOP = 'acme-test.myshopify.com';

beforeEach(() => {
  process.env.SHOPIFY_API_KEY = 'test_api_key';
  process.env.SHOPIFY_API_SECRET = SECRET;
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.SHOPIFY_API_KEY;
  delete process.env.SHOPIFY_API_SECRET;
});

async function activeConnection(tenantId: string, storeDomain = SHOP) {
  return prisma.storeConnection.create({
    data: {
      tenantId,
      provider: 'SHOPIFY',
      storeDomain,
      status: 'ACTIVE',
      credentialsEnc: encryptCredentials({ kind: 'SHOPIFY', accessToken: 'shpat_integration', scope: 'read_products' }),
      webhooksRegistered: true,
      scopes: ['read_products'],
    },
  });
}

let seq = 0;
function send(topic: string, payload: unknown, opts: { webhookId?: string; shop?: string; hmac?: string } = {}) {
  const body = JSON.stringify(payload);
  seq += 1;
  return call(webhook, {
    method: 'POST',
    body: payload,
    headers: {
      'x-shopify-topic': topic,
      'x-shopify-shop-domain': opts.shop ?? SHOP,
      'x-shopify-webhook-id': opts.webhookId ?? `wh-${Date.now()}-${seq}`,
      'x-shopify-hmac-sha256': opts.hmac ?? signWebhookBody(body, SECRET),
      'x-shopify-api-version': '2026-07',
    },
  });
}

function stubShopifyProduct(product: Record<string, unknown> | null) {
  const fetchMock = vi.fn(async (url: string | URL, _init?: RequestInit) => {
    expect(String(url)).toBe(`https://${SHOP}/admin/api/2026-07/graphql.json`);
    return new Response(
      JSON.stringify({
        data: {
          shop: {
            id: 'gid://shopify/Shop/1',
            name: 'Acme',
            myshopifyDomain: SHOP,
            primaryDomain: { host: 'www.acme-test.com' },
            currencyCode: 'TRY',
          },
          product,
        },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const PRODUCT = {
  id: 'gid://shopify/Product/101',
  handle: 'deri-bot',
  title: 'Deri Bot',
  vendor: 'Acme',
  productType: 'Ayakkabı',
  tags: ['kış'],
  status: 'ACTIVE',
  updatedAt: '2026-09-05T12:00:00Z',
  onlineStoreUrl: null,
  descriptionHtml: '<p>Gerçek deri.</p>',
  priceRangeV2: {
    minVariantPrice: { amount: '1299.00', currencyCode: 'TRY' },
    maxVariantPrice: { amount: '1299.00', currencyCode: 'TRY' },
  },
  totalInventory: 12,
  tracksInventory: true,
  featuredMedia: { preview: { image: { url: 'https://cdn.shopify.com/bot.jpg', altText: 'Deri bot' } } },
  seo: { title: null, description: null },
  variantsCount: { count: 4 },
  variants: { nodes: [{ sku: 'BOT-42', barcode: null }] },
};

describe('Shopify webhook — imza ve tekilleştirme', () => {
  it('geçersiz HMAC → 401 ve teslimat kaydı oluşmaz', async () => {
    const { tenant } = await createTenant();
    await activeConnection(tenant.id);
    const r = await send(
      'products/update',
      { id: 101 },
      { hmac: signWebhookBody('{"id":999}', SECRET), webhookId: 'wh-bad-1' },
    );
    expect(r.status).toBe(401);
    expect(r.json.code).toBe('WEBHOOK_INVALID');
    expect(await prisma.integrationWebhookDelivery.count()).toBe(0);
    // Aynı id ile gelen gerçek teslimat engellenmemeli
    stubShopifyProduct(PRODUCT);
    const ok = await send(
      'products/update',
      { id: 101, admin_graphql_api_id: 'gid://shopify/Product/101' },
      { webhookId: 'wh-bad-1' },
    );
    expect(ok.status).toBe(200);
    expect(ok.json.duplicate).toBeUndefined();
  });

  it('HMAC başlığı yok → 401; env secret yok → 401', async () => {
    const r = await send('products/update', { id: 1 }, { hmac: '' });
    expect(r.status).toBe(401);
    delete process.env.SHOPIFY_API_SECRET;
    const r2 = await call(webhook, { method: 'POST', body: { id: 1 }, headers: { 'x-shopify-hmac-sha256': 'abc' } });
    expect(r2.status).toBe(401);
  });

  it('geçerli HMAC + eksik başlıklar → 400; geçersiz shop alan adı → 400', async () => {
    const body = JSON.stringify({ id: 1 });
    const r = await call(webhook, {
      method: 'POST',
      body: { id: 1 },
      headers: { 'x-shopify-hmac-sha256': signWebhookBody(body, SECRET) },
    });
    expect(r.status).toBe(400);
    const r2 = await send('products/update', { id: 1 }, { shop: 'acme.myshopify.com.evil.example' });
    expect(r2.status).toBe(400);
  });

  it('products/update → ürün çekilir ve CatalogProduct upsert edilir; aynı webhook id ikinci kez → duplicate', async () => {
    const { tenant } = await createTenant();
    const conn = await activeConnection(tenant.id);
    const fetchMock = stubShopifyProduct(PRODUCT);
    const payload = { id: 101, admin_graphql_api_id: 'gid://shopify/Product/101', title: 'Deri Bot' };

    const first = await send('products/update', payload, { webhookId: 'wh-dup-1' });
    expect(first.status).toBe(200);
    expect(first.json.ok).toBe(true);
    await flushAfter();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const reqInit = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((reqInit.headers as Record<string, string>)['X-Shopify-Access-Token']).toBe('shpat_integration');
    expect(JSON.parse(String(reqInit.body)).variables.id).toBe('gid://shopify/Product/101');

    const product = await prisma.catalogProduct.findUniqueOrThrow({
      where: { connectionId_externalId: { connectionId: conn.id, externalId: 'gid://shopify/Product/101' } },
    });
    expect(product).toMatchObject({
      tenantId: tenant.id,
      title: 'Deri Bot',
      handle: 'deri-bot',
      url: 'https://www.acme-test.com/products/deri-bot',
      availability: 'IN_STOCK',
      currency: 'TRY',
      status: 'active',
      description: 'Gerçek deri.',
    });
    expect(Number(product.priceMin)).toBe(1299);
    expect(product.identifiers).toEqual({ sku: 'BOT-42', variantCount: 4 });
    expect(product.deletedAt).toBeNull();

    const delivery = await prisma.integrationWebhookDelivery.findUniqueOrThrow({
      where: { provider_externalId: { provider: 'SHOPIFY', externalId: 'wh-dup-1' } },
    });
    expect(delivery).toMatchObject({
      topic: 'products/update',
      status: 'processed',
      connectionId: conn.id,
      attempts: 1,
      errorCode: null,
    });
    expect(delivery.processedAt).not.toBeNull();

    // Realtime: tenant kanalına küçük olay; token/ürün verisi yok
    const msgs = await prisma.$queryRawUnsafe<{ topic: string; event: string; payload: Record<string, unknown> }[]>(
      `select topic, event, payload from realtime.messages where event = 'integration.changed'`,
    );
    expect(msgs.some((m) => m.topic === `tenant:${tenant.id}` && m.payload.status === 'product_updated')).toBe(true);
    expect(JSON.stringify(msgs)).not.toContain('shpat_integration');

    // Tekrar teslimat (Shopify yeniden deneme) → 200 duplicate, işleme yok
    const again = await send('products/update', payload, { webhookId: 'wh-dup-1' });
    expect(again.status).toBe(200);
    expect(again.json.duplicate).toBe(true);
    await flushAfter();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const after2 = await prisma.integrationWebhookDelivery.findUniqueOrThrow({ where: { id: delivery.id } });
    expect(after2.attempts).toBe(2);
  });

  it('products/delete → ürün soft-delete; Shopify tarafında ürün yoksa (null) da soft-delete', async () => {
    const { tenant } = await createTenant();
    const conn = await activeConnection(tenant.id);
    stubShopifyProduct(PRODUCT);
    await send('products/create', { id: 101, admin_graphql_api_id: 'gid://shopify/Product/101' });
    await flushAfter();
    expect((await prisma.catalogProduct.findFirstOrThrow({ where: { connectionId: conn.id } })).deletedAt).toBeNull();

    await send('products/delete', { id: 101 });
    await flushAfter();
    const deleted = await prisma.catalogProduct.findFirstOrThrow({
      where: { connectionId: conn.id, externalId: 'gid://shopify/Product/101' },
    });
    expect(deleted.deletedAt).not.toBeNull();

    // Yeniden oluştur, sonra Shopify "ürün yok" dönsün
    stubShopifyProduct(PRODUCT);
    await send('products/update', { id: 101, admin_graphql_api_id: 'gid://shopify/Product/101' });
    await flushAfter();
    expect((await prisma.catalogProduct.findFirstOrThrow({ where: { connectionId: conn.id } })).deletedAt).toBeNull();
    stubShopifyProduct(null);
    await send('products/update', { id: 101, admin_graphql_api_id: 'gid://shopify/Product/101' });
    await flushAfter();
    expect(
      (await prisma.catalogProduct.findFirstOrThrow({ where: { connectionId: conn.id } })).deletedAt,
    ).not.toBeNull();
  });

  it('bilinmeyen mağaza → 200 ama teslimat ignored/NOT_FOUND; desteklenmeyen konu → ignored', async () => {
    const r = await send('products/update', { id: 5 }, { shop: 'unknown-shop.myshopify.com', webhookId: 'wh-unk' });
    expect(r.status).toBe(200);
    await flushAfter();
    expect(
      await prisma.integrationWebhookDelivery.findUniqueOrThrow({
        where: { provider_externalId: { provider: 'SHOPIFY', externalId: 'wh-unk' } },
      }),
    ).toMatchObject({ status: 'ignored', errorCode: 'NOT_FOUND' });
    const r2 = await send('orders/create', { id: 5 }, { webhookId: 'wh-ord' });
    expect(r2.status).toBe(200);
    await flushAfter();
    expect(
      await prisma.integrationWebhookDelivery.findUniqueOrThrow({
        where: { provider_externalId: { provider: 'SHOPIFY', externalId: 'wh-ord' } },
      }),
    ).toMatchObject({ status: 'ignored', errorCode: 'UNSUPPORTED' });
  });
});

describe('Shopify webhook — uninstall ve uyum', () => {
  it('app/uninstalled → aynı mağazanın tüm bağlantıları DISCONNECTED, credentialsEnc null, ürünler soft-delete, audit', async () => {
    const a = await createTenant();
    const b = await createTenant();
    const connA = await activeConnection(a.tenant.id);
    const connB = await activeConnection(b.tenant.id);
    const other = await activeConnection(a.tenant.id, 'other.myshopify.com');
    await prisma.catalogProduct.create({
      data: {
        tenantId: a.tenant.id,
        connectionId: connA.id,
        externalId: 'gid://shopify/Product/1',
        title: 'X',
        contentHash: 'h',
      },
    });
    await prisma.catalogSync.create({
      data: {
        tenantId: a.tenant.id,
        connectionId: connA.id,
        status: 'PENDING',
        dedupeKey: `${connA.id}:x`,
        triggeredBy: 'manual',
      },
    });

    const r = await send(
      'app/uninstalled',
      { id: 1, domain: SHOP, myshopify_domain: SHOP },
      { webhookId: 'wh-uninstall' },
    );
    expect(r.status).toBe(200);
    await flushAfter();

    for (const id of [connA.id, connB.id]) {
      const c = await prisma.storeConnection.findUniqueOrThrow({ where: { id } });
      expect(c.status).toBe('DISCONNECTED');
      expect(c.credentialsEnc).toBeNull();
      expect(c.webhooksRegistered).toBe(false);
    }
    expect((await prisma.storeConnection.findUniqueOrThrow({ where: { id: other.id } })).status).toBe('ACTIVE');
    expect(
      (await prisma.catalogProduct.findFirstOrThrow({ where: { connectionId: connA.id } })).deletedAt,
    ).not.toBeNull();
    expect((await prisma.catalogSync.findFirstOrThrow({ where: { connectionId: connA.id } })).status).toBe('ERROR');
    expect(await prisma.auditLog.count({ where: { action: 'integration.uninstalled', targetId: connA.id } })).toBe(1);
    expect(
      await prisma.integrationWebhookDelivery.findUniqueOrThrow({
        where: { provider_externalId: { provider: 'SHOPIFY', externalId: 'wh-uninstall' } },
      }),
    ).toMatchObject({ status: 'processed' });

    // Kesilmiş bağlantıya gelen ürün webhook'u yoksayılır
    const fetchMock = stubShopifyProduct(PRODUCT);
    await send(
      'products/update',
      { id: 101, admin_graphql_api_id: 'gid://shopify/Product/101' },
      { webhookId: 'wh-after-uninstall' },
    );
    await flushAfter();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uyum konuları HMAC ile doğrulanır, 200 döner, processed olarak loglanır; shop/redact katalogu kalıcı siler', async () => {
    const { tenant } = await createTenant();
    const conn = await activeConnection(tenant.id);
    await prisma.catalogProduct.create({
      data: {
        tenantId: tenant.id,
        connectionId: conn.id,
        externalId: 'gid://shopify/Product/1',
        title: 'X',
        contentHash: 'h',
      },
    });

    const r1 = await send(
      'customers/data_request',
      {
        shop_id: 1,
        shop_domain: SHOP,
        customer: { id: 1, email: 'x@example.com' },
        orders_requested: [],
        data_request: { id: 9 },
      },
      { webhookId: 'wh-c1' },
    );
    expect(r1.status).toBe(200);
    const r2 = await send(
      'customers/redact',
      { shop_id: 1, shop_domain: SHOP, customer: { id: 1 }, orders_to_redact: [] },
      { webhookId: 'wh-c2' },
    );
    expect(r2.status).toBe(200);
    await flushAfter();
    expect(
      await prisma.integrationWebhookDelivery.count({
        where: { status: 'processed', externalId: { in: ['wh-c1', 'wh-c2'] } },
      }),
    ).toBe(2);
    expect(await prisma.catalogProduct.count({ where: { connectionId: conn.id } })).toBe(1);

    const r3 = await send('shop/redact', { shop_id: 1, shop_domain: SHOP }, { webhookId: 'wh-c3' });
    expect(r3.status).toBe(200);
    await flushAfter();
    expect((await prisma.storeConnection.findUniqueOrThrow({ where: { id: conn.id } })).status).toBe('DISCONNECTED');
    expect(await prisma.catalogProduct.count({ where: { connectionId: conn.id } })).toBe(0);
    expect(
      await prisma.integrationWebhookDelivery.findUniqueOrThrow({
        where: { provider_externalId: { provider: 'SHOPIFY', externalId: 'wh-c3' } },
      }),
    ).toMatchObject({ status: 'processed' });
    // Uyum webhook'u geçersiz imza ile 401
    const bad = await send('shop/redact', { shop_id: 1 }, { hmac: 'AAAA', webhookId: 'wh-c4' });
    expect(bad.status).toBe(401);
  });
});

describe('Shopify install (OAuth başlangıcı)', () => {
  it('yetkili kullanıcı PENDING bağlantı için authorize URL’sine yönlendirilir ve imzalı state çerezi alır', async () => {
    const { tenant, user } = await createTenant();
    await loginAs(user);
    const conn = await prisma.storeConnection.create({
      data: { tenantId: tenant.id, provider: 'SHOPIFY', storeDomain: SHOP, status: 'PENDING' },
    });
    const r = await call(install, { url: `/api/integrations/shopify/install?connectionId=${conn.id}` });
    expect(r.status).toBe(302);
    const loc = new URL(r.headers.get('location')!);
    expect(loc.origin + loc.pathname).toBe(`https://${SHOP}/admin/oauth/authorize`);
    expect(loc.searchParams.get('client_id')).toBe('test_api_key');
    expect(loc.searchParams.get('scope')).toBe('read_products');
    expect(loc.searchParams.get('redirect_uri')).toMatch(/\/api\/integrations\/shopify\/callback$/);
    const state = loc.searchParams.get('state')!;
    expect(state).toMatch(/^[a-f0-9]{64}$/);
    const setCookie = r.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('iai_shopify_state=');
    expect(setCookie).toContain(state);
    expect(setCookie).toContain(conn.id);
    expect(setCookie.toLowerCase()).toContain('httponly');
    expect(setCookie).toContain('Path=/api/integrations/shopify');
  });

  it('başka tenant’ın bağlantısı 404; ACTIVE bağlantı 409; myshopify olmayan alan adı 400; oturumsuz 401; VIEWER 403', async () => {
    const a = await createTenant();
    const b = await createTenant();
    const foreign = await prisma.storeConnection.create({
      data: { tenantId: b.tenant.id, provider: 'SHOPIFY', storeDomain: SHOP, status: 'PENDING' },
    });
    const active = await activeConnection(a.tenant.id);
    const badDomain = await prisma.storeConnection.create({
      data: { tenantId: a.tenant.id, provider: 'SHOPIFY', storeDomain: 'acme.com', status: 'PENDING' },
    });
    expect((await call(install, { url: `/api/integrations/shopify/install?connectionId=${foreign.id}` })).status).toBe(
      401,
    );
    await loginAs(a.user);
    expect((await call(install, { url: `/api/integrations/shopify/install?connectionId=${foreign.id}` })).status).toBe(
      404,
    );
    expect((await call(install, { url: `/api/integrations/shopify/install?connectionId=${active.id}` })).status).toBe(
      409,
    );
    expect(
      (await call(install, { url: `/api/integrations/shopify/install?connectionId=${badDomain.id}` })).status,
    ).toBe(400);
    expect((await call(install, { url: `/api/integrations/shopify/install` })).status).toBe(400);
    const viewer = await prisma.user.create({
      data: {
        tenantId: a.tenant.id,
        email: `v${Date.now()}@test.local`,
        passwordHash: 'x',
        role: 'VIEWER',
        emailVerifiedAt: new Date(),
      },
    });
    await loginAs(viewer);
    expect(
      (await call(install, { url: `/api/integrations/shopify/install?connectionId=${badDomain.id}` })).status,
    ).toBe(403);
  });

  it('SHOPIFY_API_KEY yoksa 503 provider_unavailable', async () => {
    const { tenant, user } = await createTenant();
    await loginAs(user);
    const conn = await prisma.storeConnection.create({
      data: { tenantId: tenant.id, provider: 'SHOPIFY', storeDomain: SHOP, status: 'PENDING' },
    });
    delete process.env.SHOPIFY_API_KEY;
    const r = await call(install, { url: `/api/integrations/shopify/install?connectionId=${conn.id}` });
    expect(r.status).toBe(503);
    expect(r.json.code).toBe('provider_unavailable');
  });
});
