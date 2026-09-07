/**
 * Pazarlama gezinmesi — tek kaynak (masaüstü mega menü + mobil menü + footer aynı veriyi kullanır).
 * Yalnızca var olan sayfalara link verilir; "yakında" olanlar rozetle işaretlenir, "var" gibi anlatılmaz.
 */
import type { MegaPanel } from './mega-menu';

export const SOLUTION_LINKS = [
  {
    href: '/solutions/ecommerce',
    title: 'E-ticaret',
    description: 'Mağazanı bağla, ürünlerin AI cevaplarında nasıl göründüğünü ölç.',
  },
  {
    href: '/solutions/shopify',
    title: 'Shopify',
    description: 'OAuth ile salt-okunur katalog; webhook ile canlı güncelleme.',
    badge: 'beta',
  },
  {
    href: '/solutions/ikas',
    title: 'ikas',
    description: 'Client ID/Secret ile bağlan; Türkiye e-ticaret altyapısı.',
    badge: 'beta',
  },
  {
    href: '/solutions/ticimax',
    title: 'Ticimax',
    description: 'Ürün servisi ile günlük katalog senkronu.',
    badge: 'beta',
  },
  {
    href: '/solutions/agencies',
    title: 'Ajanslar',
    description: 'Müşteri çalışma alanları, roller ve paylaşılabilir raporlar.',
  },
] as const;

export const ECOMMERCE_TOOL_LINKS = [
  {
    href: '/arac/e-ticaret-ai-gorunurluk-testi',
    title: 'E-ticaret AI görünürlük testi',
    description: 'Mağazan AI asistanlarında öneriliyor mu?',
  },
  { href: '/arac/urun-sayfasi-testi', title: 'Ürün sayfası testi', description: 'Ürün sayfan AI için okunabilir mi?' },
  {
    href: '/arac/ai-crawler-testi',
    title: 'AI crawler testi',
    description: 'GPTBot, ClaudeBot, Google-Extended erişimi',
  },
  {
    href: '/arac/urun-aciklama-yazici',
    title: 'Ürün açıklama yazıcı',
    description: 'AI-dostu, doğrulanabilir ürün metni',
    badge: 'beta',
  },
] as const;

export const RANK_CHECKER_LINKS = [
  { href: '/arac/chatgpt-rank-checker', title: 'ChatGPT rank checker' },
  { href: '/arac/claude-rank-checker', title: 'Claude rank checker' },
  { href: '/arac/gemini-rank-checker', title: 'Gemini rank checker' },
] as const;

export const NAV_PANELS: MegaPanel[] = [
  {
    label: 'Çözümler',
    sections: [
      {
        heading: 'Platforma göre',
        links: SOLUTION_LINKS.filter((l) => l.href !== '/solutions/agencies').map((l) => ({ ...l })),
      },
      {
        heading: 'Kime göre',
        links: [
          { href: '/solutions/agencies', title: 'Ajanslar', description: 'Çoklu müşteri, roller, paylaşım linkleri' },
          { href: '/use-cases#saas', title: 'SaaS şirketleri' },
          { href: '/use-cases#enterprise', title: 'Kurumsal markalar' },
          { href: '/use-cases', title: 'Tüm senaryolar' },
        ],
      },
    ],
    featured: {
      eyebrow: 'Yeni · beta',
      title: 'Mağazanı bağla, ürünlerin AI’da nasıl göründüğünü ölç',
      body: 'Shopify, ikas ve Ticimax için salt-okunur katalog senkronu; sipariş ve müşteri verisi çekilmez.',
      href: '/solutions/ecommerce',
      cta: 'E-ticaret çözümünü gör',
    },
  },
  {
    label: 'Özellikler',
    sections: [
      {
        heading: 'İzleme',
        links: [
          { href: '/features#tracking', title: '3 modelde paralel', description: 'ChatGPT, Claude, Gemini' },
          { href: '/features#detection', title: 'Akıllı marka tespiti', description: 'Alternatif yazımlar dahil' },
          { href: '/features#tracking', title: 'Günlük rerun', description: 'Her sabah taze veri' },
          { href: '/features#tracking', title: 'Anında çalıştırma', description: 'Tek tıkla yeniden tara' },
        ],
      },
      {
        heading: 'Analiz',
        links: [
          { href: '/features#analytics', title: 'Görünürlük skoru' },
          { href: '/features#analytics', title: 'Share of Voice' },
          { href: '/features#analytics', title: 'Zaman serisi trendi' },
          { href: '/features#detection', title: 'Tonal analiz', badge: 'beta' },
        ],
      },
    ],
    featured: {
      eyebrow: 'Demo',
      title: 'Canlı paneli 60 saniyede gör',
      body: 'Kayıt olmadan örnek bir hesap üzerinden tüm özellikleri keşfet.',
      href: '/login',
      cta: "Demo'ya gir",
    },
  },
  {
    label: 'Araçlar',
    sections: [
      { heading: 'E-ticaret · ücretsiz', links: ECOMMERCE_TOOL_LINKS.map((l) => ({ ...l })) },
      { heading: 'Rank checker · ücretsiz', links: RANK_CHECKER_LINKS.map((l) => ({ ...l })) },
    ],
    featured: {
      eyebrow: 'Kayıt gerekmez',
      title: 'Mağazan AI asistanlarında görünüyor mu?',
      body: 'Alan adını gir; AI hazırlık skorunu ve düzeltme önerilerini anında al.',
      href: '/arac/e-ticaret-ai-gorunurluk-testi',
      cta: 'Testi çalıştır',
    },
  },
  {
    label: 'Kaynaklar',
    sections: [
      {
        heading: 'Öğren',
        links: [
          { href: '/blog', title: 'Blog', description: 'GEO ve AI marka stratejisi' },
          { href: '/blog/arsiv', title: 'Tüm yazılar', description: 'Kategoriye göre tam arşiv' },
          { href: '/resources/geo-101', title: 'GEO 101 rehberi' },
          { href: '/resources/glossary', title: 'AI pazarlama sözlüğü' },
        ],
      },
      {
        heading: 'Yardım',
        links: [
          { href: '/docs', title: 'Dokümantasyon' },
          { href: '/changelog', title: 'Sürüm notları' },
          { href: '/contact', title: 'Destek' },
        ],
      },
      {
        heading: 'API',
        links: [
          { href: '/docs/api', title: 'API referansı' },
          { href: '/docs/webhooks', title: 'Giden webhooks', badge: 'yakında' },
        ],
      },
    ],
  },
  {
    label: 'Şirket',
    sections: [
      {
        heading: 'Hakkında',
        links: [
          { href: '/about', title: 'Independent AI nedir?' },
          { href: '/about#mission', title: 'Misyonumuz' },
          { href: '/about#team', title: 'Ekip' },
        ],
      },
      {
        heading: 'İletişim',
        links: [
          { href: '/contact', title: 'Bize yazın' },
          { href: '/contact#sales', title: 'Satış görüşmesi' },
          { href: '/contact#press', title: 'Basın' },
        ],
      },
    ],
  },
];
