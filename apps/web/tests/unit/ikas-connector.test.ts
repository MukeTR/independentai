import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommerceError } from '@/server/commerce/errors';
import type { ConnectorContext, IkasCredentials } from '@/server/commerce/types';
import {
  IKAS_GRAPHQL_URL,
  ikasConnector,
  normalizeIkasProduct,
  parseWebhookBody,
  verifyWebhookKey,
  webhookEndpointFor,
  webhookKey,
} from '@/server/commerce/connectors/ikas';

type Call = { url: string; init: RequestInit };

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}

function mkCtx(creds: Partial<IkasCredentials> = {}): ConnectorContext & { persisted: IkasCredentials[] } {
  const persisted: IkasCredentials[] = [];
  const credentials: IkasCredentials = {
    kind: 'IKAS',
    clientId: 'cid-12345678',
    clientSecret: 's_gizli_secret_9876',
    ...creds,
  };
  return {
    connectionId: 'ckconn12345678901234',
    tenantId: 't1',
    provider: 'IKAS',
    storeDomain: 'demo.myikas.com',
    credentials,
    persistCredentials: async (c) => {
      persisted.push(structuredClone(c) as IkasCredentials);
    },
    persisted,
  };
}

const PRODUCT = {
  id: 'p1',
  name: 'Pamuklu Tişört',
  description: '<p>Yumuşak &amp; nefes alan <b>pamuk</b>.</p>',
  shortDescription: null,
  type: 'PHYSICAL',
  brand: { id: 'b1', name: 'Ergen' },
  categories: [
    { id: 'c1', name: 'Giyim', parentId: null },
    { id: 'c2', name: 'Tişört', parentId: 'c1' },
  ],
  tags: [
    { id: 't1', name: 'yaz' },
    { id: 't2', name: 'basic' },
  ],
  totalStock: 12,
  weight: 0.2,
  metaData: { slug: 'pamuklu-tisort', pageTitle: 'Pamuklu Tişört | Demo', description: 'SEO açıklaması' },
  variants: [
    {
      id: 'v1',
      sku: 'TS-001-S',
      barcodeList: ['8690000000001'],
      isActive: true,
      prices: [{ sellPrice: 300, discountPrice: 249.9, currency: 'TRY', currencyCode: 'TRY', priceListId: null }],
      stocks: [{ stockCount: 5 }],
    },
    {
      id: 'v2',
      sku: 'TS-001-M',
      barcodeList: [],
      isActive: true,
      prices: [{ sellPrice: 320, discountPrice: null, currencyCode: 'TRY', priceListId: null }],
      stocks: [{ stockCount: 7 }],
    },
    { id: 'v3', sku: 'TS-001-XL', isActive: false, prices: [{ sellPrice: 999, currencyCode: 'TRY' }], stocks: [] },
  ],
};

function installFetch(handler: (call: Call, n: number) => Response | Promise<Response>) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init: RequestInit) => {
      const call = { url: String(url), init };
      calls.push(call);
      return handler(call, calls.length);
    }),
  );
  return calls;
}

function bodyOf(call: Call): Record<string, unknown> {
  return JSON.parse(String(call.init.body)) as Record<string, unknown>;
}

afterEach(() => vi.unstubAllGlobals());

describe('ikas token yönetimi', () => {
  it('token yoksa client_credentials ile alır, geri yazar ve Bearer ile GraphQL çağırır', async () => {
    const calls = installFetch((call) => {
      if (call.url.endsWith('/api/admin/oauth/token'))
        return json({ access_token: 'tok-1', token_type: 'Bearer', expires_in: 14400 });
      return json({ data: { listProduct: { count: 3 } } });
    });
    const ctx = mkCtx();
    const n = await ikasConnector.countProducts!(ctx);
    expect(n).toBe(3);
    expect(calls[0]!.url).toBe('https://demo.myikas.com/api/admin/oauth/token');
    const form = new URLSearchParams(String(calls[0]!.init.body));
    expect(form.get('grant_type')).toBe('client_credentials');
    expect(form.get('client_id')).toBe('cid-12345678');
    expect(form.get('client_secret')).toBe('s_gizli_secret_9876');
    expect((calls[0]!.init.headers as Record<string, string>)['Content-Type']).toContain(
      'application/x-www-form-urlencoded',
    );
    expect(calls[1]!.url).toBe(IKAS_GRAPHQL_URL);
    expect((calls[1]!.init.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
    expect(ctx.persisted).toHaveLength(1);
    expect(ctx.persisted[0]!.accessToken).toBe('tok-1');
    const exp = Date.parse(ctx.persisted[0]!.accessTokenExpiresAt!);
    expect(exp - Date.now()).toBeGreaterThan(14_000_000);
    // ctx.credentials aynı referansta güncellendi (activateConnection şifrelerken token'ı da yazar)
    expect((ctx.credentials as IkasCredentials).accessToken).toBe('tok-1');
  });

  it('geçerli token varsa yeniden almaz; süresi dolmuşsa yeniler', async () => {
    const calls = installFetch((call) => {
      if (call.url.endsWith('/oauth/token')) return json({ access_token: 'tok-new', expires_in: 14400 });
      return json({ data: { listProduct: { count: 1 } } });
    });
    const fresh = mkCtx({
      accessToken: 'tok-ok',
      accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    await ikasConnector.countProducts!(fresh);
    expect(calls.filter((c) => c.url.endsWith('/oauth/token'))).toHaveLength(0);
    expect(fresh.persisted).toHaveLength(0);

    const stale = mkCtx({ accessToken: 'tok-old', accessTokenExpiresAt: new Date(Date.now() - 1000).toISOString() });
    await ikasConnector.countProducts!(stale);
    expect(calls.filter((c) => c.url.endsWith('/oauth/token'))).toHaveLength(1);
    expect(stale.persisted[0]!.accessToken).toBe('tok-new');
  });

  it('token ucu 401 → AUTH_INVALID (secret mesaja sızmaz)', async () => {
    installFetch(() => json({ error: 'invalid_client' }, 401));
    const err = await ikasConnector.verify(mkCtx()).catch((e) => e);
    expect(err).toBeInstanceOf(CommerceError);
    expect(err.code).toBe('AUTH_INVALID');
    expect(String(err.message)).not.toContain('s_gizli');
  });

  it('GraphQL 401 → bir kez token yeniler, tekrar 401 → AUTH_INVALID', async () => {
    const calls = installFetch((call) => {
      if (call.url.endsWith('/oauth/token')) return json({ access_token: 'tok-x', expires_in: 14400 });
      return json({ message: 'Unauthorized' }, 401);
    });
    const ctx = mkCtx({
      accessToken: 'tok-revoked',
      accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    const err = await ikasConnector.listProducts(ctx, { cursor: null, limit: 100 }).catch((e) => e);
    expect(err.code).toBe('AUTH_INVALID');
    expect(calls.filter((c) => c.url.endsWith('/oauth/token'))).toHaveLength(1);
    expect(calls.filter((c) => c.url === IKAS_GRAPHQL_URL)).toHaveLength(2);
  });

  it('429 → RATE_LIMITED, Retry-After saniyesi ms olarak taşınır', async () => {
    installFetch(() => json({ message: 'too many' }, 429, { 'retry-after': '7' }));
    const ctx = mkCtx({ accessToken: 't', accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString() });
    const err = await ikasConnector.listProducts(ctx, { cursor: null, limit: 100 }).catch((e) => e);
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.retryable).toBe(true);
    expect(err.retryAfterMs).toBe(7000);
  });

  it('mağaza adresi *.myikas.com değilse INVALID_STORE (istek atılmaz)', async () => {
    const calls = installFetch(() => json({}));
    const ctx = mkCtx();
    ctx.storeDomain = 'www.magaza.com';
    const err = await ikasConnector.verify(ctx).catch((e) => e);
    expect(err.code).toBe('INVALID_STORE');
    expect(calls).toHaveLength(0);
  });
});

describe('ikas listProduct sayfalama ve normalize', () => {
  const ready = () => mkCtx({ accessToken: 't', accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString() });

  it('sayfa numarası imleçtir; hasNext=false → null; count toplamı taşır', async () => {
    const calls = installFetch((call) => {
      const vars = bodyOf(call).variables as { page: number; limit: number };
      if (vars.page === 1)
        return json({ data: { listProduct: { count: 2, page: 1, limit: 1, hasNext: true, data: [PRODUCT] } } });
      return json({
        data: {
          listProduct: {
            count: 2,
            page: 2,
            limit: 1,
            hasNext: false,
            data: [{ ...PRODUCT, id: 'p2', metaData: null, variants: [] }],
          },
        },
      });
    });
    const ctx = ready();
    const p1 = await ikasConnector.listProducts(ctx, { cursor: null, limit: 1 });
    expect(p1.items).toHaveLength(1);
    expect(p1.nextCursor).toBe('2');
    expect(p1.total).toBe(2);
    const p2 = await ikasConnector.listProducts(ctx, { cursor: p1.nextCursor, limit: 1 });
    expect(p2.nextCursor).toBeNull();
    expect(p2.items[0]!.url).toBeNull();
    expect(p2.items[0]!.status).toBeNull();
    expect((bodyOf(calls[1]!).variables as { page: number }).page).toBe(2);
    expect(String(bodyOf(calls[0]!).query)).toContain('listProduct(pagination: { page: $page, limit: $limit })');
  });

  it('normalize: fiyat aralığı indirimli fiyatla, para birimi, stok, tanımlayıcılar, SEO, kategori adları, URL', () => {
    const n = normalizeIkasProduct(PRODUCT, 'demo.myikas.com');
    expect(n.externalId).toBe('p1');
    expect(n.title).toBe('Pamuklu Tişört');
    expect(n.handle).toBe('pamuklu-tisort');
    expect(n.url).toBe('https://demo.myikas.com/pamuklu-tisort');
    expect(n.vendor).toBe('Ergen');
    expect(n.categories).toEqual(['Giyim', 'Tişört']);
    expect(n.description).toBe('Yumuşak & nefes alan pamuk.');
    expect(n.priceMin).toBe(249.9); // indirimli fiyat
    expect(n.priceMax).toBe(320); // pasif varyant (999) dışlanır
    expect(n.currency).toBe('TRY');
    expect(n.availability).toBe('IN_STOCK');
    expect(n.imageUrl).toBeNull(); // CDN biçimi doğrulanmadı → uydurulmaz
    expect(n.seoTitle).toBe('Pamuklu Tişört | Demo');
    expect(n.seoDescription).toBe('SEO açıklaması');
    expect(n.identifiers).toEqual({ sku: 'TS-001-S', barcode: '8690000000001', variantCount: 3 });
    expect(n.facts).toMatchObject({ tags: 'yaz, basic', type: 'physical', weight: 0.2, variantCount: 3 });
    expect(n.status).toBe('active');
  });

  it('stok 0 → OUT_OF_STOCK; totalStock yoksa varyant stokları toplanır; hiçbiri yoksa UNKNOWN', () => {
    expect(normalizeIkasProduct({ ...PRODUCT, totalStock: 0 }, 'd.myikas.com').availability).toBe('OUT_OF_STOCK');
    expect(normalizeIkasProduct({ ...PRODUCT, totalStock: null }, 'd.myikas.com').availability).toBe('IN_STOCK');
    expect(
      normalizeIkasProduct({ id: 'x', name: 'X', variants: [{ id: 'v', prices: [] }] }, 'd.myikas.com').availability,
    ).toBe('UNKNOWN');
  });

  it('getProduct: listProduct(id:{eq}) ile tek ürün; yoksa null', async () => {
    const calls = installFetch((call) => {
      const vars = bodyOf(call).variables as { id: string };
      return json({ data: { listProduct: { data: vars.id === 'p1' ? [PRODUCT] : [] } } });
    });
    const ctx = ready();
    const p = await ikasConnector.getProduct!(ctx, 'p1');
    expect(p?.externalId).toBe('p1');
    expect(String(bodyOf(calls[0]!).query)).toContain('listProduct(id: { eq: $id }');
    expect(await ikasConnector.getProduct!(ctx, 'yok')).toBeNull();
  });

  it('verify: token + count + kategori denemesi; kategori hatası yeteneği kapatır', async () => {
    installFetch((call) => {
      if (call.url.endsWith('/oauth/token')) return json({ access_token: 'tok', expires_in: 14400 });
      const q = String(bodyOf(call).query);
      if (q.includes('listCategory'))
        return json({ errors: [{ message: 'forbidden', extensions: { code: 'FORBIDDEN' } }] });
      return json({ data: { listProduct: { count: 42 } } });
    });
    const info = await ikasConnector.verify(mkCtx());
    expect(info.displayName).toBe('demo');
    expect(info.primaryDomain).toBe('demo.myikas.com');
    expect(info.capabilities).toMatchObject({ webhooks: true, categories: false, productCount: 42 });
  });

  it('registerWebhooks: mevcut olmayan scope’lar c&k parametreli uçla kaydedilir', async () => {
    const calls = installFetch((call) => {
      const q = String(bodyOf(call).query);
      if (q.includes('listWebhook')) return json({ data: { listWebhook: [] } });
      if (q.includes('saveWebhook')) {
        const input = (bodyOf(call).variables as { input: { scopes: string[]; endpoint: string } }).input;
        return json({
          data: { saveWebhook: input.scopes.map((s) => ({ id: s, scope: s, endpoint: input.endpoint })) },
        });
      }
      return json({ data: {} });
    });
    const ctx = ready();
    const r = await ikasConnector.registerWebhooks!(ctx, 'https://independentai.space/api/integrations/ikas/webhook');
    expect(r.registered).toEqual(['store/product/created', 'store/product/updated']);
    const save = calls.find((c) => String(bodyOf(c).query).includes('saveWebhook'))!;
    const input = (bodyOf(save).variables as { input: { scopes: string[]; endpoint: string } }).input;
    const u = new URL(input.endpoint);
    expect(u.searchParams.get('c')).toBe(ctx.connectionId);
    expect(verifyWebhookKey(ctx.connectionId, u.searchParams.get('k'))).toBe(true);
  });
});

describe('ikas webhook anahtarı ve payload', () => {
  it('HMAC anahtarı zamanlama-sabit doğrulanır; yanlış/başka bağlantı anahtarı reddedilir', () => {
    const k = webhookKey('ckconn12345678901234');
    expect(k).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyWebhookKey('ckconn12345678901234', k)).toBe(true);
    expect(verifyWebhookKey('ckconn12345678901234', k.toUpperCase())).toBe(true);
    expect(verifyWebhookKey('ckconn12345678901234', webhookKey('ckother1234567890123'))).toBe(false);
    expect(verifyWebhookKey('ckconn12345678901234', 'kisa')).toBe(false);
    expect(verifyWebhookKey('', k)).toBe(false);
    expect(verifyWebhookKey('ck; drop', k)).toBe(false);
    const url = new URL(webhookEndpointFor('https://x.example/api/integrations/ikas/webhook', 'ckconn12345678901234'));
    expect(url.searchParams.get('k')).toBe(k);
  });

  it('payload: data JSON metni veya nesne; id yoksa null; deleted scope → delete', () => {
    const a = parseWebhookBody(
      JSON.stringify({
        id: 'evt1',
        scope: 'store/product/updated',
        merchantId: 'm1',
        data: JSON.stringify({ id: 'p1', name: 'x' }),
      }),
    );
    expect(a).toEqual({ scope: 'store/product/updated', productId: 'p1', action: 'upsert', merchantId: 'm1' });
    const b = parseWebhookBody(JSON.stringify({ scope: 'store/product/deleted', data: { id: 'p2' } }));
    expect(b.productId).toBe('p2');
    expect(b.action).toBe('delete');
    expect(parseWebhookBody('{bozuk').productId).toBeNull();
    expect(
      parseWebhookBody(JSON.stringify({ scope: 'store/product/updated', data: { id: '../../etc' } })).productId,
    ).toBeNull();
    // data yokken üst düzey id ürün olarak yorumlanır (gövde ürünün kendisi olabilir)
    expect(parseWebhookBody(JSON.stringify({ id: 'p3', name: 'Ürün' })).productId).toBe('p3');
  });
});
