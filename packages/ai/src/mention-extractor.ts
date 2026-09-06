/**
 * Marka bahsi çıkarımı.
 *
 * Tanımlar (ürün metniyle aynı — bkz. docs/METRICS.md):
 *  - Bahis (mention): Marka adının veya alias'ının, kelime sınırlarıyla, Türkçe büyük/küçük
 *    harf duyarsız (İ/i, I/ı) ve Unicode NFC normalize edilmiş biçimde metinde geçmesi.
 *    Türkçe ek/kesme işareti ("KarPanel'in", "Adisyo’yu") bahsi bozmaz.
 *  - Pozisyon: Cevapta tanınan markaların (kendi + rakip) İLK geçiş sırasına göre 1'den
 *    başlayan sırası. Aynı marka birden fazla geçerse yalnızca ilk geçişi sayılır.
 *  - İç içe adlar ("Logo" ve "Logo Restoran"): en uzun eşleşme kazanır; kısa ad, uzun adın
 *    kapsadığı aralıkta ayrıca sayılmaz.
 *  - Domain alias'ları ("acme.com") protokol/www'suz da eşleşir.
 */

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
  /** Aynı markanın metindeki toplam geçiş sayısı */
  occurrences: number;
};

const POSITIVE_HINTS = [
  'öne çıkıyor',
  'en iyi',
  'tavsiye',
  'önerilir',
  'öneririm',
  'tercih',
  'güçlü',
  'yaygın olarak kullanılır',
  'lider',
  'popüler',
  'başarılı',
  'kaliteli',
];
const NEGATIVE_HINTS = [
  'zayıf',
  'sorunlu',
  'önerilmez',
  'kötü',
  'pahalı ve',
  'geride kalıyor',
  'eleştirilen',
  'şikayet',
  'yetersiz',
  'dezavantaj',
];
const RECOMMEND_HINTS = [
  'tavsiye',
  'öneririm',
  'önerilir',
  'en iyi seçim',
  'tercih edilmeli',
  'ideal',
  'öncelikle değerlendir',
];
const COMPARE_HINTS = [
  ' ise ',
  'oysa',
  'kıyasla',
  'göre',
  'fakat',
  'ancak',
  'farkı',
  'aksine',
  ' vs ',
  'karşılaştır',
  'buna karşın',
];

const WORD = 'A-Za-z0-9çğıöşüÇĞİÖŞÜâîûÂÎÛ';

export function foldTr(s: string): string {
  return s.normalize('NFC').toLocaleLowerCase('tr');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Türkçe duyarlı büyük/küçük harf eşleşmesi: JS'nin `i` bayrağı İ↔i ve I↔ı eşlemesini bilmez.
 * Her harf için [küçük büyük] sınıfı üretilir (i→[iİ], ı→[ıI], diğerleri → [aA]).
 */
function trCaseInsensitive(s: string): string {
  let out = '';
  for (const ch of s) {
    if (/\s/.test(ch)) {
      out += '\\s+';
      continue;
    }
    const variants = new Set([
      ch,
      ch.toLocaleLowerCase('tr'),
      ch.toLocaleUpperCase('tr'),
      ch.toLowerCase(),
      ch.toUpperCase(),
    ]);
    const letters = [...variants].filter((v) => v.length === 1);
    if (letters.length <= 1) out += escapeRegex(ch);
    else out += `[${letters.map((v) => escapeRegex(v).replace(/^\\?(-)$/, '\\$1')).join('')}]`;
  }
  return out.replace(/(\\s\+)+/g, '\\s+');
}

/** Alias'ı eşleşme desenine çevirir: domain ise www./protokol opsiyonel, boşluklar esnek. */
function candidatePattern(candidate: string): string {
  const c = candidate.trim();
  const domainLike = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(c) && !/\s/.test(c);
  if (domainLike) {
    const host = c.replace(/^www\./i, '');
    return `(?:https?:\\/\\/)?(?:www\\.)?${trCaseInsensitive(host)}(?:\\/[^\\s)]*)?`;
  }
  return trCaseInsensitive(c);
}

function findSnippet(text: string, matchIdx: number, matchLen: number): string {
  const before = Math.max(0, matchIdx - 90);
  const after = Math.min(text.length, matchIdx + matchLen + 90);
  return text.slice(before, after).replace(/\s+/g, ' ').trim();
}

export function detectSentiment(snippet: string): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' {
  const lower = foldTr(snippet);
  const pos = POSITIVE_HINTS.some((w) => lower.includes(w));
  const neg = NEGATIVE_HINTS.some((w) => lower.includes(w));
  if (neg && !pos) return 'NEGATIVE';
  if (pos && !neg) return 'POSITIVE';
  return 'NEUTRAL';
}

export function detectMentionType(snippet: string, position: number, inList: boolean): MentionType {
  const lower = ` ${foldTr(snippet)} `;
  if (RECOMMEND_HINTS.some((w) => lower.includes(w))) return 'RECOMMENDED';
  if (COMPARE_HINTS.some((w) => lower.includes(w))) return 'COMPARED';
  if (inList) return 'LISTED';
  return 'PASSING';
}

/** Eşleşmenin bulunduğu satır bir liste maddesi mi? (1. / - / • / *) */
function isListLine(text: string, idx: number): boolean {
  const lineStart = text.lastIndexOf('\n', idx) + 1;
  const line = text.slice(lineStart, idx);
  return /^\s*(\d+[.)]|[-•*])\s+/.test(line) || /^\s*(\d+[.)]|[-•*])\s*\*\*?/.test(line);
}

type Hit = { name: string; idx: number; end: number; spec: BrandSpec; isOwn: boolean; isCompetitor: boolean };

export function extractMentions(
  responseText: string,
  ownBrands: BrandSpec[],
  competitors: BrandSpec[],
): ExtractedMention[] {
  const text = responseText.normalize('NFC');
  const hits: Hit[] = [];

  const scan = (spec: BrandSpec, isOwn: boolean, isCompetitor: boolean) => {
    const candidates = [spec.name, ...spec.aliases]
      .map((c) => c?.trim())
      .filter((c): c is string => !!c && c.length >= 2);
    for (const candidate of candidates) {
      // Kelime sınırı: Türkçe harfleri de sayan lookaround. Sonda kesme işareti + ek serbest.
      const pattern = new RegExp(`(?<![${WORD}])${candidatePattern(candidate)}(?=['’ʼ]|(?![${WORD}]))`, 'gu');
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(text)) !== null) {
        if (m[0].length === 0) {
          pattern.lastIndex++;
          continue;
        }
        // Türkçe I/ı: regex 'i' bayrağı İ↔i eşleşmesini garanti etmez; katlanmış karşılaştırma ile doğrula.
        const folded = foldTr(m[0]);
        const target = foldTr(candidate);
        const domainLike = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(candidate);
        if (!domainLike && folded !== target && folded.replace(/\s+/g, ' ') !== target.replace(/\s+/g, ' ')) continue;
        hits.push({ name: m[0], idx: m.index, end: m.index + m[0].length, spec, isOwn, isCompetitor });
      }
    }
  };
  ownBrands.forEach((b) => scan(b, true, false));
  competitors.forEach((b) => scan(b, false, true));

  // Uzun eşleşme öncelikli; kapsanan (iç içe) kısa eşleşmeler elenir.
  hits.sort((a, b) => a.idx - b.idx || b.end - a.end);
  const kept: Hit[] = [];
  for (const h of hits) {
    const covered = kept.some((k) => k.spec !== h.spec && h.idx >= k.idx && h.end <= k.end);
    if (!covered) kept.push(h);
  }

  // Marka başına ilk geçiş + toplam sayım
  const firstBySpec = new Map<string, Hit>();
  const countBySpec = new Map<string, number>();
  for (const h of kept) {
    const key = `${h.isOwn ? 'own' : 'comp'}:${h.spec.id ?? h.spec.name}`;
    countBySpec.set(key, (countBySpec.get(key) ?? 0) + 1);
    if (!firstBySpec.has(key)) firstBySpec.set(key, h);
  }

  return [...firstBySpec.entries()]
    .sort(([, a], [, b]) => a.idx - b.idx)
    .map(([key, h], i) => {
      const snippet = findSnippet(text, h.idx, h.end - h.idx);
      return {
        brandId: h.spec.id,
        mentionName: h.name,
        isOwnBrand: h.isOwn,
        isCompetitor: h.isCompetitor,
        position: i + 1,
        sentiment: detectSentiment(snippet),
        mentionType: detectMentionType(snippet, i + 1, isListLine(text, h.idx)),
        snippet,
        occurrences: countBySpec.get(key) ?? 1,
      };
    });
}

/**
 * LLM ile sentiment + mention type'ı iyileştirir (best-effort). Tek çağrıyla tüm bahisler.
 * Provider yoksa/hata olursa heuristic değerler korunur. Kullanım bilgisi `llm.lastUsage`.
 */
export async function enrichMentions(responseText: string, mentions: ExtractedMention[]): Promise<ExtractedMention[]> {
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
  const res = await completeJSON<Resp>(prompt, { maxTokens: 600, timeoutMs: 20_000 });
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

// ───────────── Diğer marka keşfi (rank-checker için) ─────────────

export type DetectedBrand = { name: string; confidence: 'high' | 'medium' | 'low'; source: 'llm' | 'heuristic' };

const TR_STOP = new Set([
  'ben',
  'bir',
  'bu',
  'şu',
  've',
  'için',
  'ile',
  'ama',
  'türkiye',
  'i̇stanbul',
  'istanbul',
  'ankara',
  'i̇zmir',
  'izmir',
  'ancak',
  'ayrıca',
  'genellikle',
  'eğer',
  'örneğin',
  'sonuç',
  'özellikle',
  'öneri',
  'öneriler',
  'not',
  'tabii',
  'elbette',
  'merhaba',
  'evet',
  'hayır',
  'bunlar',
  'şunlar',
  'her',
  'en',
  'google',
  'chatgpt',
  'openai',
  'claude',
  'gemini',
  'yapay',
  'zeka',
  'ai',
  'seo',
  'geo',
  'web',
  'internet',
  'avrupa',
  'amerika',
  'dünya',
]);

/** Kaba heuristik: büyük harfle başlayan 1-2 kelimelik adlar (düşük güven). */
export function detectOtherBrandsHeuristic(text: string, excluded: string[]): DetectedBrand[] {
  const ex = new Set(excluded.map(foldTr));
  const candidates =
    text.match(/(?<![A-Za-zÇĞİÖŞÜçğıöşü])[A-ZÇĞİÖŞÜ][a-zçğıöşü0-9]{2,}(?:\s[A-ZÇĞİÖŞÜ][a-zçğıöşü0-9]{2,})?/g) || [];
  const seen = new Map<string, number>();
  for (const c of candidates) {
    const f = foldTr(c);
    if (ex.has(f) || TR_STOP.has(f) || f.split(' ').some((w) => TR_STOP.has(w))) continue;
    seen.set(c, (seen.get(c) ?? 0) + 1);
  }
  return [...seen.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => ({ name, confidence: n >= 2 ? 'medium' : 'low', source: 'heuristic' as const }));
}

/** LLM destekli yapılandırılmış marka çıkarımı; yoksa heuristik. */
export async function detectOtherBrands(text: string, excluded: string[], limit = 6): Promise<DetectedBrand[]> {
  const { completeJSON, hasLLM } = await import('./llm');
  if (hasLLM()) {
    type Resp = { brands: { name: string; confidence?: string }[] };
    const res = await completeJSON<Resp>(
      `Aşağıdaki AI cevabında geçen ŞİRKET/ÜRÜN/MARKA adlarını çıkar. Genel kavramları, şehirleri, kişi adlarını ve AI modellerini (ChatGPT, Gemini vb.) dahil etme. Şu adları hariç tut: ${excluded.join(', ') || '(yok)'}.

Cevap:
"""${text.slice(0, 3000)}"""

Format: {"brands":[{"name":"Adisyo","confidence":"high"}]} (confidence: high|medium|low)`,
      { maxTokens: 400, timeoutMs: 20_000 },
    );
    if (res?.brands?.length) {
      const ex = new Set(excluded.map(foldTr));
      const out: DetectedBrand[] = [];
      const seen = new Set<string>();
      for (const b of res.brands) {
        const name = typeof b.name === 'string' ? b.name.trim() : '';
        if (!name || name.length > 60) continue;
        const f = foldTr(name);
        if (ex.has(f) || seen.has(f)) continue;
        // Halüsinasyon koruması: ad metinde gerçekten geçmeli
        if (!foldTr(text).includes(f)) continue;
        seen.add(f);
        out.push({
          name,
          confidence: b.confidence === 'high' || b.confidence === 'low' ? b.confidence : 'medium',
          source: 'llm',
        });
        if (out.length >= limit) break;
      }
      if (out.length) return out;
    }
  }
  return detectOtherBrandsHeuristic(text, excluded).slice(0, limit);
}
