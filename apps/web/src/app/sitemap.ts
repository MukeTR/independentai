import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import { POSTS } from '@/data/blog-posts';

/**
 * SEO + GEO optimized sitemap
 * - Daha doğal priority dağılımı
 * - Pagination crawl-budget optimizasyonu
 * - Daha temiz lastModified handling
 * - Google uyumlu sade yapı
 */

const STATIC_PAGES = [
  // Core marketing
  { path: '/', priority: 1.0, change: 'weekly' as const },
  { path: '/features', priority: 0.8, change: 'weekly' as const },
  { path: '/pricing', priority: 0.8, change: 'monthly' as const },
  { path: '/how-it-works', priority: 0.7, change: 'monthly' as const },
  { path: '/use-cases', priority: 0.7, change: 'monthly' as const },

  // Company
  { path: '/about', priority: 0.5, change: 'monthly' as const },
  { path: '/contact', priority: 0.4, change: 'yearly' as const },

  // Blog
  { path: '/blog', priority: 0.7, change: 'daily' as const },

  // Resources
  { path: '/resources', priority: 0.7, change: 'monthly' as const },
  { path: '/resources/geo-101', priority: 0.7, change: 'monthly' as const },
  { path: '/resources/glossary', priority: 0.6, change: 'monthly' as const },

  // Docs
  { path: '/docs', priority: 0.5, change: 'monthly' as const },
  { path: '/docs/api', priority: 0.4, change: 'monthly' as const },
  { path: '/docs/webhooks', priority: 0.4, change: 'monthly' as const },

  // Changelog
  { path: '/changelog', priority: 0.4, change: 'weekly' as const },

  // Legal
  { path: '/legal/privacy', priority: 0.2, change: 'yearly' as const },
  { path: '/legal/terms', priority: 0.2, change: 'yearly' as const },
  { path: '/legal/kvkk', priority: 0.2, change: 'yearly' as const },
  { path: '/legal/cookies', priority: 0.2, change: 'yearly' as const },
];

const PAGE_SIZE = 12;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  /**
   * Static pages
   */
  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: `${SITE_URL}${page.path}`,
    lastModified: now,
    changeFrequency: page.change,
    priority: page.priority,
  }));

  /**
   * Blog pagination
   *
   * NOTE:
   * Pagination pages intentionally lower priority
   * to avoid crawl budget waste.
   */
  const totalPages = Math.ceil(POSTS.length / PAGE_SIZE);

  const blogPagination: MetadataRoute.Sitemap = Array.from(
    { length: Math.max(totalPages - 1, 0) },
    (_, index) => ({
      url: `${SITE_URL}/blog?page=${index + 2}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.2,
    }),
  );

  /**
   * Blog entries
   */
  const blogEntries: MetadataRoute.Sitemap = POSTS.map((post) => {
    const published = new Date(post.publishedAt);

    const ageDays =
      (now.getTime() - published.getTime()) /
      (1000 * 60 * 60 * 24);

    let priority = 0.4;

    if (ageDays <= 30) {
      priority = 0.7;
    } else if (ageDays <= 90) {
      priority = 0.6;
    } else if (ageDays <= 180) {
      priority = 0.5;
    }

    return {
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: published,
      changeFrequency: 'monthly' as const,
      priority,
    };
  });

  return [
    ...staticEntries,
    ...blogPagination,
    ...blogEntries,
  ];
}
