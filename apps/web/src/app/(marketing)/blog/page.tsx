import Link from 'next/link';
import { Container } from '@/components/container';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { POSTS } from '@/data/blog-posts';
import { ArrowRight } from 'lucide-react';

export const metadata = buildMetadata({
  title: 'Blog — GEO, AI ve marka stratejisi',
  description: 'GEO (Generative Engine Optimization), AI brand visibility ve dijital pazarlama hakkında detaylı yazılar.',
  path: '/blog',
});

export default function Blog() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Ana sayfa', href: '/' }, { name: 'Blog', href: '/blog' }]} />

      <section className="pt-24 pb-16">
        <Container className="max-w-4xl">
          <div className="eyebrow">Blog</div>
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
            {POSTS.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="card p-7 hover:bg-paper-3 transition group">
                <div className="flex items-center gap-3">
                  <span className="chip">{p.category}</span>
                  <span className="text-[11px] text-ink-faint font-mono">{p.readTimeMin} dk okuma</span>
                  <span className="text-[11px] text-ink-faint">·</span>
                  <span className="text-[11px] text-ink-faint">{new Date(p.publishedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <h2 className="font-display text-[24px] mt-4 leading-snug group-hover:text-brand-deep transition">
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
        </Container>
      </section>

      <CtaBlock />
    </>
  );
}
