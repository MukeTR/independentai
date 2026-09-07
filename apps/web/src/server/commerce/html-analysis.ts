/**
 * HTML/robots analiz yardımcıları — commerce denetimlerinin (mağaza, ürün sayfası, crawler) ortak,
 * SAF ve deterministik parçaları. Ağ erişimi yok, LLM yok; yalnızca regex/JSON tabanlı çıkarım.
 *
 * Sınırlama: JS render edilmez. İstemci tarafında üretilen içerik (SPA) görülmez; bu durum
 * `jsDependencyHint` ile kullanıcıya dürüstçe bildirilir.
 */

export type JsonLdNode = Record<string, unknown>;

/** `<script type="application/ld+json">` bloklarını parse eder; @graph ve dizileri düzleştirir. */
export function extractJsonLd(html: string): JsonLdNode[] {
  const out: JsonLdNode[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = (m[1] ?? '').trim();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // HTML yorumu / CDATA sarmalı gibi yaygın kirleri temizleyip bir kez daha dene
      try {
        parsed = JSON.parse(raw.replace(/^<!--|-->$/g, '').replace(/^\/\/<!\[CDATA\[|\/\/\]\]>$/g, ''));
      } catch {
        continue;
      }
    }
    flattenNode(parsed, out);
  }
  return out;
}

function flattenNode(node: unknown, out: JsonLdNode[]) {
  if (Array.isArray(node)) {
    for (const n of node) flattenNode(n, out);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const obj = node as JsonLdNode;
  if (Array.isArray(obj['@graph'])) {
    for (const n of obj['@graph'] as unknown[]) flattenNode(n, out);
    // @graph taşıyan kök nesnenin kendisi de bir tip taşıyabilir
    if (obj['@type']) out.push(obj);
    return;
  }
  out.push(obj);
}

/** @type eşleşmesi (string veya dizi; büyük/küçük harf duyarsız; schema.org URL öneki toleranslı). */
export function hasType(node: JsonLdNode, type: string): boolean {
  const t = node['@type'];
  const want = type.toLowerCase();
  const norm = (v: unknown) =>
    String(v ?? '')
      .toLowerCase()
      .replace(/^https?:\/\/schema\.org\//, '');
  if (Array.isArray(t)) return t.some((x) => norm(x) === want);
  return norm(t) === want;
}

export function nodesOfType(nodes: JsonLdNode[], type: string): JsonLdNode[] {
  return nodes.filter((n) => hasType(n, type));
}

/** İç içe nesnelerde de arar (örn. WebPage.mainEntity → Product). Derinlik sınırlı. */
export function findNested(nodes: JsonLdNode[], type: string, depth = 3): JsonLdNode[] {
  const found: JsonLdNode[] = [];
  const walk = (n: unknown, d: number) => {
    if (d < 0 || !n || typeof n !== 'object') return;
    if (Array.isArray(n)) {
      for (const x of n) walk(x, d);
      return;
    }
    const obj = n as JsonLdNode;
    if (hasType(obj, type)) found.push(obj);
    for (const v of Object.values(obj)) if (v && typeof v === 'object') walk(v, d - 1);
  };
  walk(nodes, depth);
  return found;
}

export function str(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return str(v[0]);
  if (typeof v === 'object') {
    const o = v as JsonLdNode;
    return str(o.name ?? o['@id'] ?? o.url ?? o.contentUrl ?? '');
  }
  return '';
}

/** Ürün JSON-LD'sinin alan doğruluğu (yalnızca varlık/biçim; gerçeklik kontrolü yok). */
export type ProductSchemaCheck = {
  present: boolean;
  name: boolean;
  description: boolean;
  image: boolean;
  brand: boolean;
  sku: boolean;
  gtin: boolean;
  offers: boolean;
  price: boolean;
  priceCurrency: boolean;
  availability: boolean;
  offerUrl: boolean;
  aggregateRating: boolean;
  review: boolean;
  /** Bulunan Product düğümü (ilk) */
  node: JsonLdNode | null;
};

export function checkProductSchema(nodes: JsonLdNode[]): ProductSchemaCheck {
  const products = findNested(nodes, 'Product');
  const p = products[0] ?? null;
  const empty: ProductSchemaCheck = {
    present: false,
    name: false,
    description: false,
    image: false,
    brand: false,
    sku: false,
    gtin: false,
    offers: false,
    price: false,
    priceCurrency: false,
    availability: false,
    offerUrl: false,
    aggregateRating: false,
    review: false,
    node: null,
  };
  if (!p) return empty;
  const offersRaw = p.offers;
  const offers: JsonLdNode[] = Array.isArray(offersRaw)
    ? (offersRaw.filter((o) => o && typeof o === 'object') as JsonLdNode[])
    : offersRaw && typeof offersRaw === 'object'
      ? [offersRaw as JsonLdNode]
      : [];
  // AggregateOffer: lowPrice/highPrice de fiyat sayılır
  const price = offers.some((o) => str(o.price) !== '' || str(o.lowPrice) !== '');
  const currency = offers.some((o) => /^[A-Z]{3}$/.test(str(o.priceCurrency)));
  const availability = offers.some((o) =>
    /InStock|OutOfStock|PreOrder|BackOrder|Discontinued|LimitedAvailability|SoldOut/i.test(str(o.availability)),
  );
  const offerUrl = offers.some((o) => str(o.url) !== '');
  const gtin = ['gtin', 'gtin8', 'gtin12', 'gtin13', 'gtin14', 'isbn', 'mpn'].some((k) => str(p[k]) !== '');
  return {
    present: true,
    name: str(p.name).length >= 2,
    description: str(p.description).length >= 20,
    image: str(p.image) !== '',
    brand: str(p.brand) !== '',
    sku: str(p.sku) !== '',
    gtin,
    offers: offers.length > 0,
    price,
    priceCurrency: currency,
    availability,
    offerUrl,
    aggregateRating: !!p.aggregateRating && typeof p.aggregateRating === 'object',
    review: !!p.review,
    node: p,
  };
}

// ───────────── HTML meta çıkarımı ─────────────

/** `<meta name|property="X" content="...">` — öznitelik sırası bağımsız. */
export function metaContent(html: string, name: string): string | null {
  const re = new RegExp(`<meta\\s+[^>]*?(?:name|property)=["']${escapeRe(name)}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  if (!tag) return null;
  const c = tag.match(/content=["']([^"']*)["']/i)?.[1];
  return c != null ? decodeEntities(c).trim() : null;
}

export function titleOf(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m
    ? decodeEntities(m[1] ?? '')
        .replace(/\s+/g, ' ')
        .trim() || null
    : null;
}

export function headings(html: string, level: 1 | 2 | 3): string[] {
  const re = new RegExp(`<h${level}[^>]*>([\\s\\S]*?)<\\/h${level}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(htmlToText(m[1] ?? ''));
  return out;
}

export function canonicalOf(html: string): string | null {
  const tag = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*>/i)?.[0];
  if (!tag) return null;
  return tag.match(/href=["']([^"']+)["']/i)?.[1]?.trim() ?? null;
}

export function hreflangCount(html: string): number {
  return (html.match(/<link\s+[^>]*rel=["']alternate["'][^>]*hreflang=/gi) || []).length;
}

export function metaRobots(html: string): string | null {
  return metaContent(html, 'robots') ?? metaContent(html, 'googlebot');
}

export function hasViewport(html: string): boolean {
  return /<meta\s+[^>]*name=["']viewport["']/i.test(html);
}

/** Sayfa gövdesini düz metne indirger (script/style/noscript/template atılır). */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<template[\s\S]*?<\/template>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

export function wordCount(text: string): number {
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

/** Metin/HTML oranı (0-1). Düşük oran = JS'e bağımlı veya şişkin HTML. */
export function textRatio(html: string): number {
  if (!html.length) return 0;
  return Math.min(1, htmlToText(html).length / html.length);
}

/**
 * JS'e bağımlılık ipucu: çok az görünür metin + SPA kökü/JS-şart uyarısı.
 * Kesin hüküm değildir; "render edilmemiş içerik olabilir" uyarısı üretir.
 */
export function jsDependencyHint(html: string): boolean {
  const words = wordCount(htmlToText(html));
  const spaRoot = /id=["'](__next|root|app|__nuxt|___gatsby)["']/i.test(html);
  const jsWarning = /enable javascript|javascript.{0,40}(gerekli|etkinleştir|required|disabled)/i.test(html);
  return words < 120 && (spaRoot || jsWarning || html.length > 30_000);
}

/** Bağlantı toplama: göreli yolları mutlaklaştırır, aynı host'a filtreler. */
export function collectLinks(html: string, baseUrl: string): string[] {
  const out = new Set<string>();
  const re = /<a\s+[^>]*href=["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  let base: URL | null = null;
  try {
    base = new URL(baseUrl);
  } catch {
    base = null;
  }
  while ((m = re.exec(html))) {
    const href = decodeEntities(m[1] ?? '').trim();
    if (!href || /^(mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    try {
      const u = base ? new URL(href, base) : new URL(href);
      if (base && u.hostname.replace(/^www\./, '') !== base.hostname.replace(/^www\./, '')) continue;
      u.hash = '';
      out.add(u.toString());
    } catch {
      /* geçersiz href */
    }
    if (out.size >= 2000) break;
  }
  return [...out];
}

const PRODUCT_PATH =
  /\/(products?|urun|urunler|product-page|p|item|items|dp)\/[^/?]+|\/[^/?]+-p-\d+|\/[^/?]+_p\d+|[?&](product_id|urun_id|productId)=/i;
const COLLECTION_PATH =
  /\/(collections?|kategori|kategoriler|category|categories|c|k|product-category|urun-kategori)\/[^/?]+/i;

export function classifyLinks(links: string[]): { products: string[]; collections: string[] } {
  const products: string[] = [];
  const collections: string[] = [];
  for (const l of links) {
    let path = l;
    try {
      const u = new URL(l);
      path = u.pathname + u.search;
    } catch {
      /* ham */
    }
    if (PRODUCT_PATH.test(path)) products.push(l);
    else if (COLLECTION_PATH.test(path)) collections.push(l);
  }
  return { products, collections };
}

export function isProductLikeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return PRODUCT_PATH.test(u.pathname + u.search);
  } catch {
    return PRODUCT_PATH.test(url);
  }
}

// ───────────── İçerik kalitesi sezgileri ─────────────

const BOILERPLATE_TAG = /<(nav|header|footer|aside)\b[\s\S]*?<\/\1>/gi;
const BOILERPLATE_CLASS =
  /<(div|section|ul)\s+[^>]*(?:class|id)=["'][^"']*(?:nav|menu|footer|header|cookie|breadcrumb|sidebar|newsletter|mega-menu)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi;

/**
 * Boilerplate oranı (0-1): nav/header/footer/aside + menü/çerez/bülten bloklarındaki metnin
 * toplam metne oranı. Yüksek oran = sayfaya özgü içerik az. Kaba ama deterministik.
 */
export function boilerplateRatio(html: string): number {
  const total = htmlToText(html).length;
  if (total === 0) return 0;
  let bp = 0;
  for (const re of [BOILERPLATE_TAG, BOILERPLATE_CLASS]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) bp += htmlToText(m[0]).length;
  }
  return Math.min(1, bp / total);
}

/** Tekrarlanan cümle oranı: aynı cümlenin (normalize) 2+ kez geçme payı. */
export function duplicateSentenceRatio(text: string): number {
  const sentences = text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.toLowerCase().replace(/\s+/g, ' ').trim())
    .filter((s) => s.length >= 25);
  if (sentences.length < 4) return 0;
  const seen = new Map<string, number>();
  for (const s of sentences) seen.set(s, (seen.get(s) ?? 0) + 1);
  let dup = 0;
  for (const c of seen.values()) if (c > 1) dup += c - 1;
  return dup / sentences.length;
}

/** Ana içerik bölgesi (main/article/#content/#product) — yoksa body. */
export function mainContent(html: string): string {
  const m =
    html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ??
    html.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ??
    html.match(
      /<(div|section)\s+[^>]*(?:id|class)=["'][^"']*(?:product|content|main)[^"']*["'][^>]*>[\s\S]*<\/\1>/i,
    )?.[0];
  return m ?? html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html;
}

export function listItemCount(html: string): number {
  return (html.match(/<li[\s>]/gi) || []).length;
}

export function tableRowCount(html: string): number {
  return (html.match(/<tr[\s>]/gi) || []).length + (html.match(/<dt[\s>]/gi) || []).length;
}

export function questionHeadingCount(html: string): number {
  return (html.match(/<h[2-4][^>]*>[^<]*\?[^<]*<\/h[2-4]>/gi) || []).length;
}

export function imageAltStats(html: string): { total: number; withAlt: number } {
  const imgs = html.match(/<img\s+[^>]*>/gi) || [];
  let withAlt = 0;
  for (const tag of imgs) {
    const alt = tag.match(/\balt=["']([^"']*)["']/i)?.[1];
    if (alt && alt.trim().length >= 3) withAlt += 1;
  }
  return { total: imgs.length, withAlt };
}

/** İki başlık arasında kelime örtüşmesi (Jaccard, Türkçe katlama). */
export function tokenOverlap(a: string, b: string): number {
  const tok = (s: string) =>
    new Set(
      s
        .toLocaleLowerCase('tr')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3),
    );
  const A = tok(a);
  const B = tok(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter += 1;
  return inter / (A.size + B.size - inter);
}

// ───────────── robots.txt (RFC 9309) ─────────────

export type RobotsRule = { type: 'allow' | 'disallow'; path: string };
export type RobotsGroup = { agents: string[]; rules: RobotsRule[] };
export type ParsedRobots = { groups: RobotsGroup[]; sitemaps: string[]; raw: string };

export function parseRobots(text: string): ParsedRobots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (key === 'sitemap') {
      if (value) sitemaps.push(value);
      continue;
    }
    if ((key === 'allow' || key === 'disallow') && current) {
      current.rules.push({ type: key, path: value });
    }
  }
  return { groups, sitemaps, raw: text };
}

function pathMatches(pattern: string, path: string): boolean {
  if (pattern === '') return false; // boş Disallow = kural yok
  let re = '^';
  for (const ch of pattern) {
    if (ch === '*') re += '.*';
    else if (ch === '$') re += '$';
    else re += ch.replace(/[.+?^${}()|[\]\\/]/g, '\\$&');
  }
  return new RegExp(re, 'i').test(path);
}

export type BotAccess = {
  allowed: boolean;
  /** Eşleşen user-agent grubu ('*' veya bot adı); null = robots'ta hiç grup yok */
  matchedAgent: string | null;
  /** Kararı veren kural satırı (yoksa null = varsayılan izin) */
  rule: string | null;
  /** Bot için ADINA yazılmış özel bir grup var mı */
  explicit: boolean;
};

/**
 * Bot → erişim kararı. Grup seçimi: bot adının en uzun eşleşen user-agent tokenı; yoksa '*'.
 * Kural seçimi: en uzun eşleşen yol; eşitlikte Allow kazanır.
 */
export function resolveBotAccess(robots: ParsedRobots, bot: string, path = '/'): BotAccess {
  const b = bot.toLowerCase();
  let best: RobotsGroup | null = null;
  let bestLen = -1;
  for (const g of robots.groups) {
    for (const a of g.agents) {
      if (a === '*') continue;
      // token eşleşmesi: "gptbot" ↔ "gptbot/1.0" gibi; ürün adı önek olarak yeter
      if ((b.startsWith(a) || a.startsWith(b)) && a.length > bestLen) {
        best = g;
        bestLen = a.length;
      }
    }
  }
  const explicit = best !== null;
  if (!best) best = robots.groups.find((g) => g.agents.includes('*')) ?? null;
  if (!best) return { allowed: true, matchedAgent: null, rule: null, explicit: false };
  let winner: RobotsRule | null = null;
  for (const r of best.rules) {
    if (!pathMatches(r.path, path)) continue;
    if (!winner || r.path.length > winner.path.length || (r.path.length === winner.path.length && r.type === 'allow')) {
      winner = r;
    }
  }
  return {
    allowed: winner ? winner.type === 'allow' : true,
    matchedAgent: explicit
      ? (best.agents.find((a) => b.startsWith(a) || a.startsWith(b)) ?? best.agents[0] ?? null)
      : '*',
    rule: winner ? `${winner.type === 'allow' ? 'Allow' : 'Disallow'}: ${winner.path}` : null,
    explicit,
  };
}

/** İzlenen AI crawler'lar — sahip ve amaç, UI'da gösterilir. */
export const AI_BOTS: { name: string; owner: string; purpose: string; kind: 'ai' | 'search' }[] = [
  { name: 'GPTBot', owner: 'OpenAI', purpose: 'Model eğitimi', kind: 'ai' },
  { name: 'OAI-SearchBot', owner: 'OpenAI', purpose: 'ChatGPT arama sonuçları', kind: 'ai' },
  { name: 'ChatGPT-User', owner: 'OpenAI', purpose: 'Kullanıcı adına anlık sayfa okuma', kind: 'ai' },
  { name: 'ClaudeBot', owner: 'Anthropic', purpose: 'Model eğitimi / indeks', kind: 'ai' },
  { name: 'anthropic-ai', owner: 'Anthropic', purpose: 'Eski Anthropic tarayıcısı', kind: 'ai' },
  { name: 'PerplexityBot', owner: 'Perplexity', purpose: 'Cevap motoru indeksi', kind: 'ai' },
  { name: 'Google-Extended', owner: 'Google', purpose: 'Gemini eğitimi (arama sıralamasını etkilemez)', kind: 'ai' },
  { name: 'CCBot', owner: 'Common Crawl', purpose: 'Açık veri seti (birçok modelin kaynağı)', kind: 'ai' },
  { name: 'Bytespider', owner: 'ByteDance', purpose: 'Doubao / TikTok AI', kind: 'ai' },
  { name: 'Applebot-Extended', owner: 'Apple', purpose: 'Apple Intelligence eğitimi', kind: 'ai' },
  { name: 'Googlebot', owner: 'Google', purpose: 'Arama indeksi (referans)', kind: 'search' },
  { name: 'Bingbot', owner: 'Microsoft', purpose: 'Bing + Copilot indeksi (referans)', kind: 'search' },
];

// ───────────── yardımcılar ─────────────

export function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, d) => safeChar(parseInt(d, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)));
}

function safeChar(code: number): string {
  try {
    return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : ' ';
  } catch {
    return ' ';
  }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

export function sameHost(a: string, b: string): boolean {
  const ha = hostnameOf(a).replace(/^www\./, '');
  const hb = hostnameOf(b).replace(/^www\./, '');
  return !!ha && ha === hb;
}
