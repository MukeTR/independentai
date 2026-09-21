/**
 * Sitemap ayrıştırma ve toplama (W2 — robots-sitemap-kontrol, hreflang-kontrol, kırık link).
 *
 *  - `parseSitemapXml(text)` SAF ve doğrusaldır (html-analysis `tagBodies`/`openTags`): `<urlset>` girişleri
 *    (loc, lastmod, `xhtml:link` alternatifleri) ya da `<sitemapindex>` alt sitemap adresleri. Metin ilk
 *    SITEMAP_MAX_BYTES (10 MB) ile sınırlanır (`truncated:true`); URL sayısı SITEMAP_MAX_URLS (50 000) ile kesilir.
 *  - Sıkıştırılmış sitemap (`.gz` uzantı ya da gzip content-type): gövde OKUNMAZ (safe-fetch izinsiz content-type'ta
 *    `text:''` döner, MF-1) → `gzip:true`; araç "sıkıştırılmış sitemap desteklenmiyor" uyarısı verir.
 *  - `collectSitemap(origin, budget, {robots})`: robots'ta bildirilen aynı host sitemap'i, yoksa /sitemap.xml;
 *    `<sitemapindex>` ise en çok `maxChildren` (3) alt sitemap çekilir; hepsi ScanBudget üzerinden (SSRF-güvenli).
 */
import type { Artifact } from '../commerce/scoring';
import { decodeEntities, openTags, sameHost, tagBodies, type ParsedRobots } from '../commerce/html-analysis';
import type { ScanBudget } from './budget';
import { SCAN_HEADERS } from './fetch-page';

export const SITEMAP_MAX_BYTES = 10 * 1024 * 1024;
export const SITEMAP_MAX_URLS = 50_000;
export const SITEMAP_MAX_CHILDREN = 3;

export type SitemapAlternate = { hreflang: string; href: string };
export type SitemapEntry = { loc: string; lastmod: string | null; alternates: SitemapAlternate[] };
export type SitemapKind = 'urlset' | 'sitemapindex' | 'invalid';

export type ParsedSitemap = {
  kind: SitemapKind;
  entries: SitemapEntry[];
  /** sitemapindex: alt sitemap adresleri (tamamı; çekilen sayısı çağıranda) */
  children: string[];
  /** Metin 10 MB'ta ya da URL sayısı 50 000'de kesildi (veya artifact zaten kesikti) */
  truncated: boolean;
  /** Geçersizlik nedeni (Türkçe, kullanıcıya gösterilebilir) */
  reason: string | null;
  lastmodCount: number;
};

function unwrapText(s: string): string {
  return decodeEntities(
    s
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]*>/g, '')
      .trim(),
  );
}

function firstBody(xml: string, name: string): string | null {
  const b = tagBodies(xml, name, { limit: 1 })[0];
  return b ? unwrapText(b.body) : null;
}

function attr(attrs: string, name: string): string | null {
  const m = attrs.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return m?.[1] != null ? decodeEntities(m[1]).trim() : null;
}

/** Bir `<url>` gövdesindeki `xhtml:link rel="alternate" hreflang href` girişleri. */
export function parseXhtmlAlternates(body: string): SitemapAlternate[] {
  const out: SitemapAlternate[] = [];
  for (const t of openTags(body, 'xhtml:link')) {
    const rel = attr(t.attrs, 'rel');
    if (rel && rel.toLowerCase() !== 'alternate') continue;
    const hreflang = attr(t.attrs, 'hreflang');
    const href = attr(t.attrs, 'href');
    if (!hreflang || !href) continue;
    out.push({ hreflang, href });
  }
  return out;
}

/**
 * SAF sitemap ayrıştırma. `opts` yalnız testte sınır düşürmek için (varsayılan 10 MB / 50 000 URL).
 */
export function parseSitemapXml(
  raw: string,
  opts: { maxBytes?: number; maxUrls?: number; alreadyTruncated?: boolean } = {},
): ParsedSitemap {
  const maxBytes = opts.maxBytes ?? SITEMAP_MAX_BYTES;
  const maxUrls = opts.maxUrls ?? SITEMAP_MAX_URLS;
  let truncated = opts.alreadyTruncated ?? false;
  let text = raw;
  if (text.length > maxBytes) {
    text = text.slice(0, maxBytes);
    truncated = true;
  }
  const empty = (reason: string): ParsedSitemap => ({
    kind: 'invalid',
    entries: [],
    children: [],
    truncated,
    reason,
    lastmodCount: 0,
  });
  const head = text.slice(0, 4096).trimStart();
  if (!head) return empty('Sitemap boş.');
  if (/^<!doctype html|^<html/i.test(head) || (/<html[\s>]/i.test(head) && !/<(urlset|sitemapindex)\b/i.test(head)))
    return empty('Sitemap yerine HTML sayfası döndü (404/yönlendirme sayfası olabilir).');
  const isIndex = /<sitemapindex\b/i.test(text.slice(0, 200_000));
  const isUrlset = /<urlset\b/i.test(text.slice(0, 200_000));
  if (!isIndex && !isUrlset) return empty('Geçerli bir <urlset> ya da <sitemapindex> kökü bulunamadı.');

  if (isIndex && !isUrlset) {
    const children: string[] = [];
    for (const sm of tagBodies(text, 'sitemap')) {
      const loc = firstBody(sm.body, 'loc');
      if (loc && /^https?:\/\//i.test(loc)) children.push(loc);
      if (children.length >= maxUrls) {
        truncated = true;
        break;
      }
    }
    if (!children.length) return empty('<sitemapindex> içinde <sitemap><loc> girişi yok.');
    return { kind: 'sitemapindex', entries: [], children, truncated, reason: null, lastmodCount: 0 };
  }

  const entries: SitemapEntry[] = [];
  let lastmodCount = 0;
  for (const u of tagBodies(text, 'url')) {
    const loc = firstBody(u.body, 'loc');
    if (!loc || !/^https?:\/\//i.test(loc)) continue;
    const lastmod = firstBody(u.body, 'lastmod');
    if (lastmod) lastmodCount += 1;
    entries.push({ loc, lastmod: lastmod || null, alternates: parseXhtmlAlternates(u.body) });
    if (entries.length >= maxUrls) {
      truncated = true;
      break;
    }
  }
  if (!entries.length) return empty('<urlset> içinde geçerli <url><loc> girişi yok.');
  return { kind: 'urlset', entries, children: [], truncated, reason: null, lastmodCount };
}

/** `.gz` uzantı ya da gzip/octet-stream content-type ve gövde yok → sıkıştırılmış (gövde okunmaz). */
export function isGzipSitemap(url: string, artifact: Pick<Artifact, 'headers' | 'text'> | null): boolean {
  if (!artifact) return false;
  if (artifact.text.trim()) return false;
  const ct = (artifact.headers.get('content-type') ?? '').toLowerCase();
  if (/gzip|x-gzip|octet-stream/.test(ct)) return true;
  return /\.gz(\?|$)/i.test(url);
}

export type SitemapChild = { url: string; artifact: Artifact; parsed: ParsedSitemap | null; gzip: boolean };

export type SitemapCollection = {
  /** Denenen sitemap adresi (robots'taki ya da /sitemap.xml) */
  url: string;
  source: 'robots' | 'default';
  root: Artifact | null;
  parsed: ParsedSitemap | null;
  gzip: boolean;
  children: SitemapChild[];
  /** Index'te bildirilip çekilmeyen alt sitemap sayısı (maxChildren ya da bütçe) */
  childrenSkipped: number;
  /** Tüm çekilen urlset'lerin birleşik girişleri */
  entries: SitemapEntry[];
  /** Birleşik lastmod sayısı */
  lastmodCount: number;
  truncated: boolean;
};

function parseOrNull(url: string, a: Artifact): { parsed: ParsedSitemap | null; gzip: boolean } {
  const gzip = isGzipSitemap(url, a);
  if (gzip) return { parsed: null, gzip: true };
  if (!a.ok || !a.text) return { parsed: null, gzip: false };
  return { parsed: parseSitemapXml(a.text, { alreadyTruncated: a.truncated }), gzip: false };
}

/**
 * Sitemap'i (ve sitemapindex ise ≤maxChildren alt sitemap'i) bütçe üzerinden çeker. robots'ta aynı host için
 * bildirilen ilk Sitemap satırı öncelikli; yoksa `${origin}/sitemap.xml`. Bütçe dolunca kalanlar `childrenSkipped`.
 */
export async function collectSitemap(
  origin: string,
  budget: ScanBudget,
  opts: { robots?: ParsedRobots | null; maxChildren?: number; timeoutMs?: number; headers?: Record<string, string> } = {},
): Promise<SitemapCollection> {
  const maxChildren = opts.maxChildren ?? SITEMAP_MAX_CHILDREN;
  const timeout = opts.timeoutMs ?? 6_000;
  const init = { headers: { ...SCAN_HEADERS, ...(opts.headers ?? {}) } };
  const declared = (opts.robots?.sitemaps ?? []).find((sm) => /^https?:\/\//i.test(sm) && sameHost(sm, origin));
  const url = declared ?? `${origin}/sitemap.xml`;
  const source: SitemapCollection['source'] = declared ? 'robots' : 'default';
  const root = await budget.fetch(url, timeout, init);
  const { parsed, gzip } = parseOrNull(url, root);
  const children: SitemapChild[] = [];
  let childrenSkipped = 0;
  if (parsed?.kind === 'sitemapindex') {
    const wanted = parsed.children.slice(0, maxChildren);
    childrenSkipped = parsed.children.length - wanted.length;
    const results = await Promise.all(
      wanted.map(async (cu) => {
        if (!sameHost(cu, origin)) return null;
        const a = await budget.fetch(cu, timeout, init);
        if (a.error === 'budget') {
          childrenSkipped += 1;
          return null;
        }
        const p = parseOrNull(cu, a);
        return { url: cu, artifact: a, parsed: p.parsed, gzip: p.gzip } satisfies SitemapChild;
      }),
    );
    for (const r of results) if (r) children.push(r);
  }
  const entries: SitemapEntry[] = [];
  let lastmodCount = 0;
  let truncated = parsed?.truncated ?? false;
  if (parsed?.kind === 'urlset') {
    entries.push(...parsed.entries);
    lastmodCount += parsed.lastmodCount;
  }
  for (const c of children) {
    if (c.parsed?.kind === 'urlset') {
      entries.push(...c.parsed.entries);
      lastmodCount += c.parsed.lastmodCount;
      truncated = truncated || c.parsed.truncated;
    }
  }
  return {
    url,
    source,
    root: root.error === 'budget' ? null : root,
    parsed,
    gzip,
    children,
    childrenSkipped,
    entries: entries.slice(0, SITEMAP_MAX_URLS),
    lastmodCount,
    truncated: truncated || entries.length > SITEMAP_MAX_URLS,
  };
}

/** URL karşılaştırma anahtarı: küçük harf host (www'siz), sondaki / atılır, hash yok. */
export function urlKey(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = '';
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const path = u.pathname.length > 1 ? u.pathname.replace(/\/+$/, '') : '';
    return `${host}${path}${u.search}`;
  } catch {
    return raw.trim().toLowerCase();
  }
}

/** Sitemap girişleri içinde bu sayfayı bul (www / sondaki slash toleranslı). */
export function findSitemapEntry(entries: SitemapEntry[], url: string): SitemapEntry | null {
  const key = urlKey(url);
  return entries.find((e) => urlKey(e.loc) === key) ?? null;
}

/** Örneklem: ilk n/2 + son n/2 (tekrarsız). */
export function sampleEntries(entries: SitemapEntry[], n = 10): SitemapEntry[] {
  if (entries.length <= n) return entries;
  const half = Math.floor(n / 2);
  const head = entries.slice(0, half);
  const tail = entries.slice(-(n - half));
  const seen = new Set<string>();
  const out: SitemapEntry[] = [];
  for (const e of [...head, ...tail]) {
    if (seen.has(e.loc)) continue;
    seen.add(e.loc);
    out.push(e);
  }
  return out;
}
