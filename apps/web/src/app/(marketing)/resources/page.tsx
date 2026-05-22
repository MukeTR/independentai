import Link from 'next/link';
import { Container } from '@/components/container';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { ArrowRight, BookOpen, Library, FileText, MessagesSquare } from 'lucide-react';

export const metadata = buildMetadata({
  title: 'Kaynaklar — GEO öğrenmenin tüm yolları',
  description: 'GEO 101 rehberi, AI pazarlama sözlüğü, blog yazıları ve dokümantasyon. Independent AI bilgi merkezi.',
  path: '/resources',
});

const RESOURCES = [
  {
    icon: BookOpen,
    title: 'GEO 101 rehberi',
    description: '12 bölümlük başucu kitabı. AI çağında marka görünürlüğüne giriş.',
    href: '/resources/geo-101',
    cta: 'Rehberi aç',
  },
  {
    icon: Library,
    title: 'AI Pazarlama Sözlüğü',
    description: 'GEO, SoV, alias matching ve daha fazla terimin Türkçe karşılıkları.',
    href: '/resources/glossary',
    cta: 'Sözlüğe git',
  },
  {
    icon: MessagesSquare,
    title: 'Blog',
    description: 'Araştırmalar, sektörel görüşler, pratik rehberler.',
    href: '/blog',
    cta: 'Yazıları gör',
  },
  {
    icon: FileText,
    title: 'Dokümantasyon',
    description: 'Kurulum, kullanım ve API rehberleri.',
    href: '/docs',
    cta: 'Dokümana git',
  },
];

export default function Resources() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Ana sayfa', href: '/' }, { name: 'Kaynaklar', href: '/resources' }]} />

      <section className="pt-24 pb-16">
        <Container className="max-w-4xl">
          <div className="eyebrow">Kaynaklar</div>
          <h1 className="font-display text-[52px] lg:text-[68px] tracking-tight mt-4 leading-[1.02]">
            GEO öğrenmenin <span className="text-brand">tüm yolları.</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            Yeni başlayanlar için 12 sayfalık rehber, hızlı referans için sözlük, derin dalış için blog ve teknik dokümantasyon.
          </p>
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {RESOURCES.map((r) => (
              <Link key={r.href} href={r.href} className="card p-8 hover:bg-paper-3 transition group">
                <r.icon className="w-6 h-6 text-brand" />
                <h2 className="font-display text-[22px] mt-5 leading-snug group-hover:text-brand-deep transition">{r.title}</h2>
                <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">{r.description}</p>
                <div className="inline-flex items-center gap-1.5 text-[13px] text-brand-deep mt-6">
                  {r.cta}
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
