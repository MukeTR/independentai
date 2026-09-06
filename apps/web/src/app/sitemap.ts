import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import { POSTS } from '@/data/blog-posts';

/**
 * SEO + GEO optimize sitemap
 * - Query-param (?page=) yerine path-based sayfalama (/blog/sayfa/N) — kendi kendine
 *   canonical, "discovered, not indexed" tuzağını giderir.
 * - Statik sayfalarda SABİT lastmod (her deploy'da değişen new Date() değil) — Google'ın
 *   lastmod sinyaline güvenini korur.
 * - "Yakında" stub'ı (docs/webhooks) noindex olduğu için listelenmez; docs/api artık gerçek doküman.
 * - lastmod sayfa bazlı ve içerik tabanlıdır: yalnızca metni gerçekten değişen sayfa bump edilir.
 */

// Statik içeriğin varsayılan "en son değişti" tarihi. Deploy'da değişmemeli; bir sayfanın
// içeriği güncellenince o sayfanın `lastmod` alanı elle bump edilir (sahte tazelik churn'ünü önler).
const STATIC_LASTMOD = '2026-06-14';
// 2026-09-06: Public API dokümantasyonu, yetenek matrisine göre dürüstlük düzeltmeleri.
const CLAIMS_REVISION = '2026-09-06';

const PAGE_SIZE = 12;

type StaticPage = {
  path: string;
  priority: number;
  change: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  /** İçeriğin en son değiştiği tarih (ISO). Boşsa STATIC_LASTMOD. */
  lastmod?: string;
};

const STATIC_PAGES: StaticPage[] = [
  // Core marketing
  { path: '/', priority: 1.0, change: 'weekly', lastmod: CLAIMS_REVISION },
  { path: '/features', priority: 0.8, change: 'weekly', lastmod: CLAIMS_REVISION },
  { path: '/pricing', priority: 0.8, change: 'monthly', lastmod: CLAIMS_REVISION },
  { path: '/how-it-works', priority: 0.7, change: 'monthly', lastmod: CLAIMS_REVISION },
  { path: '/use-cases', priority: 0.7, change: 'monthly', lastmod: CLAIMS_REVISION },

  // Company
  { path: '/about', priority: 0.5, change: 'monthly' },
  { path: '/contact', priority: 0.4, change: 'yearly' },

  // Blog
  { path: '/blog', priority: 0.7, change: 'daily' },
  { path: '/blog/arsiv', priority: 0.6, change: 'weekly' },

  // Resources
  { path: '/resources', priority: 0.7, change: 'monthly' },
  { path: '/resources/geo-101', priority: 0.7, change: 'monthly' },
  { path: '/resources/glossary', priority: 0.6, change: 'monthly' },

  // Docs (yalnızca canlı olanlar — docs/webhooks "yakında" stub'ı noindex)
  { path: '/docs', priority: 0.5, change: 'monthly', lastmod: CLAIMS_REVISION },
  { path: '/docs/api', priority: 0.6, change: 'monthly', lastmod: CLAIMS_REVISION },

  // Ücretsiz public araçlar (lead-gen)
  { path: '/arac/chatgpt-rank-checker', priority: 0.7, change: 'monthly' },
  { path: '/arac/claude-rank-checker', priority: 0.7, change: 'monthly' },
  { path: '/arac/gemini-rank-checker', priority: 0.7, change: 'monthly' },

  // Changelog
  { path: '/changelog', priority: 0.4, change: 'weekly', lastmod: CLAIMS_REVISION },

  // Legal
  { path: '/legal/privacy', priority: 0.2, change: 'yearly' },
  { path: '/legal/terms', priority: 0.2, change: 'yearly' },
  { path: '/legal/kvkk', priority: 0.2, change: 'yearly' },
  { path: '/legal/cookies', priority: 0.2, change: 'yearly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticLastmod = new Date(STATIC_LASTMOD);

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: `${SITE_URL}${page.path}`,
    lastModified: page.lastmod ? new Date(page.lastmod) : staticLastmod,
    changeFrequency: page.change,
    priority: page.priority,
  }));

  /**
   * Blog sayfalama — path-based /blog/sayfa/N (sayfa 1 = /blog, üstte zaten var).
   * Her sayfa kendi kendine canonical olduğu için indekslenebilir gerçek hedeflerdir.
   */
  const totalPages = Math.ceil(POSTS.length / PAGE_SIZE);
  const blogPagination: MetadataRoute.Sitemap = Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) => ({
    url: `${SITE_URL}/blog/sayfa/${index + 2}`,
    lastModified: staticLastmod,
    changeFrequency: 'weekly',
    priority: 0.3,
  }));

  /**
   * Blog yazıları — lastmod gerçek yayın tarihinden (sabit, dürüst).
   */
  const now = new Date();
  const blogEntries: MetadataRoute.Sitemap = POSTS.map((post) => {
    const published = new Date(post.publishedAt);
    const ageDays = (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24);

    let priority = 0.4;
    if (ageDays <= 30) priority = 0.7;
    else if (ageDays <= 90) priority = 0.6;
    else if (ageDays <= 180) priority = 0.5;

    return {
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: published,
      changeFrequency: 'monthly' as const,
      priority,
    };
  });

  return [...staticEntries, ...blogPagination, ...blogEntries];
}
