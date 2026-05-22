import Link from 'next/link';
import { Container } from '@/components/container';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { POSTS } from '@/data/blog-posts';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 12;

export const metadata = buildMetadata({
  title: 'Blog — GEO, AI ve marka stratejisi',
  description: 'GEO (Generative Engine Optimization), AI brand visibility ve dijital pazarlama hakkında detaylı yazılar.',
  path: '/blog',
});

export default async function Blog({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? '1'));
  const totalPages = Math.max(1, Math.ceil(POSTS.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageItems = POSTS.slice(start, start + PAGE_SIZE);

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Ana sayfa', href: '/' }, { name: 'Blog', href: '/blog' }]} />

      <section className="pt-24 pb-16">
        <Container className="max-w-4xl">
          <div className="eyebrow">Blog · {POSTS.length} yazı</div>
          <h1 className="font-display text-[52px] lg:text-[68px] tracking-tight mt-4 leading-[1.02]">
            GEO, AI ve <span className="text-brand">marka stratejisi</span> üzerine.
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            Independent AI ekibinden uzun-formda araştırmalar, pratik rehberler ve sektörel görüşler.
            Türkiye pazarında GEO\'nun nasıl evrildiğini buradan takip edin.
          </p>
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pageItems.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="card p-7 hover:bg-paper-3 transition group">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="chip">{p.category}</span>
                  <span className="text-[11px] text-ink-faint font-mono">{p.readTimeMin} dk</span>
                  <span className="text-[11px] text-ink-faint">·</span>
                  <span className="text-[11px] text-ink-faint">{new Date(p.publishedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <h2 className="font-display text-[22px] mt-4 leading-snug group-hover:text-brand-deep transition">
                  {p.title}
                </h2>
                <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">{p.excerpt}</p>
                <div className="inline-flex items-center gap-1.5 text-[13px] text-brand-deep mt-5">
                  Devamını oku
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="mt-14 flex items-center justify-center gap-2 flex-wrap" aria-label="Sayfalama">
              <Link
                href={safePage > 1 ? `/blog?page=${safePage - 1}` : '/blog'}
                aria-disabled={safePage === 1}
                className={`btn-secondary !py-2 !px-3 inline-flex items-center gap-1 text-[12px] ${safePage === 1 ? 'opacity-40 pointer-events-none' : ''}`}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Önceki
              </Link>
              {Array.from({ length: totalPages }).map((_, i) => {
                const n = i + 1;
                const isCurrent = n === safePage;
                return (
                  <Link
                    key={n}
                    href={n === 1 ? '/blog' : `/blog?page=${n}`}
                    aria-current={isCurrent ? 'page' : undefined}
                    className={`min-w-[36px] h-9 inline-flex items-center justify-center rounded-lg text-[12.5px] tabular transition ${isCurrent ? 'bg-ink text-paper-3' : 'border-hairline border text-ink-muted hover:text-ink hover:bg-paper-3'}`}
                  >
                    {n}
                  </Link>
                );
              })}
              <Link
                href={safePage < totalPages ? `/blog?page=${safePage + 1}` : `/blog?page=${totalPages}`}
                aria-disabled={safePage === totalPages}
                className={`btn-secondary !py-2 !px-3 inline-flex items-center gap-1 text-[12px] ${safePage === totalPages ? 'opacity-40 pointer-events-none' : ''}`}
              >
                Sonraki <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </nav>
          )}
        </Container>
      </section>

      <CtaBlock />
    </>
  );
}
