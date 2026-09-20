import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { Faq } from '@/components/marketing/faq';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { SECTORS } from '@/data/sectors';
import { STATS } from '@/data/stats';

const PATH = '/sektor';

/** Her sektör sayfasında birebir aynı sırayla duran bölümler — sayfa açılmadan da cevaplanabilsin. */
const WHATS_INSIDE = [
  'Müşterinizin o sektörde yapay zekâya sorduğu beş gerçek soru kalıbı',
  'İşin nerede kaçtığını anlatan dört an: randevu, teklif, kayıt dönemi, sezon',
  'Sizde tam olarak neye bakıldığı — sektöre özel inceleme kalemleri',
  'Önce bakılacak üç kontrol ve her birinin neden o sırada olduğu',
  'İlk ayın hafta hafta planı, sektör notları ve beş soruluk SSS',
];

const FAQ = [
  {
    question: 'Sektör sayfası ne işe yarar?',
    answer:
      'Sektör sayfası, o alandaki bir işletmenin yapay zekâ cevaplarında hangi sinyaller yüzünden geride kaldığını ve hangi düzeltmenin önce yapılması gerektiğini gösterir. İçinde müşterinin sorduğu gerçek soru kalıpları, işin nerede kaçtığı anlar, incelenen kalemler, üç kontrol ve ilk ayın hafta hafta planı bulunur.',
  },
  {
    question: 'Sektörüm listede yoksa ölçüm yine de çalışır mı?',
    answer:
      'Çalışır. Kontroller sayfanızın HTML çıktısına bakar: başlık yapısı, meta alanları, schema.org verisi, robots.txt, sitemap, yönlendirmeler ve bağlantılar. Sektör sayfaları yalnızca sıralamayı ve örnekleri değiştirir; ölçümün kendisi sektöre bağlı değildir.',
  },
  {
    question: 'Sektör sayfalarındaki sorular nereden geliyor?',
    answer:
      'Her sektörde listelenen sorular, o alanda satın almadan önce sorulan kalıplardan derlenmiştir; müşteri görüşmelerinde ve satış itirazlarında tekrar eden ifadelerle aynı biçimde yazılır. Sizin listeniz farklı olabilir: panelde kendi sorularınızı ekler, ölçümü onların üzerinden yürütürsünüz.',
  },
  {
    question: 'Sektör sayfasındaki adımları kim uygular?',
    answer:
      'Uygulamayı siz, kendi ekibiniz ya da mevcut ajansınız yapabilir; Yanıt yalnızca ölçer ve sırayı verir. Listeyi uygulayacak vaktiniz yoksa Yanıt Agency aynı işi aylık sprintle üstlenir ve ilerleme aynı panelde görünür.',
  },
];

export const metadata = buildMetadata({
  title: 'Sektörel çözümler — yapay zekâ görünürlüğü ölçümü',
  description:
    'Dokuz sektör için ayrı ayrı: müşterinizin yapay zekâya sorduğu sorular, sitenizde eksik kalan sinyaller, önce bakılacak kontroller ve düzeltme sırası.',
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
      <FaqJsonLd items={FAQ} />

      <section className="pt-20 pb-14">
        <Container>
          <div className="max-w-3xl">
            <div className="eyebrow">Sektörel çözümler</div>
            <h1 className="font-display text-[40px] lg:text-[52px] tracking-tight mt-3 leading-[1.05]">
              Her sektörde farklı soru sorulur, <span className="text-brand">farklı sinyal eksiktir.</span>
            </h1>
            <p className="text-[17px] lg:text-[19px] text-ink mt-6 leading-relaxed">
              Yanıt, dokuz sektör için ayrı ayrı yazılmış bir ölçüm sırası sunar: müşterinizin yapay zekâya sorduğu
              gerçek sorular, sitenizde eksik kalan sinyaller, önce bakılacak üç kontrol ve düzeltme sırası.
            </p>
            <p className="text-[16px] text-ink-muted mt-4 leading-relaxed">
              Çünkü sinyaller sektöre göre değişir: bir klinikte adres ve ruhsat bilgisi, bir SaaS’ta karşılaştırma
              içeriği, bir otelde çok dillilik belirleyici olur. Aşağıdan sektörünüzü seçin.
            </p>
            <p className="text-[13px] text-ink-faint mt-5">
              {stat.sentence}{' '}
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
        </Container>
      </section>

      <Section className="band border-t border-hairline" title="Sektörünüzü seçin">
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
              <div className="p-6 flex-1">
                <h3 className="font-display text-[20px]">{s.name}</h3>
                <p className="text-[13.5px] text-ink-muted mt-2 leading-relaxed">{s.showcaseQuestions[0]}</p>
                <span className="inline-flex items-center gap-1.5 text-[13px] text-brand-deep mt-4">
                  Sektör sayfasını aç
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" aria-hidden />
                </span>
              </div>
            </Link>
          ))}
        </div>
        <p className="text-[14.5px] text-ink-muted mt-10 max-w-2xl leading-relaxed">
          Sektörünüz listede yoksa da ölçüm çalışır: kontroller sayfanızın HTML çıktısına bakar. Sıralanan işleri
          uygulayacak vaktiniz yoksa{' '}
          <Link href="/yanit-agency" className="text-brand-deep hover:text-brand">
            Yanıt Agency aylık sprintle üstlenir
          </Link>
          .
        </p>
      </Section>

      <Section
        eyebrow="Sayfanın içinde ne var"
        title="Bir sektör sayfası neyi anlatıyor?"
        intro="Dokuz sayfanın hepsi aynı sırayla kurulur; yalnızca örnekler ve kontroller sektöre göre değişir."
      >
        <ol className="card divide-y divide-hairline max-w-3xl">
          {WHATS_INSIDE.map((x, i) => (
            <li key={x} className="p-5 flex gap-3.5 text-[14.5px] leading-relaxed">
              <span className="font-mono text-[12px] text-ink-faint tabular mt-0.5">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{x}</span>
            </li>
          ))}
        </ol>
        <p className="text-[13.5px] text-ink-muted mt-6 max-w-3xl leading-relaxed">
          Sayfalardaki sayılar yalnızca{' '}
          <Link href="/about#tanimlar" className="text-brand-deep hover:text-brand">
            kaynaklı istatistiklerden
          </Link>{' '}
          gelir; örnek akışlar “temsili” diye işaretlenir. Sonuç sözü verilmez: ölçeriz, eksiği gösteririz, düzeltme
          sırasını veririz, sonra aynı biçimde tekrar ölçeriz.
        </p>
      </Section>

      <Section className="band border-t border-hairline" eyebrow="Sıkça sorulanlar" title="Sektör sayfaları hakkında.">
        <Faq items={FAQ} defaultOpen={0} />
      </Section>

      <CtaBlock />
    </>
  );
}
