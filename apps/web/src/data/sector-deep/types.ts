import type { SectorSlug } from '@/lib/tool-registry';

/**
 * Sektöre özel DERİN anlatı. `data/sectors.ts` (nav, sitemap, onboarding, testler) dokunulmadan kalır;
 * burası yalnızca `/sektor/<slug>` sayfasının uzun metinlerini besler.
 *
 * Dil kuralları (tests/unit/sectors.test.ts ile aynı ruhta, sector-deep.test.ts burayı da tarar):
 *  - Hiçbir sektörde: "en iyi", "garanti", "Türkiye'nin ilk", "hükmed…", "dominate".
 *  - regulated sektörlerde (klinik, hukuk-danismanlik) ayrıca: "sıralama", "hasta garantisi" YOK;
 *    dil "bilgilendirme ve görünürlük ölçümü" çerçevesinde kalır, sonuç/hasta/müvekkil vaadi verilmez.
 *  - Sayı veren her cümle ya `data/stats.ts` kaynaklıdır ya da "temsili" ibaresiyle işaretlenir.
 */
export type SectorDeep = {
  slug: SectorSlug;

  /** Sayfanın ikinci nefesi: sektörün alım davranışı nasıl değişti (2-3 cümle, kaynaksız sayı yok). */
  lede: string;

  /**
   * "Bu sektörde para nerede kaçıyor" — müşterinin kaybı fark ettiği somut anlar.
   * Her madde o sektörün gerçek iş akışından olmalı (randevu, teklif, kayıt dönemi, sezon, RFQ…).
   */
  lossMoments: { when: string; what: string }[];

  /**
   * Uzun anlatı bölümleri. 3-4 bölüm, her biri 2-3 paragraf.
   * Sektörün kendi diliyle yazılır; jenerik "GEO önemlidir" cümleleri yasak.
   */
  sections: { heading: string; paragraphs: string[] }[];

  /** "Sizde tam olarak neye bakıyoruz" — sektöre özel inceleme kalemleri. */
  weExamine: { area: string; detail: string }[];

  /** Sektöre özel ilk ay: hafta hafta ne yapılır. */
  roadmap: { week: string; title: string; detail: string }[];

  /** Sektör sözlüğü / dikkat notları (mevzuat, sezon, terminoloji). */
  notes: { title: string; body: string }[];

  /** Bölüm arasına giren sektöre özel çizim. */
  illustration: { src: string; alt: string; caption: string };

  /** Sayfa sonundaki tek cümlelik kapanış. */
  closing: string;
};
