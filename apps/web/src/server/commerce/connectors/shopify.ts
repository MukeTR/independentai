/**
 * Shopify bağlayıcısı — GraphQL Admin API (varsayılan sürüm 2026-07), salt-okunur katalog.
 *
 *  - Kimlik: OAuth authorization code grant ile alınan çevrimdışı token (shopify-oauth.ts). Süreli
 *    token (expiring offline) varsa süresi dolmadan refresh_token ile yenilenir ve geri yazılır.
 *  - Uç: https://{shop}/admin/api/{version}/graphql.json, `X-Shopify-Access-Token` başlığı. Host,
 *    her çağrıda resmî `*.myshopify.com` deseniyle doğrulanır (SSRF: rastgele host'a istek yok).
 *  - Sayfalama: `products(first, after, sortKey: UPDATED_AT, query)` imleçli; artımlı senkron
 *    `updated_at:>` filtresiyle. Sayfa boyutu 50: Shopify tek sorgu maliyet tavanı 1000 puandır,
 *    ürün başına ~12 nesne (fiyat aralığı, medya, SEO, varyant bağlantısı) → 50 × 12 ≈ 600 puan.
 *  - Kota: HTTP 429 veya `errors[].extensions.code === 'THROTTLED'` → RATE_LIMITED (retryAfterMs
 *    throttleStatus'tan hesaplanır). Kova düşükse sonraki sayfadan önce kısa proaktif bekleme.
 *  - Veri kapsamı: yalnızca ürün + koleksiyon + mağaza meta. Sipariş/müşteri/ödeme sorgusu YOK.
 */
import { log } from '../../logger';
import { CommerceError, fromHttpStatus, USER_MESSAGES } from '../errors';
import { apiVersion, isValidShopDomain, refreshAccessToken } from '../shopify-oauth';
import type {
  CommerceConnector,
  ConnectorContext,
  ListProductsOptions,
  NormalizedProduct,
  ProductPage,
  ShopifyCredentials,
  StoreInfo,
  WebhookRegistration,
} from '../types';

const PROVIDER = 'SHOPIFY' as const;
const PAGE_SIZE = 50;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_PROACTIVE_WAIT_MS = 15_000;
const TOKEN_REFRESH_SKEW_MS = 2 * 60_000;
const MAX_DESCRIPTION_CHARS = 10_000;

export const WEBHOOK_TOPICS = ['PRODUCTS_CREATE', 'PRODUCTS_UPDATE', 'PRODUCTS_DELETE', 'APP_UNINSTALLED'] as const;
export type ShopifyWebhookTopic = (typeof WEBHOOK_TOPICS)[number];

// ───────────── GraphQL tipleri (yalnızca kullandığımız alanlar) ─────────────

type Money = { amount?: string | null; currencyCode?: string | null };
type GqlProduct = {
  id: string;
  handle?: string | null;
  title?: string | null;
  vendor?: string | null;
  productType?: string | null;
  tags?: string[] | null;
  status?: string | null;
  updatedAt?: string | null;
  onlineStoreUrl?: string | null;
  descriptionHtml?: string | null;
  priceRangeV2?: { minVariantPrice?: Money | null; maxVariantPrice?: Money | null } | null;
  totalInventory?: number | null;
  tracksInventory?: boolean | null;
  featuredMedia?: { preview?: { image?: { url?: string | null; altText?: string | null } | null } | null } | null;
  seo?: { title?: string | null; description?: string | null } | null;
  variantsCount?: { count?: number | null } | null;
  variants?: { nodes?: { sku?: string | null; barcode?: string | null }[] | null } | null;
};
type GqlShop = {
  id?: string;
  name?: string | null;
  myshopifyDomain?: string | null;
  primaryDomain?: { host?: string | null } | null;
  currencyCode?: string | null;
};
type GqlError = { message?: string; extensions?: { code?: string; [k: string]: unknown } };
type GqlResponse<T> = {
  data?: T | null;
  errors?: GqlError[];
  extensions?: {
    cost?: {
      requestedQueryCost?: number;
      actualQueryCost?: number;
      throttleStatus?: { maximumAvailable?: number; currentlyAvailable?: number; restoreRate?: number };
    };
  };
};

const PRODUCT_FIELDS = `
  id handle title vendor productType tags status updatedAt onlineStoreUrl
  descriptionHtml
  priceRangeV2 { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
  totalInventory tracksInventory
  featuredMedia { preview { image { url altText } } }
  seo { title description }
  variantsCount { count }
  variants(first: 1) { nodes { sku barcode } }
`;

const SHOP_FIELDS = `shop { id name myshopifyDomain primaryDomain { host } currencyCode }`;

const QUERIES = {
  verify: `query IaiVerify { ${SHOP_FIELDS} currentAppInstallation { accessScopes { handle } } }`,
  products: `query IaiProducts($first: Int!, $after: String, $query: String) {
    ${SHOP_FIELDS}
    products(first: $first, after: $after, query: $query, sortKey: UPDATED_AT) {
      pageInfo { hasNextPage endCursor }
      nodes { ${PRODUCT_FIELDS} }
    }
  }`,
  product: `query IaiProduct($id: ID!) { ${SHOP_FIELDS} product(id: $id) { ${PRODUCT_FIELDS} } }`,
  count: `query IaiProductsCount { productsCount { count precision } }`,
  collections: `query IaiCollections { collections(first: 100) { nodes { id title handle } } }`,
  webhookList: `query IaiWebhooks($topics: [WebhookSubscriptionTopic!]) {
    webhookSubscriptions(first: 50, topics: $topics) { nodes { id topic uri } }
  }`,
  webhookCreate: `mutation IaiWebhookCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
      webhookSubscription { id topic uri }
      userErrors { field message }
    }
  }`,
} as const;

// ───────────── Kimlik bilgisi + HTTP ─────────────

function requireShopifyCredentials(ctx: ConnectorContext): ShopifyCredentials {
  if (ctx.credentials.kind !== 'SHOPIFY')
    throw new CommerceError('AUTH_INVALID', USER_MESSAGES.AUTH_INVALID, { provider: PROVIDER });
  return ctx.credentials;
}

/** Süreli token: süresi dolmak üzereyse yenile ve geri yaz; yenilenemiyorsa AUTH_EXPIRED. */
async function ensureFreshToken(ctx: ConnectorContext): Promise<ShopifyCredentials> {
  const creds = requireShopifyCredentials(ctx);
  if (!creds.expiresAt) return creds;
  const expiresAt = Date.parse(creds.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt - Date.now() > TOKEN_REFRESH_SKEW_MS) return creds;
  if (!creds.refreshToken) throw new CommerceError('AUTH_EXPIRED', USER_MESSAGES.AUTH_EXPIRED, { provider: PROVIDER });
  const fresh = await refreshAccessToken(ctx.storeDomain, creds.refreshToken);
  fresh.scope = fresh.scope ?? creds.scope;
  ctx.credentials = fresh;
  await ctx.persistCredentials(fresh);
  return fresh;
}

function throttleRetryMs(ext: GqlResponse<unknown>['extensions'], fallbackMs = 5_000): number {
  const cost = ext?.cost;
  const need = cost?.requestedQueryCost ?? 0;
  const have = cost?.throttleStatus?.currentlyAvailable ?? 0;
  const rate = cost?.throttleStatus?.restoreRate ?? 0;
  if (need > 0 && rate > 0 && need > have) return Math.min(60_000, Math.ceil(((need - have) / rate) * 1000) + 250);
  return fallbackMs;
}

async function graphql<T>(ctx: ConnectorContext, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const shop = ctx.storeDomain;
  if (!isValidShopDomain(shop))
    throw new CommerceError('INVALID_STORE', USER_MESSAGES.INVALID_STORE, { provider: PROVIDER });
  const creds = await ensureFreshToken(ctx);
  let res: Response;
  try {
    res = await fetch(`https://${shop}/admin/api/${apiVersion()}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Shopify-Access-Token': creds.accessToken,
        'User-Agent': 'IndependentAI-Commerce/1.0 (+https://independentai.space)',
      },
      body: JSON.stringify({ query, variables }),
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw new CommerceError('NETWORK', USER_MESSAGES.NETWORK, { provider: PROVIDER, cause: err });
  }
  if (res.status === 429) throw fromHttpStatus(429, PROVIDER, res.headers.get('retry-after'));
  if (!res.ok) throw fromHttpStatus(res.status, PROVIDER, res.headers.get('retry-after'));
  let json: GqlResponse<T>;
  try {
    json = (await res.json()) as GqlResponse<T>;
  } catch (err) {
    throw new CommerceError('UPSTREAM_ERROR', USER_MESSAGES.UPSTREAM_ERROR, { provider: PROVIDER, cause: err });
  }
  if (Array.isArray(json.errors) && json.errors.length) {
    const codes = json.errors.map((e) => String(e.extensions?.code ?? '').toUpperCase());
    if (codes.includes('THROTTLED')) {
      throw new CommerceError('RATE_LIMITED', USER_MESSAGES.RATE_LIMITED, {
        provider: PROVIDER,
        status: 200,
        retryAfterMs: throttleRetryMs(json.extensions),
      });
    }
    if (codes.includes('ACCESS_DENIED'))
      throw new CommerceError('SCOPE_MISSING', USER_MESSAGES.SCOPE_MISSING, { provider: PROVIDER, status: 200 });
    if (codes.includes('MAX_COST_EXCEEDED')) {
      log.error('shopify.query_cost_exceeded', { connectionId: ctx.connectionId, cost: json.extensions?.cost });
    }
    log.warn('shopify.graphql_errors', {
      connectionId: ctx.connectionId,
      codes,
      messages: json.errors.slice(0, 3).map((e) => String(e.message ?? '').slice(0, 200)),
    });
    if (!json.data)
      throw new CommerceError('UPSTREAM_ERROR', USER_MESSAGES.UPSTREAM_ERROR, { provider: PROVIDER, status: 200 });
  }
  if (!json.data)
    throw new CommerceError('UPSTREAM_ERROR', USER_MESSAGES.UPSTREAM_ERROR, { provider: PROVIDER, status: 200 });
  // Proaktif kota koruması: kova bir sonraki sayfayı karşılamıyorsa kısa bekle (RATE_LIMITED turu yerine).
  const cost = json.extensions?.cost;
  if (
    cost?.throttleStatus &&
    cost.requestedQueryCost &&
    cost.throttleStatus.currentlyAvailable != null &&
    cost.throttleStatus.restoreRate
  ) {
    const deficit = cost.requestedQueryCost - cost.throttleStatus.currentlyAvailable;
    if (deficit > 0) {
      const waitMs = Math.min(MAX_PROACTIVE_WAIT_MS, Math.ceil((deficit / cost.throttleStatus.restoreRate) * 1000));
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  return json.data;
}

// ───────────── Normalizasyon ─────────────

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** HTML → düz metin: etiketler atılır, temel varlıklar çözülür, boşluk sıkıştırılır. */
export function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr|blockquote|section|article)>/gi, '\n')
    .replace(/<\/(td|th|dt|dd)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, ent: string) => {
      if (ent[0] === '#') {
        const code = ent[1]?.toLowerCase() === 'x' ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[ent.toLowerCase()] ?? m;
    })
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
  if (!text) return null;
  return text.length > MAX_DESCRIPTION_CHARS ? `${text.slice(0, MAX_DESCRIPTION_CHARS)}…` : text;
}

function money(m: Money | null | undefined): number | null {
  const n = Number(m?.amount);
  return Number.isFinite(n) ? n : null;
}

function productUrl(p: GqlProduct, primaryHost: string | null): string | null {
  if (p.onlineStoreUrl) return p.onlineStoreUrl;
  if (primaryHost && p.handle) return `https://${primaryHost}/products/${encodeURIComponent(p.handle)}`;
  return null;
}

export function normalizeProduct(p: GqlProduct, primaryHost: string | null): NormalizedProduct {
  const min = money(p.priceRangeV2?.minVariantPrice);
  const max = money(p.priceRangeV2?.maxVariantPrice);
  const currency =
    p.priceRangeV2?.minVariantPrice?.currencyCode ?? p.priceRangeV2?.maxVariantPrice?.currencyCode ?? null;
  let availability: NormalizedProduct['availability'] = 'UNKNOWN';
  if (p.tracksInventory === false) availability = 'IN_STOCK';
  else if (typeof p.totalInventory === 'number') availability = p.totalInventory > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';
  const firstVariant = p.variants?.nodes?.[0] ?? null;
  const variantCount = p.variantsCount?.count ?? undefined;
  const identifiers: NonNullable<NormalizedProduct['identifiers']> = {};
  if (firstVariant?.sku) identifiers.sku = String(firstVariant.sku).slice(0, 120);
  if (firstVariant?.barcode) identifiers.barcode = String(firstVariant.barcode).slice(0, 64);
  if (typeof variantCount === 'number') identifiers.variantCount = variantCount;
  const tags = Array.isArray(p.tags)
    ? p.tags.filter((t): t is string => typeof t === 'string' && !!t.trim()).slice(0, 25)
    : [];
  const facts: Record<string, string | number | boolean> = {};
  if (tags.length) facts.tags = tags.join(', ').slice(0, 500);
  if (typeof variantCount === 'number') facts.variantCount = variantCount;
  if (typeof p.tracksInventory === 'boolean') facts.tracksInventory = p.tracksInventory;
  const updated = p.updatedAt ? new Date(p.updatedAt) : null;
  return {
    externalId: p.id,
    handle: p.handle ?? null,
    url: productUrl(p, primaryHost),
    title: (p.title ?? '').trim() || p.handle || p.id,
    vendor: p.vendor?.trim() || null,
    productType: p.productType?.trim() || null,
    categories: [],
    description: stripHtml(p.descriptionHtml),
    priceMin: min,
    priceMax: max ?? min,
    currency,
    availability,
    imageUrl: p.featuredMedia?.preview?.image?.url ?? null,
    imageAlt: p.featuredMedia?.preview?.image?.altText ?? null,
    seoTitle: p.seo?.title?.trim() || null,
    seoDescription: p.seo?.description?.trim() || null,
    identifiers: Object.keys(identifiers).length ? identifiers : null,
    facts: Object.keys(facts).length ? facts : null,
    status: p.status ? p.status.toLowerCase() : null,
    sourceUpdatedAt: updated && !Number.isNaN(updated.getTime()) ? updated : null,
  };
}

function primaryHostOf(shop: GqlShop | null | undefined): string | null {
  const host = shop?.primaryDomain?.host?.trim().toLowerCase();
  return host && /^[a-z0-9.-]+$/.test(host) ? host : (shop?.myshopifyDomain ?? null);
}

/** Artımlı senkron filtresi (Shopify arama sözdizimi). */
export function updatedSinceQuery(since: Date | null | undefined): string | null {
  if (!since || Number.isNaN(since.getTime())) return null;
  return `updated_at:>'${since.toISOString()}'`;
}

// ───────────── Bağlayıcı ─────────────

export const shopifyConnector: CommerceConnector = {
  provider: PROVIDER,

  capabilities: () => ({
    products: true,
    categories: false,
    webhooks: true,
    incremental: true,
    auth: 'oauth_authorization_code',
    count: true,
    pageSize: PAGE_SIZE,
    productUrls: true,
  }),

  async verify(ctx): Promise<StoreInfo> {
    const data = await graphql<{
      shop?: GqlShop | null;
      currentAppInstallation?: { accessScopes?: { handle?: string }[] | null } | null;
    }>(ctx, QUERIES.verify);
    const shop = data.shop;
    if (!shop?.id) throw new CommerceError('UPSTREAM_ERROR', USER_MESSAGES.UPSTREAM_ERROR, { provider: PROVIDER });
    const scopes = (data.currentAppInstallation?.accessScopes ?? []).map((s) => String(s.handle ?? '')).filter(Boolean);
    const canReadProducts =
      scopes.length === 0 ? true : scopes.some((s) => s === 'read_products' || s === 'write_products');
    if (!canReadProducts) throw new CommerceError('SCOPE_MISSING', USER_MESSAGES.SCOPE_MISSING, { provider: PROVIDER });
    if (shop.myshopifyDomain && shop.myshopifyDomain.toLowerCase() !== ctx.storeDomain.toLowerCase()) {
      log.warn('shopify.domain_mismatch', {
        connectionId: ctx.connectionId,
        expected: ctx.storeDomain,
        actual: shop.myshopifyDomain,
      });
    }
    return {
      externalStoreId: shop.id,
      displayName: shop.name ?? null,
      primaryDomain: primaryHostOf(shop),
      currency: shop.currencyCode ?? null,
      capabilities: { webhooks: true, scopes },
    };
  },

  async listProducts(ctx, opts: ListProductsOptions): Promise<ProductPage> {
    const first = Math.max(1, Math.min(opts.limit || PAGE_SIZE, PAGE_SIZE));
    const data = await graphql<{
      shop?: GqlShop | null;
      products?: { pageInfo?: { hasNextPage?: boolean; endCursor?: string | null }; nodes?: GqlProduct[] } | null;
    }>(ctx, QUERIES.products, {
      first,
      after: opts.cursor || null,
      query: updatedSinceQuery(opts.updatedSince),
    });
    const host = primaryHostOf(data.shop);
    const nodes = data.products?.nodes ?? [];
    const items = nodes.filter((n) => n && typeof n.id === 'string').map((n) => normalizeProduct(n, host));
    const hasNext = !!data.products?.pageInfo?.hasNextPage && !!data.products?.pageInfo?.endCursor;
    return { items, nextCursor: hasNext ? String(data.products!.pageInfo!.endCursor) : null };
  },

  async countProducts(ctx): Promise<number | null> {
    try {
      const data = await graphql<{ productsCount?: { count?: number | null } | null }>(ctx, QUERIES.count);
      const n = data.productsCount?.count;
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
    const data = await graphql<{
      collections?: { nodes?: { id: string; title?: string | null; handle?: string | null }[] } | null;
    }>(ctx, QUERIES.collections);
    return (data.collections?.nodes ?? [])
      .filter((c) => c && c.id)
      .map((c) => ({
        id: c.id,
        name: (c.title ?? c.handle ?? c.id).slice(0, 200),
        parentId: null,
        path: c.handle ?? null,
      }));
  },

  async getProduct(ctx, externalId): Promise<NormalizedProduct | null> {
    if (!/^gid:\/\/shopify\/Product\/\d+$/.test(externalId))
      throw new CommerceError('NOT_FOUND', USER_MESSAGES.NOT_FOUND, { provider: PROVIDER });
    const data = await graphql<{ shop?: GqlShop | null; product?: GqlProduct | null }>(ctx, QUERIES.product, {
      id: externalId,
    });
    if (!data.product?.id) return null;
    return normalizeProduct(data.product, primaryHostOf(data.shop));
  },

  async registerWebhooks(ctx, callbackUrl): Promise<WebhookRegistration> {
    let uri: URL;
    try {
      uri = new URL(callbackUrl);
    } catch {
      throw new CommerceError('CONFIG_MISSING', 'Webhook geri çağrı adresi geçersiz', { provider: PROVIDER });
    }
    if (uri.protocol !== 'https:') {
      // Shopify yalnızca https uçları kabul eder (yerel geliştirme: tünel kullanın).
      log.warn('shopify.webhook_skip_insecure_callback', { connectionId: ctx.connectionId });
      return { registered: [], skipped: [...WEBHOOK_TOPICS] };
    }
    const existing = await graphql<{
      webhookSubscriptions?: { nodes?: { id: string; topic?: string; uri?: string | null }[] } | null;
    }>(ctx, QUERIES.webhookList, { topics: [...WEBHOOK_TOPICS] });
    const have = new Set(
      (existing.webhookSubscriptions?.nodes ?? []).filter((n) => n.uri === callbackUrl).map((n) => String(n.topic)),
    );
    const registered: string[] = [];
    const skipped: string[] = [];
    for (const topic of WEBHOOK_TOPICS) {
      if (have.has(topic)) {
        skipped.push(topic);
        continue;
      }
      const data = await graphql<{
        webhookSubscriptionCreate?: {
          webhookSubscription?: { id: string } | null;
          userErrors?: { field?: string[] | null; message?: string }[];
        } | null;
      }>(ctx, QUERIES.webhookCreate, {
        topic,
        webhookSubscription: { uri: callbackUrl },
      });
      const errs = data.webhookSubscriptionCreate?.userErrors ?? [];
      if (errs.length || !data.webhookSubscriptionCreate?.webhookSubscription?.id) {
        log.warn('shopify.webhook_create_failed', {
          connectionId: ctx.connectionId,
          topic,
          errors: errs.slice(0, 3).map((e) => String(e.message ?? '').slice(0, 200)),
        });
        throw new CommerceError('UPSTREAM_ERROR', `Webhook kaydı başarısız (${topic})`, { provider: PROVIDER });
      }
      registered.push(topic);
    }
    // `registered` = şu an etkin olan tüm konular (yeni + zaten var olan); `skipped` = bu turda atlananlar.
    // Yeniden bağlanmada hepsi atlanmış olsa da bağlantı "webhook'lu" sayılmalıdır.
    return { registered: [...registered, ...skipped], skipped };
  },
};
