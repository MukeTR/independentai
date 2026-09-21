/**
 * SERP snippet piksel genişliği — yaklaşık. Google masaüstü sonuç başlığı ~20 px Arial ile ≈580 px'te,
 * açıklama ~14 px ile iki satırda ≈920 px'te kesilir. Gerçek kesme cihaza, fonta ve Google'ın o günkü
 * düzenine bağlıdır; bu tablo yalnızca "kesilebilir" bilgisi verir (puan düşürmez — seo-karnesi bilgi notu).
 *
 * Karakter genişlikleri Arial 20 px için yaklaşık ortalamalardır (px). Bilinmeyen karakter → 11 px.
 * Açıklama için 14/20 oranıyla ölçeklenir. Türkçe harfler (ç, ğ, ı, ö, ş, ü, İ) Latin karşılıklarıyla aynı sınıfta.
 */
export const TITLE_LIMIT_PX = 580;
export const DESCRIPTION_LIMIT_PX = 920;

const NARROW = new Set("ijl.,:;'|!I fıİtrf");
const WIDE = new Set('mwMW@%');
const MEDIUM_WIDE = new Set('ABCDEFGHKNOPQRSTUVXYZÇĞÖŞÜ');

function charWidth20(ch: string): number {
  if (ch === ' ') return 6;
  if (NARROW.has(ch)) return 5;
  if (WIDE.has(ch)) return 17;
  if (MEDIUM_WIDE.has(ch)) return 14;
  if (/[0-9]/.test(ch)) return 11;
  if (/[A-Z]/.test(ch)) return 13;
  if (/[a-zçğıöşü]/.test(ch)) return 11;
  if (/[-–—]/.test(ch)) return 8;
  return 11;
}

/** Metnin yaklaşık piksel genişliği (Arial, `fontPx` boyutunda). */
export function textWidthPx(text: string, fontPx = 20): number {
  let w = 0;
  for (const ch of text) w += charWidth20(ch);
  return Math.round((w * fontPx) / 20);
}

export type SnippetWidth = {
  titlePx: number;
  descriptionPx: number;
  titleTruncated: boolean;
  descriptionTruncated: boolean;
};

/** Title (20 px) ve description (14 px) için genişlik + kesilme tahmini. */
export function snippetWidth(title: string | null, description: string | null): SnippetWidth {
  const titlePx = title ? textWidthPx(title, 20) : 0;
  const descriptionPx = description ? textWidthPx(description, 14) : 0;
  return {
    titlePx,
    descriptionPx,
    titleTruncated: titlePx > TITLE_LIMIT_PX,
    descriptionTruncated: descriptionPx > DESCRIPTION_LIMIT_PX,
  };
}
