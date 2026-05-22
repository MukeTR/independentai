import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import { POSTS } from '@/data/blog-posts';

/**
 * Dynamic sitemap — statik marketing/legal sayfalar + dinamik blog post'lar +
 * tüm docs, resources, use-cases, blog kategorileri.
 *
 * Yeni blog post veya yeni sayfa eklediğinde otomatik olarak sitemap'e girer.
 */

const STATIC_PAGES = [
  // Marketing
  { path: '/', priority: 1.0, change: 'weekly' as const },
  { path: '/features', priority: 0.9, change: 'weekly' as const },
  { path: '/pricing', priority: 0.9, change: 'monthly' as const },
  { path: '/how-it-works', priority: 0.8, change: 'monthly' as const },
  { path: '/use-cases', priority: 0.8, change: 'monthly' as const },
  { path: '/about', priority: 0.6, change: 'monthly' as const },
  { path: '/contact', priority: 0.5, change: 'yearly' as const },

  // Blog index ve pagination sayfaları
  { path: '/blog', priority: 0.8, change: 'daily' as const },

  // Resources hub + alt sayfalar
  { path: '/resources', priority: 0.7, change: 'monthly' as const },
  { path: '/resources/geo-101', priority: 0.8, change: 'monthly' as const },
  { path: '/resources/glossary', priority: 0.7, change: 'monthly' as const },

  // Docs
  { path: '/docs', priority: 0.6, change: 'monthly' as const },
  { path: '/docs/api', priority: 0.4, change: 'monthly' as const },
  { path: '/docs/webhooks', priority: 0.4, change: 'monthly' as const },

  // Changelog
  { path: '/changelog', priority: 0.5, change: 'weekly' as const },

  // Legal
  { path: '/legal/privacy', priority: 0.3, change: 'yearly' as const },
  { path: '/legal/terms', priority: 0.3, change: 'yearly' as const },
  { path: '/legal/kvkk', priority: 0.3, change: 'yearly' as const },
  { path: '/legal/cookies', priority: 0.3, change: 'yearly' as const },
];

const PAGE_SIZE = 12;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Statik sayfalar
  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.change,
    priority: p.priority,
  }));

  // Blog pagination sayfaları (sayfa 2, 3, ...)
  const totalPages = Math.ceil(POSTS.length / PAGE_SIZE);
  const blogPagination: MetadataRoute.Sitemap = [];
  for (let page = 2; page <= totalPages; page++) {
    blogPagination.push({
      url: `${SITE_URL}/blog?page=${page}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.5,
    });
  }

  // Tüm blog post'ları
  const blogEntries: MetadataRoute.Sitemap = POSTS.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'monthly',
    // Yeni post (son 30 gün) yüksek priority, eski post'lar düşük
    priority: (() => {
      const ageDays = (now.getTime() - new Date(post.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays < 30) return 0.7;
      if (ageDays < 90) return 0.6;
      if (ageDays < 180) return 0.5;
      return 0.4;
    })(),
  }));

  return [...staticEntries, ...blogPagination, ...blogEntries];
}
