/**
 * Sayfa seçici — `satin-alma-sorusu-kapsama` için taranacak ≤30 sayfayı belirler ve bütçe üzerinden çeker.
 *
 *  Seçim (SAF, `pickPages`):
 *   1. Ana sayfa (her zaman).
 *   2. Sitemap `<loc>` URL'leri: yol slug'ı soru anahtar kökleriyle eşleşenler, eşleşen soru sayısına göre ≤20.
 *      (ASCII katlama ile "sac-ekimi" ↔ "saç ekimi" eşleşir; W2'nin sitemap-parse.ts'ine import yok — burada
 *      yalnız `<loc>` çıkarımı yapılır, ≤2 000 URL, 10 MB'lık kesim collectPageArtifact'ta zaten var.)
 *   3. Ana sayfa iç linkleri: metni/yolu eşleşenler önce, sonra kalanlar ≤10.
 *   Aynı host (www farkı yok sayılır), fragment yok, dosya uzantılı (pdf/jpg/…) atlanır.
 *
 *  Çekim (`fetchPickedPages`): hepsi Promise.all ile; eşzamanlılığı ScanBudget host semaforu (perHost 4) sınırlar.
 *  Bütçe dolan istekler `error:'budget'` döner → çağıran partial işaretler (core partial kuralı).
 */
import { hostnameOf, sameHost } from '../commerce/html-analysis';
import type { ScanBudget } from './budget';
import { parsePage, SCAN_HEADERS, type PageArtifact } from './fetch-page';
import { asciiFold, slugTokens, tokenizeTr } from './tr-text';

export const MAX_PAGES = 30;
export const MAX_SITEMAP_PICKS = 20;
export const MAX_LINK_PICKS = 10;
const MAX_SITEMAP_URLS = 2000;
const SKIP_EXT = /\.(pdf|jpe?g|png|gif|webp|svg|zip|rar|docx?|xlsx?|pptx?|mp4|mp3|xml|json|css|js)(\?|$)/i;
const SKIP_PATH = /\/(wp-json|wp-admin|wp-login|cart|sepet|checkout|login|giris|account|hesap|tag|etiket|feed|cdn-cgi)(\/|$)/i;

export type PickedPage = { url: string; reason: 'home' | 'sitemap' | 'link'; hits: number };

/** Sitemap XML'inden `<loc>` adresleri (index dosyasında alt sitemap adresleri de döner; çağıran filtreler). */
export function sitemapLocs(xml: string, max = MAX_SITEMAP_URLS): string[] {
  const out: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) && out.length < max) {
    const u = m[1]!.replace(/&amp;/g, '&').trim();
    if (u) out.push(u);
  }
  return out;
}

/** Soru anahtarlarından kök kümesi (≥3 karakter, ASCII katlanmış). */
export function keywordStems(keywords: string[][]): Set<string> {
  const out = new Set<string>();
  for (const group of keywords)
    for (const k of group) for (const t of tokenizeTr(k)) if (t.length >= 3) out.add(asciiFold(t));
  return out;
}

function pathStems(url: string): string[] {
  try {
    const u = new URL(url);
    return slugTokens(u.pathname).map(asciiFold);
  } catch {
    return [];
  }
}

function usable(url: string, base: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  if (!sameHost(url, base)) return false;
  try {
    const u = new URL(url);
    if (SKIP_EXT.test(u.pathname)) return false;
    if (SKIP_PATH.test(u.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

function canon(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, '');
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Sayfa listesi: ana sayfa + sitemap eşleşmeleri (≤20) + iç linkler (≤10), toplam ≤ MAX_PAGES.
 * `questionKeywords`: her sorunun `keywords` dizisi; slug'ı en çok soruya değen sayfa önce gelir.
 */
export function pickPages(home: PageArtifact, questionKeywords: string[][][], max = MAX_PAGES): PickedPage[] {
  const base = home.finalUrl || home.url;
  const homeUrl = canon(base);
  const seen = new Set<string>([homeUrl]);
  const out: PickedPage[] = [{ url: homeUrl, reason: 'home', hits: 0 }];
  const perQuestion = questionKeywords.map(keywordStems);

  const hitsOf = (stems: string[]): number => {
    if (stems.length === 0) return 0;
    let n = 0;
    for (const qs of perQuestion) if (stems.some((s) => qs.has(s))) n += 1;
    return n;
  };

  // 2) sitemap
  const sm = home.sitemap;
  const smOk = !!sm?.ok && /<(urlset|sitemapindex)\b/i.test(sm.text);
  if (smOk) {
    const scored: PickedPage[] = [];
    for (const loc of sitemapLocs(sm!.text)) {
      if (!usable(loc, base)) continue;
      const c = canon(loc);
      if (seen.has(c)) continue;
      const hits = hitsOf(pathStems(c));
      if (hits > 0) scored.push({ url: c, reason: 'sitemap', hits });
    }
    scored.sort((a, b) => b.hits - a.hits || a.url.length - b.url.length || a.url.localeCompare(b.url));
    for (const p of scored.slice(0, MAX_SITEMAP_PICKS)) {
      if (out.length >= max) break;
      seen.add(p.url);
      out.push(p);
    }
  }

  // 3) ana sayfa iç linkleri
  const links: PickedPage[] = [];
  for (const l of home.links) {
    if (!l.internal || !usable(l.url, base)) continue;
    const c = canon(l.url);
    if (seen.has(c)) continue;
    seen.add(c);
    const hits = hitsOf([...pathStems(c), ...tokenizeTr(l.text).map(asciiFold)]);
    links.push({ url: c, reason: 'link', hits });
  }
  links.sort((a, b) => b.hits - a.hits || a.url.length - b.url.length);
  for (const p of links.slice(0, MAX_LINK_PICKS)) {
    if (out.length >= max) break;
    out.push(p);
  }
  return out.slice(0, max);
}

/** Seçilen sayfaları (ana sayfa hariç — o zaten elde) bütçe üzerinden paralel çeker; SAF parsePage ile ayrıştırır. */
export async function fetchPickedPages(
  picks: PickedPage[],
  budget: ScanBudget,
  opts: { timeoutMs?: number } = {},
): Promise<PageArtifact[]> {
  const ms = opts.timeoutMs ?? 8_000;
  const init = { headers: SCAN_HEADERS };
  const pages = await Promise.all(
    picks
      .filter((p) => p.reason !== 'home')
      .map(async (p) => {
        const a = await budget.fetch(p.url, ms, init);
        return parsePage(p.url, a);
      }),
  );
  return pages.filter((p) => hostnameOf(p.url) !== '');
}
