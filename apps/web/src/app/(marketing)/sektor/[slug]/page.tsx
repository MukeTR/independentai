import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowRight, Check, MessageSquareQuote, Search, Wrench } from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { Faq } from '@/components/marketing/faq';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { SECTORS, sectorBySlug } from '@/data/sectors';
import { STATS } from '@/data/stats';
import { toolBySlug, toolPath } from '@/lib/tool-registry';

/** Sektörel çözüm sayfası. Veri tek kaynaktan (`data/sectors.ts`); araç bağlantısı yalnız yayındaki araçlara verilir. */

export function generateStaticParams() {
  return SECTORS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const sector = sectorBySlug(slug);
  if (!sector) return buildMetadata({ title: 'Sektörel çözümler', path: '/sektor', noIndex: true });
  return buildMetadata({
    title: `${sector.name} için yapay zekâ görünürlüğü`,
    description: `${sector.name} siteleri için: müşterinizin yapay zekâya sorduğu sorular, sitenizde eksik kalan sinyaller ve düzeltme sırası. Kurulum gerekmez.`,
    path: `/sektor/${sector.slug}`,
  });
}

export default async function SectorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sector = sectorBySlug(slug);
  if (!sector) notFound();

  const stat = STATS[sector.stat];
  const others = SECTORS.filter((s) => s.slug !== sector.slug).slice(0, 4);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Sektörel çözümler', href: '/sektor' },
          { name: sector.name, href: `/sektor/${sector.slug}` },
        ]}
      />
      <FaqJsonLd items={sector.faq.map((f) => ({ question: f.q, answer: f.a }))} />

      {/* Hero */}
      <section className="pt-20 pb-14">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <div className="eyebrow">Sektörel çözüm · {sector.name}</div>
              <h1 className="font-display text-[38px] lg:text-[52px] tracking-tight mt-3 leading-[1.05]">
                {sector.headline}
              </h1>
              <p className="text-[17px] lg:text-[18px] text-ink-muted mt-6 leading-relaxed max-w-2xl">{sector.intro}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/arac" className="btn-primary inline-flex items-center gap-2">
                  Sitemi ücretsiz tara <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
                <Link href={`/contact?src=sektor&sektor=${sector.slug}#sales`} className="btn-secondary">
                  Yanıt Agency ile konuş
                </Link>
              </div>
              <p className="text-[12.5px] text-ink-faint mt-4">
                Kayıt gerekmez · sayfanız yalnızca okunur · {stat.sentence}
              </p>
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-2xl overflow-hidden border border-hairline bg-paper-2">
                <Image
                  src={sector.image}
                  alt={sector.imageAlt}
                  width={900}
                  height={506}
                  priority
                  unoptimized
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Müşteriniz bunu soruyor */}
      <Section
        className="band border-t border-hairline"
        eyebrow="Müşteriniz bunu soruyor"
        title="Bu sorular bugün yapay zekâya soruluyor."
        intro="Satın almadan önce sorulan gerçek soru kalıpları. Sitenizde bu soruların karşılığı yoksa cevapta başka bir marka geçer."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sector.showcaseQuestions.map((q) => (
            <div key={q} className="card p-5 h-full flex gap-3">
              <MessageSquareQuote className="w-4 h-4 text-brand shrink-0 mt-1" aria-hidden />
              <p className="text-[14.5px] leading-relaxed">{q}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Bu sektörde 3 kontrol */}
      <Section
        eyebrow="Bu sektörde önce şuna bakılır"
        title="Üç kontrol, üç somut düzeltme."
        intro="Her sektörde eksik kalan sinyaller farklıdır. Sizinkinde sıralama şöyle."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {sector.checks.map((c, i) => {
            const tool = toolBySlug(c.tool);
            const live = tool?.enabled === true;
            return (
              <div key={c.tool} className="card p-7 h-full flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-brand-glow flex items-center justify-center shrink-0">
                    <Search className="w-4 h-4 text-brand" aria-hidden />
                  </span>
                  <span className="eyebrow">Adım {i + 1}</span>
                </div>
                <h3 className="font-display text-[19px] mt-4 leading-snug">{tool?.title ?? c.tool}</h3>
                <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">{c.why}</p>
                <div className="mt-auto pt-5">
                  {live ? (
                    <Link
                      href={toolPath(c.tool)}
                      className="inline-flex items-center gap-1.5 text-[13.5px] text-brand-deep hover:text-brand"
                    >
                      Aracı çalıştır <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                    </Link>
                  ) : (
                    <span className="text-[12.5px] text-ink-faint">Panelde ölçülür</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Nasıl ilerlersiniz */}
      <Section
        className="band border-t border-hairline"
        eyebrow="Nasıl ilerlersiniz"
        title="Siz düzeltin ya da biz düzeltelim."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-7 h-full flex flex-col">
            <div className="font-display text-[22px]">Yanıt</div>
            <p className="text-[14.5px] text-ink-muted mt-3 leading-relaxed">
              Ücretsiz araçlarla bugün başlayın; panelde {sector.name.toLocaleLowerCase('tr')} sorularınız her gün
              ölçülür, sıradaki iş listelenir.
            </p>
            <ul className="mt-5 space-y-2">
              {['Günlük ölçüm ve rakip dağılımı', 'Sayfa düzeyinde bulgular', 'Paylaşılabilir rapor bağlantısı'].map(
                (x) => (
                  <li key={x} className="flex items-center gap-2 text-[14px]">
                    <Check className="w-3.5 h-3.5 text-brand shrink-0" aria-hidden /> {x}
                  </li>
                ),
              )}
            </ul>
            <div className="mt-auto pt-7">
              <Link href="/pricing" className="btn-primary inline-flex items-center gap-2">
                Fiyatlandırmayı gör <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </div>
          </div>
          <div className="card p-7 h-full flex flex-col">
            <div className="font-display text-[22px]">Yanıt Agency</div>
            <p className="text-[14.5px] text-ink-muted mt-3 leading-relaxed">
              Listeyi uygulayacak vaktiniz yoksa ekibimiz üstlenir: teknik düzeltme, şema, içerik ve kaynak çalışması.
            </p>
            <ul className="mt-5 space-y-2">
              {['Aylık sprint, teklifle', 'İlerleme aynı panelde', 'Sonuç sözü değil, ölçüm'].map((x) => (
                <li key={x} className="flex items-center gap-2 text-[14px]">
                  <Wrench className="w-3.5 h-3.5 text-brand shrink-0" aria-hidden /> {x}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-7">
              <Link href="/yanit-agency" className="btn-secondary inline-flex items-center gap-2">
                Yanıt Agency’yi tanıyın <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </Section>

      <Section eyebrow="Sıkça sorulanlar" title={`${sector.name} için sorular.`}>
        <Faq items={sector.faq.map((f) => ({ question: f.q, answer: f.a }))} defaultOpen={0} />
      </Section>

      {/* Diğer sektörler */}
      <Section className="band border-t border-hairline" eyebrow="Diğer sektörler" title="Başka bir alandasınız?">
        <div className="flex flex-wrap gap-2.5">
          {others.map((s) => (
            <Link key={s.slug} href={`/sektor/${s.slug}`} className="chip !text-[13px] !px-4 !py-2 hover:border-brand">
              {s.name}
            </Link>
          ))}
          <Link href="/sektor" className="chip !text-[13px] !px-4 !py-2 hover:border-brand">
            Tüm sektörler
          </Link>
        </div>
      </Section>

      <CtaBlock />
    </>
  );
}
