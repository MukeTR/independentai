/**
 * "İki yol" bölümünün listeleri — test edilebilir tek kaynak (marketing-copy.test.ts).
 *
 * SaaS listesi yalnızca `CAPABILITIES` içinde `live` ya da `beta` olan yeteneklere işaret eder; kodda
 * karşılığı olmayan hiçbir şey burada "var" gibi sunulmaz. Yapılacaklar listesi (Task) roadmap'tir ve
 * bileşende ayrı bir "yakında" satırı olarak gösterilir.
 */
export type SaasItem = { label: string; capability: string; beta?: boolean };

export const SAAS_ITEMS: SaasItem[] = [
  { label: 'ChatGPT · Claude · Gemini görünürlük takibi', capability: 'tracking' },
  { label: 'Rakip takibi ve Share of Voice', capability: 'competitors' },
  { label: 'GEO denetimi ve panel araçları', capability: 'geo_tools' },
  { label: 'Atıf kaynakları', capability: 'citations', beta: true },
  { label: 'Günlük ölçüm, haftalık rapor ve uyarılar', capability: 'alerts' },
  { label: 'Paylaşılabilir rapor bağlantısı', capability: 'share_links' },
  { label: 'Salt-okunur Public API', capability: 'api' },
];

/** Yanıt Agency — hizmet dili, teklifle. Basın çalışması iddiası yok; kaynak çalışması teknik ve içerik odaklıdır. */
export const AGENCY_ITEMS: string[] = [
  'Teknik düzeltmeler (sayfa yapısı, hız, erişim)',
  'Şema ve entity çalışması',
  'Satın alma sorularına cevap veren içerik',
  'Kaynak ve atıf çalışması (dizinler, karşılaştırmalar)',
  'Rakip kıyası ve öncelik sırası',
  'Aylık sprint, aynı panelden ölçüm',
];
