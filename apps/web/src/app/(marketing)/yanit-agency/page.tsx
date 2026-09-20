import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Check, FileText, Gauge, Link2, ListChecks, Minus, Wrench } from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { Faq } from '@/components/marketing/faq';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { getOffer } from '@/server/offer';
import { formatTry } from '@independentai/shared';

const PATH = '/yanit-agency';

export const metadata = buildMetadata({
  title: 'Yanıt Agency — analizi biz yaptık, uygulamayı da biz yapalım',
  description:
    'Yanıt’ın bulduğu listeyi ekibimiz uygular: teknik düzeltme, şema, içerik ve kaynak çalışması. Aylık sprint, teklifle; ölçüm aynı panelde.',
  path: PATH,
});

/** Hizmet kolonları — her biri panelde ölçülen bir bulgu türüne karşılık gelir. */
const SERVICES = [
  {
    img: '/img/ajans/teknik.webp',
    alt: 'Bir kişi web sitesi iskeletinin içini anahtarla düzeltiyor',
    icon: Wrench,
    title: 'Teknik düzeltme',
    body: 'Bot erişimi, yönlendirme zinciri, canonical, sayfa hızı ve güvenlik başlıkları. Görünmemenin en ucuz sebepleri genelde burada.',
    items: ['robots.txt ve bot erişimi', 'Yönlendirme ve canonical', 'Güvenlik başlıkları ve TLS'],
  },
  {
    img: '/img/ajans/icerik.webp',
    alt: 'Bir el, başlık ve paragraf blokları olan bir sayfaya yazıyor',
    icon: FileText,
    title: 'Cevap veren içerik',
    body: 'Müşterinizin sorduğu soruyu başlığa taşıyan, ilk paragrafta doğrudan cevap veren sayfalar. Karşılaştırma ve fiyat sayfaları dahil.',
    items: ['Satın alma sorusu sayfaları', 'Karşılaştırma içerikleri', 'SSS ve şema uyumu'],
  },
  {
    img: '/img/ajans/kaynak.webp',
    alt: 'Merkezdeki karta bağlı beş küçük site kartı',
    icon: Link2,
    title: 'Şema, entity ve kaynak',
    body: 'Kim olduğunuzu makinenin anlayacağı biçimde yazmak; dizinlerde, karşılaştırma sitelerinde ve sektör kaynaklarında doğru kayıt.',
    items: ['Organization ve sektör şeması', 'NAP ve profil tutarlılığı', 'Kaynak ve dizin çalışması'],
  },
  {
    img: '/img/ajans/rapor.webp',
    alt: 'İki kişi masada yükselen bir grafiği inceliyor',
    icon: Gauge,
    title: 'Ölçüm ve raporlama',
    body: 'Aynı sorular her gün aynı biçimde sorulur. Ay sonunda ne değişti, hangi soruda kim öne geçti; hepsi aynı panelde.',
    items: ['Günlük ölçüm', 'Aylık değerlendirme', 'Paylaşılabilir rapor bağlantısı'],
  },
];

/** Aylık sprint — dört hafta, her haftanın çıktısı belli. */
const SPRINT = [
  {
    w: '1. hafta',
    t: 'Tarama ve sıralama',
    d: 'Site taraması, sorularınızın belirlenmesi ve bulguların etkiye göre sıralanması. Sprintte neyin yapılacağı burada yazılı hale gelir.',
  },
  {
    w: '2. hafta',
    t: 'Teknik düzeltmeler',
    d: 'Erişim, yönlendirme, şema ve sayfa düzeyindeki hızlı kazanımlar. Geliştirici ekibinizle ya da doğrudan panelinizde.',
  },
  {
    w: '3. hafta',
    t: 'İçerik ve kaynak',
    d: 'Cevap veren sayfalar yazılır, karşılaştırma içerikleri kurulur, kaynak ve dizin başvuruları yapılır.',
  },
  {
    w: '4. hafta',
    t: 'Ölçüm ve devir',
    d: 'Yeniden ölçüm, ay sonu değerlendirmesi ve bir sonraki sprintin listesi. Her şey panelde kalır.',
  },
];

/** Somut teslimler — hepsi üründe karşılığı olan şeyler. */
const DELIVERABLES = [
  { t: 'Önceliklendirilmiş bulgu listesi', d: 'Ne eksik, neden önemli, nasıl düzeltilir.' },
  { t: 'Uygulanan düzeltmeler', d: 'Sprint içinde kapatılan maddeler ve yapılan değişikliklerin kaydı.' },
  { t: 'Yazılan sayfalar', d: 'Soru odaklı içerik, karşılaştırma ve SSS bölümleri.' },
  { t: 'Kaynak çalışması kaydı', d: 'Başvurulan dizin ve kaynaklar, dönen sonuçlar.' },
  { t: 'Paylaşılabilir rapor', d: 'Yönetime tek bağlantıyla gönderilebilen ölçüm raporu.' },
  { t: 'Panel erişimi', d: 'Aynı veriye siz de bakarsınız; kapalı kutu yok.' },
];

const FIT = {
  yes: [
    'Sitesi yayında ve düzeltme yapılabilecek bir ekip ya da ajans erişimi olan markalar',
    'Kategorisinde rakiplerinin önerildiğini gördüğü halde sebebini bilmeyenler',
    'İçerik ve teknik işi yapacak vakti olmayan, ölçümü kendisi takip etmek isteyenler',
  ],
  no: [
    'Kesin sonuç sözü arayanlar — biz böyle bir söz vermiyoruz',
    'Tek seferlik “bir bakıp gitsin” işi arayanlar; sprint aylık çalışır',
    'Sitesine hiçbir değişiklik yapılamayacak durumda olanlar',
  ],
};

const FAQ = [
  {
    question: 'Ne kadar sürede sonuç görürüm?',
    answer:
      'Teknik düzeltmelerin etkisi taramada hemen görünür. Yapay zekâ cevaplarındaki değişim içerik ve kaynak çalışmasının olgunlaşmasına bağlıdır; bunu tarih vererek değil, her sabah aynı soruyu sorarak takip ederiz.',
  },
  {
    question: 'Sonuç sözü veriyor musunuz?',
    answer:
      'Hayır. Modellerin ne söyleyeceği bizim kontrolümüzde değil. Söz verdiğimiz şey yöntem: ölçeriz, eksikleri gösteririz, uygularız ve değişimi aynı biçimde tekrar ölçeriz. Rakamlar panelde, istediğiniz an bakarsınız.',
  },
  {
    question: 'Kendi ajansımız var, çakışır mı?',
    answer:
      'Çakışmaz, çoğu zaman birlikte çalışırız. Biz bulguyu ve sırayı veririz; uygulamayı sizin ekibiniz yapıyorsa yalnızca ölçüm ve yönlendirme tarafında kalırız. Ajanslar için ayrı bir ortaklık programımız da var.',
  },
  {
    question: 'Fiyat neye göre belirleniyor?',
    answer:
      'Site büyüklüğü, izlenecek soru sayısı, içerik hacmi ve sektörün rekabetine göre. Aylık sprint modeliyle çalışır ve teklif öncesi sitenizi tarayıp kapsamı birlikte netleştiririz.',
  },
  {
    question: 'Sözleşme süresi var mı?',
    answer:
      'Sprint aylıktır. Uzun dönem taahhüdü istemiyoruz; devam kararını her ay sonundaki ölçüme bakarak birlikte veririz.',
  },
];

export default async function YanitAgencyPage() {
  const offer = await getOffer();

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Yanıt Agency', href: PATH },
        ]}
      />
      <FaqJsonLd items={FAQ} />

      {/* Hero */}
      <section className="pt-20 pb-14">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <div className="eyebrow">Yanıt Agency</div>
              <h1 className="font-display text-[40px] lg:text-[54px] tracking-tight mt-3 leading-[1.05]">
                Analizi biz yaptık. <span className="text-brand">Uygulamayı da biz yapalım.</span>
              </h1>
              <p className="text-[17px] lg:text-[19px] text-ink-muted mt-6 leading-relaxed">
                Yanıt size ne yapılacağını söylüyor. Yapacak vaktiniz yoksa ekibimiz üstlenir: teknik düzeltme, şema,
                cevap veren içerik ve kaynak çalışması. Aylık sprint, tek panel, ölçülebilir ilerleme.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/contact?src=agency#sales" className="btn-primary inline-flex items-center gap-2">
                  Ekiple görüş <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
                <Link href="/arac" className="btn-secondary">
                  Önce ücretsiz tarayın
                </Link>
              </div>
              <p className="text-[13px] text-ink-faint mt-4">
                {formatTry(offer.agencyFromMonthlyTry)}/ay’dan başlar · kapsam teklifle · sonuç sözü yok, ölçüm var
              </p>
            </div>
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-hairline overflow-hidden bg-paper-3">
                <Image
                  src="/img/ajans/sprint.webp"
                  alt="Üç kişilik bir ekip, üç sütunlu bir görev panosunun önünde çalışıyor"
                  width={1200}
                  height={675}
                  priority
                  unoptimized
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Ne yapıyoruz */}
      <Section
        className="band border-t border-hairline"
        eyebrow="Ne yapıyoruz"
        title="Dört kolon, hepsi panelde ölçülen bir bulguya bağlı."
        intro="Soyut bir “GEO çalışması” değil. Her kalem, taramada çıkan somut bir eksikliğin karşılığıdır."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SERVICES.map((s) => (
            <div key={s.title} className="card overflow-hidden h-full flex flex-col">
              <span className="block border-b border-hairline bg-paper-3">
                <Image src={s.img} alt={s.alt} width={1200} height={675} unoptimized className="w-full h-auto" />
              </span>
              <div className="p-7 flex-1 flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-brand-glow flex items-center justify-center shrink-0">
                    <s.icon className="w-4 h-4 text-brand" aria-hidden />
                  </span>
                  <h3 className="font-display text-[20px]">{s.title}</h3>
                </div>
                <p className="text-[14.5px] text-ink-muted mt-3 leading-relaxed">{s.body}</p>
                <ul className="mt-4 space-y-1.5">
                  {s.items.map((i) => (
                    <li key={i} className="flex items-center gap-2 text-[13.5px]">
                      <Check className="w-3.5 h-3.5 text-brand shrink-0" aria-hidden /> {i}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Sprint */}
      <Section eyebrow="Aylık sprint" title="Dört hafta, dört çıktı." intro="Her haftanın ne bıraktığı baştan belli.">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {SPRINT.map((s) => (
            <div key={s.w} className="card p-6 h-full">
              <div className="eyebrow text-brand-deep">{s.w}</div>
              <h3 className="font-display text-[19px] mt-3 leading-snug">{s.t}</h3>
              <p className="text-[13.5px] text-ink-muted mt-3 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Örnek sprint — temsili */}
      <Section className="band border-t border-hairline" eyebrow="Bir sprint neye benzer" title="Örnek bir ay.">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <div className="card p-7">
              <div className="flex items-center justify-between gap-4">
                <div className="font-display text-[20px]">Sprint özeti</div>
                <span className="chip !text-[10.5px]">temsili</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6">
                {[
                  ['31', 'bulgu'],
                  ['9', 'kritik'],
                  ['6', 'bu sprintte'],
                ].map(([n, l]) => (
                  <div key={l} className="rounded-xl border border-hairline p-4">
                    <div className="font-display text-[30px] tabular text-brand leading-none">{n}</div>
                    <div className="text-[12.5px] text-ink-muted mt-2">{l}</div>
                  </div>
                ))}
              </div>
              <ul className="mt-6 space-y-2.5">
                {[
                  'Bot erişimi açıldı, üç yönlendirme zinciri tek adıma indi',
                  'Organization ve hizmet şeması eklendi, iletişim bilgileri tutarlı hale getirildi',
                  'Dört satın alma sorusu için cevap-önce sayfa yazıldı',
                  'İki sektör dizininde kayıt açıldı, bir karşılaştırma sayfasına eklenildi',
                ].map((x) => (
                  <li key={x} className="flex gap-3 text-[14px] leading-relaxed">
                    <ListChecks className="w-4 h-4 text-brand shrink-0 mt-0.5" aria-hidden /> {x}
                  </li>
                ))}
              </ul>
              <p className="text-[12.5px] text-ink-faint mt-6">
                Bu bir örnek akıştır, gerçek bir müşteri vakası değildir. Sizin sprintiniz taramanızdan çıkar.
              </p>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="card overflow-hidden">
              <Image
                src="/img/panel/trend.webp"
                alt="Panelde görünürlük ve ses payı trendi grafiği"
                width={900}
                height={500}
                unoptimized
                className="w-full h-auto"
              />
              <div className="p-6">
                <div className="font-display text-[17px]">İlerleme aynı panelde</div>
                <p className="text-[13.5px] text-ink-muted mt-2 leading-relaxed">
                  Ne yaptığımızı anlatmakla kalmayız; aynı soruların günlük ölçümünü siz de görürsünüz.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Teslimler */}
      <Section eyebrow="Ne teslim ediyoruz" title="Altı somut çıktı.">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {DELIVERABLES.map((d) => (
            <div key={d.t} className="card p-6 h-full">
              <h3 className="font-display text-[17px] leading-snug">{d.t}</h3>
              <p className="text-[13.5px] text-ink-muted mt-2.5 leading-relaxed">{d.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Uygun mu */}
      <Section className="band border-t border-hairline" eyebrow="Kimler için" title="Herkese uygun değil.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-7 h-full">
            <div className="font-display text-[19px]">Uygun</div>
            <ul className="mt-4 space-y-3">
              {FIT.yes.map((x) => (
                <li key={x} className="flex gap-3 text-[14px] leading-relaxed">
                  <Check className="w-4 h-4 text-positive shrink-0 mt-0.5" aria-hidden /> {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-7 h-full">
            <div className="font-display text-[19px]">Uygun değil</div>
            <ul className="mt-4 space-y-3">
              {FIT.no.map((x) => (
                <li key={x} className="flex gap-3 text-[14px] leading-relaxed text-ink-muted">
                  <Minus className="w-4 h-4 text-ink-faint shrink-0 mt-0.5" aria-hidden /> {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Fiyat */}
      <Section eyebrow="Fiyat" title="Aylık sprint, teklifle.">
        <div className="card p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5">
              <div className="font-display text-[44px] tracking-tight leading-none">
                {formatTry(offer.agencyFromMonthlyTry)}
                <span className="text-[20px] text-ink-muted"> /ay’dan</span>
              </div>
              <p className="text-[14px] text-ink-muted mt-4 leading-relaxed">
                Kapsam site büyüklüğü, soru sayısı ve içerik hacmine göre belirlenir. Teklif öncesi sitenizi tarar,
                neyin gerektiğini birlikte konuşuruz.
              </p>
              <Link href="/contact?src=agency#sales" className="btn-primary inline-flex items-center gap-2 mt-7">
                Teklif alın <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </div>
            <div className="lg:col-span-7">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
                {[
                  'Aylık sprint ve yol haritası',
                  'Teknik düzeltme uygulaması',
                  'Cevap veren içerik üretimi',
                  'Şema ve entity çalışması',
                  'Kaynak ve dizin başvuruları',
                  'Günlük ölçüm ve aylık rapor',
                  'Panel erişimi (ekibiniz dahil)',
                  'Taahhütsüz, aylık devam kararı',
                ].map((x) => (
                  <li key={x} className="flex items-center gap-2 text-[14px]">
                    <Check className="w-3.5 h-3.5 text-brand shrink-0" aria-hidden /> {x}
                  </li>
                ))}
              </ul>
              <p className="text-[12.5px] text-ink-faint mt-6">
                Yalnızca ölçüm istiyorsanız Yanıt aboneliği {formatTry(offer.saasMonthlyTry)}/ay;{' '}
                <Link href="/pricing" className="text-brand-deep hover:text-brand">
                  fiyatlandırmayı görün
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section className="band border-t border-hairline" eyebrow="Sıkça sorulanlar" title="Yanıt Agency hakkında.">
        <Faq items={FAQ} defaultOpen={0} />
      </Section>

      <CtaBlock />
    </>
  );
}
