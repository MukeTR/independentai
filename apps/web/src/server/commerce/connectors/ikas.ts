/**
 * ikas bağlayıcısı — Admin GraphQL API, salt-okunur katalog.
 *
 * Doğrulanmış gerçekler (ikas.dev/docs, Eylül 2026):
 *  - Kimlik: OAuth client_credentials → `POST https://{store}.myikas.com/api/admin/oauth/token`
 *    (form: grant_type, client_id, client_secret) → { access_token, token_type, expires_in: 14400 }.
 *    Token 4 saat geçerli; süresi dolmadan yenilenir ve `persistCredentials` ile geri yazılır.
 *  - Uç: `POST https://api.myikas.com/api/v1/admin/graphql`, `Authorization: Bearer <token>`.
 *  - `listProduct(pagination:{page,limit≤200}, id:{eq}) → { data, count, page, limit, hasNext }`;
 *    `listCategory → [Category]` (id, name, parentId, categoryPath); `listWebhook`,
 *    `saveWebhook(input:{scopes,endpoint})`, `deleteWebhook(scopes)`; geçerli ürün scope'ları:
 *    `store/product/created`, `store/product/updated` (dokümanda `deleted` scope'u YOK).
 *  - Webhook imzası dokümante değil → geri çağrı URL'sine bağlantıya özel HMAC anahtarı (`?c=&k=`)
 *    eklenir; gelen payload'a güvenilmez, ürün API'den yeniden çekilir (getProduct).
 *  - Görsel CDN URL biçimi dokümante değil → imageUrl null bırakılır (uydurulmaz).
 *  - Ürün URL'si: `https://{storeDomain}/{metaData.slug}` (slug yoksa null).
 *  - Host doğrulaması: yalnızca `{store}.myikas.com` ve `api.myikas.com` (SSRF: rastgele host yok).
 *
 * Veri kapsamı: yalnızca ürün + kategori. Sipariş/müşteri/ödeme sorgusu YOK.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { log } from '../../logger';
import { encryptionSecret } from '../../env';
import { CommerceError, fromHttpStatus, USER_MESSAGES } from '../errors';
import type {
  CommerceConnector,
  ConnectorContext,
  IkasCredentials,
  ListProductsOptions,
  NormalizedProduct,
  ProductPage,
  StoreInfo,
  WebhookRegistration,
} from '../types';
import { stripHtml } from './shopify';
import { readBodyCapped, USER_AGENT } from './http';

const PROVIDER = 'IKAS' as const;
const PAGE_SIZE = 100;
const REQUEST_TIMEOUT_MS = 20_000;
const TOKEN_SKEW_MS = 2 * 60_000;
const DEFAULT_TOKEN_TTL_SEC = 14_400;
const MAX_TOKEN_BODY_BYTES = 64 * 1024;

export const IKAS_GRAPHQL_URL = 'https://api.myikas.com/api/v1/admin/graphql';
export const IKAS_STORE_RE = /^[a-z0-9][a-z0-9-]*\.myikas\.com$/;
export const IKAS_WEBHOOK_SCOPES = ['store/product/created', 'store/product/updated'] as const;

// ───────────── GraphQL tipleri (yalnızca kullandığımız alanlar) ─────────────

type GqlPrice = {
  sellPrice?: number | null;
  discountPrice?: number | null;
  currency?: string | null;
  currencyCode?: string | null;
  priceListId?: string | null;
};
type GqlVariant = {
  id?: string;
  sku?: string | null;
  barcodeList?: string[] | null;
  isActive?: boolean | null;
  prices?: GqlPrice[] | null;
  stocks?: { stockCount?: number | null }[] | null;
};
export type GqlIkasProduct = {
  id: string;
  name?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  type?: string | null;
  brandId?: string | null;
  brand?: { id?: string; name?: string | null } | null;
  categoryIds?: string[] | null;
  categories?: { id?: string; name?: string | null; parentId?: string | null }[] | null;
  tags?: { id?: string; name?: string | null }[] | null;
  vendorId?: string | null;
  salesChannelIds?: string[] | null;
  totalStock?: number | null;
  weight?: number | null;
  metaData?: { slug?: string | null; pageTitle?: string | null; description?: string | null } | null;
  variants?: GqlVariant[] | null;
};
type GqlProductPage = {
  data?: GqlIkasProduct[] | null;
  count?: number | null;
  page?: number | null;
  limit?: number | null;
  hasNext?: boolean | null;
};
type GqlCategory = { id: string; name?: string | null; parentId?: string | null; categoryPath?: string[] | null };
type GqlWebhook = { id?: string; scope?: string | null; endpoint?: string | null };
type GqlError = { message?: string; extensions?: { code?: string; [k: string]: unknown } };
type GqlResponse<T> = { data?: T | null; errors?: GqlError[] };

const PRODUCT_FIELDS = `
  id name description shortDescription type brandId brand { id name }
  categoryIds categories { id name parentId } tags { id name }
  vendorId salesChannelIds totalStock weight
  metaData { slug pageTitle description }
  variants { id sku barcodeList isActive prices { sellPrice discountPrice currency currencyCode priceListId } stocks { stockCount } }
`;

const QUERIES = {
  products: `query IaiIkasProducts($page: Int!, $limit: Int!) {
    listProduct(pagination: { page: $page, limit: $limit }) { count page limit hasNext data { ${PRODUCT_FIELDS} } }
  }`,
  product: `query IaiIkasProduct($id: String!) {
    listProduct(id: { eq: $id }, pagination: { page: 1, limit: 1 }) { data { ${PRODUCT_FIELDS} } }
  }`,
  count: `query IaiIkasCount { listProduct(pagination: { page: 1, limit: 1 }) { count } }`,
  categories: `query IaiIkasCategories { listCategory { id name parentId categoryPath } }`,
  webhookList: `query IaiIkasWebhooks { listWebhook { id scope endpoint } }`,
  webhookSave: `mutation IaiIkasSaveWebhook($input: WebhookInput!) { saveWebhook(input: $input) { id scope endpoint } }`,
} as const;

// ───────────── Kimlik bilgisi + token ─────────────

function requireIkasCredentials(ctx: ConnectorContext): IkasCredentials {
  if (ctx.credentials.kind !== 'IKAS')
    throw new CommerceError('AUTH_INVALID', USER_MESSAGES.AUTH_INVALID, { provider: PROVIDER });
  return ctx.credentials;
}

/** Bağlantının mağaza adresi `{store}.myikas.com` biçiminde olmalı (token ucu bu host'ta). */
export function requireIkasStoreDomain(storeDomain: string): string {
  const s = String(storeDomain ?? '')
    .trim()
    .toLowerCase();
  if (!IKAS_STORE_RE.test(s)) {
    throw new CommerceError('INVALID_STORE', 'ikas mağaza adresi "magaza.myikas.com" biçiminde olmalı', {
      provider: PROVIDER,
    });
  }
  return s;
}

async function fetchToken(
  storeDomain: string,
  clientId: string,
  clientSecret: string,
): Promise<{ accessToken: string; expiresAt: string }> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  let res: Response;
  try {
    res = await fetch(`https://${storeDomain}/api/admin/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: body.toString(),
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw new CommerceError('NETWORK', USER_MESSAGES.NETWORK, { provider: PROVIDER, cause: err });
  }
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    await res.body?.cancel().catch(() => undefined);
    throw new CommerceError(
      'AUTH_INVALID',
      'ikas Client ID / Client Secret geçersiz. Özel uygulama bilgilerini kontrol edin.',
      { provider: PROVIDER, status: res.status },
    );
  }
  if (res.status === 404) {
    await res.body?.cancel().catch(() => undefined);
    throw new CommerceError('INVALID_STORE', 'ikas mağazası bulunamadı; mağaza adresini kontrol edin.', {
      provider: PROVIDER,
      status: 404,
    });
  }
  if (!res.ok) throw fromHttpStatus(res.status, PROVIDER, res.headers.get('retry-after'));
  let json: { access_token?: unknown; expires_in?: unknown };
  try {
    json = JSON.parse(await readBodyCapped(res, PROVIDER, MAX_TOKEN_BODY_BYTES)) as typeof json;
  } catch (err) {
    throw new CommerceError('UPSTREAM_ERROR', USER_MESSAGES.UPSTREAM_ERROR, { provider: PROVIDER, cause: err });
  }
  if (typeof json.access_token !== 'string' || !json.access_token) {
    throw new CommerceError('UPSTREAM_ERROR', 'ikas token yanıtı beklenen biçimde değil', { provider: PROVIDER });
  }
  const ttl = Number(json.expires_in);
  const sec = Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_TOKEN_TTL_SEC;
  return { accessToken: json.access_token, expiresAt: new Date(Date.now() + sec * 1000).toISOString() };
}

/** Geçerli erişim token'ı; yoksa/süresi dolmak üzereyse (veya force) yeniler ve geri yazar. */
async function ensureToken(ctx: ConnectorContext, force = false): Promise<string> {
  const creds = requireIkasCredentials(ctx);
  if (!force && creds.accessToken && creds.accessTokenExpiresAt) {
    const exp = Date.parse(creds.accessTokenExpiresAt);
    if (Number.isFinite(exp) && exp - Date.now() > TOKEN_SKEW_MS) return creds.accessToken;
  }
  const store = requireIkasStoreDomain(ctx.storeDomain);
  const t = await fetchToken(store, creds.clientId, creds.clientSecret);
  // Aynı nesne referansı activateConnection'da da şifrelenir → yerinde güncelle, sonra kalıcılaştır.
  creds.accessToken = t.accessToken;
  creds.accessTokenExpiresAt = t.expiresAt;
  ctx.credentials = creds;
  await ctx.persistCredentials(creds);
  return t.accessToken;
}

function classifyGraphqlErrors(errors: GqlError[]): CommerceError | null {
  const text = errors.map((e) => `${String(e.extensions?.code ?? '')} ${String(e.message ?? '')}`).join(' | ');
  if (/unauthenticated|unauthorized|invalid[_ ]?token|token[_ ](expired|invalid)|jwt/i.test(text)) {
    return new CommerceError('AUTH_INVALID', USER_MESSAGES.AUTH_INVALID, { provider: PROVIDER, status: 200 });
  }
  if (/forbidden|permission|not allowed|scope/i.test(text))
    return new CommerceError('SCOPE_MISSING', USER_MESSAGES.SCOPE_MISSING, { provider: PROVIDER, status: 200 });
  if (/too many|rate ?limit|throttl/i.test(text))
    return new CommerceError('RATE_LIMITED', USER_MESSAGES.RATE_LIMITED, {
      provider: PROVIDER,
      status: 200,
      retryAfterMs: 5_000,
    });
  return null;
}

async function graphql<T>(
  ctx: ConnectorContext,
  query: string,
  variables: Record<string, unknown> = {},
  attempt = 0,
): Promise<T> {
  const token = await ensureToken(ctx, attempt > 0);
  let res: Response;
  try {
    res = await fetch(IKAS_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify({ query, variables }),
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw new CommerceError('NETWORK', USER_MESSAGES.NETWORK, { provider: PROVIDER, cause: err });
  }
  if (res.status === 401 && attempt === 0) {
    // Token iptal edilmiş olabilir: bir kez zorla yenile ve tekrar dene.
    await res.body?.cancel().catch(() => undefined);
    return graphql<T>(ctx, query, variables, 1);
  }
  if (!res.ok) {
    await res.body?.cancel().catch(() => undefined);
    throw fromHttpStatus(res.status, PROVIDER, res.headers.get('retry-after'));
  }
  let json: GqlResponse<T>;
  try {
    json = JSON.parse(await readBodyCapped(res, PROVIDER)) as GqlResponse<T>;
  } catch (err) {
    if (err instanceof CommerceError) throw err;
    throw new CommerceError('UPSTREAM_ERROR', USER_MESSAGES.UPSTREAM_ERROR, { provider: PROVIDER, cause: err });
  }
  if (Array.isArray(json.errors) && json.errors.length) {
    const mapped = classifyGraphqlErrors(json.errors);
    log.warn('ikas.graphql_errors', {
      connectionId: ctx.connectionId,
      codes: json.errors.map((e) => String(e.extensions?.code ?? '')).slice(0, 5),
      messages: json.errors.slice(0, 3).map((e) => String(e.message ?? '').slice(0, 200)),
    });
    if (mapped) throw mapped;
    if (!json.data)
      throw new CommerceError('UPSTREAM_ERROR', USER_MESSAGES.UPSTREAM_ERROR, { provider: PROVIDER, status: 200 });
  }
  if (!json.data)
    throw new CommerceError('UPSTREAM_ERROR', USER_MESSAGES.UPSTREAM_ERROR, { provider: PROVIDER, status: 200 });
  return json.data;
}

// ───────────── Normalizasyon ─────────────

function effectivePrice(p: GqlPrice): number | null {
  const sell = typeof p.sellPrice === 'number' && Number.isFinite(p.sellPrice) ? p.sellPrice : null;
  const disc =
    typeof p.discountPrice === 'number' && Number.isFinite(p.discountPrice) && p.discountPrice > 0
      ? p.discountPrice
      : null;
  if (disc != null && (sell == null || disc < sell)) return disc;
  return sell;
}

export function normalizeIkasProduct(p: GqlIkasProduct, storeDomain: string): NormalizedProduct {
  const variants = Array.isArray(p.variants)
    ? p.variants.filter((v): v is GqlVariant => !!v && typeof v === 'object')
    : [];
  const active = variants.filter((v) => v.isActive !== false);
  const priced = active.length ? active : variants;
  const prices: number[] = [];
  let currency: string | null = null;
  for (const v of priced) {
    const list = Array.isArray(v.prices) ? v.prices : [];
    // Varsayılan fiyat listesi (priceListId yok) öncelikli; yoksa tüm listeler.
    const preferred = list.filter((pr) => !pr.priceListId);
    for (const pr of preferred.length ? preferred : list) {
      const n = effectivePrice(pr);
      if (n != null && n >= 0) prices.push(n);
      if (!currency)
        currency = (pr.currencyCode ?? pr.currency ?? null)?.toString().trim().toUpperCase().slice(0, 8) || null;
    }
  }
  let availability: NormalizedProduct['availability'] = 'UNKNOWN';
  if (typeof p.totalStock === 'number' && Number.isFinite(p.totalStock))
    availability = p.totalStock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';
  else if (priced.some((v) => Array.isArray(v.stocks))) {
    const sum = priced.reduce(
      (s, v) => s + (v.stocks ?? []).reduce((a, st) => a + (typeof st?.stockCount === 'number' ? st.stockCount : 0), 0),
      0,
    );
    availability = sum > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';
  }
  const first = priced[0] ?? null;
  const identifiers: NonNullable<NormalizedProduct['identifiers']> = {};
  if (first?.sku) identifiers.sku = String(first.sku).slice(0, 120);
  const barcode = first?.barcodeList?.find((b) => typeof b === 'string' && b.trim());
  if (barcode) identifiers.barcode = barcode.trim().slice(0, 64);
  if (variants.length) identifiers.variantCount = variants.length;
  const tags = (p.tags ?? [])
    .map((t) => String(t?.name ?? '').trim())
    .filter(Boolean)
    .slice(0, 25);
  const facts: Record<string, string | number | boolean> = {};
  if (tags.length) facts.tags = tags.join(', ').slice(0, 500);
  if (p.type) facts.type = String(p.type).toLowerCase().slice(0, 40);
  if (typeof p.weight === 'number' && Number.isFinite(p.weight) && p.weight > 0) facts.weight = p.weight;
  if (variants.length) facts.variantCount = variants.length;
  const slug = p.metaData?.slug?.trim() || null;
  const categories = (p.categories ?? [])
    .map((c) => String(c?.name ?? '').trim())
    .filter(Boolean)
    .slice(0, 20);
  return {
    externalId: p.id,
    handle: slug,
    url: slug ? `https://${storeDomain}/${encodeURIComponent(slug)}` : null,
    title: (p.name ?? '').trim() || slug || p.id,
    vendor: p.brand?.name?.trim() || null,
    productType: null,
    categories,
    description: stripHtml(p.description) ?? stripHtml(p.shortDescription),
    priceMin: prices.length ? Math.min(...prices) : null,
    priceMax: prices.length ? Math.max(...prices) : null,
    currency,
    availability,
    imageUrl: null, // ikas görsel CDN biçimi dokümante değil
    imageAlt: null,
    seoTitle: p.metaData?.pageTitle?.trim() || null,
    seoDescription: p.metaData?.description?.trim() || null,
    identifiers: Object.keys(identifiers).length ? identifiers : null,
    facts: Object.keys(facts).length ? facts : null,
    status: variants.length ? (active.length ? 'active' : 'inactive') : null,
    sourceUpdatedAt: null,
  };
}

// ───────────── Webhook URL anahtarı ─────────────

const CONNECTION_ID_RE = /^[a-z0-9]{10,64}$/i;

/** Bağlantıya özel URL anahtarı: HMAC-SHA256(connectionId, CONFIG_ENCRYPTION_KEY||JWT_SECRET) hex. */
export function webhookKey(connectionId: string): string {
  return createHmac('sha256', encryptionSecret()).update(connectionId).digest('hex');
}

/** Zamanlama-sabit doğrulama; biçimi bozuk girişte false. */
export function verifyWebhookKey(connectionId: unknown, key: unknown): boolean {
  if (typeof connectionId !== 'string' || typeof key !== 'string') return false;
  if (!CONNECTION_ID_RE.test(connectionId) || !/^[0-9a-f]{64}$/i.test(key)) return false;
  const expected = Buffer.from(webhookKey(connectionId), 'hex');
  const given = Buffer.from(key.toLowerCase(), 'hex');
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function webhookEndpointFor(callbackUrl: string, connectionId: string): string {
  const u = new URL(callbackUrl);
  u.searchParams.set('c', connectionId);
  u.searchParams.set('k', webhookKey(connectionId));
  return u.toString();
}

export type IkasWebhookEvent = {
  scope: string | null;
  productId: string | null;
  action: 'upsert' | 'delete';
  merchantId: string | null;
};

/**
 * Gelen webhook gövdesini toleranslı ayrıştırır (ikas payload biçimi dokümante değil: `data` JSON
 * metni veya nesne olabilir). Yalnızca ürün id'si alınır; içerik API'den yeniden çekilir.
 */
export function parseWebhookBody(raw: string): IkasWebhookEvent {
  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
  } catch {
    body = {};
  }
  const scope = typeof body.scope === 'string' ? body.scope.slice(0, 100) : null;
  let data: unknown = body.data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }
  const d = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  const candidates = [d?.id, d?.productId, body.productId, d ? undefined : body.id];
  const productId =
    candidates.find((c): c is string => typeof c === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(c)) ?? null;
  const merchantId = typeof body.merchantId === 'string' ? body.merchantId.slice(0, 80) : null;
  return { scope, productId, action: scope?.endsWith('/deleted') ? 'delete' : 'upsert', merchantId };
}

// ───────────── Bağlayıcı ─────────────

export const ikasConnector: CommerceConnector = {
  provider: PROVIDER,

  capabilities: () => ({
    products: true,
    categories: true,
    webhooks: true,
    incremental: false,
    auth: 'oauth_client_credentials',
    count: true,
    pageSize: PAGE_SIZE,
    productUrls: true,
  }),

  async verify(ctx): Promise<StoreInfo> {
    const store = requireIkasStoreDomain(ctx.storeDomain);
    // Token alımı client id/secret'ı doğrular; listProduct ürün okuma iznini doğrular.
    await ensureToken(ctx, true);
    const data = await graphql<{ listProduct?: { count?: number | null } | null }>(ctx, QUERIES.count);
    const count = typeof data.listProduct?.count === 'number' ? data.listProduct.count : null;
    let categories = true;
    try {
      await graphql<{ listCategory?: GqlCategory[] | null }>(ctx, QUERIES.categories);
    } catch (err) {
      categories = false;
      log.warn('ikas.verify_categories_failed', { connectionId: ctx.connectionId, err });
    }
    return {
      externalStoreId: null,
      displayName: store.replace(/\.myikas\.com$/, ''),
      primaryDomain: store,
      currency: null,
      capabilities: {
        webhooks: true,
        categories,
        count: true,
        productCount: count,
        webhookScopes: [...IKAS_WEBHOOK_SCOPES],
      },
    };
  },

  async listProducts(ctx, opts: ListProductsOptions): Promise<ProductPage> {
    const store = requireIkasStoreDomain(ctx.storeDomain);
    const page = Math.max(1, Number.parseInt(opts.cursor ?? '1', 10) || 1);
    const limit = Math.max(1, Math.min(opts.limit || PAGE_SIZE, PAGE_SIZE));
    const data = await graphql<{ listProduct?: GqlProductPage | null }>(ctx, QUERIES.products, { page, limit });
    const lp = data.listProduct;
    const rows = Array.isArray(lp?.data) ? lp.data.filter((p) => p && typeof p.id === 'string') : [];
    const items = rows.map((p) => normalizeIkasProduct(p, store));
    return {
      items,
      nextCursor: lp?.hasNext && rows.length ? String(page + 1) : null,
      total: typeof lp?.count === 'number' ? lp.count : null,
    };
  },

  async countProducts(ctx): Promise<number | null> {
    try {
      const data = await graphql<{ listProduct?: { count?: number | null } | null }>(ctx, QUERIES.count);
      const n = data.listProduct?.count;
      return typeof n === 'number' && n >= 0 ? n : null;
    } catch (err) {
      if (
        err instanceof CommerceError &&
        (err.code === 'AUTH_INVALID' || err.code === 'AUTH_EXPIRED' || err.code === 'SCOPE_MISSING')
      )
        throw err;
      return null;
    }
  },

  async listCategories(ctx) {
    const data = await graphql<{ listCategory?: GqlCategory[] | null }>(ctx, QUERIES.categories);
    return (data.listCategory ?? [])
      .filter((c) => c && typeof c.id === 'string')
      .map((c) => ({
        id: c.id,
        name: (c.name ?? c.id).slice(0, 200),
        parentId: c.parentId ?? null,
        path: Array.isArray(c.categoryPath) ? c.categoryPath.join('/') : null,
      }));
  },

  async getProduct(ctx, externalId): Promise<NormalizedProduct | null> {
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(externalId))
      throw new CommerceError('NOT_FOUND', USER_MESSAGES.NOT_FOUND, { provider: PROVIDER });
    const store = requireIkasStoreDomain(ctx.storeDomain);
    const data = await graphql<{ listProduct?: GqlProductPage | null }>(ctx, QUERIES.product, { id: externalId });
    const p = data.listProduct?.data?.find((x) => x && x.id === externalId) ?? null;
    return p ? normalizeIkasProduct(p, store) : null;
  },

  async registerWebhooks(ctx, callbackUrl): Promise<WebhookRegistration> {
    let base: URL;
    try {
      base = new URL(callbackUrl);
    } catch {
      throw new CommerceError('CONFIG_MISSING', 'Webhook geri çağrı adresi geçersiz', { provider: PROVIDER });
    }
    if (base.protocol !== 'https:') {
      log.warn('ikas.webhook_skip_insecure_callback', { connectionId: ctx.connectionId });
      return { registered: [], skipped: [...IKAS_WEBHOOK_SCOPES] };
    }
    const endpoint = webhookEndpointFor(callbackUrl, ctx.connectionId);
    const existing = await graphql<{ listWebhook?: GqlWebhook[] | null }>(ctx, QUERIES.webhookList);
    const have = new Set(
      (existing.listWebhook ?? []).filter((w) => w?.endpoint === endpoint).map((w) => String(w.scope ?? '')),
    );
    const missing = IKAS_WEBHOOK_SCOPES.filter((s) => !have.has(s));
    const skipped = IKAS_WEBHOOK_SCOPES.filter((s) => have.has(s));
    if (missing.length) {
      const data = await graphql<{ saveWebhook?: GqlWebhook[] | null }>(ctx, QUERIES.webhookSave, {
        input: { scopes: missing, endpoint },
      });
      const saved = new Set((data.saveWebhook ?? []).map((w) => String(w?.scope ?? '')));
      const failed = missing.filter((s) => !saved.has(s));
      if (failed.length && saved.size === 0) {
        throw new CommerceError('UPSTREAM_ERROR', `Webhook kaydı başarısız (${failed.join(', ')})`, {
          provider: PROVIDER,
        });
      }
      if (failed.length) log.warn('ikas.webhook_partial', { connectionId: ctx.connectionId, failed });
    }
    // registered = etkin olan tüm scope'lar (yeni + zaten var olan) — yeniden bağlanmada da "webhook'lu".
    return { registered: [...IKAS_WEBHOOK_SCOPES], skipped: [...skipped] };
  },
};
