/**
 * Sayfa artefaktı — site araçlarının ortak girdisi. Tek sayfayı (isteğe bağlı robots/sitemap/llms ile) ScanBudget
 * üzerinden çeker ve SAF `parsePage` ile yapılandırılmış alanlara ayırır (title, meta, OG/Twitter, JSON-LD, başlıklar,
 * linkler, canonical, robots meta, lang, viewport, charset, WAF izi).
 *  - UA: `YanitBot/1.0 (+SITE_URL/bot)` + `Accept-Language: tr-TR` — safe-fetch varsayılanı değişmez, init.headers ile geçer.
 *  - Charset: Content-Type → <meta charset> → http-equiv; ISO-8859-9 / windows-1254 ⇒ `legacyCharset:true`.
 *    Gövde YENİDEN ÇÖZÜMLENMEZ (safe-fetch UTF-8 çözer, MF-2); araçlar metin uzunluğu kontrollerini warn'a düşürür.
 *  - WAF: 403/503/429 + Cloudflare/challenge imzası ⇒ `waf:true` (araç skor yerine "taranamadı" hükmü verir).
 *  - html-analysis.ts yardımcıları yeniden kullanılır (kopya yok).
 *  - Düşmanca HTML (Brifing §D.4): meta/link ayrıştırıcıları DOĞRUSALDIR (html-analysis `openTags`/`tagBodies`:
 *    indexOf + memo, öznitelik listesi sınırlı) ve ilk PARSE_LIMIT karakterle sınırlıdır; tek istek gövdesi
 *    MAX_BODY_BYTES'ı (budget.ts) aşamaz. 2 MB kapanmamış `<a>`/`<meta` yığını ms'lerde biter (fetch-page.test.ts).
 */
import { siteUrl } from '../env';
import {
  canonicalOf,
  decodeEntities,
  extractJsonLd,
  headings,
  hostnameOf,
  htmlToText,
  metaRobots,
  openTags,
  originOf,
  parseRobots,
  sameHost,
  titleOf,
  type JsonLdNode,
} from '../commerce/html-analysis';
import type { Artifact, ArtifactInit } from '../commerce/scoring';
import { ScanBudget, type HeadResult } from './budget';

export const SCAN_UA = `YanitBot/1.0 (+${siteUrl()}/bot)`;
export const SCAN_HEADERS: Record<string, string> = {
  'User-Agent': SCAN_UA,
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.5',
};

export type PageLink = {
  url: string;
  text: string;
  /** Aynı host (www farkı yok sayılır) */
  internal: boolean;
  rel: string | null;
};

export type PageArtifact = {
  page: Artifact;
  robots?: Artifact | null;
  sitemap?: Artifact | null;
  llms?: Artifact | null;
  /** İstenen (normalize) URL */
  url: string;
  origin: string;
  hostname: string;
  finalUrl: string;
  /** Sayfa yolu (+ sorgu) — robots kural çözümü için */
  path: string;
  html: string;
  charset: string | null;
  legacyCharset: boolean;
  waf: boolean;
  /** Sayfa çekildi ve gövde var (ok + html) */
  reachable: boolean;
  title: string | null;
  /** name/property → content (ilk kazanır, küçük harf anahtar) */
  metaTags: Record<string, string>;
  /** og:* (önek atılmış) */
  og: Record<string, string>;
  /** twitter:* (önek atılmış) */
  twitter: Record<string, string>;
  jsonLd: JsonLdNode[];
  headings: { h1: string[]; h2: string[]; h3: string[] };
  links: PageLink[];
  canonical: string | null;
  robotsMeta: string | null;
  xRobotsTag: string | null;
  lang: string | null;
  viewport: boolean;
  /** Görünür metin (kısaltılmış: ilk 200 000 karakter) */
  text: string;
  sizeBytes: number;
  latencyMs: number;
  redirects: Artifact['redirects'];
  fetchedAt: string;
};

export type CollectOptions = {
  robots?: boolean;
  sitemap?: boolean;
  llms?: boolean;
  /** Sayfa isteği zaman aşımı (ms), varsayılan 12 000 */
  pageTimeoutMs?: number;
  /** Ek başlıklar (SCAN_HEADERS üstüne) */
  headers?: Record<string, string>;
};

/** Bağlantı metni penceresi (karakter) — `</a>` bu pencerede yoksa metin kesilir. */
export const LINK_TEXT_MAX = 2000;
/** Meta/link ayrıştırıcılarının baktığı en fazla karakter. */
export const PARSE_LIMIT = 400_000;

const LEGACY_CHARSET_RE = /iso-?8859-?9|windows-?1254|cp-?1254|latin-?5/i;
const WAF_HTML_RE =
  /cf-browser-verification|challenge-platform|cf_chl_|just a moment|attention required|checking your browser|cloudflare|ddos-guard|incapsula|_incapsula_resource|sucuri|imperva|access denied|bot protection|are you a robot|enable javascript and cookies to continue/i;

/** Content-Type → <meta charset> → http-equiv sırası; bulunamazsa null. */
export function detectCharset(contentType: string | null, html: string): { charset: string | null; legacy: boolean } {
  let cs: string | null = null;
  const ct = contentType?.match(/charset\s*=\s*["']?([A-Za-z0-9._-]+)/i)?.[1];
  if (ct) cs = ct;
  if (!cs) {
    const head = html.slice(0, 4096);
    const m1 = head.match(/<meta\s+[^>]*charset\s*=\s*["']?\s*([A-Za-z0-9._-]+)/i)?.[1];
    if (m1) cs = m1;
  }
  const charset = cs ? cs.toLowerCase() : null;
  return { charset, legacy: !!charset && LEGACY_CHARSET_RE.test(charset) };
}

/** 403/503/429 + Cloudflare/challenge imzası (başlık veya gövde) ⇒ bot koruması. */
export function detectWaf(status: number, headers: Headers, html: string): boolean {
  const mitigated = (headers.get('cf-mitigated') ?? '').toLowerCase();
  if (mitigated === 'challenge') return true;
  if (status !== 403 && status !== 503 && status !== 429) return false;
  const server = (headers.get('server') ?? '').toLowerCase();
  if (
    server.includes('cloudflare') ||
    headers.has('cf-ray') ||
    server.includes('ddos-guard') ||
    server.includes('imperva')
  )
    return true;
  return WAF_HTML_RE.test(html.slice(0, 20_000));
}

/** Tüm <meta> etiketleri: name|property → content (ilk kazanır; anahtar küçük harf). İlk PARSE_LIMIT karakter. */
export function parseMetaTags(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const head = html.length > PARSE_LIMIT ? html.slice(0, PARSE_LIMIT) : html;
  for (const { attrs } of openTags(head, 'meta')) {
    const key = attrs
      .match(/(?:^|\s)(?:name|property)\s*=\s*["']([^"']+)["']/i)?.[1]
      ?.trim()
      .toLowerCase();
    if (!key) continue;
    const content = attrs.match(/(?:^|\s)content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (content == null) continue;
    if (!(key in out)) out[key] = decodeEntities(content).trim();
  }
  return out;
}

function prefixed(meta: Record<string, string>, prefix: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(meta)) if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v;
  return out;
}

/**
 * <a href> bağlantıları (metin + rel); aynı host filtresi YOK, `internal` bayrağı verilir. En fazla 1 000;
 * ilk PARSE_LIMIT karakter. Bağlantı metni `</a>`'ya kadar, en çok LINK_TEXT_MAX karakter (yalnız tekil URL'ler
 * için hesaplanır); kapanışı olmayan/iç içe anchor'lar da href verir.
 */
export function collectPageLinks(html: string, baseUrl: string, max = 1000): PageLink[] {
  const out: PageLink[] = [];
  const seen = new Set<string>();
  const head = html.length > PARSE_LIMIT ? html.slice(0, PARSE_LIMIT) : html;
  const closeRe = /<\/a>/gi;
  let closeAt = -1;
  for (const { attrs, end } of openTags(head, 'a')) {
    if (out.length >= max) break;
    const href = attrs.match(/(?:^|\s)href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const raw = decodeEntities(href).trim();
    if (!raw || raw.startsWith('#') || /^(mailto:|tel:|javascript:|data:|sms:|whatsapp:)/i.test(raw)) continue;
    let u: URL;
    try {
      u = new URL(raw, baseUrl);
    } catch {
      continue;
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
    u.hash = '';
    const key = u.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    const rel =
      attrs
        .match(/(?:^|\s)rel\s*=\s*["']([^"']+)["']/i)?.[1]
        ?.trim()
        .toLowerCase() ?? null;
    if (closeAt < end) {
      closeRe.lastIndex = end;
      closeAt = closeRe.exec(head)?.index ?? Number.POSITIVE_INFINITY;
    }
    const text = htmlToText(head.slice(end, Math.min(closeAt, end + LINK_TEXT_MAX))).slice(0, 120);
    out.push({ url: key, text, internal: sameHost(key, baseUrl), rel });
  }
  return out;
}

function langOf(html: string): string | null {
  const tag = openTags(html.slice(0, PARSE_LIMIT), 'html')[0];
  if (!tag) return null;
  return tag.attrs.match(/\slang\s*=\s*["']?\s*([A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*)/i)?.[1]?.trim() ?? null;
}

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return '/';
  }
}

/**
 * SAF ayrıştırma: ağ yok. Testler fixture Artifact'ı ile doğrudan çağırır.
 * `url` istenen (normalize) adres; `page.url` yönlendirme sonrası son adrestir.
 */
export function parsePage(
  url: string,
  page: Artifact,
  extras: { robots?: Artifact | null; sitemap?: Artifact | null; llms?: Artifact | null; fetchedAt?: string } = {},
): PageArtifact {
  const html = page.text ?? '';
  const finalUrl = page.url || url;
  const { charset, legacy } = detectCharset(page.headers.get('content-type'), html);
  const waf = detectWaf(page.status, page.headers, html);
  const reachable = page.ok && html.length > 0 && !waf;
  const metaTags = reachable || html.length > 0 ? parseMetaTags(html) : {};
  const text = html ? htmlToText(html.slice(0, 600_000)).slice(0, 200_000) : '';
  return {
    page,
    robots: extras.robots ?? null,
    sitemap: extras.sitemap ?? null,
    llms: extras.llms ?? null,
    url,
    origin: originOf(finalUrl) || originOf(url),
    hostname: hostnameOf(finalUrl) || hostnameOf(url),
    finalUrl,
    path: pathOf(finalUrl),
    html,
    charset,
    legacyCharset: legacy,
    waf,
    reachable,
    title: html ? titleOf(html) : null,
    metaTags,
    og: prefixed(metaTags, 'og:'),
    twitter: prefixed(metaTags, 'twitter:'),
    jsonLd: html ? extractJsonLd(html) : [],
    headings: html
      ? { h1: headings(html, 1), h2: headings(html, 2), h3: headings(html, 3) }
      : { h1: [], h2: [], h3: [] },
    links: html ? collectPageLinks(html, finalUrl) : [],
    canonical: html ? canonicalOf(html) : null,
    robotsMeta: html ? metaRobots(html) : null,
    xRobotsTag: page.headers.get('x-robots-tag'),
    lang: html ? langOf(html) : null,
    viewport: openTags(html.slice(0, PARSE_LIMIT), 'meta').some((t) =>
      /(?:^|\s)name\s*=\s*["']viewport["']/i.test(t.attrs),
    ),
    text,
    sizeBytes: Buffer.byteLength(html, 'utf8'),
    latencyMs: page.latencyMs,
    redirects: page.redirects ?? [],
    fetchedAt: extras.fetchedAt ?? new Date().toISOString(),
  };
}

function scanInit(extra?: Record<string, string>): ArtifactInit {
  return { headers: { ...SCAN_HEADERS, ...(extra ?? {}) } };
}

/**
 * Sayfayı (ve isteğe bağlı robots.txt / sitemap.xml / llms.txt) bütçe üzerinden çeker; hepsi paralel.
 * robots'ta bildirilen farklı bir sitemap varsa ve /sitemap.xml geçerli değilse onu dener (bütçe izin verirse).
 */
export async function collectPageArtifact(
  url: string,
  budget: ScanBudget,
  opts: CollectOptions = {},
): Promise<PageArtifact> {
  const fetchedAt = new Date().toISOString();
  const origin = originOf(url);
  const init = scanInit(opts.headers);
  const [page, robots, llms, sitemap] = await Promise.all([
    budget.fetch(url, opts.pageTimeoutMs ?? 12_000, init),
    opts.robots && origin ? budget.fetch(`${origin}/robots.txt`, 6_000, init) : Promise.resolve(null),
    opts.llms && origin ? budget.fetch(`${origin}/llms.txt`, 5_000, init) : Promise.resolve(null),
    opts.sitemap && origin ? budget.fetch(`${origin}/sitemap.xml`, 6_000, init) : Promise.resolve(null),
  ]);
  let finalSitemap = sitemap;
  if (opts.sitemap && robots?.ok && !(sitemap?.ok && /<(urlset|sitemapindex)\b/i.test(sitemap.text))) {
    const declared = parseRobots(robots.text).sitemaps.find((sm) => sameHost(sm, url));
    if (declared && declared !== `${origin}/sitemap.xml` && !budget.exhausted) {
      const r = await budget.fetch(declared, 5_000, init);
      if (r.ok) finalSitemap = r;
    }
  }
  return parsePage(url, page, { robots, sitemap: finalSitemap, llms, fetchedAt });
}

/**
 * Yalnız başlık (HEAD) — görsel / .gz sitemap gibi gövdesi okunmayan kaynaklar için.
 * Bütçe verilmezse tek istekli geçici bütçe kullanılır (yine SSRF-güvenli yol).
 */
export function headResource(url: string, ms: number, budget?: ScanBudget): Promise<HeadResult> {
  const b = budget ?? new ScanBudget({ maxRequests: 1, maxBytes: 1024, deadlineAt: Date.now() + ms + 1000 });
  return b.head(url, ms, scanInit());
}
