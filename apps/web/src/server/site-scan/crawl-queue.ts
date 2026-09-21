/**
 * Aynı host BFS tarayıcısı (W2 — kırık link bulucu). ScanBudget üstünde çalışır; düz fetch YOK.
 *
 *  - Derinlik ≤ `maxDepth` (2), sayfa ≤ `maxPages` (40), aynı host (www farkı yok sayılır), yalnız HTML sayfalar
 *    (ikili uzantılar ve sorgu-takip parametreleri atlanır), her URL bir kez (urlKey ile tekilleştirme).
 *  - Nezaket: robots.txt (YanitBot ya da `*` grubu) ile engellenen yollar çekilmez (`robotsBlocked`); eşzamanlılık
 *    ScanBudget host semaforu (4) ile sınırlıdır — burada ayrıca `concurrency` kadar işçi çalışır.
 *  - Bütçe dolduğunda (istek/bayt/süre) kalan sıra `skipped` olarak sayılır → araç `partial:true` verir.
 *  - Sayfa gövdeleri `parsePage` ile PageArtifact'a çevrilir (linkler, başlık, WAF izi …).
 */
import { parseRobots, resolveBotAccess, sameHost, type ParsedRobots } from '../commerce/html-analysis';
import type { Artifact } from '../commerce/scoring';
import type { ScanBudget } from './budget';
import { parsePage, SCAN_HEADERS, type PageArtifact } from './fetch-page';
import { urlKey } from './sitemap-parse';

export const CRAWL_MAX_PAGES = 40;
export const CRAWL_MAX_DEPTH = 2;
export const CRAWL_BOT_NAME = 'YanitBot';

const BINARY_EXT =
  /\.(pdf|jpe?g|png|gif|webp|avif|svg|ico|bmp|zip|rar|7z|gz|tgz|tar|mp4|mp3|wav|avi|mov|wmv|m4a|docx?|xlsx?|pptx?|css|js|mjs|json|xml|rss|atom|woff2?|ttf|eot|otf|exe|dmg|apk)(\?.*)?$/i;
const TRACKING_PARAMS = /^(utm_|fbclid|gclid|yclid|mc_|ref$|_ga$)/i;

export type CrawlOptions = {
  maxPages?: number;
  maxDepth?: number;
  /** Sayfa isteği zaman aşımı (ms), varsayılan 8 000 */
  pageTimeoutMs?: number;
  /** Eşzamanlı sayfa isteği, varsayılan 4 */
  concurrency?: number;
  /** Sayfa gövdesi üst sınırı (bayt), varsayılan 512 KB */
  maxBytesPerPage?: number;
  /** robots.txt'e uy (varsayılan true); `robots` verilmemişse 1 istekle çekilir */
  respectRobots?: boolean;
  robots?: ParsedRobots | null;
  headers?: Record<string, string>;
};

export type CrawledPage = { url: string; depth: number; page: PageArtifact };

export type CrawlResult = {
  pages: CrawledPage[];
  /** Sıraya alınıp çekilmeyen tekil URL sayısı (sayfa tavanı ya da bütçe) */
  skipped: number;
  robotsBlocked: string[];
  reason: 'done' | 'pages' | 'budget';
  robots: ParsedRobots | null;
  /** Keşfedilen tekil aynı-host URL sayısı (çekilen + atlanan + engellenen) */
  discovered: number;
};

/** http(s), ikili uzantı değil. */
export function isCrawlableUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return !BINARY_EXT.test(u.pathname);
  } catch {
    return false;
  }
}

/** Aynı host, hash/takip parametresi yok, normalize; uygun değilse null. */
export function normalizeCrawlUrl(raw: string, base: string): string | null {
  let u: URL;
  try {
    u = new URL(raw, base);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (!sameHost(u.toString(), base)) return null;
  if (u.username || u.password) return null;
  u.hash = '';
  u.hostname = u.hostname.toLowerCase();
  for (const k of [...u.searchParams.keys()]) if (TRACKING_PARAMS.test(k)) u.searchParams.delete(k);
  const s = u.toString();
  return isCrawlableUrl(s) ? s : null;
}

function isHtml(a: Artifact): boolean {
  const ct = (a.headers.get('content-type') ?? '').toLowerCase();
  return !ct || ct.includes('html') || ct.includes('xhtml');
}

export async function crawlSite(startUrl: string, budget: ScanBudget, opts: CrawlOptions = {}): Promise<CrawlResult> {
  const maxPages = Math.max(1, opts.maxPages ?? CRAWL_MAX_PAGES);
  const maxDepth = Math.max(0, opts.maxDepth ?? CRAWL_MAX_DEPTH);
  const timeout = opts.pageTimeoutMs ?? 8_000;
  const concurrency = Math.max(1, opts.concurrency ?? 4);
  const init = { headers: { ...SCAN_HEADERS, ...(opts.headers ?? {}) }, maxBytes: opts.maxBytesPerPage ?? 512 * 1024 };

  let robots: ParsedRobots | null = opts.robots ?? null;
  if (!robots && (opts.respectRobots ?? true)) {
    try {
      const origin = new URL(startUrl).origin;
      const r = await budget.fetch(`${origin}/robots.txt`, 5_000, { headers: init.headers });
      robots = r.ok && r.text ? parseRobots(r.text) : null;
    } catch {
      robots = null;
    }
  }

  const start = normalizeCrawlUrl(startUrl, startUrl) ?? startUrl;
  const seen = new Set<string>([urlKey(start)]);
  const queue: { url: string; depth: number }[] = [{ url: start, depth: 0 }];
  const pages: CrawledPage[] = [];
  const robotsBlocked: string[] = [];
  let reason: CrawlResult['reason'] = 'done';

  const allowed = (url: string): boolean => {
    if (!robots) return true;
    let path = '/';
    try {
      const u = new URL(url);
      path = u.pathname + u.search;
    } catch {
      return true;
    }
    return resolveBotAccess(robots, CRAWL_BOT_NAME, path).allowed;
  };

  const enqueue = (page: PageArtifact, depth: number) => {
    if (depth >= maxDepth) return;
    for (const l of page.links) {
      if (!l.internal) continue;
      const n = normalizeCrawlUrl(l.url, page.finalUrl);
      if (!n) continue;
      const k = urlKey(n);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push({ url: n, depth: depth + 1 });
    }
  };

  while (queue.length) {
    if (pages.length >= maxPages) {
      reason = 'pages';
      break;
    }
    if (budget.exhausted) {
      reason = 'budget';
      break;
    }
    const batch: { url: string; depth: number }[] = [];
    while (batch.length < concurrency && queue.length && pages.length + batch.length < maxPages) {
      const item = queue.shift();
      if (!item) break;
      if (item.depth > 0 && !allowed(item.url)) {
        robotsBlocked.push(item.url);
        continue;
      }
      batch.push(item);
    }
    if (!batch.length) continue;
    const fetched = await Promise.all(
      batch.map(async (item) => {
        const a = await budget.fetch(item.url, timeout, init);
        return { item, a };
      }),
    );
    for (const { item, a } of fetched) {
      if (a.error === 'budget') {
        // bütçe reddetti: sıraya geri say (skipped), sayfa olarak kaydetme
        queue.unshift(item);
        reason = 'budget';
        continue;
      }
      const page = parsePage(item.url, a);
      pages.push({ url: item.url, depth: item.depth, page });
      if (a.ok && isHtml(a) && page.reachable && sameHost(page.finalUrl, start)) enqueue(page, item.depth);
    }
    if (reason === 'budget') break;
  }

  // kuyrukta kalan tekil URL'ler (robots engelli olmayanlar) atlanmış sayılır
  const skipped = queue.length;
  return {
    pages,
    skipped,
    robotsBlocked,
    reason: reason === 'done' && skipped > 0 ? 'pages' : reason,
    robots,
    discovered: seen.size,
  };
}
