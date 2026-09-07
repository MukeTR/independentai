/**
 * Ürün yetenek matrisi — pazarlama sayfaları, dokümanlar ve panel bu listeden beslenir.
 * Bir özellik burada "live" değilse hiçbir sayfa onu çalışan özellik gibi sunamaz.
 *
 * status:
 *  - live     : kodda var, testli, kullanıcıya açık
 *  - beta     : çalışıyor ama sınırlı/deneysel (UI'da "beta" rozeti)
 *  - roadmap  : planlı, kodda yok (UI'da "yakında"; asla "var" gibi anlatılmaz)
 */
export type CapabilityStatus = 'live' | 'beta' | 'roadmap';

export type Capability = {
  key: string;
  label: string;
  status: CapabilityStatus;
  /** Kısa, dürüst açıklama */
  note?: string;
};

export const CAPABILITIES: Capability[] = [
  { key: 'tracking', label: 'ChatGPT · Claude · Gemini görünürlük takibi', status: 'live' },
  {
    key: 'daily_rerun',
    label: 'Günlük otomatik yeniden çalıştırma',
    status: 'live',
    note: 'Vercel Cron, 23:00 UTC ±59 dk; birikmiş işler zincirleme tetikleyiciyle tamamlanır',
  },
  { key: 'manual_run', label: 'Anında "şimdi çalıştır"', status: 'live' },
  { key: 'mentions', label: 'Marka bahsi, pozisyon ve mention tipi', status: 'live' },
  {
    key: 'sentiment',
    label: 'Sentiment (LLM destekli)',
    status: 'beta',
    note: 'Heuristik + LLM sınıflandırma; provider anahtarı yoksa yalnızca heuristik',
  },
  { key: 'competitors', label: 'Rakip takibi ve Share of Voice', status: 'live' },
  {
    key: 'citations',
    label: 'Atıf kaynakları (native web arama)',
    status: 'beta',
    note: 'Provider web arama açıkken native atıf; kapalıysa yalnızca metin içi linkler',
  },
  { key: 'geo_tools', label: '13 GEO aracı', status: 'live' },
  {
    key: 'alerts',
    label: 'E-posta + Slack uyarıları ve haftalık rapor',
    status: 'live',
    note: 'E-posta için RESEND_API_KEY gerekir',
  },
  {
    key: 'api',
    label: 'Public API (/api/v1/visibility)',
    status: 'live',
    note: 'Salt-okunur; token bazlı; 60 istek/dk',
  },
  {
    key: 'team',
    label: 'Ekip daveti ve roller (Owner / Admin / Viewer)',
    status: 'live',
    note: 'Davet yeniden gönderme, sahiplik devri, üyelerin son aktivitesi',
  },

  // ── E-ticaret entegrasyonları (v1: salt-okunur katalog; sipariş/müşteri/ödeme verisi çekilmez) ──
  {
    key: 'store_connect_shopify',
    label: 'Shopify mağaza bağlantısı',
    status: 'beta',
    note: 'Salt-okunur ürün kataloğu; OAuth; webhooks; App Store listesinde değil — özel uygulama kurulumu gerekir',
  },
  {
    key: 'store_connect_ikas',
    label: 'ikas mağaza bağlantısı',
    status: 'beta',
    note: 'Salt-okunur ürün kataloğu; Client ID/Secret ile; webhook kaydı başarısızsa günlük senkron',
  },
  {
    key: 'store_connect_ticimax',
    label: 'Ticimax mağaza bağlantısı',
    status: 'beta',
    note: 'Günlük senkron; webhook yok',
  },
  { key: 'commerce_readiness', label: 'E-ticaret AI hazırlık skoru', status: 'live' },
  { key: 'product_page_test', label: 'Ürün sayfası testi', status: 'live' },
  { key: 'ai_crawler_test', label: 'AI crawler erişim testi', status: 'live' },
  {
    key: 'product_writer',
    label: 'Ürün açıklama yazıcı (AI)',
    status: 'beta',
    note: 'Provider anahtarı gerekir',
  },

  // ── Ajans ve paylaşım ──
  {
    key: 'agency_workspaces',
    label: 'Ajans çalışma alanları (çoklu müşteri)',
    status: 'live',
    note: 'Owner/Admin/Strategist/Analyst; koltuk ve müşteri limitleri',
  },
  {
    key: 'share_links',
    label: 'Paylaşılabilir rapor bağlantıları',
    status: 'live',
    note: 'İmzalı; beyaz etiket yok',
  },
  {
    key: 'realtime',
    label: 'Gerçek zamanlı panel güncellemeleri',
    status: 'beta',
    note: 'Supabase Realtime; yapılandırılmadığında 30 sn polling',
  },
  { key: 'activity_feed', label: 'Aktivite akışı', status: 'live' },

  // ── Yol haritası ──
  {
    key: 'multi_brand',
    label: 'Çoklu marka (tek hesapta birden fazla kendi markası)',
    status: 'roadmap',
    note: 'Lansmanda hesap başına 1 kendi markası; ajanslar için çalışma alanları mevcut',
  },
  { key: 'webhooks', label: 'Giden webhooks (olay bildirimleri)', status: 'roadmap' },
  { key: 'pdf_report', label: 'Aylık PDF rapor', status: 'roadmap' },
  { key: 'perplexity', label: 'Perplexity / Grok takibi', status: 'roadmap' },
  {
    key: 'billing',
    label: 'Ücretli planlar ve ödeme',
    status: 'roadmap',
    note: 'Lansman süresince ücretsiz; fiyatlar duyurulmadı',
  },
];

export function capability(key: string): Capability {
  const c = CAPABILITIES.find((x) => x.key === key);
  if (!c) throw new Error(`Bilinmeyen yetenek: ${key}`);
  return c;
}

export function isLive(key: string): boolean {
  return capability(key).status === 'live';
}

/** Lansman teklifi — tek kaynak. Tarihler ISO; bitiş boşsa süresiz (env ile kapatılır). */
export const LAUNCH_OFFER = {
  startsAt: '2026-05-22',
  trialMonths: 6,
  /** Teklifin yeni kayıtlara kapanma tarihi; null = açık. Deploy'da env LAUNCH_OFFER_ENDS_AT ile ayarlanır. */
  endsAt: (typeof process !== 'undefined' && process.env?.LAUNCH_OFFER_ENDS_AT) || null,
  /** "Adil kullanım" tavanları (entitlement.ts LAUNCH limitleriyle aynı) */
  fairUse: {
    prompts: 200,
    competitors: 50,
    members: 5,
    apiTokens: 5,
    manualRunsPerDay: 60,
    storeConnections: 2,
    catalogProducts: 5000,
  },
} as const;

export function launchOfferOpen(now = new Date()): boolean {
  if (!LAUNCH_OFFER.endsAt) return true;
  return now < new Date(LAUNCH_OFFER.endsAt);
}
