import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shopifyConnector, normalizeProduct, stripHtml, updatedSinceQuery } from '@/server/commerce/connectors/shopify';
import { CommerceError } from '@/server/commerce/errors';
import type { ConnectorContext } from '@/server/commerce/types';

type Call = { url: string; init: RequestInit; body: { query: string; variables: Record<string, unknown> } };

function ctx(overrides: Partial<ConnectorContext> = {}): ConnectorContext {
  return {
    connectionId: 'conn1',
    tenantId: 'ten1',
    provider: 'SHOPIFY',
    storeDomain: 'acme.myshopify.com',
    credentials: { kind: 'SHOPIFY', accessToken: 'shpat_test_token', scope: 'read_products' },
    persistCredentials: async () => undefined,
    ...overrides,
  };
}

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
}

const SHOP = {
  id: 'gid://shopify/Shop/1',
  name: 'Acme',
  myshopifyDomain: 'acme.myshopify.com',
  primaryDomain: { host: 'www.acme.com' },
  currencyCode: 'TRY',
};

function product(n: number, extra: Record<string, unknown> = {}) {
  return {
    id: `gid://shopify/Product/${n}`,
    handle: `urun-${n}`,
    title: `Ürün ${n}`,
    vendor: 'Acme',
    productType: 'Ayakkabı',
    tags: ['yaz', 'indirim'],
    status: 'ACTIVE',
    updatedAt: '2026-09-01T10:00:00Z',
    onlineStoreUrl: null,
    descriptionHtml: '<p>Hafif &amp; <strong>rahat</strong>.<br>Deri.</p><script>x()</script>',
    priceRangeV2: {
      minVariantPrice: { amount: '199.90', currencyCode: 'TRY' },
      maxVariantPrice: { amount: '249.90', currencyCode: 'TRY' },
    },
    totalInventory: 5,
    tracksInventory: true,
    featuredMedia: { preview: { image: { url: 'https://cdn.shopify.com/x.jpg', altText: 'alt' } } },
    seo: { title: 'SEO başlık', description: 'SEO açıklama' },
    variantsCount: { count: 3 },
    variants: { nodes: [{ sku: 'SKU-1', barcode: '8690000000001' }] },
    ...extra,
  };
}

let calls: Call[] = [];
let responder: (call: Call) => Response | Promise<Response>;

beforeEach(() => {
  calls = [];
  responder = () => jsonResponse({ data: {} });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init: RequestInit) => {
      const call: Call = { url: String(url), init, body: JSON.parse(String(init.body)) };
      calls.push(call);
      return responder(call);
    }),
  );
  delete process.env.SHOPIFY_API_VERSION;
});
afterEach(() => vi.unstubAllGlobals());

describe('capabilities', () => {
  it('OAuth, webhook, artımlı, sayım ve ürün URL destekli; sayfa boyutu maliyet tavanına göre 50', () => {
    const c = shopifyConnector.capabilities();
    expect(c).toMatchObject({
      products: true,
      categories: false,
      webhooks: true,
      incremental: true,
      auth: 'oauth_authorization_code',
      count: true,
      productUrls: true,
    });
    expect(c.pageSize).toBeLessThanOrEqual(100);
  });
});

describe('verify', () => {
  it('resmî GraphQL ucuna token başlığıyla gider ve mağaza metasını döndürür', async () => {
    responder = () =>
      jsonResponse({ data: { shop: SHOP, currentAppInstallation: { accessScopes: [{ handle: 'read_products' }] } } });
    const info = await shopifyConnector.verify(ctx());
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('https://acme.myshopify.com/admin/api/2026-07/graphql.json');
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers['X-Shopify-Access-Token']).toBe('shpat_test_token');
    expect(calls[0]!.init.method).toBe('POST');
    expect(calls[0]!.body.query).toContain('shop {');
    expect(calls[0]!.body.query).not.toMatch(/orders|customers/i);
    expect(info).toEqual({
      externalStoreId: 'gid://shopify/Shop/1',
      displayName: 'Acme',
      primaryDomain: 'www.acme.com',
      currency: 'TRY',
      capabilities: { webhooks: true, scopes: ['read_products'] },
    });
  });
  it('SHOPIFY_API_VERSION env sürümü kullanır', async () => {
    process.env.SHOPIFY_API_VERSION = '2026-10';
    responder = () => jsonResponse({ data: { shop: SHOP } });
    await shopifyConnector.verify(ctx());
    expect(calls[0]!.url).toContain('/admin/api/2026-10/');
  });
  it('read_products izni yoksa SCOPE_MISSING', async () => {
    responder = () =>
      jsonResponse({ data: { shop: SHOP, currentAppInstallation: { accessScopes: [{ handle: 'read_orders' }] } } });
    await expect(shopifyConnector.verify(ctx())).rejects.toMatchObject({ code: 'SCOPE_MISSING' });
  });
  it('geçersiz mağaza alan adında ağ isteği yapmadan INVALID_STORE', async () => {
    await expect(
      shopifyConnector.verify(ctx({ storeDomain: 'acme.myshopify.com.evil.example' })),
    ).rejects.toMatchObject({ code: 'INVALID_STORE' });
    await expect(shopifyConnector.verify(ctx({ storeDomain: 'localhost' }))).rejects.toMatchObject({
      code: 'INVALID_STORE',
    });
    expect(calls).toHaveLength(0);
  });
  it('kimlik bilgisi türü Shopify değilse AUTH_INVALID', async () => {
    await expect(
      shopifyConnector.verify(ctx({ credentials: { kind: 'IKAS', clientId: 'a', clientSecret: 'b' } })),
    ).rejects.toMatchObject({ code: 'AUTH_INVALID' });
  });
});

describe('listProducts', () => {
  it('imleçli sayfalama + normalize', async () => {
    responder = (call) => {
      const after = call.body.variables.after;
      if (!after)
        return jsonResponse({
          data: {
            shop: SHOP,
            products: {
              pageInfo: { hasNextPage: true, endCursor: 'CUR1' },
              nodes: [
                product(1),
                product(2, {
                  tracksInventory: false,
                  totalInventory: 0,
                  onlineStoreUrl: 'https://www.acme.com/products/ozel',
                }),
              ],
            },
          },
        });
      return jsonResponse({
        data: {
          shop: SHOP,
          products: {
            pageInfo: { hasNextPage: false, endCursor: 'CUR2' },
            nodes: [
              product(3, {
                totalInventory: 0,
                status: 'DRAFT',
                descriptionHtml: '',
                tags: [],
                variants: { nodes: [] },
                variantsCount: null,
                featuredMedia: null,
                seo: { title: null, description: null },
              }),
            ],
          },
        },
      });
    };
    const p1 = await shopifyConnector.listProducts(ctx(), { cursor: null, limit: 50 });
    expect(calls[0]!.body.variables).toMatchObject({ first: 50, after: null, query: null });
    expect(calls[0]!.body.query).toContain('sortKey: UPDATED_AT');
    expect(p1.nextCursor).toBe('CUR1');
    expect(p1.items).toHaveLength(2);
    const a = p1.items[0]!;
    expect(a).toMatchObject({
      externalId: 'gid://shopify/Product/1',
      handle: 'urun-1',
      url: 'https://www.acme.com/products/urun-1',
      title: 'Ürün 1',
      vendor: 'Acme',
      productType: 'Ayakkabı',
      categories: [],
      description: 'Hafif & rahat.\nDeri.',
      priceMin: 199.9,
      priceMax: 249.9,
      currency: 'TRY',
      availability: 'IN_STOCK',
      imageUrl: 'https://cdn.shopify.com/x.jpg',
      imageAlt: 'alt',
      seoTitle: 'SEO başlık',
      seoDescription: 'SEO açıklama',
      identifiers: { sku: 'SKU-1', barcode: '8690000000001', variantCount: 3 },
      facts: { tags: 'yaz, indirim', variantCount: 3, tracksInventory: true },
      status: 'active',
    });
    expect(a.sourceUpdatedAt?.toISOString()).toBe('2026-09-01T10:00:00.000Z');
    // Envanter takibi kapalı → stokta; onlineStoreUrl varsa o kullanılır
    expect(p1.items[1]).toMatchObject({ availability: 'IN_STOCK', url: 'https://www.acme.com/products/ozel' });

    const p2 = await shopifyConnector.listProducts(ctx(), { cursor: p1.nextCursor, limit: 50 });
    expect(calls[1]!.body.variables.after).toBe('CUR1');
    expect(p2.nextCursor).toBeNull();
    expect(p2.items[0]).toMatchObject({
      availability: 'OUT_OF_STOCK',
      status: 'draft',
      description: null,
      identifiers: null,
      facts: { tracksInventory: true },
      imageUrl: null,
      seoTitle: null,
    });
  });
  it('updatedSince → updated_at:> filtresi; limit sayfa boyutuna kırpılır', async () => {
    responder = () =>
      jsonResponse({
        data: { shop: SHOP, products: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] } },
      });
    const since = new Date('2026-08-30T00:00:00Z');
    const r = await shopifyConnector.listProducts(ctx(), { cursor: null, limit: 250, updatedSince: since });
    expect(r.items).toEqual([]);
    expect(calls[0]!.body.variables.query).toBe("updated_at:>'2026-08-30T00:00:00.000Z'");
    expect(calls[0]!.body.variables.first).toBe(50);
    expect(updatedSinceQuery(null)).toBeNull();
  });
  it('throttled GraphQL cevabı → RATE_LIMITED (retryAfterMs throttleStatus’tan)', async () => {
    responder = () =>
      jsonResponse({
        errors: [
          {
            message: 'Throttled',
            extensions: { code: 'THROTTLED', documentation: 'https://shopify.dev/api/usage/rate-limits' },
          },
        ],
        extensions: {
          cost: {
            requestedQueryCost: 600,
            actualQueryCost: null,
            throttleStatus: { maximumAvailable: 1000, currentlyAvailable: 100, restoreRate: 50 },
          },
        },
      });
    const err = await shopifyConnector.listProducts(ctx(), { cursor: null, limit: 50 }).catch((e) => e);
    expect(err).toBeInstanceOf(CommerceError);
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.retryable).toBe(true);
    expect(err.retryAfterMs).toBeGreaterThanOrEqual(10_000);
    expect(err.retryAfterMs).toBeLessThanOrEqual(11_000);
  });
  it('HTTP 429 → RATE_LIMITED (Retry-After); 401 → AUTH_INVALID; 403 → SCOPE_MISSING; 500 → UPSTREAM_ERROR', async () => {
    responder = () => new Response('', { status: 429, headers: { 'retry-after': '7' } });
    await expect(shopifyConnector.listProducts(ctx(), { cursor: null, limit: 50 })).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      retryAfterMs: 7000,
    });
    responder = () => jsonResponse({ errors: 'Invalid API key or access token' }, { status: 401 });
    await expect(shopifyConnector.listProducts(ctx(), { cursor: null, limit: 50 })).rejects.toMatchObject({
      code: 'AUTH_INVALID',
      status: 401,
    });
    responder = () => new Response('', { status: 403 });
    await expect(shopifyConnector.listProducts(ctx(), { cursor: null, limit: 50 })).rejects.toMatchObject({
      code: 'SCOPE_MISSING',
    });
    responder = () => new Response('oops', { status: 502 });
    await expect(shopifyConnector.listProducts(ctx(), { cursor: null, limit: 50 })).rejects.toMatchObject({
      code: 'UPSTREAM_ERROR',
      retryable: true,
    });
  });
  it('ACCESS_DENIED GraphQL hatası → SCOPE_MISSING; bozuk JSON → UPSTREAM_ERROR; ağ hatası → NETWORK', async () => {
    responder = () =>
      jsonResponse({
        errors: [{ message: 'Access denied for products field.', extensions: { code: 'ACCESS_DENIED' } }],
      });
    await expect(shopifyConnector.listProducts(ctx(), { cursor: null, limit: 50 })).rejects.toMatchObject({
      code: 'SCOPE_MISSING',
    });
    responder = () => new Response('<html>not json</html>', { status: 200, headers: { 'content-type': 'text/html' } });
    await expect(shopifyConnector.listProducts(ctx(), { cursor: null, limit: 50 })).rejects.toMatchObject({
      code: 'UPSTREAM_ERROR',
    });
    responder = () => {
      throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });
    };
    await expect(shopifyConnector.listProducts(ctx(), { cursor: null, limit: 50 })).rejects.toMatchObject({
      code: 'NETWORK',
    });
  });
  it('hata mesajları token içermez', async () => {
    responder = () => new Response('', { status: 401 });
    const err = (await shopifyConnector.listProducts(ctx(), { cursor: null, limit: 50 }).catch((e) => e)) as Error;
    expect(err.message).not.toContain('shpat_test_token');
  });
});

describe('countProducts / getProduct / listCategories', () => {
  it('productsCount döner; sağlayıcı hatasında null', async () => {
    responder = () => jsonResponse({ data: { productsCount: { count: 1234, precision: 'EXACT' } } });
    expect(await shopifyConnector.countProducts!(ctx())).toBe(1234);
    responder = () => new Response('', { status: 500 });
    expect(await shopifyConnector.countProducts!(ctx())).toBeNull();
    responder = () => new Response('', { status: 401 });
    await expect(shopifyConnector.countProducts!(ctx())).rejects.toMatchObject({ code: 'AUTH_INVALID' });
  });
  it('getProduct: gid doğrular, ürün yoksa null', async () => {
    responder = () => jsonResponse({ data: { shop: SHOP, product: product(7) } });
    const p = await shopifyConnector.getProduct!(ctx(), 'gid://shopify/Product/7');
    expect(calls[0]!.body.variables.id).toBe('gid://shopify/Product/7');
    expect(p?.externalId).toBe('gid://shopify/Product/7');
    expect(p?.url).toBe('https://www.acme.com/products/urun-7');
    responder = () => jsonResponse({ data: { shop: SHOP, product: null } });
    expect(await shopifyConnector.getProduct!(ctx(), 'gid://shopify/Product/8')).toBeNull();
    await expect(shopifyConnector.getProduct!(ctx(), 'gid://shopify/Order/1')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
  it('listCategories koleksiyonları döndürür', async () => {
    responder = () =>
      jsonResponse({
        data: { collections: { nodes: [{ id: 'gid://shopify/Collection/1', title: 'Yaz', handle: 'yaz' }] } },
      });
    expect(await shopifyConnector.listCategories!(ctx())).toEqual([
      { id: 'gid://shopify/Collection/1', name: 'Yaz', parentId: null, path: 'yaz' },
    ]);
  });
});

describe('registerWebhooks', () => {
  const cb = 'https://independentai.space/api/integrations/shopify/webhook';
  it('var olan konuları atlar, eksikleri uri ile oluşturur', async () => {
    responder = (call) => {
      if (call.body.query.includes('webhookSubscriptions(')) {
        return jsonResponse({
          data: {
            webhookSubscriptions: {
              nodes: [
                { id: 'gid://shopify/WebhookSubscription/1', topic: 'PRODUCTS_UPDATE', uri: cb },
                {
                  id: 'gid://shopify/WebhookSubscription/2',
                  topic: 'PRODUCTS_DELETE',
                  uri: 'https://other.example/hook',
                },
              ],
            },
          },
        });
      }
      return jsonResponse({
        data: {
          webhookSubscriptionCreate: {
            webhookSubscription: {
              id: `gid://shopify/WebhookSubscription/${calls.length}`,
              topic: call.body.variables.topic,
              uri: cb,
            },
            userErrors: [],
          },
        },
      });
    };
    const r = await shopifyConnector.registerWebhooks!(ctx(), cb);
    expect(r.skipped).toEqual(['PRODUCTS_UPDATE']);
    expect(r.registered.sort()).toEqual(['APP_UNINSTALLED', 'PRODUCTS_CREATE', 'PRODUCTS_DELETE', 'PRODUCTS_UPDATE']);
    const creates = calls.filter((c) => c.body.query.includes('webhookSubscriptionCreate'));
    expect(creates.map((c) => c.body.variables.topic).sort()).toEqual([
      'APP_UNINSTALLED',
      'PRODUCTS_CREATE',
      'PRODUCTS_DELETE',
    ]);
    expect(creates[0]!.body.variables.webhookSubscription).toEqual({ uri: cb });
  });
  it('userErrors → UPSTREAM_ERROR; http olmayan geri çağrı atlanır', async () => {
    responder = (call) =>
      call.body.query.includes('webhookSubscriptions(')
        ? jsonResponse({ data: { webhookSubscriptions: { nodes: [] } } })
        : jsonResponse({
            data: {
              webhookSubscriptionCreate: {
                webhookSubscription: null,
                userErrors: [{ field: ['webhookSubscription', 'uri'], message: 'Address is invalid' }],
              },
            },
          });
    await expect(shopifyConnector.registerWebhooks!(ctx(), cb)).rejects.toMatchObject({ code: 'UPSTREAM_ERROR' });
    const r = await shopifyConnector.registerWebhooks!(ctx(), 'http://localhost:3200/api/integrations/shopify/webhook');
    expect(r.registered).toEqual([]);
    expect(r.skipped).toHaveLength(4);
  });
});

describe('süreli token yenileme (opsiyonel)', () => {
  it('süresi dolmak üzereyse refresh_token ile yeniler ve persistCredentials çağırır', async () => {
    process.env.SHOPIFY_API_KEY = 'k';
    process.env.SHOPIFY_API_SECRET = 's';
    const persisted: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL, init: RequestInit) => {
        const u = String(url);
        if (u.endsWith('/admin/oauth/access_token')) {
          const body = String(init.body);
          expect(body).toContain('grant_type=refresh_token');
          expect(body).toContain('refresh_token=shprt_old');
          return jsonResponse({
            access_token: 'shpat_new',
            scope: 'read_products',
            expires_in: 86400,
            refresh_token: 'shprt_new',
          });
        }
        expect((init.headers as Record<string, string>)['X-Shopify-Access-Token']).toBe('shpat_new');
        return jsonResponse({ data: { shop: SHOP } });
      }),
    );
    const c = ctx({
      credentials: {
        kind: 'SHOPIFY',
        accessToken: 'shpat_old',
        refreshToken: 'shprt_old',
        expiresAt: new Date(Date.now() + 30_000).toISOString(),
        scope: 'read_products',
      },
      persistCredentials: async (cr) => {
        persisted.push(cr);
      },
    });
    await shopifyConnector.verify(c);
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toMatchObject({ kind: 'SHOPIFY', accessToken: 'shpat_new', refreshToken: 'shprt_new' });
    delete process.env.SHOPIFY_API_KEY;
    delete process.env.SHOPIFY_API_SECRET;
  });
  it('süresi dolmuş ve refresh_token yok → AUTH_EXPIRED', async () => {
    const c = ctx({
      credentials: { kind: 'SHOPIFY', accessToken: 'shpat_old', expiresAt: new Date(Date.now() - 1000).toISOString() },
    });
    await expect(shopifyConnector.verify(c)).rejects.toMatchObject({ code: 'AUTH_EXPIRED' });
    expect(calls).toHaveLength(0);
  });
});

describe('yardımcılar', () => {
  it('stripHtml etiket/varlık/boşluk temizler', () => {
    expect(stripHtml('<div>A &lt;b&gt; &#39;c&#39; &#x26; d</div><ul><li>x</li><li>y</li></ul>')).toBe(
      "A <b> 'c' & d\nx\ny",
    );
    expect(stripHtml('   ')).toBeNull();
    expect(stripHtml(null)).toBeNull();
    expect(stripHtml('<p>' + 'a'.repeat(20_000) + '</p>')!.length).toBeLessThanOrEqual(10_001);
  });
  it('normalizeProduct eksik alanlarda güvenli varsayılanlar üretir', () => {
    const p = normalizeProduct({ id: 'gid://shopify/Product/9' }, null);
    expect(p).toMatchObject({
      externalId: 'gid://shopify/Product/9',
      title: 'gid://shopify/Product/9',
      url: null,
      availability: 'UNKNOWN',
      priceMin: null,
      priceMax: null,
      identifiers: null,
      facts: null,
      status: null,
      sourceUpdatedAt: null,
    });
  });
});
