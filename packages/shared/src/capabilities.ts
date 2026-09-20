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
  { key: 'tracking', label: 'ChatGPT · Claude · Gemini · Perplexity görünürlük takibi', status: 'live' },
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
  { key: 'geo_tools', label: 'GEO araçları (panel + ücretsiz herkese açık araçlar)', status: 'live' },
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

  // ── Yanıt Agency, lead ve duyuru (gece programı 2026-09-21) ──
  {
    key: 'agency_service',
    label: 'Yanıt Agency uygulama hizmeti',
    status: 'beta',
    note: 'Teklifle; iletişim formu üzerinden başlar; kodda hizmet akışı yok',
  },
  {
    key: 'agency_partner_program',
    label: 'Ajans ortaklık programı',
    status: 'beta',
    note: 'Çalışma alanları canlı; ortaklık koşulları teklifle, başvuru iletişim formundan',
  },
  {
    key: 'announcements',
    label: 'Duyuru şeridi (admin yönetimli)',
    status: 'live',
    note: 'Ton, yerleşim ve tarih aralığı; kapatma tarayıcıda hatırlanır',
  },
  {
    key: 'lead_capture',
    label: 'Lead kaydı (araç taramaları + iletişim formu)',
    status: 'live',
    note: 'Araçlardan yalnız hostname ve skor; kişisel veri yalnız açık rızayla ve LLM’e gönderilmez',
  },
  {
    key: 'tasks',
    label: 'Yapılacaklar listesi',
    status: 'roadmap',
    note: 'Panelde henüz yok; landing’deki örnek temsilidir',
  },

  // ── AI Discovery Sensor ──
  {
    key: 'discovery_sensor',
    label: 'AI Discovery Sensor (siteye tek satır script)',
    status: 'beta',
    note: 'Her tür sitede çalışır (SaaS, hizmet, medya, eğitim, pazar yeri, e-ticaret); çerezsiz ve PII toplamaz',
  },
  {
    key: 'discovery_referral',
    label: 'AI kaynaklı gerçek ziyaret ölçümü (ChatGPT, Claude, Gemini, Perplexity, Copilot)',
    status: 'beta',
    note: 'Yalnızca tam hostname eşleşmesiyle; referrer yoksa AI tahmini yapılmaz',
  },
  {
    key: 'discovery_crawler',
    label: 'AI crawler ölçümü (sunucu/edge telemetrisi)',
    status: 'beta',
    note: "Cloudflare Worker veya Next.js middleware ile; yalnızca user-agent eşleşmesi 'doğrulanmış' sayılmaz",
  },
  {
    key: 'discovery_goals',
    label: 'Sektörden bağımsız hedef ve dönüşüm takibi',
    status: 'beta',
    note: 'Kayıt, demo, form, telefon, rezervasyon, başvuru, abonelik veya satış; kod yazmadan URL ile tanımlanır',
  },
  {
    key: 'prompt_attribution',
    label: 'Prompt kaynağı ayrımı (bildirilen / tahmin / sentetik)',
    status: 'beta',
    note: 'Gerçek prompt yalnızca ziyaretçi bildirirse bilinir; tahminler güven ve kanıtla gösterilir',
  },

  // ── Yol haritası ──
  {
    key: 'multi_brand',
    label: 'Çoklu marka (tek hesapta birden fazla kendi markası)',
    status: 'roadmap',
    note: 'Şu an hesap başına 1 kendi markası; ajanslar için çalışma alanları mevcut',
  },
  { key: 'webhooks', label: 'Giden webhooks (olay bildirimleri)', status: 'roadmap' },
  { key: 'pdf_report', label: 'Aylık PDF rapor', status: 'roadmap' },
  {
    key: 'perplexity',
    label: 'Perplexity görünürlük takibi',
    status: 'live',
    note: 'Sonar adaptörü kodda; ölçüm PERPLEXITY_API_KEY tanımlıysa çalışır. Kaynaklar Perplexity’nin kendi web aramasından gelir',
  },
  { key: 'grok', label: 'Grok görünürlük takibi', status: 'roadmap' },
  {
    key: 'billing',
    label: 'Kart ile online ödeme',
    status: 'roadmap',
    note: 'Fiyatlar açık (bkz. OFFER); ödeme sağlayıcısı henüz bağlı değil, abonelik teklifle başlatılır',
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

/**
 * Teklif ve fiyat — TEK kaynak (varsayılanlar). Sunucu tarafında SystemConfig ile geçersiz kılınabilir
 * (`apps/web/src/server/offer.ts` → getOffer()); istemci/statik bağlamlar bu varsayılanları kullanır.
 *
 *  - Ücretsiz: şok raporu + tüm /arac araçları (hesap gerekmez)
 *  - Yanıt (SaaS): aylık abonelik, `trialDays` gün ücretsiz deneme, kart gerekmez
 *  - Yanıt Agency: aylık sprint, `agencyFromMonthlyTry`'dan başlayan fiyat, teklifle
 */
export const OFFER = {
  /** Deneme süresi (gün) — kayıt anında trialEndsAt = now + trialDays */
  trialDays: 14,
  /** Yanıt SaaS aylık fiyat (₺/ay; KDV gösterimi iş kararı — sayfada belirtilmez) */
  saasMonthlyTry: 2490,
  /** Yanıt Agency aylık sprint başlangıç fiyatı (₺/ay'dan başlayan; teklifle) */
  agencyFromMonthlyTry: 30000,
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

export type Offer = {
  trialDays: number;
  saasMonthlyTry: number;
  agencyFromMonthlyTry: number;
  fairUse: typeof OFFER.fairUse;
};

/** ₺ biçimlendirme — "₺2.490" (tr-TR binlik ayırıcı, kuruş yok). */
export function formatTry(amount: number): string {
  return `₺${Math.round(amount).toLocaleString('tr-TR')}`;
}

/**
 * @deprecated OFFER kullanın. Eski "6 ay ücretsiz lansman" teklifi kaldırıldı; bu alias yalnızca
 * geriye uyumluluk için kalır (trialMonths artık OFFER.trialDays'ten türetilir, endsAt her zaman null).
 */
export const LAUNCH_OFFER = {
  startsAt: '2026-05-22',
  /** @deprecated ay cinsinden yaklaşık deneme süresi; OFFER.trialDays kullanın */
  trialMonths: OFFER.trialDays / 30,
  /** @deprecated kayıt hiçbir zaman kapanmaz */
  endsAt: null as string | null,
  fairUse: OFFER.fairUse,
} as const;

/** Kayıt her zaman açık (eski lansman kapanış tarihi kaldırıldı). */
export function launchOfferOpen(_now = new Date()): boolean {
  return true;
}
