import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

const PAGES = [
  { path: '/', priority: 1.0, change: 'weekly' as const },
  { path: '/features', priority: 0.9, change: 'weekly' as const },
  { path: '/pricing', priority: 0.9, change: 'monthly' as const },
  { path: '/how-it-works', priority: 0.8, change: 'monthly' as const },
  { path: '/use-cases', priority: 0.8, change: 'monthly' as const },
  { path: '/about', priority: 0.6, change: 'monthly' as const },
  { path: '/contact', priority: 0.5, change: 'yearly' as const },
  { path: '/resources/geo-101', priority: 0.7, change: 'monthly' as const },
  { path: '/resources/glossary', priority: 0.6, change: 'monthly' as const },
  { path: '/blog', priority: 0.6, change: 'weekly' as const },
  { path: '/docs', priority: 0.5, change: 'monthly' as const },
  { path: '/legal/privacy', priority: 0.3, change: 'yearly' as const },
  { path: '/legal/terms', priority: 0.3, change: 'yearly' as const },
  { path: '/legal/kvkk', priority: 0.3, change: 'yearly' as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.change,
    priority: p.priority,
  }));
}
