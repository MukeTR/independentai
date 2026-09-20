import Link from 'next/link';
import { ArrowRight, Boxes, Briefcase, ShoppingBag, ShoppingCart, Sparkles, Store } from 'lucide-react';
import { Container } from '@/components/container';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { SOLUTION_LINKS } from '@/components/nav-data';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Çözümler — sektör, platform ve ajans',
  description:
    'Sektörünüze göre sayfalar, Shopify / ikas / Ticimax için salt-okunur katalog bağlantısı (beta), ajanslar için müşteri portföyü ve ortaklık programı, uygulama için Yanıt Agency.',
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
            Hangi sektörde, hangi altyapıda olursanız olun:{' '}
            <span className="text-brand">yapay zekâ sizi mi öneriyor, rakibinizi mi?</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            Sektör sayfaları, e-ticaret platformları için salt-okunur katalog bağlantıları (beta), ajanslar için müşteri
            portföyü ve ortaklık programı, uygulama için Yanıt Agency. Her sayfada neyin çalıştığını ve sınırlarını
            açıkça yazıyoruz.
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
            <Link
              href="/yanit-agency"
              className="card p-6 group hover:-translate-y-0.5 transition-transform grad-border"
            >
              <div className="flex items-center justify-between">
                <Sparkles className="w-5 h-5 text-brand" aria-hidden />
                <span className="chip !text-[10px]">hizmet · teklifle</span>
              </div>
              <h2 className="font-display text-[20px] mt-4">Yanıt Agency</h2>
              <p className="text-[13.5px] text-ink-muted mt-2 leading-relaxed">
                Analizi biz yaptık, uygulamayı da biz yapalım: teknik düzeltme, şema, içerik, kaynak çalışması.
              </p>
              <span className="inline-flex items-center gap-1.5 text-[13px] text-brand-deep mt-4 group-hover:text-brand">
                İncele <ArrowRight className="w-3.5 h-3.5" aria-hidden />
              </span>
            </Link>
            <Link href="/sektor" className="card p-6 group hover:-translate-y-0.5 transition-transform">
              <div className="flex items-center justify-between">
                <Store className="w-5 h-5 text-brand" aria-hidden />
                <span className="chip !text-[10px]">9 sektör</span>
              </div>
              <h2 className="font-display text-[20px] mt-4">Sektöre göre</h2>
              <p className="text-[13.5px] text-ink-muted mt-2 leading-relaxed">
                Klinik, hukuk, SaaS, e-ticaret, ajans, eğitim, turizm, gayrimenkul, B2B üretici: müşterinin sorduğu 5
                soru ve 3 kontrol.
              </p>
              <span className="inline-flex items-center gap-1.5 text-[13px] text-brand-deep mt-4 group-hover:text-brand">
                Sektörler <ArrowRight className="w-3.5 h-3.5" aria-hidden />
              </span>
            </Link>
          </div>
        </Container>
      </section>
      <CtaBlock
        eyebrow="Önce ücretsiz"
        title={
          <>
            Önce ölç, <span className="text-brand">sonra düzelt.</span>
          </>
        }
        body="Ücretsiz araçlar hesap istemez. Sürekli ölçüm için hesap açın; kart gerekmez."
        secondaryHref="/arac"
        secondaryLabel="Ücretsiz araçlar"
      />
    </>
  );
}
