import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/container';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd, JsonLd } from '@/components/json-ld';
import { LlmsTxtGenerator } from '@/components/marketing/llms-txt-generator';
import { buildMetadata } from '@/lib/seo';
import { POSTS, getPostBySlug } from '@/data/blog-posts';
import { ArrowLeft, Sparkles } from 'lucide-react';

// Slug bazlı interaktif araç eklemeleri.
// AI'a doğrudan konuşmak isteyen okuyucu için inline generator.
const INLINE_TOOLS: Record<string, { title: string; body: string; component: React.ComponentType }> = {
  'llms-txt-rehberi-2026': {
    title: 'Kendi llms.txt\'ini şimdi oluştur',
    body: 'Aşağıdaki interaktif araç ile markanın bilgilerini gir, llms.txt dosyanı anında indir. 30 saniyede hazır.',
    component: LlmsTxtGenerator,
  },
};

export async function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return buildMetadata({ title: 'Yazı bulunamadı', noIndex: true });
  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
  });
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Blog', href: '/blog' },
          { name: post.title, href: `/blog/${post.slug}` },
        ]}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.excerpt,
          datePublished: post.publishedAt,
          author: { '@type': 'Organization', name: 'Independent AI' },
          publisher: { '@type': 'Organization', name: 'Independent AI' },
        }}
      />

      <article className="pt-20 pb-24">
        <Container className="max-w-3xl">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-[12px] text-ink-faint hover:text-ink">
            <ArrowLeft className="w-3 h-3" /> Tüm yazılar
          </Link>

          <header className="mt-8 pb-8 border-b-hairline border-hairline">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="chip">{post.category}</span>
              <span className="text-[12px] text-ink-faint font-mono">{post.readTimeMin} dk okuma</span>
              <span className="text-[12px] text-ink-faint">·</span>
              <time dateTime={post.publishedAt} className="text-[12px] text-ink-faint">
                {new Date(post.publishedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </time>
            </div>
            <h1 className="font-display text-[40px] lg:text-[52px] tracking-tight mt-5 leading-[1.05]">
              {post.title}
            </h1>
            <p className="text-[17px] text-ink-muted mt-5 leading-relaxed">{post.excerpt}</p>
            <div className="text-[12px] text-ink-faint mt-6">
              {post.author.name} · <span className="font-mono">{post.author.role}</span>
            </div>
          </header>

          <div className="mt-10 space-y-6 text-[16px] leading-[1.75] text-ink">
            {post.body.map((b, i) => {
              switch (b.type) {
                case 'h2':
                  return <h2 key={i} className="font-display text-[26px] tracking-tight mt-10 mb-2">{b.text}</h2>;
                case 'h3':
                  return <h3 key={i} className="font-display text-[20px] tracking-tight mt-8 mb-1">{b.text}</h3>;
                case 'p':
                  return <p key={i} className="text-ink-muted">{b.text}</p>;
                case 'ul':
                  return (
                    <ul key={i} className="list-disc pl-6 space-y-2 text-ink-muted">
                      {b.items?.map((it, j) => <li key={j}>{it}</li>)}
                    </ul>
                  );
                case 'quote':
                  return (
                    <blockquote key={i} className="border-l-4 border-brand pl-5 py-2 text-[18px] italic text-ink">
                      {b.text}
                    </blockquote>
                  );
                case 'code':
                  return (
                    <pre key={i} className="card bg-paper-2 p-5 overflow-x-auto text-[12px] font-mono leading-relaxed">
                      <code>{b.text}</code>
                    </pre>
                  );
                default:
                  return null;
              }
            })}
          </div>

          {INLINE_TOOLS[post.slug] && (
            <div className="mt-12">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-brand" />
                <span className="eyebrow text-brand-deep">İnteraktif araç</span>
              </div>
              <h2 className="font-display text-[28px] tracking-tight">{INLINE_TOOLS[post.slug]!.title}</h2>
              <p className="text-[15px] text-ink-muted mt-3 leading-relaxed">{INLINE_TOOLS[post.slug]!.body}</p>
              {(() => {
                const Tool = INLINE_TOOLS[post.slug]!.component;
                return <Tool />;
              })()}
            </div>
          )}

          <div className="mt-16 pt-8 border-t-hairline border-hairline">
            <div className="eyebrow mb-4">Diğer yazılar</div>
            <div className="space-y-3">
              {POSTS.filter((p) => p.slug !== post.slug).slice(0, 3).map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="block hover:text-brand-deep transition">
                  <div className="text-[15px]">{p.title}</div>
                  <div className="text-[11px] text-ink-faint font-mono mt-1">{p.category} · {p.readTimeMin} dk</div>
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </article>

      <CtaBlock />
    </>
  );
}
