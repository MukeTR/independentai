import Link from 'next/link';
import { ArrowUpRight, CalendarClock, Database, Scale, TriangleAlert } from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { Reveal } from '@/components/marketing/reveal';
import { Faq } from '@/components/marketing/faq';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import {
  ModelKarti,
  SiraliCubuklar,
  VeriKalemi,
  VeriTablosu,
  veriBul,
  verileriBul,
} from '@/components/marketing/model-atlas';
import {
  AI_MODELS,
  KULLANIM_VERILERI,
  SEKTOR_VERILERI,
  TURKIYE_VERILERI,
  TUM_VERILER,
  VERI_BOSLUKLARI,
} from '@/data/ai-models';

/**
 * Yapay zekâ modellerini tanıyalım — kaynaklı atlas sayfası.
 *
 * TEK KURAL: Bu dosyada hiçbir sayı yazılı değildir. Ekrandaki her yüzde, her kullanıcı
 * sayısı ve her tarih `data/ai-models.ts`ten gelir; sayfa yalnızca düzenler ve kaynağını
 * gösterir. Künyedeki toplamlar bile dizi uzunluğundan hesaplanır, elle yazılmaz.
 *
 * Veri bulunamayan yerde boşluk bırakılmaz: "doğrulanmış veri bulunamadı" yazar.
 * "Bilmediklerimiz" bölümü sayfanın süsü değil, güven omurgasıdır — kısaltılmamalıdır.
 */

const PATH = '/resources/yapay-zeka-modelleri';

export const metadata = buildMetadata({
  title: 'Yapay zekâ modelleri atlası: kim, neyi, nerede kullanıyor?',
  description:
    'ChatGPT, Gemini, Claude, Perplexity ve Copilot: hangi asistanı kim kullanıyor, Türkiye’de durum ne? TÜİK ve birincil kaynaklarla, her sayının yanında kaynağı.',
  path: PATH,
});

/* ------------------------------------------------------------------ */
/* Sayfa künyesi — hepsi veriden hesaplanır                            */
/* ------------------------------------------------------------------ */

const TR_KALEM = TUM_VERILER.filter((s) => s.kapsam === 'türkiye').length;
const KURESEL_KALEM = TUM_VERILER.filter((s) => s.kapsam === 'küresel').length;
const BIRINCIL_KALEM = TUM_VERILER.filter((s) => s.guven === 'yüksek').length;
const BOT_DOGRULANMAYAN = AI_MODELS.filter((m) => m.botAdi === null).length;

/* ------------------------------------------------------------------ */
/* Sektör × kanal eşleşmesi                                            */
/* ------------------------------------------------------------------ */

type SektorSatiri = {
  sektor: string;
  href?: string;
  /** Kitlenin nerede olduğu — yalnızca altında listelenen kalemlerin söylediği kadarı. */
  kanal: string;
  /** Veri kaleminin başlığında geçen ayırt edici parça. */
  parcalar: readonly string[];
  /** Veri yoksa nedeni; bu satırda kalem listelenmez. */
  bosluk?: string;
};

const SEKTORLER: SektorSatiri[] = [
  {
    sektor: 'SaaS ve yazılım',
    href: '/sektor/saas',
    kanal:
      'Alıcı kısa listeyi yapmadan önce asistana soruyor ve tek bir asistanda kalmıyor. Aşağıdaki kalemlerin tamamı küresel araştırmalara ait; Türkiye örneklemi içermiyor.',
    parcalar: [
      'B2B yazılım alıcılarının',
      'Yazılım araştırmasına',
      'kullanılan asistanlar',
      'satın alma hunisindeki yeri',
      'satın alma komitesinin büyüklüğü',
    ],
  },
  {
    sektor: 'Klinik ve sağlık',
    href: '/sektor/klinik',
    kanal:
      'Hasta davranışına dair elimizdeki tek ölçüm ABD örneklemine ait. Türkiye tarafında doğrulanabilen şey hasta davranışı değil, pazarın hacmi.',
    parcalar: ['Sağlık bilgisi için', 'sağlık turizmi hacmi'],
  },
  {
    sektor: 'Hukuk ve danışmanlık',
    href: '/sektor/hukuk-danismanlik',
    kanal:
      'Müvekkil adayının avukat ararken asistana danıştığına dair ölçüm var; ancak bu ölçüm ABD kaynaklı ve ikincil bir derlemeden geliyor.',
    parcalar: ['Avukat araştırmasında'],
  },
  {
    sektor: 'Yerel hizmet veren işletmeler',
    kanal:
      'Yerel arama davranışı, yapay zekâ asistanlarına en hızlı kayan alanlardan biri. Eldeki ölçüm ABD tüketicisine ait.',
    parcalar: ['Yerel işletme bulmak için'],
  },
  {
    sektor: 'E-ticaret',
    href: '/solutions/ecommerce',
    kanal:
      'Türkiye tarafında hacim ve yaş kırılımı doğrulanabiliyor; alıcının asistanda ne sorduğu doğrulanamıyor. Yaş kırılımı, üretken yapay zekâ kullanımının yoğunlaştığı yaş aralığıyla örtüşüyor.',
    parcalar: ['Türkiye e-ticaret hacmi', 'en aktif yaş grubu'],
  },
  {
    sektor: 'Eğitim',
    href: '/sektor/egitim',
    kanal:
      'Kurum seçiminde asistan kullanma niyeti ölçülmüş; bu bir niyet beyanı, gerçekleşmiş davranış ölçümü değil.',
    parcalar: ['Eğitim kurumu seçiminde'],
  },
  {
    sektor: 'Gayrimenkul',
    href: '/sektor/gayrimenkul',
    kanal:
      'Elimizdeki iki kalem alıcının yaşı ve aracı kullanımı hakkında. İkisi de ABD verisi ve alıcının asistan kullanımını ölçmüyor; kitlenin yaş profilini gösteriyor.',
    parcalar: ['Konut alıcılarının medyan yaşı', 'Konut alımında aracı kullanımı'],
  },
  {
    sektor: 'Turizm ve konaklama',
    href: '/sektor/turizm',
    kanal:
      'Planlama ile rezervasyon arasında belirgin bir ayrım var: araştırma asistana kayıyor, işlemin kendisi kaymıyor. Türkiye tarafında doğrulanabilen şey ziyaretçi hacmi ve kaynak ülkeler — yani hangi dilde içerik gerektiği.',
    parcalar: ['Seyahat planlamada', 'Rezervasyonu yapay zekâya', 'yabancı ziyaretçi ve kaynak ülkeler'],
  },
  {
    sektor: 'Ajans',
    href: '/sektor/ajans',
    kanal: 'Ajans arayan müşterinin hangi kanaldan ve hangi asistandan geldiğine dair doğrulanmış veri bulunamadı.',
    parcalar: [],
    bosluk:
      'Dolaşımdaki oranların tamamı yapay zekâ görünürlüğü aracı satan şirketlerin kendi blog derlemelerinden geliyor; birincil rapora ulaşılamadı. Bu yüzden bu satır boş bırakıldı.',
  },
  {
    sektor: 'B2B üretici ve ihracatçı',
    href: '/sektor/b2b-uretici',
    kanal: 'Türk ihracatçıyı arayan yabancı satın almacının davranışına dair doğrulanmış veri bulunamadı.',
    parcalar: [],
    bosluk:
      'Bu alanda dolaşan tedarikçi araştırma oranlarının yayın tarihi ve örneklemi yok. Yalnızca yukarıdaki küresel B2B kalemleri kullanılabilir ve küresel oldukları açıkça yazılmalıdır.',
  },
  {
    sektor: 'E-ticaret altyapısı',
    href: '/sektor/eticaret-altyapi',
    kanal: 'Altyapı seçen işletme sahibinin araştırma davranışına dair doğrulanmış veri bulunamadı.',
    parcalar: [],
    bosluk:
      'Eldeki hacim ve yaş verileri son tüketiciye ait, altyapı alıcısına değil. İkisini birbirinin yerine koymak yanlış hedefleme üretir.',
  },
];

/* ------------------------------------------------------------------ */
/* Çubuk olarak gösterilecek kalemler                                  */
/* ------------------------------------------------------------------ */

const DUNYA_PAYLARI = veriBul(KULLANIM_VERILERI, 'Dünya genelinde');
const SORU_TURLERI = veriBul(KULLANIM_VERILERI, 'sorulan soruların türü');
const TR_PAYLARI = veriBul(TURKIYE_VERILERI, 'sohbet botu yönlendirme payları');
const B2B_ASISTANLAR = veriBul(SEKTOR_VERILERI, 'kullanılan asistanlar');

const TR_KIRILIMLAR = verileriBul(TURKIYE_VERILERI, [
  'yaş kırılımı',
  'Eğitim düzeyine göre',
  'Bireylerde yapay zekâ kullanım amacı',
  'Girişim büyüklüğüne göre',
  'Sektöre göre',
]);

/* ------------------------------------------------------------------ */
/* Anlam ve yöntem                                                     */
/* ------------------------------------------------------------------ */

const ANLAM = [
  {
    baslik: 'Tek asistana göre optimize edilmez.',
    metin:
      'Yönlendirme ölçümünde bir asistan açık ara önde görünse bile, aynı dönemde ikinci asistanın payı Türkiye’de bir yıl içinde katlanarak arttı. Tek bir asistanın diline göre yazılmış içerik, sıralama değiştiğinde elinizde kalır. Ölçüm de içerik de birden çok yüzeyi hesaba katmalıdır.',
  },
  {
    baslik: 'Bot erişimi hepsi için açılmalı.',
    metin:
      'Her sağlayıcının tek bir botu yok: aynı şirketin eğitim için gelen botu ile arama dizini için gelen botu ayrı jetonlarla çalışıyor. Yalnızca eğitim botunu engellemek asistan içindeki görünürlüğü kesmez; tersine, arama botunu engellemek kesebilir. robots.txt kararını jeton jeton vermek gerekir.',
  },
  {
    baslik: 'Kaynak gösteren asistanlarda atıf önem kazanır.',
    metin:
      'Atlastaki asistanların tamamı yanıtlarında bağlantı veriyor. Bu, görünürlüğün yalnızca “adım geçti mi” sorusu olmadığı anlamına gelir: bağlantının hangi sayfaya gittiği, o sayfanın doğrulanabilir bilgi taşıyıp taşımadığı ölçülebilir bir sonuç üretir.',
  },
  {
    baslik: 'Ölçüm birden çok modelde yapılmalı.',
    metin:
      'Aynı soruya farklı asistanlar farklı markaları anıyor; üstelik aynı dönemi ölçen iki ayrı araştırma şirketi taban tabana zıt paylar verebiliyor. Tek bir modelde ya da tek bir ölçüm şirketinin rakamında kalmak, tabloyu değil tablonun bir köşesini görmektir.',
  },
];

const SSS = [
  {
    question: 'Tek bir asistana göre optimize etmek yeterli olur mu?',
    answer:
      'Hayır. Atlasta profili bulunan asistanların tamamı ayrı yüzeyler; kullanıcı biri için yazdığınız sayfayı diğerinde göremeyebilir. Türkiye’de ikinci sıradaki asistanın payı bir yıl içinde katlanarak arttı — bu sayfadaki tabloda hem eski hem yeni oran kaynağıyla duruyor. Sıralamanın bu hızda değiştiği bir alanda tek asistana göre kurulmuş bir plan kırılgandır.',
  },
  {
    question: 'Bu sayfadaki rakamların hepsi Türkiye verisi mi?',
    answer: `Hayır ve bu ayrımı sayfada gizlemiyoruz. ${TUM_VERILER.length} veri kaleminin ${TR_KALEM} tanesi Türkiye kapsamlı, ${KURESEL_KALEM} tanesi küresel; her satırda kapsam rozeti var. Küresel işaretli kalemlerin bir bölümü fiilen ABD örneklemidir ve bu, kalemin notunda yazılıdır. Türkiye verisi ile küresel veriyi aynı cümlede toplamayın.`,
  },
  {
    question: '“Birincil kaynak” ve “ikincil kaynak” etiketleri ne anlama geliyor?',
    answer: `Birincil kaynak, sayıyı açıklayan kurumun kendi yayınıdır: TÜİK bülteni, şirketin kazanç açıklaması, resmî dokümantasyon. İkincil kaynak ise haber aktarımı, ölçüm şirketi tahmini ya da derlemedir. ${TUM_VERILER.length} kalemin ${BIRINCIL_KALEM} tanesi birincil kaynaklı. İkincil olanları sildirmek yerine işaretliyoruz; çünkü bazı alanlarda birincil kaynak hiç yok ve bunu bilmek de bir bilgidir.`,
  },
  {
    question: 'Bot adı “doğrulanmadı” yazan satırlar ne demek?',
    answer: `Bir tarayıcı jetonunu ancak sağlayıcının kendi resmî dokümanında görürsek yazıyoruz. Atlastaki ${AI_MODELS.length} asistandan ${BOT_DOGRULANMAYAN} tanesinde bu doğrulama yapılamadı; oraya tahmini bir ad yazmak yerine “doğrulanmadı” diyoruz. Robots.txt rehberlerinde sık geçen bazı jetonların sağlayıcının resmî listesinde hiç bulunmadığını da ilgili asistanın notunda belirtiyoruz.`,
  },
  {
    question: 'Veriler ne zaman güncellenecek?',
    answer:
      'Her kalemin yanında verinin ölçüm yılı yazıyor; raporun adındaki yıl değil, verinin yılı. TÜİK’in yapay zekâ istatistikleri yıllık yayımlanıyor ve yeni bülten çıktığında bu sayfadaki bireysel ve girişim kalemleri birlikte güncellenecek. Şirket açıklamaları çeyreklik geliyor; ölçüm şirketlerinin yönlendirme payları aylık. Bir kalem eskirse yılı olduğu gibi görünür, taze gibi gösterilmez.',
  },
];

export default function YapayZekaModelleriPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Kaynaklar', href: '/resources' },
          { name: 'Yapay zekâ modelleri', href: PATH },
        ]}
      />
      <FaqJsonLd items={SSS.map((f) => ({ question: f.question, answer: f.answer }))} />

      {/* 1 — Hero */}
      <section className="pt-20 pb-12">
        <Container>
          <div className="max-w-3xl">
            <div className="eyebrow">Kaynaklar · veri atlası</div>
            <h1 className="font-display text-[38px] lg:text-[52px] tracking-tight mt-3 leading-[1.05]">
              Müşteriniz tek bir yere <span className="text-brand">sormuyor.</span>
            </h1>
            <p className="text-[17px] lg:text-[18px] text-ink-muted mt-6 leading-relaxed">
              Kısa cevap: ortada tek bir yapay zekâ yok. Aynı soru farklı asistanlara sorulduğunda farklı markalar
              anılıyor, farklı sayfalar kaynak gösteriliyor ve siteye farklı botlar geliyor. Bu sayfa, hangi asistanı
              kimin nerede kullandığını kaynağıyla birlikte tek yerde toplar.
            </p>
            <p className="text-[15px] text-ink-faint mt-5 leading-relaxed">
              Aşağıdaki her sayının yanında kaynağın adı, verinin yılı ve tıklanabilir bağlantısı vardır. Türkiye
              verisi ile küresel veri ayrı ayrı etiketlenir; doğrulayamadığımız hiçbir oran yazılmaz.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10 max-w-4xl">
            <div className="card p-5">
              <div className="eyebrow">Kaynaklı veri kalemi</div>
              <div className="font-display text-[26px] mt-1.5 tabular">{TUM_VERILER.length}</div>
            </div>
            <div className="card p-5">
              <div className="eyebrow">Türkiye kalemi</div>
              <div className="font-display text-[26px] mt-1.5 tabular">{TR_KALEM}</div>
            </div>
            <div className="card p-5">
              <div className="eyebrow">Asistan profili</div>
              <div className="font-display text-[26px] mt-1.5 tabular">{AI_MODELS.length}</div>
            </div>
            <div className="card p-5">
              <div className="eyebrow">Açıkça bilinmeyen</div>
              <div className="font-display text-[26px] mt-1.5 tabular">{VERI_BOSLUKLARI.length}</div>
            </div>
          </div>

          {/* Yanlış okumayı baştan kesen uyarı. */}
          <div className="card mt-8 p-6 max-w-3xl flex gap-4">
            <TriangleAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" aria-hidden />
            <div>
              <h2 className="font-display text-[18px] leading-snug">İki ölçüm birbirinin yerine geçmez</h2>
              <p className="text-[14.5px] text-ink-muted mt-2 leading-relaxed">
                Bu sayfadaki pay verileri iki ayrı şeyi ölçen kaynaklardan geliyor: biri asistanlardan sitelere{' '}
                <em>giden</em> yönlendirmeyi, diğeri asistanların kendi sitelerine <em>gelen</em> ziyareti sayıyor. Aynı
                dönem için farklı sonuç vermeleri hata değil, ölçüm farkıdır. Bu yüzden ikisini aynı grafikte
                birleştirmiyoruz ve hangisinin “gerçek pay” olduğunu iddia etmiyoruz.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* 2 — Kim neyi kullanıyor */}
      <Section
        id="kim-neyi-kullaniyor"
        className="band border-t border-hairline"
        eyebrow="Kim neyi kullanıyor"
        title="Ölçek ve kullanım dağılımı."
        intro="Önce sayılar, sonra yorum. Aşağıdaki dağılımlar paragrafa gömülmedi; her biri kendi kaynağı ve ölçüm yılıyla duruyor."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {DUNYA_PAYLARI ? (
            <Reveal>
              <SiraliCubuklar stat={DUNYA_PAYLARI} />
            </Reveal>
          ) : (
            <p className="text-[14.5px] text-ink-faint">Doğrulanmış veri bulunamadı.</p>
          )}
          {SORU_TURLERI ? (
            <Reveal delay={80}>
              <SiraliCubuklar stat={SORU_TURLERI} />
            </Reveal>
          ) : (
            <p className="text-[14.5px] text-ink-faint">Doğrulanmış veri bulunamadı.</p>
          )}
        </div>

        <h3 className="font-display text-[22px] tracking-tight mt-14">
          Ölçek, kullanım ve bot davranışı — tüm kalemler
        </h3>
        <p className="text-[14.5px] text-ink-muted mt-3 max-w-2xl leading-relaxed">
          Haftalık ölçüt ile aylık ölçüt, kullanıcı sayısı ile lisans sayısı toplanmaz. Tabloda her kalemin ne
          ölçtüğü başlığında yazar.
        </p>
        <div className="mt-6">
          <VeriTablosu
            veriler={KULLANIM_VERILERI}
            caption="Yapay zekâ asistanlarının ölçeği ve kullanım biçimine dair kaynaklı veri kalemleri"
          />
        </div>
      </Section>

      {/* 3 — Türkiye'de durum */}
      <Section
        id="turkiyede-durum"
        eyebrow="Türkiye’de durum"
        title="TÜİK ne diyor, ölçümler ne diyor?"
        intro="Bu bölümdeki kalemler yalnızca Türkiye kapsamlıdır. Küresel karşılaştırma gerektiren iki kalem kapsam rozetinde “küresel” olarak işaretlidir; ikisini aynı cümlede toplamayın."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {TR_PAYLARI ? (
            <Reveal>
              <SiraliCubuklar stat={TR_PAYLARI} />
            </Reveal>
          ) : (
            <p className="text-[14.5px] text-ink-faint">Doğrulanmış veri bulunamadı.</p>
          )}
          {TR_KIRILIMLAR.map((s, i) => (
            <Reveal key={s.baslik} delay={(i + 1) * 60}>
              <SiraliCubuklar stat={s} />
            </Reveal>
          ))}
        </div>

        <h3 className="font-display text-[22px] tracking-tight mt-14">Türkiye kalemlerinin tamamı</h3>
        <p className="text-[14.5px] text-ink-muted mt-3 max-w-2xl leading-relaxed">
          Bireysel kullanım, girişim kullanımı, yönlendirme payları, tutum araştırmaları, Türkçe model
          değerlendirmeleri ve politika hedefleri tek tabloda.
        </p>
        <div className="mt-6">
          <VeriTablosu veriler={TURKIYE_VERILERI} caption="Türkiye’de yapay zekâ kullanımına dair kaynaklı veri kalemleri" />
        </div>
      </Section>

      {/* 4 — Model profilleri */}
      <Section
        id="model-profilleri"
        className="band border-t border-hairline"
        eyebrow="Model profilleri"
        title="Asistanların künyesi."
        intro="Her kart aynı altı soruya cevap verir: sağlayıcı kim, nerede karşınıza çıkıyor, kim kullanıyor, web’e çıkıyor mu, kaynak gösteriyor mu, sitenize hangi bot adıyla geliyor. Bot adı yalnız sağlayıcının resmî dokümanında doğrulandıysa yazılır."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {AI_MODELS.map((m, i) => (
            <Reveal key={m.key} delay={i * 50}>
              <ModelKarti model={m} />
            </Reveal>
          ))}
        </div>

        <div className="card p-6 mt-5 flex gap-4">
          <Scale className="w-5 h-5 text-ink-faint shrink-0 mt-0.5" aria-hidden />
          <p className="text-[14px] text-ink-muted leading-relaxed">
            Atlasta yalnız hakkında doğrulanmış veri bulunan yüzeyler var. Kullanıcı sayısı ya da bot jetonu resmî
            kaynakta doğrulanamayan asistanlar bilerek dışarıda bırakıldı; gerekçeleri aşağıdaki “Bilmediklerimiz”
            bölümünde tek tek yazılı.
          </p>
        </div>
      </Section>

      {/* 5 — Hangi sektörün kitlesi nerede */}
      <Section
        id="sektor-kanal"
        eyebrow="Sektör × kanal"
        title="Hangi sektörün kitlesi nerede?"
        intro="Aşağıdaki eşleşme yalnız doğrulanmış kalemlerden kuruldu. Veri bulunamayan sektörde tahmin yürütülmedi; satır açıkça boş bırakıldı ve nedeni yazıldı."
      >
        {B2B_ASISTANLAR && (
          <div className="max-w-2xl mb-10">
            <SiraliCubuklar stat={B2B_ASISTANLAR} />
          </div>
        )}

        <div className="card overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[680px]">
            <caption className="sr-only">
              Sektörlere göre doğrulanmış veri kalemi sayısı ve verinin kapsamı
            </caption>
            <thead>
              <tr className="border-b border-hairline">
                <th scope="col" className="eyebrow px-5 py-4">
                  Sektör
                </th>
                <th scope="col" className="eyebrow px-5 py-4">
                  Doğrulanmış kalem
                </th>
                <th scope="col" className="eyebrow px-5 py-4">
                  Kapsam
                </th>
                <th scope="col" className="eyebrow px-5 py-4">
                  Durum
                </th>
              </tr>
            </thead>
            <tbody>
              {SEKTORLER.map((s) => {
                const kalemler = verileriBul(SEKTOR_VERILERI, s.parcalar);
                const trVar = kalemler.some((k) => k.kapsam === 'türkiye');
                const kureselVar = kalemler.some((k) => k.kapsam === 'küresel');
                return (
                  <tr key={s.sektor} className="border-b border-hairline last:border-0">
                    <th scope="row" className="px-5 py-4 text-[14px] text-ink font-normal text-left">
                      {s.href ? (
                        <Link href={s.href} className="hover:text-brand transition">
                          {s.sektor}
                        </Link>
                      ) : (
                        s.sektor
                      )}
                    </th>
                    <td className="px-5 py-4 text-[14px] text-ink-muted tabular">{kalemler.length}</td>
                    <td className="px-5 py-4 text-[13.5px] text-ink-muted">
                      {kalemler.length === 0
                        ? '—'
                        : [trVar ? 'Türkiye' : null, kureselVar ? 'küresel' : null].filter(Boolean).join(' + ')}
                    </td>
                    <td className="px-5 py-4 text-[13.5px]">
                      {kalemler.length === 0 ? (
                        <span className="text-warning">doğrulanmış veri bulunamadı</span>
                      ) : (
                        <span className="text-positive">kaynaklı</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-10">
          {SEKTORLER.map((s, i) => {
            const kalemler = verileriBul(SEKTOR_VERILERI, s.parcalar);
            return (
              <Reveal key={s.sektor} delay={i * 40}>
                <article className="card p-7 h-full">
                  <h3 className="font-display text-[20px] tracking-tight leading-snug">
                    {s.href ? (
                      <Link href={s.href} className="hover:text-brand transition inline-flex items-center gap-1.5">
                        {s.sektor}
                        <ArrowUpRight className="w-4 h-4 text-ink-faint" aria-hidden />
                      </Link>
                    ) : (
                      s.sektor
                    )}
                  </h3>
                  <p className="text-[14.5px] text-ink-muted mt-3 leading-relaxed">{s.kanal}</p>

                  {kalemler.length > 0 ? (
                    <div className="mt-6">
                      {kalemler.map((k) => (
                        <VeriKalemi key={k.baslik} stat={k} />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-6 border-t border-hairline pt-5">
                      <p className="text-[14px] text-warning">Doğrulanmış veri bulunamadı.</p>
                      {s.bosluk && <p className="text-[13px] text-ink-faint mt-2 leading-relaxed">{s.bosluk}</p>}
                    </div>
                  )}
                </article>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* 6 — Bunun sizin için anlamı */}
      <Section
        id="anlami"
        className="band border-t border-hairline"
        eyebrow="Bunun sizin için anlamı"
        title="Tablodan çıkan dört karar."
        intro="Bu maddeler yukarıdaki kalemlerden çıkar; yeni bir sayı getirmez."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {ANLAM.map((a, i) => (
            <Reveal key={a.baslik} delay={i * 60}>
              <div className="card p-7 h-full">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-[12px] text-ink-faint tabular pt-1">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-display text-[19px] leading-snug">{a.baslik}</h3>
                    <p className="text-[14.5px] text-ink-muted mt-3 leading-relaxed">{a.metin}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Link
          href="/arac/ai-crawler-testi"
          className="inline-flex items-center gap-1.5 text-[13.5px] text-brand-deep hover:text-brand mt-8"
        >
          Sitenize hangi botların girebildiğini ücretsiz kontrol edin
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      </Section>

      {/* 7 — Bilmediklerimiz */}
      <Section
        id="bilmediklerimiz"
        eyebrow="Bilmediklerimiz"
        title="Bu araştırmada doğrulayamadıklarımız."
        intro="Bir sayıyı bulamamış olmak, o sayıyı uydurmak için gerekçe değildir. Aşağıdaki başlıklarda dolaşan rakamlar var; hiçbirini birincil kaynağa bağlayamadık, bu yüzden hiçbirini sayfada kullanmadık. Bir madde buradan çıkıp veri kalemine geçmek için birincil kaynak ister."
      >
        <ol className="card divide-y divide-hairline overflow-hidden">
          {VERI_BOSLUKLARI.map((b, i) => (
            <li key={b} className="p-6 flex gap-4">
              <span className="font-mono text-[12px] text-ink-faint tabular pt-1 shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="text-[14.5px] text-ink-muted leading-relaxed">{b}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 8 — Yöntem */}
      <Section
        id="yontem"
        className="band border-t border-hairline"
        eyebrow="Yöntem"
        title="Bu veriyi nasıl topladık?"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="card p-7">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-brand-glow flex items-center justify-center shrink-0">
                <Database className="w-4 h-4 text-brand" aria-hidden />
              </span>
              <h3 className="font-display text-[18px]">Toplama</h3>
            </div>
            <p className="text-[14.5px] text-ink-muted mt-4 leading-relaxed">
              Her kalem için önce kurumun kendi yayını arandı: TÜİK bültenleri, şirketlerin kazanç açıklamaları ve
              resmî dokümantasyon. Birincil kaynak bulunamadığında ikincil kaynak kullanıldı ve öyle işaretlendi.
              Hiçbir sayı arama sonucu özetinden alınıp doğrudan yazılmadı; bağlantı açıldı, sayı sayfada görüldü.
            </p>
          </div>

          <div className="card p-7">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-brand-glow flex items-center justify-center shrink-0">
                <Scale className="w-4 h-4 text-brand" aria-hidden />
              </span>
              <h3 className="font-display text-[18px]">Güven düzeyleri</h3>
            </div>
            <p className="text-[14.5px] text-ink-muted mt-4 leading-relaxed">
              <strong className="text-positive font-normal">Birincil kaynak:</strong> sayıyı açıklayan kurumun kendi
              yayını.{' '}
              <strong className="text-warning font-normal">İkincil kaynak:</strong> haber aktarımı, ölçüm şirketi
              tahmini ya da derleme. İkincil kalemler silinmedi, işaretlendi — çünkü bazı başlıklarda birincil kaynak
              hiç yok ve bunu bilmek de bir bilgidir. Ayrıca her kalemde verinin ölçüm yılı yazar; raporun adındaki
              yıl değil.
            </p>
          </div>

          <div className="card p-7">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-brand-glow flex items-center justify-center shrink-0">
                <CalendarClock className="w-4 h-4 text-brand" aria-hidden />
              </span>
              <h3 className="font-display text-[18px]">Güncelleme</h3>
            </div>
            <p className="text-[14.5px] text-ink-muted mt-4 leading-relaxed">
              TÜİK’in yapay zekâ istatistikleri yıllık yayımlanıyor; yeni bülten çıktığında bireysel ve girişim
              kalemleri birlikte güncellenecek. Şirket açıklamaları çeyreklik, yönlendirme payları aylık geliyor. Bir
              kalem eskirse yılı olduğu gibi kalır; taze gibi gösterilmez.
            </p>
          </div>
        </div>

        <div className="card p-7 mt-5">
          <h3 className="font-display text-[18px]">Neyi yapmadık?</h3>
          <ul className="mt-4 space-y-3">
            {[
              'Farklı yöntemlerle ölçülmüş iki payı aynı grafikte birleştirmedik; hangisinin doğru olduğunu da iddia etmedik.',
              'Haftalık ölçütle aylık ölçütü, kullanıcı sayısıyla lisans sayısını toplamadık.',
              'Türkiye verisiyle küresel veriyi tek bir ortalamaya çevirmedik; her kalem kendi kapsamıyla duruyor.',
              'Doğrulayamadığımız hiçbir oranı “yaklaşık” diyerek yuvarlayıp yazmadık; “Bilmediklerimiz” bölümüne koyduk.',
            ].map((x) => (
              <li key={x} className="text-[14.5px] text-ink-muted leading-relaxed flex gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0 mt-2" aria-hidden />
                {x}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* 9 — SSS */}
      <Section id="sss" eyebrow="Sıkça sorulanlar" title="Bu atlasa dair sorular.">
        <Faq items={SSS} defaultOpen={0} />
      </Section>

      <CtaBlock
        eyebrow="Kendi tablonuz"
        title={
          <>
            Peki sizi <span className="text-brand">hangisi anıyor?</span>
          </>
        }
        body="Bu sayfa herkes için geçerli tabloyu gösterir. Size özel olanı görmek için alan adınızı girin; aynı soruyu birden çok asistana sorup cevapları yan yana koyalım."
      />
    </>
  );
}
