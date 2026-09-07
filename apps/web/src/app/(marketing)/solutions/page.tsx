import Link from 'next/link';
import { ArrowRight, Boxes, Briefcase, ShoppingBag, ShoppingCart, Store } from 'lucide-react';
import { Container } from '@/components/container';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { SOLUTION_LINKS } from '@/components/nav-data';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Çözümler — E-ticaret, Shopify, ikas, Ticimax ve ajanslar',
  description:
    'Mağazanı bağla, ürünlerinin ChatGPT, Claude ve Gemini cevaplarında nasıl göründüğünü ölç. Shopify, ikas ve Ticimax için salt-okunur katalog senkronu; ajanslar için çoklu müşteri çalışma alanları.',
  path: '/solutions',
});

const ICONS: Record<string, typeof Store> = {
  '/solutions/ecommerce': ShoppingCart,
  '/solutions/shopify': ShoppingBag,
  '/solutions/ikas': Store,
  '/solutions/ticimax': Boxes,
  '/solutions/agencies': Briefcase,
};

export default function SolutionsIndex() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Çözümler', href: '/solutions' },
        ]}
      />
      <section className="pt-24 pb-12">
        <Container className="max-w-4xl">
          <div className="eyebrow">Çözümler</div>
          <h1 className="font-display text-[48px] lg:text-[64px] tracking-tight mt-4 leading-[1.04]">
            Hangi altyapıda olursan ol, <span className="text-brand">AI asistanlarında nasıl göründüğünü ölç.</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            E-ticaret mağazaları için salt-okunur katalog bağlantıları (beta), ajanslar için çoklu müşteri çalışma
            alanları. Her sayfada neyin çalıştığını ve sınırlarını açıkça yazıyoruz.
          </p>
        </Container>
      </section>
      <section className="pb-16">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SOLUTION_LINKS.map((s) => {
              const Icon = ICONS[s.href] ?? Store;
              return (
                <Link key={s.href} href={s.href} className="card p-6 group hover:-translate-y-0.5 transition-transform">
                  <div className="flex items-center justify-between">
                    <Icon className="w-5 h-5 text-brand" aria-hidden />
                    {'badge' in s && s.badge ? <span className="chip !text-[10px]">{s.badge}</span> : null}
                  </div>
                  <h2 className="font-display text-[20px] mt-4">{s.title}</h2>
                  <p className="text-[13.5px] text-ink-muted mt-2 leading-relaxed">{s.description}</p>
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-brand-deep mt-4 group-hover:text-brand">
                    İncele <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                  </span>
                </Link>
              );
            })}
          </div>
        </Container>
      </section>
      <CtaBlock
        eyebrow="Lansman · ücretsiz"
        title={
          <>
            Önce ölç, <span className="text-brand">sonra düzelt.</span>
          </>
        }
        body="Kayıt 30 saniye sürer. Mağaza bağlamadan da ücretsiz araçlarla başlayabilirsin."
        secondaryHref="/arac/e-ticaret-ai-gorunurluk-testi"
        secondaryLabel="Ücretsiz testi dene"
      />
    </>
  );
}
