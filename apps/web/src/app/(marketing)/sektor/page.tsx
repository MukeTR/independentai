import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { SECTORS } from '@/data/sectors';
import { STATS } from '@/data/stats';

const PATH = '/sektor';

export const metadata = buildMetadata({
  title: 'Sektörel çözümler — sektörünüze göre yapay zekâ görünürlüğü',
  description:
    'Dokuz sektör için ayrı ayrı: müşterinizin yapay zekâya sorduğu sorular, sitenizde eksik kalan sinyaller ve düzeltme sırası.',
  path: PATH,
});

export default function SektorIndexPage() {
  const stat = STATS.genAiUsage;
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Sektörel çözümler', href: PATH },
        ]}
      />

      <section className="pt-20 pb-14">
        <Container>
          <div className="max-w-3xl">
            <div className="eyebrow">Sektörel çözümler</div>
            <h1 className="font-display text-[40px] lg:text-[52px] tracking-tight mt-3 leading-[1.05]">
              Her sektörde farklı soru sorulur, <span className="text-brand">farklı sinyal eksiktir.</span>
            </h1>
            <p className="text-[17px] lg:text-[19px] text-ink-muted mt-6 leading-relaxed">
              Bir klinikte adres ve ruhsat sinyali, bir SaaS’ta karşılaştırma içeriği, bir otelde çok dillilik
              belirleyici olur. Sektörünüzü seçin: müşterinizin sorduğu sorular, önce bakılacak üç kontrol ve düzeltme
              sırası.
            </p>
            <p className="text-[13px] text-ink-faint mt-5">{stat.sentence}</p>
          </div>
        </Container>
      </section>

      <Section className="band border-t border-hairline">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {SECTORS.map((s) => (
            <Link
              key={s.slug}
              href={`/sektor/${s.slug}`}
              className="card overflow-hidden h-full flex flex-col group hover:border-brand/40 transition"
            >
              <span className="block border-b border-hairline bg-paper-3">
                <Image
                  src={s.image}
                  alt={s.imageAlt}
                  width={900}
                  height={506}
                  unoptimized
                  className="w-full h-[150px] object-cover"
                />
              </span>
              <span className="block p-6 flex-1">
                <span className="font-display text-[20px] block">{s.name}</span>
                <span className="text-[13.5px] text-ink-muted mt-2 block leading-relaxed">
                  {s.showcaseQuestions[0]}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[13px] text-brand-deep mt-4">
                  Sektör sayfasını aç
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" aria-hidden />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <CtaBlock />
    </>
  );
}
