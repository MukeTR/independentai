import { SITE_URL, BRAND_NAME } from '@/lib/seo';
import { POSTS } from '@/data/blog-posts';

/**
 * RSS 2.0 feed — yeni bir domain için ek bir keşif + tazelik kanalı.
 * Feed okuyucular, agregatörler ve e-posta araçları bu kanalı tüketir.
 * llms.txt/route.ts ile aynı force-static Route Handler kalıbını kullanır.
 */
export const dynamic = 'force-static';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function GET() {
  const items = POSTS.map((post) => {
    const url = `${SITE_URL}/blog/${post.slug}`;
    const pubDate = new Date(`${post.publishedAt}T09:00:00Z`).toUTCString();
    return `    <item>
      <title>${esc(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${esc(post.category)}</category>
      <description>${esc(post.excerpt)}</description>
    </item>`;
  }).join('\n');

  const lastBuild = POSTS.length
    ? new Date(`${POSTS[0]!.publishedAt}T09:00:00Z`).toUTCString()
    : new Date('2026-05-22T09:00:00Z').toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(BRAND_NAME)} — Blog</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <description>GEO (Generative Engine Optimization), AI brand visibility ve dijital pazarlama üzerine yazılar.</description>
    <language>tr-TR</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
