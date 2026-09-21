import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/container';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd, WebPageJsonLd } from '@/components/json-ld';
import { SECTORS, sectorPath } from '@/data/sectors';
import { statSentence } from '@/data/stats';
import { buildMetadata } from '@/lib/seo';

/** /sektor — 9 sektör kartı (görsel + "N soru"); her kart kendi landing'ine gider. */
export const metadata = buildMetadata({
  title: 'Sektöre göre yapay zekâ görünürlük testi — 9 sektör',
  description:
    'SaaS, ajans, klinik, hukuk ve danışmanlık, e-ticaret altyapısı, eğitim, gayrimenkul, turizm ve B2B üretici siteleri için müşterinin yapay zekâya sorduğu sorular ve ücretsiz görünürlük testi.',
  path: '/sektor',
});

export default function SectorIndexPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Sektörler', href: '/sektor' },
        ]}
      />
      <WebPageJsonLd
        path="/sektor"
        name="Sektöre göre yapay zekâ görünürlük testi"
        description="9 sektör için müşterinin yapay zekâya sorduğu satın alma soruları, sektör kontrolleri ve ücretsiz test."
      />

      <section className="pt-24 pb-14">
        <Container className="max-w-4xl">
          <div className="eyebrow">Sektöre göre</div>
          <h1 className="font-display text-[44px] lg:text-[64px] tracking-tight mt-4 leading-[1.03]">
            Müşteriniz hangi soruyu soruyor? <span className="text-brand">Sektörünüzü seçin.</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            Her sektörde satın alma sorusu farklı kurulur: konum, fiyat ve güven işareti aynı cümlede. Sektör sayfasında
            beş örnek soru, üç teknik kontrol ve sektör ön-seçili ücretsiz test bulunur.
          </p>
          <p className="text-[13.5px] mt-5 max-w-2xl leading-relaxed border-l-2 border-brand/40 pl-4">
            {statSentence('genAiUsage')}
          </p>
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-label="Sektörler">
            {SECTORS.map((s, i) => (
              <li key={s.slug} className={`rise-${Math.min(i + 1, 5)}`}>
                <Link
                  href={sectorPath(s.slug)}
                  className="card overflow-hidden flex flex-col h-full hover:border-ink transition group"
                >
                  <div className="bg-paper-2 border-b border-hairline">
                    <Image
                      src={s.image}
                      alt={s.imageAlt}
                      width={1600}
                      height={896}
                      sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                      className="w-full h-auto"
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-display text-[22px] tracking-tight leading-tight">{s.name}</h2>
                      <span className="chip !text-[11px] tabular shrink-0">{s.showcaseQuestions.length} soru</span>
                    </div>
                    <p className="text-[14px] text-ink-muted mt-3 leading-relaxed line-clamp-3">“{s.showcaseQuestions[0]}”</p>
                    <span className="mt-auto pt-5 inline-flex items-center gap-1.5 text-[13.5px] text-brand-deep group-hover:text-brand font-medium">
                      Sektör testini aç <ArrowRight className="w-4 h-4" aria-hidden />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <CtaBlock
        eyebrow="Sektörünüz listede yok mu?"
        title={
          <>
            Test yine çalışır — <span className="text-brand">genel kontrollerle.</span>
          </>
        }
        body="Sektör seçmeden de SEO karnesi, WhatsApp önizleme ve güvenlik başlıkları araçlarını kullanabilirsiniz; hesap, e-posta veya kart gerekmez."
        primaryHref="/arac"
        primaryLabel="Tüm ücretsiz araçlar"
        secondaryHref="/contact?src=sektor"
        secondaryLabel="Sektörünüzü bize yazın"
      />
    </>
  );
}
