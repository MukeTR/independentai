/**
 * Kanibalizasyon Denetleyici (Faz 7) — sitenizin kendi sayfaları birbiriyle aynı
 * konu için rekabet ediyor mu? Sayfaları embed edip cosine benzerlikle eşleştirir.
 * pgvector gerekmez — embedding'ler Json saklanır, cosine JS'te hesaplanır.
 */
import { embed, cosineSimilarity } from '@independentai/ai';
import { fetchText, stripTags } from './geo-audit';

export type CannibalPair = {
  a: string;
  b: string;
  similarity: number; // 0-100
};

export type CannibalizationResult = {
  pagesAnalyzed: number;
  pairs: CannibalPair[];
};

const MAX_PAGES = 15;
const SIMILARITY_THRESHOLD = 0.82;

function unescapeXml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function dedup(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const key = u.replace(/\/+$/, '').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  return out;
}

/** Bir sitemap XML'inden <loc>'ları çıkarır; sitemap-index ise ilk alt sitemap'i açar. */
async function locsFromSitemap(xml: string, depth = 0): Promise<string[]> {
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => unescapeXml(m[1]!.trim())).filter(Boolean);
  // sitemap index → alt sitemap'lere işaret eder (sayfa değil)
  if (/<sitemapindex/i.test(xml) && depth < 2 && locs.length) {
    const childXml = await fetchText(locs[0]!).catch(() => null);
    if (childXml) return locsFromSitemap(childXml, depth + 1);
  }
  return locs;
}

/** sitemap.xml veya düz URL listesinden URL'leri çıkar. */
async function resolveUrls(input: string): Promise<string[]> {
  const trimmed = input.trim();

  // Birden fazla satır → URL listesi (dedup uygulanır)
  if (/\n/.test(trimmed)) {
    const lines = trimmed
      .split(/\n+/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//i.test(s));
    return dedup(lines).slice(0, MAX_PAGES);
  }

  let url = trimmed;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  // sitemap mı?
  if (/sitemap.*\.xml$/i.test(url) || url.endsWith('.xml')) {
    const xml = await fetchText(url);
    if (xml) {
      const locs = await locsFromSitemap(xml);
      if (locs.length) return dedup(locs).slice(0, MAX_PAGES);
    }
  }

  // Tek URL → o origin'in sitemap.xml'ini dene
  try {
    const origin = new URL(url).origin;
    const xml = await fetchText(`${origin}/sitemap.xml`);
    if (xml) {
      const locs = await locsFromSitemap(xml);
      if (locs.length) return dedup(locs).slice(0, MAX_PAGES);
    }
  } catch {
    /* yoksay */
  }
  return [url];
}

export async function runCannibalization(input: string): Promise<CannibalizationResult> {
  const urls = await resolveUrls(input);
  if (urls.length < 2) {
    return { pagesAnalyzed: urls.length, pairs: [] };
  }

  // Sayfaları paralel çek + metne indir
  const pages = await Promise.all(
    urls.map(async (u) => {
      const html = await fetchText(u, 9000).catch(() => null);
      if (!html) return null;
      const text = stripTags(html);
      if (text.length < 100) return null;
      // başlık + ilk ~1500 karakter embedding için yeterli sinyal
      const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? '').trim();
      return { url: u, content: `${title}\n${text.slice(0, 1500)}` };
    }),
  );

  const valid = pages.filter((p): p is { url: string; content: string } => p !== null);
  if (valid.length < 2) return { pagesAnalyzed: valid.length, pairs: [] };

  const vectors = await embed(valid.map((p) => p.content));

  const pairs: CannibalPair[] = [];
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const sim = cosineSimilarity(vectors[i]!, vectors[j]!);
      if (sim >= SIMILARITY_THRESHOLD) {
        pairs.push({ a: valid[i]!.url, b: valid[j]!.url, similarity: Math.round(sim * 100) });
      }
    }
  }

  pairs.sort((x, y) => y.similarity - x.similarity);
  return { pagesAnalyzed: valid.length, pairs };
}
