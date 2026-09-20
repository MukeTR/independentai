/**
 * Ücretsiz araç kataloğu — TEK kaynak. Nav, footer, sitemap, /arac hub'ı, panel araç kutusu, llms.txt ve
 * `PUBLIC_SCAN_LIMITS` eşlemesi buradan türetilir. Sunucu importu YOK (istemci bileşenleri de okur).
 *
 *  - `enabled:false` girişler henüz yayında değildir (INTEGRATE adımı `true` yapar); sayfaları yoksa link üretilmez.
 *  - `kind` `handlePublicScan` türüyle birebir eşleşir; `null` = URL taraması olmayan araç (rank checker, yazıcı).
 *  - `dashboard:true` girişler `DASHBOARD_TOOLS`'a türetilir (`dashboardSlug` public slug'dan farklıysa verilir).
 */
import type { AuditKind } from '@independentai/db';

export type ToolGroup = 'site-sagligi' | 'paylasim-dil' | 'ai-gorunurluk' | 'e-ticaret';

export type ToolIcon =
  | 'Gauge'
  | 'MessageCircle'
  | 'ShieldCheck'
  | 'ArrowRightLeft'
  | 'Unlink'
  | 'Map'
  | 'Languages'
  | 'Braces'
  | 'HelpCircle'
  | 'BadgeCheck'
  | 'Scale'
  | 'Store'
  | 'PackageSearch'
  | 'Bot'
  | 'Tags'
  | 'Search';

export type ToolEntry = {
  /** /arac/<slug> */
  slug: string;
  /** PublicScan/Audit türü; URL taraması olmayan araçta null */
  kind: AuditKind | null;
  /** Sayfa başlığı (h1 soru biçimindedir: `question`) */
  title: string;
  /** h1 — soru biçimi (mikro-kopya sözleşmesi) */
  question: string;
  /** Nav/dock kısa adı */
  shortTitle: string;
  /** Tek cümle — nav açıklaması, hub kartı, llms.txt */
  description: string;
  group: ToolGroup;
  /** POST ucu */
  endpoint: string;
  /** Tarama başına en fazla HTTP isteği (bütçe) */
  budgetRequests: number;
  /** Panelde kopyası var mı (/dashboard/tools/<dashboardSlug ?? slug>) */
  dashboard: boolean;
  dashboardSlug?: string;
  icon: ToolIcon;
  enabled: boolean;
  badge?: 'yeni';
};

export const TOOL_GROUP_LABELS: Record<ToolGroup, string> = {
  'site-sagligi': 'Site sağlığı',
  'paylasim-dil': 'Paylaşım ve dil',
  'ai-gorunurluk': 'AI görünürlüğü',
  'e-ticaret': 'E-ticaret',
};

/** Sektör landing slug'ları (`/sektor/<slug>`, `PublicScan.sector`, `QUESTION_COVERAGE` girdisi). */
export const SECTOR_SLUGS = [
  'saas',
  'ajans',
  'klinik',
  'hukuk-danismanlik',
  'eticaret-altyapi',
  'egitim',
  'gayrimenkul',
  'turizm',
  'b2b-uretici',
] as const;
export type SectorSlug = (typeof SECTOR_SLUGS)[number];

export function isSectorSlug(x: unknown): x is SectorSlug {
  return typeof x === 'string' && (SECTOR_SLUGS as readonly string[]).includes(x);
}

export const TOOL_REGISTRY: ToolEntry[] = [
  // ── Mevcut araçlar (yayında) ──
  {
    slug: 'e-ticaret-ai-gorunurluk-testi',
    kind: 'COMMERCE',
    title: 'E-ticaret AI görünürlük testi',
    question: 'Mağazanız AI asistanlarında öneriliyor mu?',
    shortTitle: 'E-ticaret AI görünürlük testi',
    description: 'Mağazanızı 6 eksende puanlar; katalog yapısı, Product şeması, AI bot erişimi.',
    group: 'e-ticaret',
    endpoint: '/api/tools/ecommerce-visibility',
    budgetRequests: 12,
    dashboard: true,
    dashboardSlug: 'ecommerce-visibility',
    icon: 'Store',
    enabled: true,
  },
  {
    slug: 'urun-sayfasi-testi',
    kind: 'PRODUCT_PAGE',
    title: 'Ürün sayfası testi',
    question: 'Ürün sayfanız AI cevaplarında doğru okunuyor mu?',
    shortTitle: 'Ürün sayfası testi',
    description: 'Product JSON-LD, açıklama özgünlüğü, görsel alt metni, SSS/özellik tablosu.',
    group: 'e-ticaret',
    endpoint: '/api/tools/product-page',
    budgetRequests: 4,
    dashboard: true,
    dashboardSlug: 'product-page',
    icon: 'PackageSearch',
    enabled: true,
  },
  {
    slug: 'ai-crawler-testi',
    kind: 'CRAWLER',
    title: 'AI crawler testi',
    question: 'GPTBot, ClaudeBot ve PerplexityBot sitenize erişebiliyor mu?',
    shortTitle: 'AI crawler testi',
    description: 'robots.txt bot matrisi, noindex/canonical/sitemap/llms.txt.',
    group: 'ai-gorunurluk',
    endpoint: '/api/tools/ai-crawler',
    budgetRequests: 6,
    dashboard: true,
    dashboardSlug: 'ai-crawler',
    icon: 'Bot',
    enabled: true,
  },
  {
    slug: 'urun-aciklama-yazici',
    kind: null,
    title: 'Ürün açıklama yazıcı',
    question: 'Ürününüz için AI alıntılamasına uygun açıklama ister misiniz?',
    shortTitle: 'Ürün açıklama yazıcı',
    description: 'Yalnızca verdiğiniz özelliklerle açıklama + SSS + meta + Product JSON-LD iskeleti.',
    group: 'e-ticaret',
    endpoint: '/api/tools/product-writer',
    budgetRequests: 0,
    dashboard: true,
    dashboardSlug: 'product-writer',
    icon: 'Tags',
    enabled: true,
  },
  {
    slug: 'chatgpt-rank-checker',
    kind: null,
    title: 'ChatGPT rank checker',
    question: 'Markanız ChatGPT’de görünüyor mu?',
    shortTitle: 'ChatGPT rank checker',
    description: 'Tek soru, tek model: markanız cevapta geçiyor mu, kaçıncı sırada?',
    group: 'ai-gorunurluk',
    endpoint: '/api/tools/rank-check',
    budgetRequests: 0,
    dashboard: false,
    icon: 'Search',
    enabled: true,
  },
  {
    slug: 'claude-rank-checker',
    kind: null,
    title: 'Claude rank checker',
    question: 'Markanız Claude’da görünüyor mu?',
    shortTitle: 'Claude rank checker',
    description: 'Tek soru, tek model: markanız cevapta geçiyor mu, kaçıncı sırada?',
    group: 'ai-gorunurluk',
    endpoint: '/api/tools/rank-check',
    budgetRequests: 0,
    dashboard: false,
    icon: 'Search',
    enabled: true,
  },
  {
    slug: 'gemini-rank-checker',
    kind: null,
    title: 'Gemini rank checker',
    question: 'Markanız Gemini’de görünüyor mu?',
    shortTitle: 'Gemini rank checker',
    description: 'Tek soru, tek model: markanız cevapta geçiyor mu, kaçıncı sırada?',
    group: 'ai-gorunurluk',
    endpoint: '/api/tools/rank-check',
    budgetRequests: 0,
    dashboard: false,
    icon: 'Search',
    enabled: true,
  },

  // ── Gece programı (W1–W3 yazar; INTEGRATE `enabled:true` yapar) ──
  {
    slug: 'seo-karnesi',
    kind: 'ONPAGE_SEO',
    title: 'SEO karnesi',
    question: 'Google ve ChatGPT sitenizi tek cümlede nasıl tanıyor?',
    shortTitle: 'SEO karnesi',
    description: 'Title, meta, H1, canonical, OG — tek ekranda.',
    group: 'site-sagligi',
    endpoint: '/api/tools/seo-karnesi',
    budgetRequests: 3,
    dashboard: true,
    icon: 'Gauge',
    enabled: false,
  },
  {
    slug: 'whatsapp-onizleme',
    kind: 'SOCIAL_PREVIEW',
    title: 'WhatsApp önizleme',
    question: 'Siteniz WhatsApp’ta nasıl görünüyor?',
    shortTitle: 'WhatsApp önizleme',
    description: 'Müşterinize attığınız link WhatsApp, LinkedIn ve X’te böyle görünüyor.',
    group: 'paylasim-dil',
    endpoint: '/api/tools/whatsapp-onizleme',
    budgetRequests: 3,
    dashboard: true,
    icon: 'MessageCircle',
    enabled: false,
  },
  {
    slug: 'guvenlik-basliklari',
    kind: 'SECURITY_HEADERS',
    title: 'Güvenlik başlıkları',
    question: 'Siteniz tarayıcıya ve yapay zekâya güven veriyor mu?',
    shortTitle: 'Güvenlik başlıkları',
    description: 'HSTS, CSP, X-Frame-Options ve TLS sertifikası — A+–F harf notu.',
    group: 'site-sagligi',
    endpoint: '/api/tools/guvenlik-basliklari',
    budgetRequests: 4,
    dashboard: true,
    icon: 'ShieldCheck',
    enabled: false,
  },
  {
    slug: 'yonlendirme-zinciri',
    kind: 'REDIRECTS',
    title: 'Yönlendirme zinciri',
    question: 'Siteniz kaç adımda açılıyor?',
    shortTitle: 'Yönlendirme zinciri',
    description: 'http/https × www/çıplak — hop sayısı, döngü, tek kanonik host.',
    group: 'site-sagligi',
    endpoint: '/api/tools/yonlendirme-zinciri',
    budgetRequests: 4,
    dashboard: true,
    icon: 'ArrowRightLeft',
    enabled: false,
  },
  {
    slug: 'kirik-link-bulucu',
    kind: 'BROKEN_LINKS',
    title: 'Kırık link bulucu',
    question: 'Yapay zekâ sizi kırık bir sayfaya mı yolluyor?',
    shortTitle: 'Kırık link bulucu',
    description: 'İç/dış linkler, görsel ve script kaynakları; derinlik 2, en fazla 40 sayfa.',
    group: 'site-sagligi',
    endpoint: '/api/tools/kirik-link-bulucu',
    budgetRequests: 120,
    dashboard: true,
    icon: 'Unlink',
    enabled: false,
  },
  {
    slug: 'robots-sitemap-kontrol',
    kind: 'ROBOTS_SITEMAP',
    title: 'robots.txt ve sitemap kontrolü',
    question: 'Arama motorları ve AI botları sitenize girebiliyor mu?',
    shortTitle: 'robots.txt ve sitemap',
    description: 'robots.txt sözdizimi, felaket kuralları, sitemap geçerliliği ve örneklem.',
    group: 'ai-gorunurluk',
    endpoint: '/api/tools/robots-sitemap-kontrol',
    budgetRequests: 16,
    dashboard: true,
    icon: 'Map',
    enabled: false,
  },
  {
    slug: 'hreflang-kontrol',
    kind: 'HREFLANG',
    title: 'hreflang kontrolü',
    question: 'İngilizce soran müşteri sizi görebiliyor mu?',
    shortTitle: 'hreflang kontrolü',
    description: 'Dil/bölge alternatifleri, karşılıklılık, x-default ve erişim.',
    group: 'paylasim-dil',
    endpoint: '/api/tools/hreflang-kontrol',
    budgetRequests: 22,
    dashboard: true,
    icon: 'Languages',
    enabled: false,
  },
  {
    slug: 'schema-denetimi',
    kind: 'SCHEMA_AUDIT',
    title: 'Schema denetimi',
    question: 'Yapay zekâ kim olduğunuzu şemadan öğrenebiliyor mu?',
    shortTitle: 'Schema denetimi',
    description: 'Organization/LocalBusiness, sayfa tipi, JSON-LD sözdizimi ve tutarlılık.',
    group: 'ai-gorunurluk',
    endpoint: '/api/tools/schema-denetimi',
    budgetRequests: 2,
    dashboard: true,
    icon: 'Braces',
    enabled: false,
  },
  {
    slug: 'musteriniz-nasil-soruyor',
    kind: 'QUESTION_COVERAGE',
    title: 'Müşteriniz sizi nasıl soruyor?',
    question: 'Müşteriniz sizi yapay zekâya nasıl soruyor?',
    shortTitle: 'Müşteriniz nasıl soruyor',
    description:
      'Sektörünüzü seçin: müşterinizin yapay zekâya yazdığı gerçek cümleleri aşama aşama görün; site adresi verirseniz o sayfada karşılıkları var mı bakalım.',
    group: 'ai-gorunurluk',
    endpoint: '/api/tools/musteriniz-nasil-soruyor',
    budgetRequests: 1,
    dashboard: true,
    icon: 'HelpCircle',
    enabled: true,
  },
  {
    slug: 'guven-sinyalleri',
    kind: 'TRUST_SIGNALS',
    title: 'Güven sinyalleri',
    question: 'Yapay zekâ sizi güvenilir buluyor mu?',
    shortTitle: 'Güven sinyalleri',
    description: 'Kimlik (ad/adres/telefon), KVKK ve çerez, hakkımızda, iletişim kanalları.',
    group: 'ai-gorunurluk',
    endpoint: '/api/tools/guven-sinyalleri',
    budgetRequests: 5,
    dashboard: true,
    icon: 'BadgeCheck',
    enabled: false,
  },
  {
    slug: 'rakip-kiyas',
    kind: 'COMPARE',
    title: 'Rakip kıyası',
    question: 'Rakibinizle yan yana: 14 maddede kim önde?',
    shortTitle: 'Rakip kıyası',
    description: 'İki site aynı formülle: kimlik, AI erişimi, teknik temel, paylaşılabilirlik.',
    group: 'ai-gorunurluk',
    endpoint: '/api/tools/rakip-kiyas',
    budgetRequests: 8,
    dashboard: true,
    icon: 'Scale',
    enabled: false,
  },
];

/** /arac/<slug> */
export function toolPath(slug: string): string {
  return `/arac/${slug}`;
}

/** /dashboard/tools/<dashboardSlug ?? slug> */
export function dashboardToolPath(entry: ToolEntry): string {
  return `/dashboard/tools/${entry.dashboardSlug ?? entry.slug}`;
}

export function toolBySlug(slug: string): ToolEntry | undefined {
  return TOOL_REGISTRY.find((t) => t.slug === slug);
}

export function toolByKind(kind: AuditKind): ToolEntry | undefined {
  return TOOL_REGISTRY.find((t) => t.kind === kind);
}

/** Yayındaki araçlar (nav/sitemap/hub bu listeyi kullanır). */
export function enabledTools(): ToolEntry[] {
  return TOOL_REGISTRY.filter((t) => t.enabled);
}
