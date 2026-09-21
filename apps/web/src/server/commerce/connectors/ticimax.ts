/**
 * Ticimax bağlayıcısı — SOAP 1.1 (WCF) `{serviceBase}/Servis/UrunServis.svc`, salt-okunur katalog.
 *
 * Doğrulanmış gerçekler (resmî UrunServis.pdf + mağaza WSDL'i):
 *  - Her çağrıda `UyeKodu` (yönetim panelinden alınan web servis üye kodu).
 *  - `SelectUrun(UyeKodu, f: UrunFiltre, s: UrunSayfalama)` → List<UrunKarti>;
 *    `SelectUrunCount(UyeKodu, f)` → int; `SelectKategori(UyeKodu, kategoriID)` → List<Kategori>;
 *    `SelectMarka(UyeKodu, markaID)` → List<Marka>. Filtre: Aktif/Firsat/Indirimli/Vitrin (-1 filtre
 *    yok, 0/1), KategoriID/MarkaID/UrunKartiID (0 = filtre yok). Sayfalama: BaslangicIndex,
 *    KayitSayisi, KayitSayisinaGoreGetir, SiralamaDegeri ("ID"), SiralamaYonu ("ASC").
 *  - UrunKarti: ID, UrunAdi, Aciklama (HTML), OnYazi, Marka, MarkaID, AnaKategori, Kategoriler (int[]),
 *    Resimler (URL string[]), SeoAnahtarKelime, SeoSayfaAciklama, SeoSayfaBaslik, UrunSayfaAdresi,
 *    Varyasyonlar[{ID, StokKodu, Barkod, SatisFiyati, IndirimliFiyati, ParaBirimiID, ParaBirimiKodu,
 *    StokAdedi, Aktif, Ozellikler[{Tanim, Deger}], UrunAgirligi}], ToplamStokAdedi, Aktif.
 *    Para birimi `ParaBirimiKodu` (örn. "TRY") alanından okunur; ID→kod varsayımı yapılmaz.
 *    Ürün güncelleme tarihi alanı yok (`GuncellemeTarihi` WSDL'de bulunmuyor) → sourceUpdatedAt null.
 *  - Hatalı üye kodu: HTTP 500 + Fault "Hatalı Kullanıcı Kodu" → AUTH_INVALID.
 *  - Webhook YOK → günlük cron senkron (catalog-sync enqueueDailyCatalogSyncs).
 *
 * Güvenlik: serviceBase `parsePublicUrl` ile doğrulanır ve https zorunludur (SSRF); tüm değerler XML
 * kaçışlanır; yanıt gövdesi 5 MB'ta kesilir (aşılırsa sayfa boyutu otomatik yarıya iner).
 * Veri kapsamı: yalnızca ürün + kategori + marka adı. Sipariş/üye/ödeme çağrısı YOK.
 */
import { log } from '../../logger';
import { parsePublicUrl, UnsafeUrlError } from '../../safe-fetch';
import { CommerceError, fromHttpStatus, USER_MESSAGES } from '../errors';
import {
  asArray,
  bool,
  buildEnvelope,
  extractResult,
  isAuthFault,
  num,
  parseSoapEnvelope,
  soapAction,
  SoapFault,
  str,
  type XmlValue,
} from '../soap';
import type {
  CommerceConnector,
  ConnectorContext,
  ListProductsOptions,
  NormalizedProduct,
  ProductPage,
  StoreInfo,
  TicimaxCredentials,
} from '../types';
import { stripHtml } from './shopify';
import { BodyTooLargeError, MAX_PROVIDER_BODY_BYTES, readBodyCapped, USER_AGENT } from './http';

const PROVIDER = 'TICIMAX' as const;
export const TICIMAX_PAGE_SIZE = 100;
const MIN_PAGE_SIZE = 5;
const REQUEST_TIMEOUT_MS = 30_000;
const CATEGORY_CACHE_TTL_MS = 15 * 60_000;
const CATEGORY_FAIL_TTL_MS = 5 * 60_000;
export const SERVICE_PATH = '/Servis/UrunServis.svc';

/** Şema (alfabetik) sırası korunur: DataContractSerializer üyeleri bu sırada bekler. */
const BASE_FILTER: Record<string, XmlValue> = {
  Aktif: 1,
  Firsat: -1,
  Indirimli: -1,
  KategoriID: 0,
  MarkaID: 0,
  UrunKartiID: 0,
  Vitrin: -1,
};

function paging(start: number, size: number): Record<string, XmlValue> {
  return {
    BaslangicIndex: start,
    KayitSayisi: size,
    KayitSayisinaGoreGetir: true,
    SiralamaDegeri: 'ID',
    SiralamaYonu: 'ASC',
  };
}

// ───────────── Servis adresi ─────────────

/**
 * Kullanıcının girdiği servis adresini normalize eder: https zorunlu, public host (SSRF), `/Servis/...`
 * son eki ve sorgu atılır. Örn. `https://www.magaza.com/Servis/UrunServis.svc?wsdl` → `https://www.magaza.com`.
 */
export function normalizeServiceBase(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) throw new CommerceError('INVALID_STORE', 'Servis adresi gerekli', { provider: PROVIDER });
  let u: URL;
  try {
    u = parsePublicUrl(/^[a-z]+:\/\//i.test(s) ? s : `https://${s}`);
  } catch (err) {
    throw new CommerceError(
      'INVALID_STORE',
      err instanceof UnsafeUrlError ? `Servis adresi geçersiz: ${err.message}` : USER_MESSAGES.INVALID_STORE,
      { provider: PROVIDER, cause: err },
    );
  }
  if (u.protocol !== 'https:')
    throw new CommerceError('INVALID_STORE', 'Servis adresi https:// ile başlamalı', { provider: PROVIDER });
  const path = u.pathname.replace(/\/servis(\/.*)?$/i, '').replace(/\/+$/, '');
  return `${u.origin}${path}`;
}

export function serviceEndpoint(serviceBase: string): string {
  return `${normalizeServiceBase(serviceBase)}${SERVICE_PATH}`;
}

function requireCredentials(ctx: ConnectorContext): TicimaxCredentials {
  if (ctx.credentials.kind !== 'TICIMAX')
    throw new CommerceError('AUTH_INVALID', USER_MESSAGES.AUTH_INVALID, { provider: PROVIDER });
  if (!ctx.credentials.uyeKodu)
    throw new CommerceError('AUTH_INVALID', 'Ticimax üye kodu eksik', { provider: PROVIDER });
  return ctx.credentials;
}

// ───────────── SOAP çağrısı ─────────────

async function soapCall(
  ctx: ConnectorContext,
  operation: string,
  params: Record<string, XmlValue>,
  maxBytes = MAX_PROVIDER_BODY_BYTES,
): Promise<unknown> {
  const creds = requireCredentials(ctx);
  const endpoint = serviceEndpoint(creds.serviceBase);
  const xml = buildEnvelope(operation, { UyeKodu: creds.uyeKodu, ...params });
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: `"${soapAction(operation)}"`,
        Accept: 'text/xml, application/soap+xml',
        'User-Agent': USER_AGENT,
      },
      body: xml,
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw new CommerceError('NETWORK', USER_MESSAGES.NETWORK, { provider: PROVIDER, cause: err });
  }
  if (res.status === 404) {
    await res.body?.cancel().catch(() => undefined);
    throw new CommerceError('INVALID_STORE', 'Servis adresi bulunamadı (Servis/UrunServis.svc yanıt vermedi)', {
      provider: PROVIDER,
      status: 404,
    });
  }
  if (!res.ok && res.status !== 500) {
    await res.body?.cancel().catch(() => undefined);
    throw fromHttpStatus(res.status, PROVIDER, res.headers.get('retry-after'));
  }
  const text = await readBodyCapped(res, PROVIDER, maxBytes);
  let body;
  try {
    body = parseSoapEnvelope(text);
  } catch (err) {
    if (err instanceof SoapFault) {
      if (isAuthFault(err.reason)) {
        throw new CommerceError(
          'AUTH_INVALID',
          'Ticimax üye kodu geçersiz (servis "Hatalı Kullanıcı Kodu" döndürdü).',
          { provider: PROVIDER, status: res.status, cause: err },
        );
      }
      log.warn('ticimax.soap_fault', {
        connectionId: ctx.connectionId,
        operation,
        code: err.code,
        reason: err.reason.slice(0, 200),
      });
      throw new CommerceError('UPSTREAM_ERROR', USER_MESSAGES.UPSTREAM_ERROR, {
        provider: PROVIDER,
        status: res.status,
        cause: err,
      });
    }
    throw new CommerceError('UPSTREAM_ERROR', 'Sağlayıcı yanıtı çözümlenemedi (SOAP zarfı bekleniyordu)', {
      provider: PROVIDER,
      status: res.status,
      cause: err,
    });
  }
  if (!res.ok) throw fromHttpStatus(res.status, PROVIDER);
  return extractResult(body, operation);
}

// ───────────── Ham tipler (fast-xml-parser çıktısı; değerler string) ─────────────

type RawList<T> = { [tag: string]: T[] | undefined } | string | undefined | null;
type RawOzellik = { Tanim?: unknown; Deger?: unknown };
export type RawVaryasyon = {
  ID?: unknown;
  Aktif?: unknown;
  Barkod?: unknown;
  StokKodu?: unknown;
  SatisFiyati?: unknown;
  IndirimliFiyati?: unknown;
  ParaBirimiKodu?: unknown;
  ParaBirimi?: unknown;
  StokAdedi?: unknown;
  UrunAgirligi?: unknown;
  Resimler?: RawList<string>;
  Ozellikler?: RawList<RawOzellik>;
};
export type RawUrunKarti = {
  ID?: unknown;
  Aktif?: unknown;
  UrunAdi?: unknown;
  Aciklama?: unknown;
  OnYazi?: unknown;
  Marka?: unknown;
  AnaKategori?: unknown;
  Kategoriler?: RawList<string>;
  Resimler?: RawList<string>;
  SeoAnahtarKelime?: unknown;
  SeoSayfaAciklama?: unknown;
  SeoSayfaBaslik?: unknown;
  UrunSayfaAdresi?: unknown;
  UcretsizKargo?: unknown;
  ToplamStokAdedi?: unknown;
  Varyasyonlar?: RawList<RawVaryasyon>;
};
type RawKategori = { ID?: unknown; PID?: unknown; Tanim?: unknown; Url?: unknown; Aktif?: unknown };

function list<T>(v: RawList<T> | unknown, tag: string): T[] {
  if (!v || typeof v !== 'object') return [];
  return asArray<T>((v as Record<string, unknown>)[tag]);
}

function absoluteUrl(raw: unknown, storeDomain: string): string | null {
  const s = str(raw);
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s.slice(0, 2000);
  if (s.startsWith('//')) return `https:${s}`.slice(0, 2000);
  if (s.startsWith('/')) return `https://${storeDomain}${s}`.slice(0, 2000);
  return null;
}

export type TicimaxNormalizeContext = { storeDomain: string; categoryNames: Map<string, string> | null };

/** UrunKarti → NormalizedProduct. ID yoksa null. */
export function normalizeUrunKarti(p: RawUrunKarti, ctx: TicimaxNormalizeContext): NormalizedProduct | null {
  const id = str(p.ID);
  if (!id) return null;
  const variants = list<RawVaryasyon>(p.Varyasyonlar, 'Varyasyon');
  const active = variants.filter((v) => bool(v.Aktif) !== false);
  const priced = active.length ? active : variants;
  const prices: number[] = [];
  let currency: string | null = null;
  let stockSum = 0;
  let sawStock = false;
  for (const v of priced) {
    const sell = num(v.SatisFiyati);
    const disc = num(v.IndirimliFiyati);
    const eff = disc != null && disc > 0 && (sell == null || disc < sell) ? disc : sell;
    if (eff != null && eff > 0) prices.push(eff);
    if (!currency) {
      const code = str(v.ParaBirimiKodu);
      if (code && /^[A-Za-z]{3}$/.test(code)) currency = code.toUpperCase();
    }
    const st = num(v.StokAdedi);
    if (st != null) {
      sawStock = true;
      stockSum += st;
    }
  }
  let availability: NormalizedProduct['availability'] = 'UNKNOWN';
  if (sawStock) availability = stockSum > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';
  else {
    const total = num(p.ToplamStokAdedi);
    if (total != null) availability = total > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';
  }
  const first = priced[0] ?? null;
  const identifiers: NonNullable<NormalizedProduct['identifiers']> = {};
  const sku = first ? str(first.StokKodu) : null;
  const barcode = first ? str(first.Barkod) : null;
  if (sku) identifiers.sku = sku.slice(0, 120);
  if (barcode) identifiers.barcode = barcode.slice(0, 64);
  if (variants.length) identifiers.variantCount = variants.length;

  // Kategori adları: id listesi → ad haritası; harita yoksa ana kategori adı.
  const catIds = list<string>(p.Kategoriler, 'int')
    .map((x) => str(x))
    .filter((x): x is string => !!x);
  const categories: string[] = [];
  for (const cid of catIds) {
    const name = ctx.categoryNames?.get(cid);
    if (name && !categories.includes(name)) categories.push(name);
  }
  const main = str(p.AnaKategori);
  if (main && !categories.includes(main)) categories.push(main);

  const facts: Record<string, string | number | boolean> = {};
  const options = new Map<string, Set<string>>();
  for (const v of variants) {
    for (const o of list<RawOzellik>(v.Ozellikler, 'VaryasyonOzellik')) {
      const t = str(o.Tanim);
      const d = str(o.Deger);
      if (!t || !d) continue;
      if (!options.has(t)) options.set(t, new Set());
      options.get(t)!.add(d);
    }
  }
  if (options.size) {
    facts.options = [...options.entries()]
      .map(([k, vals]) => `${k}: ${[...vals].slice(0, 12).join(', ')}`)
      .join('; ')
      .slice(0, 500);
  }
  if (bool(p.UcretsizKargo) === true) facts.freeShipping = true;
  const weight = first ? num(first.UrunAgirligi) : null;
  if (weight != null && weight > 0) facts.weight = weight;
  if (variants.length) facts.variantCount = variants.length;
  const keywords = str(p.SeoAnahtarKelime);
  if (keywords) facts.keywords = keywords.slice(0, 300);

  const image =
    absoluteUrl(list<string>(p.Resimler, 'string')[0], ctx.storeDomain) ??
    (first ? absoluteUrl(list<string>(first.Resimler, 'string')[0], ctx.storeDomain) : null);
  const url = absoluteUrl(p.UrunSayfaAdresi, ctx.storeDomain);
  const title = str(p.UrunAdi) ?? id;
  return {
    externalId: id,
    handle: null,
    url,
    title,
    vendor: str(p.Marka),
    productType: null,
    categories: categories.slice(0, 20),
    description: stripHtml(str(p.Aciklama)) ?? stripHtml(str(p.OnYazi)),
    priceMin: prices.length ? Math.min(...prices) : null,
    priceMax: prices.length ? Math.max(...prices) : null,
    currency,
    availability,
    imageUrl: image,
    imageAlt: null,
    seoTitle: str(p.SeoSayfaBaslik),
    seoDescription: str(p.SeoSayfaAciklama),
    identifiers: Object.keys(identifiers).length ? identifiers : null,
    facts: Object.keys(facts).length ? facts : null,
    status: bool(p.Aktif) === false ? 'inactive' : 'active',
    sourceUpdatedAt: null,
  };
}

// ───────────── Kategori önbelleği (süreç içi, bağlantı başına) ─────────────

type CategoryCacheEntry = { at: number; map: Map<string, string> | null };
const categoryCache = new Map<string, CategoryCacheEntry>();

function kategoriMap(result: unknown): Map<string, string> {
  const map = new Map<string, string>();
  for (const k of list<RawKategori>(result, 'Kategori')) {
    const id = str(k.ID);
    const name = str(k.Tanim);
    if (id && name) map.set(id, name.slice(0, 120));
  }
  return map;
}

function primeCategoryCache(connectionId: string, result: unknown): Map<string, string> {
  const map = kategoriMap(result);
  categoryCache.set(connectionId, { at: Date.now(), map });
  return map;
}

async function categoryNames(ctx: ConnectorContext): Promise<Map<string, string> | null> {
  const hit = categoryCache.get(ctx.connectionId);
  if (hit && Date.now() - hit.at < (hit.map ? CATEGORY_CACHE_TTL_MS : CATEGORY_FAIL_TTL_MS)) return hit.map;
  try {
    return primeCategoryCache(ctx.connectionId, await soapCall(ctx, 'SelectKategori', { kategoriID: 0 }));
  } catch (err) {
    if (err instanceof CommerceError && err.code === 'AUTH_INVALID') throw err;
    log.warn('ticimax.categories_unavailable', { connectionId: ctx.connectionId, err });
    categoryCache.set(ctx.connectionId, { at: Date.now(), map: null });
    return null;
  }
}

/** İmleç: `baslangicIndex[:kayitSayisi]` — sayfa boyutu gövde sınırına göre otomatik küçülebilir. */
export function parseTicimaxCursor(cursor: string | null | undefined, limit: number): { start: number; size: number } {
  const m = /^(\d{1,9})(?::(\d{1,4}))?$/.exec(cursor ?? '');
  const start = m ? Number(m[1]) : 0;
  const hinted = m?.[2] ? Number(m[2]) : TICIMAX_PAGE_SIZE;
  const size = Math.max(1, Math.min(limit || TICIMAX_PAGE_SIZE, TICIMAX_PAGE_SIZE, hinted));
  return { start, size };
}

function hostOf(serviceBase: string): string {
  return new URL(serviceEndpoint(serviceBase)).hostname;
}

// ───────────── Bağlayıcı ─────────────

export const ticimaxConnector: CommerceConnector = {
  provider: PROVIDER,

  capabilities: () => ({
    products: true,
    categories: true,
    webhooks: false,
    incremental: false,
    auth: 'api_key',
    count: true,
    pageSize: TICIMAX_PAGE_SIZE,
    productUrls: true,
  }),

  /**
   * Yetenek keşfi: SelectUrunCount başarılıysa kimlik geçerli; SelectKategori/SelectMarka denemeleri
   * `capabilities.discovered` içine yazılır (kategori adları/marka listesi kullanılabilir mi).
   */
  async verify(ctx): Promise<StoreInfo> {
    const creds = requireCredentials(ctx);
    const count = num(await soapCall(ctx, 'SelectUrunCount', { f: BASE_FILTER }));
    const discovered: Record<string, boolean> = { SelectUrunCount: true, SelectUrun: true };
    let categories = false;
    let brands = false;
    try {
      primeCategoryCache(ctx.connectionId, await soapCall(ctx, 'SelectKategori', { kategoriID: 0 }));
      categories = true;
    } catch (err) {
      log.warn('ticimax.discover_categories_failed', { connectionId: ctx.connectionId, err });
    }
    try {
      await soapCall(ctx, 'SelectMarka', { markaID: 0 });
      brands = true;
    } catch (err) {
      log.warn('ticimax.discover_brands_failed', { connectionId: ctx.connectionId, err });
    }
    discovered.SelectKategori = categories;
    discovered.SelectMarka = brands;
    const host = hostOf(creds.serviceBase);
    return {
      externalStoreId: null,
      displayName: host,
      primaryDomain: host,
      currency: null,
      capabilities: {
        categories,
        count: true,
        webhooks: false,
        productUrls: true,
        brands,
        discovered,
        productCount: count,
      },
    };
  },

  async listProducts(ctx, opts: ListProductsOptions): Promise<ProductPage> {
    const { start, size } = parseTicimaxCursor(opts.cursor, opts.limit);
    let pageSize = size;
    const names = await categoryNames(ctx);
    const normCtx: TicimaxNormalizeContext = { storeDomain: ctx.storeDomain, categoryNames: names };
    for (;;) {
      try {
        const result = await soapCall(ctx, 'SelectUrun', { f: BASE_FILTER, s: paging(start, pageSize) });
        const raws = list<RawUrunKarti>(result, 'UrunKarti');
        const items = raws.map((r) => normalizeUrunKarti(r, normCtx)).filter((x): x is NormalizedProduct => !!x);
        const nextCursor = raws.length < pageSize ? null : `${start + raws.length}:${pageSize}`;
        return { items, nextCursor };
      } catch (err) {
        if (err instanceof BodyTooLargeError && pageSize > MIN_PAGE_SIZE) {
          pageSize = Math.max(MIN_PAGE_SIZE, Math.floor(pageSize / 2));
          log.warn('ticimax.page_too_large', { connectionId: ctx.connectionId, start, nextPageSize: pageSize });
          continue;
        }
        throw err;
      }
    }
  },

  async countProducts(ctx): Promise<number | null> {
    try {
      const n = num(await soapCall(ctx, 'SelectUrunCount', { f: BASE_FILTER }));
      return n != null && n >= 0 ? Math.floor(n) : null;
    } catch (err) {
      if (err instanceof CommerceError && (err.code === 'AUTH_INVALID' || err.code === 'INVALID_STORE')) throw err;
      return null;
    }
  },

  async listCategories(ctx) {
    const result = await soapCall(ctx, 'SelectKategori', { kategoriID: 0 });
    primeCategoryCache(ctx.connectionId, result);
    return list<RawKategori>(result, 'Kategori')
      .map((k) => {
        const id = str(k.ID);
        if (!id) return null;
        const pid = num(k.PID);
        return {
          id,
          name: (str(k.Tanim) ?? id).slice(0, 200),
          parentId: pid != null && pid > 0 ? String(pid) : null,
          path: str(k.Url),
        };
      })
      .filter((x): x is { id: string; name: string; parentId: string | null; path: string | null } => !!x);
  },
};
