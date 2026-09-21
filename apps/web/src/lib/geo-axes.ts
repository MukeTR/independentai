import type { GeoAuditResult } from '@/server/geo-audit';

/**
 * GEO denetiminin puanlama eksenleri — insan okunur adlarıyla.
 *
 * NEDEN AYRI DOSYA: `geo-audit.ts` çalışma zamanında yapay zekâ istemcisini (`@independentai/ai`)
 * yükler. Pazarlama sayfası yalnız "kaç eksende puanlanıyor" sayısını göstermek için o ağır
 * modülü çekmemeli. Buradaki `import type` derlemede SİLİNİR, dolayısıyla çalışma zamanı
 * bağımlılığı yoktur.
 *
 * SENKRON GARANTİSİ: tip `Record<keyof GeoAuditResult['breakdown'], string>` olduğu için
 * eksen eklenir ya da çıkarılırsa `tsc` burada hata verir. Sayı elle yazılmaz, bu nesneden sayılır.
 */
export const GEO_EKSENLERI: Record<keyof GeoAuditResult['breakdown'], string> = {
  answerFirst: 'Önce cevap',
  citationAuthority: 'Kaynak ve otorite',
  aiComprehension: 'Yapay zekânın anlayabilmesi',
  technical: 'Teknik altyapı',
  freshness: 'Tazelik',
};

/** Eksen adları, sabit sırayla. */
export const GEO_EKSEN_ADLARI = Object.values(GEO_EKSENLERI);
