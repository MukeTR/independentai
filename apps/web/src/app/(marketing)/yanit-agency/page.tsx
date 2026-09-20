import Link from 'next/link';
import { Ciz } from '@/components/marketing/ciz';
import {
  ArrowRight,
  Check,
  ClipboardList,
  Code2,
  FileText,
  Gauge,
  Link2,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { capability, formatTry } from '@independentai/shared';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { CtaBlock } from '@/components/marketing/cta-block';
import { Faq } from '@/components/marketing/faq';
import { BreadcrumbJsonLd, FaqJsonLd, JsonLd } from '@/components/json-ld';
import { buildMetadata, ORG_ID, SITE_URL } from '@/lib/seo';
import { getOffer } from '@/server/offer';

export const metadata = buildMetadata({
  title: 'Yanıt Agency — analizi biz yaptık, uygulamayı da biz yapalım',
  description:
    'Yanıt’ın bulduğu listeyi ekibimiz uygular: teknik düzeltme, şema, içerik ve kaynak çalışması. Aylık sprint, teklifle; ölçüm aynı panelde.',
  path: '/yanit-agency',
});

/**
 * Hizmet sayfası. Hizmet akışı kodda yok;
 * talep iletişim formundan alınır. Basın çalışması iddiası, sıralama ya da sonuç sözü yok.
 */
const WHAT = [
  {
    icon: Wrench,
    t: 'Teknik düzeltme',
    d: 'Yönlendirme zinciri, canonical, güvenlik başlıkları, hız engelleri, robots ve AI crawler erişimi. Ücretsiz araçların “kritik” dediği her şey.',
  },
  {
    icon: Code2,
    t: 'Şema ve entity çalışması',
    d: 'Organization / LocalBusiness / Product / FAQ şemaları, marka adı tutarlılığı, sameAs bağlantıları, llms.txt. Yapay zekâ sizi ne olarak tanıyor, onu düzeltiriz.',
  },
  {
    icon: FileText,
    t: 'Satın alma sorularına cevap veren içerik',
    d: 'Sektörünüzde müşterinin sorduğu 5 soru için sayfalar: karşılaştırma, “kimin için / kimin için değil”, fiyat mantığı, sık sorulanlar. Abartı yok; kanıt var.',
  },
  {
    icon: Link2,
    t: 'Kaynak ve atıf çalışması',
    d: 'Modellerin dayandığı dizinler, karşılaştırma siteleri ve sektör kaynaklarında doğru ve tutarlı kayıt. Ölçülebilir hedef: atıf veren kaynak sayısı (panelde).',
  },
];

const SPRINT = [
  {
    n: '01',
    t: 'Ölçüm',
    d: 'Ücretsiz araçlar + panel: mevcut durum, rakip kıyası, öncelik sırası. Teklif bu rapora dayanır.',
  },
  {
    n: '02',
    t: 'Sprint planı',
    d: 'Aylık iş listesi: hangi bulgu, hangi sayfa, kim yapar, ne zaman biter. Onayınızla başlar.',
  },
  {
    n: '03',
    t: 'Uygulama',
    d: 'Ekibimiz uygular ya da geliştiricinizle birlikte çalışır; her iş bir bulguya bağlıdır.',
  },
  {
    n: '04',
    t: 'Yeniden ölçüm',
    d: 'Aynı sorular, aynı modeller, her sabah. Sprint raporu panelden; ekran görüntüsü tarihli.',
  },
];

const FOR_WHOM = [
  'Ekibinde teknik SEO / geliştirici olmayan KOBİ',
  'Sektör sayfası sorularının çoğunda görünmeyen hizmet işletmesi (klinik, hukuk, eğitim, turizm)',
  'Katalog şeması ve crawler erişimi zayıf e-ticaret mağazası',
  'Müşterisi için uygulamayı dışarı vermek isteyen ajans (ortaklık programı)',
];

const NOT_FOR = [
  'Sıralama ya da “ilk 3” sözü isteyenler: yapay zekâ cevapları değişkendir; biz ölçer ve gösteririz.',
  'Basın bülteni, influencer ya da reklam kampanyası arayanlar: bu bir uygulama hizmetidir.',
  'Sağlık, hukuk ve mali müşavirlikte reklam mevzuatına aykırı ifade isteyenler: bilgilendirme diliyle çalışırız.',
];

const FAQ_ITEMS = [
  {
    question: 'Sonuç sözü veriyor musunuz?',
    answer:
      'Hayır. Yapay zekâ cevapları oturumdan oturuma değişir; hiçbir sağlayıcıyla sıralama anlaşması yoktur. Sözümüz yöntem ve ölçümdür: her iş bir bulguya bağlanır, her sabah aynı sorularla yeniden ölçülür, rapor tarihli ekran görüntüsüyle panelde durur.',
  },
  {
    question: 'Fiyat nasıl belirleniyor?',
    answer:
      'Aylık sprint modeliyle, teklifle. Başlangıç fiyatı sayfada yazar; kapsam (sayfa sayısı, teknik borç, içerik hacmi) teklifi belirler. Taahhüt yok; sprint sonunda devam edip etmemeye siz karar verirsiniz. Yanıt aboneliği ayrıdır ve isteğe bağlıdır.',
  },
  {
    question: 'Kişisel verilerimiz yapay zekâ servislerine gidiyor mu?',
    answer:
      'Hayır. Yalnızca herkese açık web sitenizi tarıyoruz; kişisel verinizi yapay zekâ servislerine göndermiyoruz. Müşteri listesi, CRM ya da sipariş verisi istemeyiz; ölçüm sorularında yalnızca marka adı ve herkese açık içerik kullanılır.',
  },
  {
    question: 'Kendi geliştiricimiz var; yine de çalışabilir miyiz?',
    answer:
      'Evet. Sprint planı iş listesi olarak paylaşılır; teknik işleri geliştiriciniz, içerik ve şema işlerini biz yapabiliriz ya da tam tersi. İlerleme aynı panelden izlenir.',
  },
  {
    question: 'Ajansız; müşterimiz için sizi kullanabilir miyiz?',
    answer:
      'Evet. Ölçüm ve rapor sizin ajans panelinizde kalır; uygulamayı biz üstleniriz ve raporu siz sunarsınız. Ayrıntı için ajans ortaklık programı sayfasına bakın.',
  },
];

export default async function YanitAgencyPage() {
  const offer = await getOffer();
  const status = (() => {
    try {
      return capability('agency_service').status;
    } catch {
      return null;
    }
  })();
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Yanıt Agency', href: '/yanit-agency' },
        ]}
      />
      <FaqJsonLd items={FAQ_ITEMS} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'Yanıt Agency',
          serviceType: 'Yapay zekâ görünürlüğü uygulama hizmeti',
          url: `${SITE_URL}/yanit-agency`,
          provider: { '@id': ORG_ID },
          areaServed: 'TR',
          description:
            'Teknik düzeltme, şema ve entity, satın alma sorularına cevap veren içerik ve kaynak çalışması; aylık sprint, teklifle; ilerleme Yanıt panelinden ölçülür.',
        }}
      />

      <section className="pt-24 pb-12">
        <Container className="max-w-4xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-2 chip own">
              <Sparkles className="w-3 h-3 text-brand" aria-hidden />
              <span className="font-mono tracking-eyebrow">Yanıt Agency · hizmet</span>
            </span>
            <span className="chip !text-[10.5px]">{status}</span>
            <span className="chip !text-[10.5px]">teklifle</span>
          </div>
          <h1 className="font-display text-[44px] lg:text-[64px] tracking-tight mt-5 leading-[1.02]">
            Analizi biz yaptık. <span className="text-brand">Uygulamayı da biz yapalım.</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            Yanıt “31 bulgu, 9’u kritik” dediğinde listeyi kim yapacak? İsterseniz ekibimiz: teknik düzeltme, şema ve
            entity, satın alma sorularına cevap veren içerik, kaynak çalışması. Aylık sprint; ilerleme aynı panelden,
            aynı sorularla ölçülür.
          </p>
          <div className="mt-9 flex items-center gap-3 flex-wrap">
            <Link href="/contact?src=agency" className="btn-primary inline-flex items-center gap-2">
              Teklif isteyin <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <Link href="/arac" className="btn-secondary">
              Önce sitemi tara
            </Link>
            <span className="text-[12px] text-ink-faint font-mono ml-2">
              {formatTry(offer.agencyFromMonthlyTry)}/ay’dan · aylık sprint · taahhüt yok
            </span>
          </div>
          <p className="mt-5 text-[12.5px] text-ink-faint">
            Sonuç sözü vermiyoruz; sıralama satmıyoruz. Ölçer, uygular, yeniden ölçeriz.
          </p>
        </Container>
      </section>

      <section className="pb-4">
        <Container>
          <div className="max-w-md">
            <Ciz name="ajans" alt="İki kişi bir web sitesi iskeleti üzerinde birlikte çalışıyor" />
          </div>
        </Container>
      </section>
      <Section eyebrow="Ne yaparız" title="Dört iş kalemi; hepsi bir bulguya bağlı." className="py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {WHAT.map((w) => (
            <div key={w.t} className="card p-7">
              <w.icon className="w-6 h-6 text-brand" aria-hidden />
              <h3 className="font-display text-[20px] mt-4 leading-tight">{w.t}</h3>
              <p className="text-[14.5px] text-ink-muted mt-3 leading-relaxed">{w.d}</p>
            </div>
          ))}
        </div>
        <p className="text-[12.5px] text-ink-faint mt-5 font-mono">
          // Yapmadıklarımız: basın çalışması, reklam yönetimi, sosyal medya. Bunlar için ortak ajanslara yönlendiririz.
        </p>
      </Section>

      <Section
        eyebrow="Sprint modeli"
        title={
          <>
            {formatTry(offer.agencyFromMonthlyTry)}/ay’dan başlayan aylık sprint,{' '}
            <span className="text-brand">teklifle.</span>
          </>
        }
        intro="Kapsam teklifi belirler: sayfa sayısı, teknik borç, içerik hacmi. Taahhüt yok; sprint sonunda devam kararı sizin. Yanıt aboneliği ayrı ve isteğe bağlıdır; ölçüm için önerilir."
        className="py-12 lg:py-16 bg-paper-2/40"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SPRINT.map((s) => (
            <div key={s.n} className="card p-6">
              <div className="font-mono text-[11px] tracking-eyebrow text-brand">{s.n}</div>
              <h3 className="font-display text-[18px] mt-3">{s.t}</h3>
              <p className="text-[13.5px] text-ink-muted mt-2 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 card p-6 flex items-start gap-4 flex-wrap">
          <Gauge className="w-6 h-6 text-brand shrink-0" aria-hidden />
          <div className="flex-1 min-w-[240px]">
            <div className="font-display text-[18px]">Aynı panelden ölçüm</div>
            <p className="text-[14px] text-ink-muted mt-2 leading-relaxed">
              Sprint raporu ayrı bir sunum değil: görünürlük, Share of Voice, pozisyon ve atıf kaynakları panelde, tarih
              damgalı. İsterseniz salt-okunur paylaşım linkiyle yönetiminize gönderirsiniz.
            </p>
          </div>
        </div>
      </Section>

      <Section eyebrow="Kimler için" title="Kime uyar, kime uymaz?" className="py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-7">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-brand" aria-hidden />
              <div className="font-display text-[18px]">Uyar</div>
            </div>
            <ul className="mt-4 space-y-2.5 text-[14px]">
              {FOR_WHOM.map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="w-4 h-4 text-positive shrink-0 mt-0.5" aria-hidden /> <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-7">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand" aria-hidden />
              <div className="font-display text-[18px]">Uymaz</div>
            </div>
            <ul className="mt-4 space-y-2.5 text-[14px] text-ink-muted">
              {NOT_FOR.map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="w-4 shrink-0 text-ink-faint">—</span> <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section eyebrow="Sık sorulanlar" title="Açık sorular, açık cevaplar." className="py-12 lg:py-16 bg-paper-2/40">
        <Faq items={FAQ_ITEMS} />
        <p className="text-[12.5px] text-ink-faint mt-5">
          Yalnızca herkese açık web sitenizi tarıyoruz; kişisel verinizi yapay zekâ servislerine göndermiyoruz.
        </p>
      </Section>

      <CtaBlock
        eyebrow="Yanıt Agency"
        title={
          <>
            Önce raporu görün, <span className="text-brand">sonra teklifi konuşalım.</span>
          </>
        }
        body="Ücretsiz araçlar hesap istemez; teklif bu rapora dayanır. Uygulama için iletişim formundan yazın, bir iş günü içinde döneriz."
        primaryHref="/contact?src=agency"
        primaryLabel="Teklif isteyin"
        secondaryHref="/solutions/agencies#ortaklik"
        secondaryLabel="Ajansım, ortaklık istiyorum"
      />
    </>
  );
}
