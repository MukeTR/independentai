import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowRight, Check, MessageSquareQuote, Search, TrendingDown, Wrench } from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { Faq } from '@/components/marketing/faq';
import { CtaBlock } from '@/components/marketing/cta-block';
import { Reveal } from '@/components/marketing/reveal';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { SECTORS, sectorBySlug } from '@/data/sectors';
import { sectorDeepBySlug } from '@/data/sector-deep';
import { STATS, STAT_KEYS } from '@/data/stats';
import { toolBySlug, toolPath } from '@/lib/tool-registry';

/**
 * Sektörel çözüm sayfası.
 *  - Çekirdek veri: `data/sectors.ts` (nav, sitemap, onboarding da buradan besleniyor).
 *  - Uzun anlatı: `data/sector-deep/<slug>.ts` — her sektörün kendi diliyle yazılmış bölümler.
 * Araç bağlantısı yalnız yayındaki araçlara verilir.
 */

export function generateStaticParams() {
  return SECTORS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const sector = sectorBySlug(slug);
  if (!sector) return buildMetadata({ title: 'Sektörel çözümler', path: '/sektor', noIndex: true });
  /**
   * Başlık 50-60 karakter aralığında kalsın: buildMetadata sonuna " — Yanıt" (8 karakter) ekler.
   * Kısa sektör adlarında uzun kalıp, uzun adlarda ("Hukuk ve danışmanlık") kısa kalıp kullanılır.
   */
  const longTitle = `${sector.name} siteleri için yapay zekâ görünürlüğü`;
  const title = longTitle.length + 8 <= 60 ? longTitle : `${sector.name} için yapay zekâ görünürlüğü`;

  return buildMetadata({
    title,
    description: `${sector.name} siteleri için: müşterinizin yapay zekâya sorduğu sorular, sitenizde eksik kalan sinyaller, üç kontrol ve düzeltme sırası. Kurulum gerekmez.`,
    path: `/sektor/${sector.slug}`,
  });
}

export default async function SectorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sector = sectorBySlug(slug);
  if (!sector) notFound();

  const deep = sectorDeepBySlug(sector.slug);
  const stat = STATS[sector.stat];
  const others = SECTORS.filter((s) => s.slug !== sector.slug).slice(0, 4);
  const sectorLower = sector.name.toLocaleLowerCase('tr');

  /**
   * Sayfada gerçekten geçen istatistiklerin kaynak listesi. Metinde geçmeyen bir kaynağı
   * listelemiyoruz: hero'daki istatistik + uzun anlatıda değeri geçen istatistikler.
   */
  const deepText = deep
    ? [deep.lede, ...deep.sections.flatMap((s) => s.paragraphs), ...deep.notes.map((n) => n.body)].join(' ')
    : '';
  const citedStats = STAT_KEYS.filter((k) => k === sector.stat || deepText.includes(STATS[k].value));

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
                Kayıt gerekmez · sayfanız yalnızca okunur · {stat.sentence}{' '}
                <a
                  href={stat.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-deep hover:text-brand"
                >
                  Kaynak: {stat.source}
                </a>
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

      {/* Kısa cevap — sayfanın tek başına alıntılanabilir tanımı, girizgâhtan önce */}
      <section className="pb-14 border-b border-hairline">
        <Container>
          <div className="card p-7 lg:p-8 max-w-3xl">
            <div className="eyebrow">Kısa cevap</div>
            <h2 className="font-display text-[22px] lg:text-[26px] tracking-tight mt-3 leading-snug">
              {sector.name} için yapay zekâ görünürlüğü ne demek?
            </h2>
            <p className="text-[15.5px] lg:text-[16.5px] text-ink mt-4 leading-relaxed">
              {sector.name} tarafında yapay zekâ görünürlüğü, müşterinizin bir asistana sorduğu satın alma sorusunun
              cevabında sizin anılıp anılmadığınız ve nasıl anlatıldığınızdır — bir sıra numarası değil, cevabın içinde
              geçip geçmemektir.
            </p>
            <p className="text-[14px] text-ink-muted mt-3.5 leading-relaxed">
              Yanıt bunu ölçer: “{sector.showcaseQuestions[0]}” gibi sorular her gün aynı biçimde sorulur, cevapta kimin
              geçtiği kaydedilir, sitenizde eksik kalan sinyal işaretlenir. Bu sayfada sırasıyla {sectorLower} tarafında
              işin nerede kaçtığını, önce bakılacak üç kontrolü ve ilk ayın hafta hafta planını bulacaksınız. Sonuç sözü
              verilmez; ölçüm, eksik listesi ve düzeltme sırası verilir.
            </p>
          </div>

          {deep && (
            <Reveal>
              <p className="max-w-3xl text-[19px] lg:text-[22px] text-ink leading-[1.55] font-display mt-12">
                {deep.lede}
              </p>
            </Reveal>
          )}
        </Container>
      </section>

      {/* Müşteriniz bunu soruyor */}
      <Section
        className="band border-t border-hairline"
        eyebrow="Müşteriniz bunu soruyor"
        title="Müşteriniz yapay zekâya ne soruyor?"
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

      {/* Nerede kaçıyor */}
      {deep && deep.lossMoments.length > 0 && (
        <Section
          eyebrow="Kayıp anları"
          title={`${sector.name} tarafında iş nerede kaçıyor?`}
          intro="Kısa cevap: kayıp, ziyaretin hiç gerçekleşmediği anda oluyor. Aşağıdaki dört an sitenizin trafiğinde görünmez; müşteri cevabı alıp yoluna devam eder."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {deep.lossMoments.map((m, i) => (
              <Reveal key={m.when} delay={i * 70}>
                <div className="card p-7 h-full">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-brand-glow flex items-center justify-center shrink-0">
                      <TrendingDown className="w-4 h-4 text-brand" aria-hidden />
                    </span>
                    <span className="font-mono text-[11px] text-ink-faint">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="font-display text-[19px] mt-4 leading-snug">{m.when}</h3>
                  <p className="text-[14.5px] text-ink-muted mt-3 leading-relaxed">{m.what}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {/* Uzun anlatı */}
      {deep && deep.sections.length > 0 && (
        <section className="py-20 lg:py-24 band border-t border-hairline">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-8 lg:col-start-1">
                {deep.sections.map((s, i) => (
                  <Reveal key={s.heading}>
                    <div className={i === 0 ? '' : 'mt-14'}>
                      <h2 className="font-display text-[26px] lg:text-[32px] tracking-tight leading-[1.15]">
                        {s.heading}
                      </h2>
                      {s.paragraphs.map((p, j) => (
                        <p key={j} className="text-[16px] lg:text-[17px] text-ink-muted mt-5 leading-[1.75]">
                          {p}
                        </p>
                      ))}
                      {i === 1 && (
                        <figure className="mt-10 max-w-[460px] mx-auto rounded-2xl border border-hairline bg-paper-3 overflow-hidden">
                          <Image
                            src={deep.illustration.src}
                            alt={deep.illustration.alt}
                            width={1200}
                            height={675}
                            unoptimized
                            className="w-full h-auto"
                          />
                          <figcaption className="text-[12.5px] text-ink-faint px-6 py-4 border-t border-hairline">
                            {deep.illustration.caption}
                          </figcaption>
                        </figure>
                      )}
                    </div>
                  </Reveal>
                ))}

                {citedStats.length > 0 && (
                  <div className="mt-12 pt-6 border-t border-hairline">
                    <div className="eyebrow">Kaynaklar</div>
                    <ul className="mt-3 space-y-2">
                      {citedStats.map((k) => {
                        const s = STATS[k];
                        return (
                          <li key={k} className="text-[12.5px] text-ink-faint leading-relaxed">
                            {s.label} — {s.value} ·{' '}
                            <a
                              href={s.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-deep hover:text-brand"
                            >
                              {s.source}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              {/* Yan sütun: neye bakıyoruz */}
              <aside className="lg:col-span-4">
                <div className="lg:sticky lg:top-24">
                  <div className="card p-7">
                    <div className="eyebrow">Sizde neye bakıyoruz</div>
                    <ul className="mt-5 space-y-4">
                      {deep.weExamine.map((w) => (
                        <li key={w.area}>
                          <div className="text-[14px] text-ink font-medium leading-snug">{w.area}</div>
                          <div className="text-[13px] text-ink-faint mt-1 leading-relaxed">{w.detail}</div>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/arac"
                      className="inline-flex items-center gap-1.5 text-[13.5px] text-brand-deep hover:text-brand mt-6"
                    >
                      Ücretsiz araçlarla başla <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                    </Link>
                  </div>
                </div>
              </aside>
            </div>
          </Container>
        </section>
      )}

      {/* Bu sektörde 3 kontrol */}
      <Section
        eyebrow="Bu sektörde önce şuna bakılır"
        title="Önce neye bakılır? Üç kontrol, üç somut düzeltme."
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

      {/* İlk ay */}
      {deep && deep.roadmap.length > 0 && (
        <Section
          className="band border-t border-hairline"
          eyebrow="İlk ay"
          title={`${sector.name} tarafında bir ay neye benziyor?`}
          intro="Sıra önemlidir: önce okunabilirlik, sonra cevap, sonra kaynak. Ters sırayla çalışmak emeği boşa çıkarır."
        >
          <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {deep.roadmap.map((r) => (
              <li key={r.week} className="card p-6 h-full flex flex-col">
                <span className="chip own !text-[10.5px] self-start">{r.week}</span>
                <h3 className="font-display text-[17px] mt-4 leading-snug">{r.title}</h3>
                <p className="text-[13.5px] text-ink-muted mt-2.5 leading-relaxed">{r.detail}</p>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Nasıl ilerlersiniz */}
      <Section eyebrow="Nasıl ilerlersiniz" title="Nasıl ilerlersiniz: siz mi düzeltirsiniz, biz mi?">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-7 h-full flex flex-col">
            <h3 className="font-display text-[22px]">Yanıt</h3>
            <p className="text-[14.5px] text-ink-muted mt-3 leading-relaxed">
              Ücretsiz araçlarla bugün başlayın; panelde {sectorLower} sorularınız her gün ölçülür, sıradaki iş
              listelenir.
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
            <h3 className="font-display text-[22px]">Yanıt Agency</h3>
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

      {/* Sektör notları */}
      {deep && deep.notes.length > 0 && (
        <Section
          className="band border-t border-hairline"
          eyebrow="Dikkat notları"
          title={`${sector.name} tarafında atlanmaması gerekenler.`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {deep.notes.map((n) => (
              <div key={n.title} className="card p-6 h-full">
                <h3 className="font-display text-[17px] leading-snug">{n.title}</h3>
                <p className="text-[13.5px] text-ink-muted mt-3 leading-relaxed">{n.body}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section eyebrow="Sıkça sorulanlar" title={`${sector.name} için sorular.`}>
        <Faq items={sector.faq.map((f) => ({ question: f.q, answer: f.a }))} defaultOpen={0} />
        {deep && <p className="text-[16px] lg:text-[17px] text-ink mt-12 max-w-2xl leading-relaxed">{deep.closing}</p>}
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
