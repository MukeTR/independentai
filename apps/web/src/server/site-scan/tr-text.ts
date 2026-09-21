/**
 * Türkçe metin eşleştirme — `satin-alma-sorusu-kapsama` ve `page-picker` için deterministik, LLM'siz kök eşleme.
 *
 *  - Normalize: NFC → `toLocaleLowerCase('tr')` (İ→i, I→ı) → ı→i katlama → şapkalı harf katlama (â→a, î→i, û→u)
 *    → noktalama boşluğa. Böylece "Fiyatı", "FİYAT", "fiyatlar" aynı köke iner.
 *  - Kök soyma: hafif sonek listesi (çoğul, iyelik, hâl, bulunma/ayrılma) en uzun eşleşmeden başlayarak en fazla
 *    3 tur; kök en az 3 karakter kalır. Tam bir morfolojik çözümleyici DEĞİLDİR; anahtar kelime eşleşmesi için yeter.
 *  - Eş anlamlı sözlük: sorudaki "fiyat" ↔ sayfadaki "ücret/tarife/maliyet" gibi grupları aynı köke bağlar.
 *  - `matchesKeyword(text, "ne kadar")` çok kelimeli anahtarları ardışık kök dizisi olarak arar.
 *  - `matchesGroups(text, [["fiyat"],["ne kadar","ücret"]])` → dış OR, iç AND (sector-questions.ts sözleşmesi).
 */

const SUFFIXES = [
  'lardan',
  'lerden',
  'larda',
  'lerde',
  'ların',
  'lerin',
  'ları',
  'leri',
  'lara',
  'lere',
  'larla',
  'lerle',
  'ların',
  'lar',
  'ler',
  'dan',
  'den',
  'tan',
  'ten',
  'nin',
  'nun',
  'nün',
  'nın',
  'in',
  'un',
  'ün',
  'ın',
  'da',
  'de',
  'ta',
  'te',
  'ya',
  'ye',
  'yi',
  'yu',
  'yü',
  'yı',
  'si',
  'su',
  'sü',
  'sı',
  'la',
  'le',
  'miz',
  'muz',
  'müz',
  'mız',
  'niz',
  'nuz',
  'nüz',
  'nız',
  'im',
  'um',
  'üm',
  'ım',
  'i',
  'u',
  'ü',
  'ı',
  'a',
  'e',
] as const;

// Katlama sonrası (ı→i) kullanılacak sonek listesi; tekrarlar atılır, uzun → kısa sıralanır.
const FOLDED_SUFFIXES = [...new Set(SUFFIXES.map((s) => foldChars(s)))].sort((a, b) => b.length - a.length);

const MIN_STEM = 3;

/** Eş anlamlı / yakın anlamlı gruplar (kök hâlinde yazılır; normalize edilir). */
export const SYNONYM_GROUPS: string[][] = [
  ['fiyat', 'ücret', 'tarife', 'maliyet', 'bedel', 'ne kadar', 'kaç para', 'kaç tl'],
  ['adres', 'konum', 'lokasyon', 'nerede', 'şube', 'ofis', 'yol tarifi'],
  ['telefon', 'ara', 'iletişim', 'whatsapp', 'bize ulaşın', 'ulaşın'],
  ['randevu', 'rezervasyon', 'görüşme', 'teklif al', 'teklif'],
  ['belge', 'sertifika', 'ruhsat', 'lisans', 'yetki belgesi', 'iso'],
  ['referans', 'müşteri', 'vaka', 'örnek proje', 'başarı hikayesi', 'yorum'],
  ['süre', 'ne kadar sürer', 'kaç gün', 'kaç hafta', 'kaç ay', 'teslim'],
  ['entegrasyon', 'entegre', 'bağlantı', 'api', 'uyumlu'],
  ['ödeme', 'taksit', 'kredi kartı', 'havale', 'fatura'],
  ['iade', 'iptal', 'cayma', 'geri ödeme'],
  ['kvkk', 'gizlilik', 'aydınlatma', 'kişisel veri', 'veri güvenliği'],
  ['deneyim', 'tecrübe', 'yıl', 'kuruluş', 'yıldır'],
  ['ekip', 'kadro', 'uzman', 'doktor', 'avukat', 'öğretmen', 'eğitmen', 'danışman'],
  ['ücretsiz', 'bedava', 'deneme', 'demo'],
  ['destek', 'yardım', 'servis', 'bakım'],
  ['ingilizce', 'english', 'yabancı', 'uluslararası', 'yurt dışı', 'ihracat', 'export'],
  ['kampanya', 'indirim', 'promosyon', 'fırsat'],
  ['karşılaştır', 'fark', 'hangisi', 'vs', 'arasında'],
  ['çalışma saatleri', 'saat', 'açık', 'mesai'],
  ['paket', 'plan', 'abonelik', 'üyelik'],
];

/** ı→i, â/î/û şapkalı katlama; diğer Türkçe harfler korunur. */
function foldChars(s: string): string {
  return s.replace(/ı/g, 'i').replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u').replace(/[’'`´]/g, '');
}

/** NFC + Türkçe küçük harf + katlama + noktalama → boşluk. */
export function normalizeTr(s: string): string {
  return foldChars(s.normalize('NFC').toLocaleLowerCase('tr'))
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tek kelimeyi köke indirir (normalize edilmiş girdi bekler). */
export function stemTr(word: string): string {
  let w = word;
  for (let round = 0; round < 3; round += 1) {
    let stripped = false;
    for (const suf of FOLDED_SUFFIXES) {
      if (w.length - suf.length >= MIN_STEM && w.endsWith(suf)) {
        w = w.slice(0, -suf.length);
        stripped = true;
        break;
      }
    }
    if (!stripped) break;
  }
  return w;
}

/** Metni kök dizisine çevirir (boş kelime yok). */
export function tokenizeTr(s: string): string[] {
  return normalizeTr(s)
    .split(' ')
    .filter((w) => w.length > 0)
    .map(stemTr);
}

const SYNONYM_INDEX: Map<string, string[][]> = (() => {
  const idx = new Map<string, string[][]>();
  for (const group of SYNONYM_GROUPS) {
    const stems = group.map(tokenizeTr).filter((t) => t.length > 0);
    for (const t of stems) {
      const key = t.join(' ');
      const list = idx.get(key) ?? [];
      list.push(...stems.filter((x) => x.join(' ') !== key));
      idx.set(key, list);
    }
  }
  return idx;
})();

/** Anahtar kelimenin kök dizisi + eş anlamlı kök dizileri. */
export function expandKeyword(keyword: string): string[][] {
  const base = tokenizeTr(keyword);
  if (base.length === 0) return [];
  const out: string[][] = [base];
  const syn = SYNONYM_INDEX.get(base.join(' '));
  if (syn) for (const s of syn) out.push(s);
  return out;
}

function containsSeq(tokens: string[], seq: string[]): boolean {
  if (seq.length === 0) return false;
  if (seq.length === 1) return tokens.includes(seq[0]!);
  outer: for (let i = 0; i + seq.length <= tokens.length; i += 1) {
    for (let j = 0; j < seq.length; j += 1) if (tokens[i + j] !== seq[j]) continue outer;
    return true;
  }
  return false;
}

/** Önceden köklenmiş metin üzerinde anahtar (veya eş anlamlısı) geçiyor mu. */
export function tokensMatchKeyword(tokens: string[], keyword: string): boolean {
  return expandKeyword(keyword).some((seq) => containsSeq(tokens, seq));
}

/** Ham metin üzerinde anahtar eşleşmesi (küçük metinler için; büyük metinlerde önce tokenizeTr). */
export function matchesKeyword(text: string, keyword: string): boolean {
  return tokensMatchKeyword(tokenizeTr(text), keyword);
}

/** Dış OR, iç AND: `[["fiyat"], ["ücret", "aylık"]]` → ("fiyat") VEYA ("ücret" VE "aylık"). */
export function tokensMatchGroups(tokens: string[], groups: string[][]): boolean {
  return groups.some((g) => g.length > 0 && g.every((k) => tokensMatchKeyword(tokens, k)));
}

export function matchesGroups(text: string, groups: string[][]): boolean {
  return tokensMatchGroups(tokenizeTr(text), groups);
}

/** URL yolu / slug → kök listesi ("/saç-ekimi-fiyatlari" → ["sac","ekim","fiyat"] değil; Türkçe harf korunur, ASCII slug'lar da çözülür). */
export function slugTokens(pathOrSlug: string): string[] {
  let s = pathOrSlug;
  try {
    s = decodeURIComponent(s);
  } catch {
    /* ham */
  }
  return tokenizeTr(s.replace(/[/_.\-+]+/g, ' '));
}

/** ASCII'ye indirgenmiş karşılaştırma anahtarı (ş→s, ç→c…): slug ↔ kelime eşlemesi için ikinci yol. */
export function asciiFold(s: string): string {
  return normalizeTr(s)
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u');
}
