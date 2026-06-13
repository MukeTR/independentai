export type BrandSpec = {
  id?: string;
  name: string;
  aliases: string[];
  isOwn?: boolean;
};

export type MentionType = 'RECOMMENDED' | 'LISTED' | 'COMPARED' | 'PASSING';

export type ExtractedMention = {
  brandId?: string;
  mentionName: string;
  isOwnBrand: boolean;
  isCompetitor: boolean;
  position: number;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  mentionType: MentionType;
  snippet: string;
};

const POSITIVE_HINTS = ['öne çıkıyor', 'en iyi', 'tavsiye', 'önerilir', 'tercih', 'güçlü', 'yaygın olarak kullanılır', 'lider'];
const NEGATIVE_HINTS = ['zayıf', 'sorunlu', 'önerilmez', 'kötü', 'pahalı ve', 'geride kalıyor', 'eleştirilen'];

const RECOMMEND_HINTS = ['tavsiye', 'öneririm', 'önerilir', 'en iyi seçim', 'tercih edilmeli', 'ideal'];
const COMPARE_HINTS = ['ise', 'oysa', 'kıyasla', 'göre', 'fakat', 'ancak', 'farkı', 'aksine', 'vs'];

function detectMentionType(snippet: string, position: number): MentionType {
  const lower = snippet.toLowerCase();
  if (RECOMMEND_HINTS.some((w) => lower.includes(w))) return 'RECOMMENDED';
  if (COMPARE_HINTS.some((w) => lower.includes(w))) return 'COMPARED';
  // numaralı/madde işaretli liste bağlamı
  if (/(^|\s)(\d+[\.\)]|[-•*])\s/.test(snippet) || position <= 5) return 'LISTED';
  return 'PASSING';
}

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
      // ASCII \b Türkçe harfleri (çğıöşü/ÇĞİÖŞÜ) kelime sınırı saymadığı için
      // lookaround + genişletilmiş harf sınıfı kullan.
      const W = 'A-Za-z0-9çğıöşüÇĞİÖŞÜ';
      const pattern = new RegExp(`(?<![${W}])${escapeRegex(candidate)}(?![${W}])`, 'gi');
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
      mentionType: detectMentionType(snippet, i + 1),
      snippet,
    };
  });
}

/**
 * LLM ile sentiment + mention type'ı iyileştirir (best-effort).
 * Provider yoksa veya hata olursa heuristic değerleri korunur.
 * Tek LLM çağrısıyla tüm mention'ları sınıflandırır.
 */
export async function enrichMentions(
  responseText: string,
  mentions: ExtractedMention[],
): Promise<ExtractedMention[]> {
  if (mentions.length === 0) return mentions;
  const { completeJSON } = await import('./llm');

  const list = mentions.map((m, i) => `${i}: "${m.mentionName}" (bağlam: ${m.snippet})`).join('\n');
  const prompt = `Aşağıda bir AI cevabında geçen marka bahisleri var. Her biri için duygu (sentiment) ve bahsedilme tipini sınıflandır.

AI cevabı:
"""${responseText.slice(0, 2000)}"""

Bahisler:
${list}

Her bahis için JSON döndür. sentiment: POSITIVE|NEUTRAL|NEGATIVE. type: RECOMMENDED (açıkça öneriliyor) | LISTED (liste içinde) | COMPARED (karşılaştırma) | PASSING (geçerken).
Format: {"items":[{"i":0,"sentiment":"POSITIVE","type":"RECOMMENDED"}]}`;

  type Resp = { items: { i: number; sentiment: string; type: string }[] };
  const res = await completeJSON<Resp>(prompt, { maxTokens: 600 });
  if (!res?.items) return mentions;

  const byIdx = new Map(res.items.map((it) => [it.i, it]));
  return mentions.map((m, i) => {
    const it = byIdx.get(i);
    if (!it) return m;
    const sentiment = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'].includes(it.sentiment)
      ? (it.sentiment as ExtractedMention['sentiment'])
      : m.sentiment;
    const mentionType = ['RECOMMENDED', 'LISTED', 'COMPARED', 'PASSING'].includes(it.type)
      ? (it.type as MentionType)
      : m.mentionType;
    return { ...m, sentiment, mentionType };
  });
}
