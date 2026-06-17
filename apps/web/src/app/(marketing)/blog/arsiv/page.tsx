import Link from 'next/link';
import { Container } from '@/components/container';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd, JsonLd } from '@/components/json-ld';
import { buildMetadata, SITE_URL } from '@/lib/seo';
import { POSTS, getPostsByCategory } from '@/data/blog-posts';

export const metadata = buildMetadata({
  title: 'Tüm yazılar — Blog arşivi',
  description: `Independent AI blogundaki ${POSTS.length} yazının tamamı. GEO, AI brand visibility ve marka stratejisi üzerine rehberler, kategoriye göre düzenlendi.`,
  path: '/blog/arsiv',
});

/**
 * HTML arşiv — TÜM yazıları tek, crawlable, kendi kendine canonical sayfada listeler.
 * Footer + header'dan linklendiği için her yazı siteden en fazla 2 hop uzakta olur.
 * Bu, "discovered, not indexed" probleminin #1 yapısal sebebini (orphan yazılar) çözer.
 */
export default function BlogArchive() {
  const groups = getPostsByCategory();

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Blog', href: '/blog' },
          { name: 'Tüm yazılar', href: '/blog/arsiv' },
        ]}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Independent AI — Blog arşivi',
          url: `${SITE_URL}/blog/arsiv`,
          inLanguage: 'tr-TR',
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: POSTS.length,
            itemListElement: POSTS.map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `${SITE_URL}/blog/${p.slug}`,
              name: p.title,
            })),
          },
        }}
      />

      <section className="pt-24 pb-12">
        <Container className="max-w-4xl">
          <div className="eyebrow">Arşiv · {POSTS.length} yazı</div>
          <h1 className="font-display text-[48px] lg:text-[60px] tracking-tight mt-4 leading-[1.04]">
            Tüm yazılar
          </h1>
          <p className="text-[16px] text-ink-muted mt-6 leading-relaxed max-w-2xl">
            Independent AI blogundaki her yazı, kategoriye göre tek sayfada. Aradığınız konuya doğrudan ulaşın.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {groups.map((g) => (
              <a
                key={g.category}
                href={`#${g.category}`}
                className="chip hover:bg-paper-3 transition"
              >
                {g.category} · {g.posts.length}
              </a>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-20">
        <Container className="max-w-4xl">
          {groups.map((g) => (
            <div key={g.category} id={g.category} className="mt-12 scroll-mt-24 first:mt-0">
              <h2 className="font-display text-[24px] tracking-tight pb-3 border-b-hairline border-hairline">
                {g.category}
                <span className="text-ink-faint font-mono text-[13px] ml-2">{g.posts.length}</span>
              </h2>
              <ul className="mt-5 divide-y divide-hairline">
                {g.posts.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/blog/${p.slug}`}
                      className="group flex items-baseline justify-between gap-4 py-3 hover:text-brand-deep transition"
                    >
                      <span className="text-[15.5px] leading-snug">{p.title}</span>
                      <span className="shrink-0 text-[11px] text-ink-faint font-mono tabular">
                        {new Date(p.publishedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Container>
      </section>

      <CtaBlock />
    </>
  );
}
