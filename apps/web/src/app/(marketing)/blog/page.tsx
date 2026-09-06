import Link from 'next/link';
import { Container } from '@/components/container';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { PostGrid } from '@/components/marketing/post-grid';
import { BlogPagination } from '@/components/marketing/blog-pagination';
import { buildMetadata } from '@/lib/seo';
import { POSTS } from '@/data/blog-posts';
import { LayoutList } from 'lucide-react';

const PAGE_SIZE = 12;
const TOTAL_PAGES = Math.max(1, Math.ceil(POSTS.length / PAGE_SIZE));

export const metadata = buildMetadata({
  title: 'Blog — GEO, AI ve marka stratejisi',
  description:
    'GEO (Generative Engine Optimization), AI brand visibility ve dijital pazarlama hakkında detaylı yazılar.',
  path: '/blog',
});

export default function Blog() {
  // Sayfa 1 her zaman /blog'da (kendi kendine canonical). 2..N => /blog/sayfa/N.
  const pageItems = POSTS.slice(0, PAGE_SIZE);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Blog', href: '/blog' },
        ]}
      />

      <section className="pt-24 pb-16">
        <Container className="max-w-4xl">
          <div className="eyebrow">Blog · {POSTS.length} yazı</div>
          <h1 className="font-display text-[52px] lg:text-[68px] tracking-tight mt-4 leading-[1.02]">
            GEO, AI ve <span className="text-brand">marka stratejisi</span> üzerine.
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            Independent AI ekibinden uzun-formda araştırmalar, pratik rehberler ve sektörel görüşler. Türkiye pazarında
            GEO&apos;nun nasıl evrildiğini buradan takip edin.
          </p>
          <Link
            href="/blog/arsiv"
            className="inline-flex items-center gap-2 mt-7 text-[13.5px] text-brand-deep hover:gap-3 transition-all"
          >
            <LayoutList className="w-4 h-4" /> Tüm {POSTS.length} yazıyı kategoriye göre gör
          </Link>
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <PostGrid posts={pageItems} />
          <BlogPagination current={1} total={TOTAL_PAGES} />
        </Container>
      </section>

      <CtaBlock />
    </>
  );
}
