/**
 * Commerce bağlayıcı sözleşmesi (v1: SALT-OKUNUR katalog).
 *
 * Kapsam: ürün + kategori + mağaza meta. Sipariş/müşteri/ödeme verisi ASLA çekilmez.
 * Her bağlayıcı bu arayüzü uygular; senkron motoru (catalog-sync.ts) yalnızca bu tipleri bilir.
 */
import type { CommerceProvider, Availability } from '@independentai/db';
export type { CommerceProvider, Availability };

export type ConnectorCapabilities = {
  /** Ürün listeleme (zorunlu) */
  products: true;
  categories: boolean;
  /** Sağlayıcı webhook desteği (yoksa periyodik senkron) */
  webhooks: boolean;
  /** updatedSince ile artımlı çekim */
  incremental: boolean;
  /** Kimlik doğrulama modeli */
  auth: 'oauth_authorization_code' | 'oauth_client_credentials' | 'api_key';
  /** Toplam ürün sayısı önceden bilinir mi (ilerleme çubuğu için) */
  count: boolean;
  /** Sağlayıcı dokümantasyonuna göre sayfa başına güvenli üst sınır */
  pageSize: number;
  /** Ürün URL'si oluşturulabiliyor mu (handle/slug) */
  productUrls: boolean;
};

/** Şifreli saklanan kimlik bilgileri (provider'a göre). Client'a ASLA dönmez. */
export type ShopifyCredentials = {
  kind: 'SHOPIFY';
  accessToken: string;
  refreshToken?: string;
  /** Süreli token ise (expiring offline token) */
  expiresAt?: string;
  scope?: string;
};
export type IkasCredentials = {
  kind: 'IKAS';
  clientId: string;
  clientSecret: string;
  /** client_credentials ile alınan kısa ömürlü token (4 saat) */
  accessToken?: string;
  accessTokenExpiresAt?: string;
};
export type TicimaxCredentials = {
  kind: 'TICIMAX';
  /** SOAP servis kökü, örn. https://magaza.com (Servis/UrunServis.svc eklenir) */
  serviceBase: string;
  uyeKodu: string;
};
export type Credentials = ShopifyCredentials | IkasCredentials | TicimaxCredentials;

export type NormalizedProduct = {
  externalId: string;
  handle?: string | null;
  url?: string | null;
  title: string;
  vendor?: string | null;
  productType?: string | null;
  categories: string[];
  description?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  currency?: string | null;
  availability: Availability;
  imageUrl?: string | null;
  imageAlt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  /** sku/barcode/gtin/mpn — varsa */
  identifiers?: { sku?: string; barcode?: string; gtin?: string; mpn?: string; variantCount?: number } | null;
  /** Doğrulanabilir ek gerçekler: ağırlık, malzeme, garanti vb. (yalnızca kaynakta açıkça varsa) */
  facts?: Record<string, string | number | boolean> | null;
  status?: string | null;
  sourceUpdatedAt?: Date | null;
};

export type ProductPage = {
  items: NormalizedProduct[];
  /** Sonraki sayfa imleci (sağlayıcıya özel, opak); null = bitti */
  nextCursor: string | null;
  /** Bilinen toplam (opsiyonel) */
  total?: number | null;
};

export type StoreInfo = {
  externalStoreId?: string | null;
  displayName?: string | null;
  primaryDomain?: string | null;
  currency?: string | null;
  /** Bağlantıyı test ederken tespit edilen sağlayıcı yetenekleri (webhook izni vb.) */
  capabilities?: Partial<ConnectorCapabilities> & Record<string, unknown>;
};

export type ConnectorContext = {
  connectionId: string;
  tenantId: string;
  provider: CommerceProvider;
  storeDomain: string;
  externalStoreId?: string | null;
  credentials: Credentials;
  /** Senkron motoru kimlik bilgisi yenilenirse geri yazar (ikas token, Shopify refresh) */
  persistCredentials: (c: Credentials) => Promise<void>;
  /** Log/ölçüm için istek kimliği */
  requestId?: string;
};

export type ListProductsOptions = {
  cursor: string | null;
  limit: number;
  /** Artımlı senkron (capabilities.incremental) */
  updatedSince?: Date | null;
};

export type WebhookRegistration = {
  registered: string[];
  skipped?: string[];
};

export interface CommerceConnector {
  readonly provider: CommerceProvider;
  capabilities(): ConnectorCapabilities;
  /** Kimlik bilgileri geçerli mi + mağaza meta (ilk bağlantı ve "yeniden doğrula") */
  verify(ctx: ConnectorContext): Promise<StoreInfo>;
  listProducts(ctx: ConnectorContext, opts: ListProductsOptions): Promise<ProductPage>;
  countProducts?(ctx: ConnectorContext): Promise<number | null>;
  listCategories?(
    ctx: ConnectorContext,
  ): Promise<{ id: string; name: string; parentId?: string | null; path?: string | null }[]>;
  registerWebhooks?(ctx: ConnectorContext, callbackUrl: string): Promise<WebhookRegistration>;
  /** Tek ürün (webhook sonrası hedefli yenileme) */
  getProduct?(ctx: ConnectorContext, externalId: string): Promise<NormalizedProduct | null>;
}

/** Store domain temizleme: küçük harf, şema/yol yok, izin verilen karakterler */
export function normalizeStoreDomain(raw: unknown): string {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
  if (!/^[a-z0-9][a-z0-9.-]{1,120}\.[a-z]{2,}$/.test(s)) throw new Error('Geçersiz mağaza adresi');
  return s;
}
