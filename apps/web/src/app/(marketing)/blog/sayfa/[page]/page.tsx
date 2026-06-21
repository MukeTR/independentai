import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/container';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { PostGrid } from '@/components/marketing/post-grid';
import { BlogPagination } from '@/components/marketing/blog-pagination';
import { buildMetadata } from '@/lib/seo';
import { POSTS } from '@/data/blog-posts';
import { ArrowLeft } from 'lucide-react';

const PAGE_SIZE = 12;
const TOTAL_PAGES = Math.max(1, Math.ceil(POSTS.length / PAGE_SIZE));

/** Sayfa 1 /blog'da; burada yalnızca 2..N statik üretilir. Her biri kendi kendine canonical. */
export function generateStaticParams() {
  return Array.from({ length: Math.max(TOTAL_PAGES - 1, 0) }, (_, i) => ({ page: String(i + 2) }));
}

function parsePage(raw: string): number | null {
  if (!/^[0-9]+$/.test(raw)) return null;
  const n = Number(raw);
  if (n < 2 || n > TOTAL_PAGES) return null;
  return n;
}

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const n = parsePage(page);
  if (!n) return buildMetadata({ title: 'Sayfa bulunamadı', noIndex: true });
  return buildMetadata({
    title: `Blog — Sayfa ${n}`,
    description: `GEO, AI brand visibility ve marka stratejisi yazıları — sayfa ${n}.`,
    path: `/blog/sayfa/${n}`,
  });
}

export default async function BlogPaginated({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const n = parsePage(page);
  if (!n) notFound();

  const start = (n - 1) * PAGE_SIZE;
  const pageItems = POSTS.slice(start, start + PAGE_SIZE);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Blog', href: '/blog' },
          { name: `Sayfa ${n}`, href: `/blog/sayfa/${n}` },
        ]}
      />

      <section className="pt-24 pb-10">
        <Container className="max-w-4xl">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-[12px] text-ink-faint hover:text-ink">
            <ArrowLeft className="w-3 h-3" /> Blog
          </Link>
          <div className="eyebrow mt-6">Sayfa {n} / {TOTAL_PAGES}</div>
          <h1 className="font-display text-[40px] lg:text-[52px] tracking-tight mt-3 leading-[1.04]">
            GEO, AI ve <span className="text-brand">marka stratejisi</span>
          </h1>
          <p className="text-[15px] text-ink-muted mt-5">
            Tüm yazıları tek sayfada görmek için <Link href="/blog/arsiv" className="text-brand-deep underline underline-offset-2">arşive</Link> göz atın.
          </p>
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <PostGrid posts={pageItems} />
          <BlogPagination current={n} total={TOTAL_PAGES} />
        </Container>
      </section>

      <CtaBlock />
    </>
  );
}
