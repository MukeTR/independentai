import Link from 'next/link';
import { Container } from '@/components/container';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { ArrowRight, BookOpen, Library, FileText, MessagesSquare, Bot, Wrench, ScrollText } from 'lucide-react';

export const metadata = buildMetadata({
  title: 'Kaynaklar — rehber, sözlük, blog, dokümantasyon',
  description:
    'Yapay zekâ görünürlüğü rehberi (GEO 101), sözlük, blog yazıları, ücretsiz araçlar, skor yöntemi ve Public API dokümantasyonu, YanitBot. Yanıt bilgi merkezi.',
  path: '/resources',
});

const RESOURCES = [
  {
    icon: BookOpen,
    title: 'GEO 101 rehberi',
    description: '12 bölümlük başucu rehberi: müşteriniz yapay zekâya sorduğunda görünür olmak.',
    href: '/resources/geo-101',
    cta: 'Rehberi aç',
  },
  {
    icon: Library,
    title: 'Sözlük',
    description: 'Görünürlük, Share of Voice, atıf, alias, YanitBot: terimlerin Türkçe açıklamaları.',
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
    description: 'Kurulum, skor yöntemi (/docs#skorlar), ücretsiz araç uçları ve Public API.',
    href: '/docs',
    cta: 'Dokümana git',
  },
  {
    icon: Wrench,
    title: 'Ücretsiz araçlar',
    description: 'Site sağlığı, görünürlük ve e-ticaret araçları; hesap yok, e-posta duvarı yok.',
    href: '/arac',
    cta: 'Araçları aç',
  },
  {
    icon: ScrollText,
    title: 'Sürüm notları',
    description: 'Ne eklendi, ne düzeltildi; tarihli.',
    href: '/changelog',
    cta: 'Sürüm notları',
  },
  {
    icon: Bot,
    title: 'YanitBot',
    description: 'Tarayıcımız ne çeker, ne çekmez, nasıl engellenir.',
    href: '/bot',
    cta: 'YanitBot',
  },
];

export default function Resources() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Kaynaklar', href: '/resources' },
        ]}
      />

      <section className="pt-24 pb-16">
        <Container className="max-w-4xl">
          <div className="eyebrow">Kaynaklar</div>
          <h1 className="font-display text-[48px] lg:text-[68px] tracking-tight mt-4 leading-[1.02]">
            Müşteriniz yapay zekâya soruyor; <span className="text-brand">öğrenmenin tüm yolları.</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            Yeni başlayanlar için 12 bölümlük rehber, hızlı referans için sözlük, derin dalış için blog, teknik
            dokümantasyon ve ücretsiz araçlar.
          </p>
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {RESOURCES.map((r) => (
              <Link key={r.href} href={r.href} className="card p-8 hover:bg-paper-3 transition group">
                <r.icon className="w-6 h-6 text-brand" aria-hidden />
                <h2 className="font-display text-[22px] mt-5 leading-snug group-hover:text-brand-deep transition">
                  {r.title}
                </h2>
                <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">{r.description}</p>
                <div className="inline-flex items-center gap-1.5 text-[13px] text-brand-deep mt-6">
                  {r.cta}
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" aria-hidden />
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
