export type BrandSpec = {
  id?: string;
  name: string;
  aliases: string[];
  isOwn?: boolean;
};

export type ExtractedMention = {
  brandId?: string;
  mentionName: string;
  isOwnBrand: boolean;
  isCompetitor: boolean;
  position: number;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  snippet: string;
};

const POSITIVE_HINTS = ['öne çıkıyor', 'en iyi', 'tavsiye', 'önerilir', 'tercih', 'güçlü', 'yaygın olarak kullanılır', 'lider'];
const NEGATIVE_HINTS = ['zayıf', 'sorunlu', 'önerilmez', 'kötü', 'pahalı ve', 'geride kalıyor', 'eleştirilen'];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findSnippet(text: string, matchIdx: number, matchLen: number): string {
  const before = Math.max(0, matchIdx - 80);
  const after = Math.min(text.length, matchIdx + matchLen + 80);
  return text.slice(before, after).replace(/\s+/g, ' ').trim();
}

function detectSentiment(snippet: string): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' {
  const lower = snippet.toLowerCase();
  const pos = POSITIVE_HINTS.some((w) => lower.includes(w));
  const neg = NEGATIVE_HINTS.some((w) => lower.includes(w));
  if (neg && !pos) return 'NEGATIVE';
  if (pos && !neg) return 'POSITIVE';
  return 'NEUTRAL';
}

export function extractMentions(
  responseText: string,
  ownBrands: BrandSpec[],
  competitors: BrandSpec[],
): ExtractedMention[] {
  type Hit = { name: string; idx: number; len: number; spec: BrandSpec; isOwn: boolean; isCompetitor: boolean };
  const hits: Hit[] = [];

  const scan = (spec: BrandSpec, isOwn: boolean, isCompetitor: boolean) => {
    const candidates = [spec.name, ...spec.aliases].filter(Boolean);
    for (const candidate of candidates) {
      const pattern = new RegExp(`\\b${escapeRegex(candidate)}\\b`, 'gi');
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(responseText)) !== null) {
        hits.push({
          name: match[0],
          idx: match.index,
          len: match[0].length,
          spec,
          isOwn,
          isCompetitor,
        });
      }
    }
  };

  ownBrands.forEach((b) => scan(b, true, false));
  competitors.forEach((b) => scan(b, false, true));

  // Aynı marka birden fazla geçerse sadece ilk hit'i tut
  const seenSpec = new Set<string>();
  const uniqueHits = hits
    .sort((a, b) => a.idx - b.idx)
    .filter((h) => {
      const key = `${h.isOwn ? 'own' : 'comp'}:${h.spec.name}`;
      if (seenSpec.has(key)) return false;
      seenSpec.add(key);
      return true;
    });

  return uniqueHits.map((h, i) => {
    const snippet = findSnippet(responseText, h.idx, h.len);
    return {
      brandId: h.spec.id,
      mentionName: h.name,
      isOwnBrand: h.isOwn,
      isCompetitor: h.isCompetitor,
      position: i + 1,
      sentiment: detectSentiment(snippet),
      snippet,
    };
  });
}
