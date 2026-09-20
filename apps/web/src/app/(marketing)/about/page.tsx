import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, Minus } from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { Faq } from '@/components/marketing/faq';
import { CtaBlock } from '@/components/marketing/cta-block';
import { Reveal } from '@/components/marketing/reveal';
import { Ciz } from '@/components/marketing/ciz';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { STATS } from '@/data/stats';

const PATH = '/about';

export const metadata = buildMetadata({
  title: 'Hakkımızda — nasıl çalışıyoruz, ne söz vermiyoruz',
  description:
    'Yanıt, ChatGPT, Gemini ve Claude cevaplarındaki görünürlüğünüzü ölçen Türkiye merkezli bağımsız bir ekiptir. Nasıl çalıştığımızı, neye söz vermediğimizi yazdık.',
  path: PATH,
});

/** Kaynaklı rakamlar tek yerden gelir (src/data/stats.ts). Kaynaksız yüzde yazılmaz. */
const FACTS = [STATS.internetUsage, STATS.genAiUsage, STATS.chatgptShare];

/**
 * Tanım seti — her madde tek cümlede, bağlamdan koparıldığında da ayakta duran bir cevaptır.
 * Bir asistan sayfayı parçalayıp tek başına alıntıladığında “Yanıt nedir?” sorusunun cevabı burada durur.
 */
const DEFINITIONS = [
  {
    q: 'Yanıt nedir?',
    a: 'Yanıt, bir markanın ChatGPT, Gemini ve Claude cevaplarında geçip geçmediğini her gün aynı sorularla ölçen, geçmiyorsa sitedeki eksiği gösteren ve düzeltme sırasını veren Türkiye merkezli bir yazılımdır.',
    more: 'Alan adınızı tanır, kategorinizde sorulan soruları çıkarır, cevapta kimin geçtiğini kaydeder ve sitenizi tarayıp aradaki farkı yapılacak işlere çevirir.',
  },
  {
    q: 'Yanıt Agency nedir?',
    a: 'Yanıt Agency, Yanıt’ın çıkardığı yapılacaklar listesini aylık sprintle uygulayan hizmet ekibidir: teknik düzeltme, şema ve entity çalışması, cevap veren içerik ve kaynak kayıtları.',
    more: 'Yanıt yazılım, Yanıt Agency hizmettir. Yalnızca yazılımı alıp uygulamayı kendi ekibinizle yapabilirsiniz; ajans tarafı zorunlu değildir.',
  },
  {
    q: 'Yapay zekâ görünürlüğü nedir?',
    a: 'Yapay zekâ görünürlüğü, müşterinizin bir asistana sorduğu satın alma sorusunun cevabında markanızın anılıp anılmadığı ve nasıl anlatıldığıdır; bir sıra numarası değil, cevabın içinde yer alıp almamaktır.',
    more: 'Bu yüzden “kaçıncı sıradayım” sorusunun karşılığı yoktur. Ölçülen şey şudur: aynı soru her gün sorulduğunda cevapta kimler geçiyor, siz hangi bağlamda geçiyorsunuz.',
  },
  {
    q: 'GEO nedir, SEO’dan farkı ne?',
    a: 'GEO (generative engine optimization), bir markanın üretken yapay zekâ cevaplarında doğru ve alıntılanabilir biçimde yer alması için sitesinde yapılan ölçüm ve düzeltme çalışmasıdır.',
    more: 'SEO bir bağlantının listede kaçıncı sırada çıkacağıyla ilgilenir; GEO ise makinenin sayfadan cümle çıkarıp cevaba koyabilmesiyle. İkisi çakışmaz: aynı sayfa hem taranabilir hem alıntılanabilir olabilir.',
  },
];

/** Çalışma ilkeleri — duvara asılan değerler değil, teslim biçimini belirleyen kurallar. */
const PRINCIPLES = [
  {
    t: 'Ölçmeden konuşmayız',
    d: 'Bir markanın yapay zekâ cevaplarında nerede durduğunu bilmeden ne yapılması gerektiğini söyleyemeyiz. Bu yüzden her iş, müşterinizin gerçekten sorduğu soruların listesiyle ve o soruların ölçümüyle başlar. Ölçüm olmadan yazılmış her yapılacaklar listesi, birinin tahminidir.',
  },
  {
    t: 'Sonuç sözü vermeyiz, ölçüm veririz',
    d: 'Bir modelin yarın ne söyleyeceği bizim elimizde değil. Söz verebildiğimiz şey yöntemdir: ölçeriz, neyin eksik olduğunu gösteririz, düzeltme sırasını veririz, sonra aynı soruyu aynı biçimde tekrar sorarız. Rakamı biz yorumlamadan önce siz görürsünüz.',
  },
  {
    t: 'Her bulgunun bir “nasıl yapılır”ı olur',
    d: '“Şemanız eksik” bir teşhistir, iş değildir. Bizde her bulgunun yanında hangi sayfada, hangi alanda, hangi sırayla ne yapılacağı yazar. Uygulamayı kim yaparsa yapsın — sizin ekibiniz, ajansınız ya da biz — elinde bugün başlanabilir bir madde olur.',
  },
  {
    t: 'Sizin ekibiniz de yapabilsin diye anlatırız',
    d: 'Kapalı kutu satmıyoruz. Skorun nasıl hesaplandığı, hangi soruların sorulduğu, hangi modelin ne zaman yanıtladığı panelde açık durur. Bir gün bizimle çalışmayı bırakırsanız öğrendikleriniz sizde kalsın istiyoruz; müşterinin mecbur olduğu için kalması iyi bir iş ilişkisi değil.',
  },
];

/** SaaS ile hizmet tarafının karşılaştırması — aynı satır başlıkları, iki kolon. */
const SIDES = [
  {
    name: 'Yanıt',
    kind: 'Yazılım (abonelik)',
    href: '/features',
    hrefLabel: 'Ürünü görün',
    rows: [
      ['Ne verir', 'Günlük ölçüm, neden analizi ve önceliklendirilmiş yapılacaklar listesi'],
      ['Kimin için', 'Uygulamayı yapacak kendi ekibi ya da ajansı olan markalar'],
      ['Nasıl ilerler', 'Siz uygularsınız, panel aynı soruları sormaya devam eder'],
      ['Taahhüt', 'Aylık abonelik, istediğiniz zaman iptal'],
    ],
  },
  {
    name: 'Yanıt Agency',
    kind: 'Hizmet (aylık sprint)',
    href: '/yanit-agency',
    hrefLabel: 'Ajans tarafını görün',
    rows: [
      ['Ne verir', 'Aynı liste ve listenin uygulanmış hali: teknik, şema, içerik, kaynak'],
      ['Kimin için', 'Listeyi hayata geçirecek vakti ya da kadrosu olmayan markalar'],
      ['Nasıl ilerler', 'Dört haftalık sprint; her haftanın çıktısı baştan belli'],
      ['Taahhüt', 'Devam kararı her ay sonunda, uzun dönem taahhüdü yok'],
    ],
  },
];

/** Ekip rol bazlı anlatılır: isim ve fotoğraf yayımlanmaz. */
const ROLES = [
  {
    t: 'GEO araştırma',
    d: 'Sizin kategorinizde insanların yapay zekâya gerçekten ne sorduğunu çıkarır; takip edilecek soru listesini, rakip kümesini ve ölçüm biçimini belirler. Modellerin davranışı değiştikçe soruların ve yöntemin güncellenmesi de bu masanın işi.',
    touch: 'Takip edilen soru listesi ve rakip kümesi',
    q: 'Bu işte hangi sorularda görünmek gerçekten para ediyor?',
  },
  {
    t: 'Veri ve tarama altyapısı',
    d: 'Aynı soruların her gün aynı biçimde sorulmasını, cevapların kaydını ve sitenizin taranmasını sağlayan tarafı kurar. Ölçümün tekrarlanabilir olması — aynı girdi, aynı sonuç — buranın sorumluluğu.',
    touch: 'Günlük ölçüm, tarama, skor hesabı ve kayıt',
    q: 'Bu rakam nereden geldi, yarın tekrar ölçsek aynı çıkar mı?',
  },
  {
    t: 'İçerik stratejisi',
    d: 'Bir sorunun cevabının sitenizde nerede, hangi başlıkla ve hangi cümleyle duracağına karar verir. Amaç kelime doldurmak değil; bir asistanın alıntılayabileceği kadar net, bir insanın okuyunca karar verebileceği kadar dolu sayfalar.',
    touch: 'Cevap veren sayfalar, karşılaştırmalar, SSS blokları',
    q: 'Bu soruya bizim yerimize kim cevap veriyor, biz neden vermiyoruz?',
  },
  {
    t: 'Teknik uygulama',
    d: 'Bot erişiminden şemaya, yönlendirme zincirinden sayfa yapısına kadar makinenin sizi okuyabilmesi için gereken işleri yapar. Görünmemenin en ucuz sebepleri genelde burada çıkar, en hızlı kapanan maddeler de burada.',
    touch: 'robots.txt, şema ve entity, canonical, başlıklar, sayfa yapısı',
    q: 'Sayfa yayında da makine gerçekten okuyabiliyor mu?',
  },
  {
    t: 'Müşteri tarafı',
    d: 'Demo, kurulum, aylık değerlendirme ve veri/KVKK sorularını yürütür. Ölçümün ne anlama geldiğini yönetime anlatılabilir hale getirmek de buranın işi: rapor okunmuyorsa iş yarım kalmış demektir.',
    touch: 'Kurulum, aylık değerlendirme, raporun anlatımı',
    q: 'Bu ay ne değişti, önümüzdeki ay ne yapacağız?',
  },
];

/** Bileşik getiri — üç adımda neden birikir. */
const COMPOUND = [
  {
    t: 'Bir kez kurulur',
    d: 'Kim olduğunuz, ne sattığınız, fiyatınızın neye göre belirlendiği ve sık sorulanın cevabı, makinenin okuyabileceği biçimde bir kez yazılır.',
  },
  {
    t: 'Her yeni soruda tekrar çalışır',
    d: 'Aynı bilgi, bugün kimsenin sormadığı yarınki soruya da kaynaklık eder. Her soru için baştan iş yapılmaz; üstüne eklenir.',
  },
  {
    t: 'Geçmiş birikir',
    d: 'Ölçüm serisi uzadıkça “ne işe yaradı” sorusunun cevabı tahminden çıkar, kayda dönüşür. İkinci yıl, birinci yılın verisiyle karar verirsiniz.',
  },
];

/** Dürüstlük bölümü — satış görüşmesinde de aynen böyle söylenir. */
const NOT_PROMISED = [
  {
    t: 'Sıralama ya da sonuç sözü vermiyoruz',
    d: 'Bir modelin yarın ne söyleyeceğini kimse taahhüt edemez. Ölçeriz, eksiği gösteririz, uygularız ve aynı biçimde tekrar ölçeriz. Sözümüz yöntemdir, çıktı değil.',
  },
  {
    t: 'Tek bir sorgudan hüküm çıkarmıyoruz',
    d: 'Yapay zekâ cevapları oturumdan oturuma değişebilir. Tek ekran görüntüsüne dayanan iddiaları ne kendimizde ne de başkasında ciddiye alıyoruz; seriye bakarız, aralığı da yazarız.',
  },
  {
    t: 'Modellerin içini göremiyoruz',
    d: 'Hangi kaynağın cevaba neden girdiğini sağlayıcılar açıklamıyor. Biz dışarıdan gözlemliyoruz: ne soruldu, ne cevaplandı, kim geçti, sitede ne eksik. Bunun ötesini bilen değil, tahmin eden vardır.',
  },
  {
    t: 'Modele para verip sizi listeye sokmuyoruz',
    d: 'Böyle bir mekanizma yok; olsaydı da satmazdık. Hiçbir yapay zekâ sağlayıcısıyla iş ortaklığımız, gelir paylaşımımız ya da teşvikimiz bulunmuyor. Cevapları filtrelemiyor, sıralamayı değiştirmiyoruz.',
  },
  {
    t: 'Yayında olmayan özelliği çalışıyormuş gibi anlatmıyoruz',
    d: 'Yol haritasındaki işler sayfalarda “yakında” etiketiyle görünür. Demoda gördüğünüz her ekran, hesabınızda da aynı biçimde çalışır.',
  },
  {
    t: 'Her markaya uygun değiliz',
    d: 'Sitesine hiçbir değişiklik yapılamayan, kesin sonuç sözü arayan ya da tek seferlik bir bakış isteyen işler için doğru adres biz değiliz. Bunu ilk görüşmede söyleriz, sözleşmeden sonra değil.',
  },
];

const FAQ = [
  {
    question: 'Yanıt nedir?',
    answer:
      'Yanıt, bir markanın ChatGPT, Gemini ve Claude cevaplarında geçip geçmediğini her gün aynı sorularla ölçen, geçmiyorsa sitedeki eksiği gösteren ve düzeltme sırasını veren Türkiye merkezli bir yazılımdır. Ücretsiz rapor ve araçlar hesap istemez; sürekli ölçüm aylık aboneliktedir. Uygulamayı üstlenen ekip ise ayrı bir hizmettir: Yanıt Agency.',
  },
  {
    question: 'GEO nedir, SEO’dan farkı ne?',
    answer:
      'GEO (generative engine optimization), bir markanın üretken yapay zekâ cevaplarında doğru ve alıntılanabilir biçimde yer alması için sitesinde yapılan ölçüm ve düzeltme çalışmasıdır. SEO bir bağlantının listede kaçıncı sırada çıkacağıyla ilgilenir; GEO ise bir asistanın sayfadan cümle çıkarıp cevabına koyabilmesiyle. İkisi birbirinin yerine geçmez: aynı sayfa hem taranabilir hem alıntılanabilir olacak biçimde kurulur.',
  },
  {
    question: 'Yanıt’ı kim geliştiriyor?',
    answer:
      'Yanıt, Türkiye merkezli bağımsız bir ekip tarafından geliştiriliyor; hiçbir yapay zekâ sağlayıcısının iş ortağı, bayisi ya da gelir paylaşımı içinde olduğu bir taraf değiliz. Ürünü yazan ekiple müşteri sprintlerini yürüten ekip aynı kişiler: sahada işlemeyen bir öneri, ürüne geri bildirim olarak döner.',
  },
  {
    question: 'Neden ekip sayfasında isim ve fotoğraf yok?',
    answer:
      'Çünkü sizi ilgilendiren şey kadronun kalabalığı değil, işinize kimin hangi noktada dokunacağı. Rolleri ve her rolün sorumluluğunu açık yazıyoruz; görüşmede zaten işi yapacak kişiyle tanışıyorsunuz. Kurumsal ve basın talepleri için iletişim sayfasındaki basın bağlantısını kullanabilirsiniz.',
  },
  {
    question: 'Yanıt ile Yanıt Agency arasındaki fark ne?',
    answer:
      'Yanıt, ölçen ve ne yapılacağını söyleyen yazılım. Yanıt Agency ise o listeyi uygulayan ekip. Yalnızca aboneliği alıp uygulamayı kendi ekibinizle yapabilirsiniz; ajans tarafını kullanmak zorunda değilsiniz. Ölçüm her iki durumda da aynı panelde durur, veriye siz de bakarsınız.',
  },
  {
    question: 'Kendi ajansımız var, sizinle çalışmak çakışır mı?',
    answer:
      'Genelde çakışmaz. Biz bulguyu ve sırayı veririz; uygulamayı mevcut ajansınız yapıyorsa onları da aynı panele davet edersiniz ve herkes aynı rakama bakar. Tartışma “oldu mu olmadı mı” olmaktan çıkar, “hangi madde kapandı” haline gelir. Ajanslarla ayrı bir çalışma biçimimiz de var.',
  },
  {
    question: 'Sonuçları ne zaman görürüz?',
    answer:
      'Teknik düzeltmelerin etkisi bir sonraki taramada görünür. Yapay zekâ cevaplarındaki değişim ise içerik ve kaynak çalışmasının olgunlaşmasına bağlı olduğu için tarih vermiyoruz. Bunun yerine aynı soruları her gün sorup seriyi gösteriyoruz; neyin ne zaman değiştiğini biz anlatmadan önce siz görürsünüz.',
  },
];

export default function About() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Hakkımızda', href: PATH },
        ]}
      />
      <FaqJsonLd items={FAQ} />

      {/* 1 — Hero: Yanıt neden var */}
      <section className="pt-24 pb-16">
        <Container className="max-w-4xl">
          <div className="eyebrow">Hakkımızda</div>
          <h1 className="font-display text-[44px] lg:text-[68px] tracking-tight mt-4 leading-[1.03]">
            Yapay zekâ sizi anmıyorsa bunun bir sebebi vardır.
            <br />
            <span className="text-brand">Biz o sebebi ölçülebilir hale getiriyoruz.</span>
          </h1>
          <p className="text-[18px] lg:text-[20px] text-ink mt-8 leading-relaxed max-w-3xl">
            Yanıt; markanızın yapay zekâ cevaplarında geçip geçmediğini ölçen, geçmiyorsa nedenini gösteren ve düzeltme
            sırasını veren Türkiye merkezli bağımsız bir platformdur.
          </p>
          <div className="mt-7 space-y-5 text-[16.5px] text-ink-muted leading-[1.75] max-w-3xl">
            <p>
              Yirmi yıl boyunca “görünüyor muyuz” sorusunun cevabı bir sıra numarasıydı. Onuncu sıradaysanız birinci
              sayfadaydınız, kötü ihtimalle tıklanma azdı ama yine de oradaydınız. Bugün müşteriniz aynı soruyu bir
              arama kutusuna değil bir asistana yazıyor ve karşısına on bağlantı değil, iki üç ismin geçtiği tek bir
              paragraf çıkıyor. O paragrafta yoksanız listede sonuncu değilsiniz; listede hiç yoksunuz.
            </p>
            <p>
              Bu katmanın en can sıkıcı tarafı sessiz olması. Sıralamanız düştüğünde bir panelde kırmızı bir çizgi
              görürsünüz. Bir asistan sizi anmayı bıraktığında hiçbir yerde hiçbir şey olmaz; yalnızca telefon daha az
              çalar ve teklif isteyenler seyrelir. Yanıt bu sessizliği kırmak için var: aynı soruları her gün aynı
              biçimde sorar, cevabı kaydeder, kimin geçtiğini yazar ve sizin hangi eksik yüzünden dışarıda kaldığınızı
              gösterir.
            </p>
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/how-it-works" className="btn-primary inline-flex items-center gap-2">
              Yöntemi görün <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <Link href="/arac" className="btn-secondary">
              Önce ücretsiz tarayın
            </Link>
          </div>
        </Container>
      </section>

      {/* 1b — Tanımlar: sayfanın en çok alıntılanacak bölümü, cevap önce */}
      <Section
        id="tanimlar"
        className="border-t border-hairline scroll-mt-20"
        eyebrow="Kısa cevaplar"
        title="Önce tanımlar: Yanıt nedir, Yanıt Agency nedir?"
        intro="Aşağıdaki dört cevap, sayfanın gerisini okumadan da anlaşılacak biçimde yazıldı. Her biri tek cümlede biter; altındaki satır yalnızca gerekçedir."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {DEFINITIONS.map((d) => (
            <div key={d.q} className="card p-7 h-full">
              <h3 className="font-display text-[20px] tracking-tight leading-snug">{d.q}</h3>
              <p className="text-[15px] text-ink mt-3 leading-relaxed">{d.a}</p>
              <p className="text-[13.5px] text-ink-muted mt-3 leading-relaxed">{d.more}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 2 — Neyi değiştirmeye çalışıyoruz */}
      <Section
        id="mission"
        className="band border-t border-hairline scroll-mt-20"
        eyebrow="Neyi değiştirmeye çalışıyoruz"
        title="Arama kutusu kapanmadı; ama karar giderek cevap kutusunda veriliyor."
        intro="Bu bir kehanet değil, ölçülen bir davranış değişikliği. Türkiye’deki tabloyu kaynaklarıyla veriyoruz."
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7 space-y-5 text-[16px] text-ink leading-[1.75]">
            <p>
              Türkiye bu geçişi uzaktan seyretmiyor, içinde. İnternet neredeyse bütün yetişkin nüfusa ulaşmış durumda ve
              üretken yapay zekâ kullanımı — hâlâ genç kuşakta yoğunlaşsa da — merak evresinden alışkanlığa geçiyor.
              Önemli olan yüzdenin bugünkü seviyesi değil, sorunun tipinin değişmesi: “İstanbul diş kliniği” diye arayan
              kişi liste ister; “ailem için hangi kliniğe gitmeliyim, neye dikkat etmeliyim” diye soran kişi karar
              ister. İkinci soruya cevap veren taraf, adı geçen taraf olur.
            </p>
            <p>
              Değiştirmeye çalıştığımız şey tam olarak şu: bir markanın bu katmanda görünür olup olmadığı tahmine, ajans
              hissiyatına ya da tek bir ekran görüntüsüne kalmasın. Ölçülebilir olsun. Ölçülebilirse tartışılabilir,
              tartışılabilirse düzeltilebilir; düzeltildiyse de aynı biçimde tekrar ölçülebilir.
            </p>
            <p>
              Bunu KOBİ’ye “GEO” ya da “AEO” diye anlatmıyoruz. Sorduğumuz soru daha basit ve daha rahatsız edici:{' '}
              <strong>ChatGPT sizi öneriyor mu, önermiyorsa yerinizde kim var?</strong>
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-hairline bg-paper-3 overflow-hidden">
              <Ciz name="soru" alt="Bir kişinin sorduğu sorunun cevabında geçen marka isimleri" className="p-3" />
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {FACTS.map((f) => (
            <Reveal key={f.key} className="h-full">
              <div className="card p-6 h-full">
                <div className="font-display text-[34px] tabular text-brand leading-none">{f.value}</div>
                <div className="text-[14px] text-ink mt-3 leading-snug">{f.label}</div>
                <p className="text-[13px] text-ink-muted mt-3 leading-relaxed">{f.sentence}</p>
                <a
                  href={f.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[11.5px] text-ink-faint mt-4 font-mono leading-relaxed hover:text-brand-deep"
                >
                  {f.source}
                </a>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="text-[13px] text-ink-faint mt-5 max-w-3xl leading-relaxed">
          Rakamlar tek bir kaynak dosyasından gelir ve yıl bilgisiyle birlikte yazılır; kaynağı olmayan yüzdeyi hiçbir
          sayfamızda kullanmıyoruz.
        </p>
      </Section>

      {/* 3 — Nasıl çalışırız */}
      <Section
        eyebrow="Nasıl çalışırız"
        title="Nasıl çalışıyoruz? Dört ilke, hepsi aynı yere çıkıyor: kanıt."
        intro="Bunlar duvara asılan değerler değil; işi nasıl teslim ettiğimizi belirleyen kurallar."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-9">
          {PRINCIPLES.map((p, i) => (
            <div key={p.t} className="border-l-2 border-brand/40 pl-6 py-1">
              <div className="eyebrow text-brand-deep">0{i + 1}</div>
              <h3 className="font-display text-[22px] tracking-tight mt-2 leading-snug">{p.t}</h3>
              <p className="text-[14.5px] text-ink-muted mt-3 leading-relaxed">{p.d}</p>
            </div>
          ))}
        </div>
        <Link
          href="/how-it-works"
          className="mt-10 inline-flex items-center gap-1.5 text-[14px] text-brand-deep hover:text-brand"
        >
          Yöntemin tamamı: Analiz → Düzelt → Ölç <ArrowRight className="w-4 h-4" aria-hidden />
        </Link>
      </Section>

      {/* 4 — Şirket: iki yüz */}
      <Section
        id="sirket"
        className="band border-t border-hairline scroll-mt-20"
        eyebrow="Şirket"
        title="Yanıt’ın iki yüzü var: bir ürün, bir de o ürünü sahada kullanan ekip."
      >
        <div className="max-w-3xl space-y-5 text-[16px] text-ink leading-[1.75]">
          <p>
            Birinci yüz yazılım. Alan adınızı tanır, kategorinizde sorulan soruları çıkarır, ChatGPT, Gemini ve Claude
            cevaplarında kimin geçtiğini her gün kaydeder, sitenizi tarar ve arada kalan farkı yapılacak işlere çevirir.
            Hesap açan herkes aynı panele bakar; müşteriye gösterdiğimiz ekranla kendi baktığımız ekran aynıdır.
          </p>
          <p>
            İkinci yüz uygulama. Sahada gördüğümüz sorun rapor eksikliği değil, uygulama eksikliği: çoğu markanın elinde
            zaten bir yerden çıkmış bir liste var, o listeyi hayata geçirecek saat yok. Yanıt Agency bunun için var;
            aylık sprintle çalışır, teknik düzeltmeyi, şemayı, cevap veren içeriği ve kaynak çalışmasını üstlenir.
          </p>
        </div>

        <figure className="mt-10 max-w-[460px] mx-auto rounded-2xl border border-hairline bg-paper-3 overflow-hidden">
          <Image
            src="/img/ciz/iki-yuz.webp"
            alt="Solda ölçüm paneli, sağda anahtarla düzeltilen bir sayfa; ikisi arasında dönen bir döngü oku"
            width={1200}
            height={675}
            unoptimized
            className="w-full h-auto"
          />
          <figcaption className="text-[12.5px] text-ink-faint px-6 py-4 border-t border-hairline">
            Ölçen ürün ile uygulayan ekip aynı döngünün iki ucunda duruyor.
          </figcaption>
        </figure>

        <div className="mt-10 max-w-3xl space-y-5 text-[16px] text-ink leading-[1.75]">
          <p>
            İkisini bir arada tutmamızın sebebi ticari değil, teknik. Ürünü en çok kullanan ajans biziz. Bir bulgunun
            uygulaması gerçekte kaç saat sürüyor, hangi öneri sahada karşılık bulmuyor, hangi kontrol yanlış alarm
            veriyor — bunları müşteri şikâyetinden değil, kendi sprintimizden öğreniyoruz. Uygulamadan gelen her ders
            ürüne geri döner; üründe ölçtüğümüz her şey de bir sonraki sprintin sırasını belirler. Biri diğerinin
            laboratuvarı.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {SIDES.map((s) => (
            <div key={s.name} className="card p-7 h-full flex flex-col">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-display text-[22px] tracking-tight">{s.name}</h3>
                <span className="chip">{s.kind}</span>
              </div>
              <dl className="mt-6 divide-y divide-hairline">
                {s.rows.map(([k, v]) => (
                  <div key={k} className="py-3.5">
                    <dt className="text-[11.5px] font-mono tracking-eyebrow text-ink-faint uppercase">{k}</dt>
                    <dd className="text-[14.5px] text-ink mt-1.5 leading-relaxed">{v}</dd>
                  </div>
                ))}
              </dl>
              <Link
                href={s.href}
                className="mt-6 inline-flex items-center gap-1.5 text-[14px] text-brand-deep hover:text-brand"
              >
                {s.hrefLabel} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
              </Link>
            </div>
          ))}
        </div>
        <p className="text-[13.5px] text-ink-muted mt-6 max-w-3xl leading-relaxed">
          İkisi zorunlu bir paket değil. Yalnızca ölçüm isteyen abone olur, uygulamayı kendi ekibiyle yapar; yalnızca
          uygulama isteyen sprint alır. Ölçüm her iki durumda da aynı yerde durur.
        </p>
      </Section>

      {/* 5 — Ekip */}
      <Section id="team" className="scroll-mt-20" eyebrow="Ekip" title="Küçük bir ekip. Herkes uygulamanın içinde.">
        <div className="max-w-3xl text-[16px] text-ink leading-[1.75] -mt-4">
          <p>
            Burada isim ve fotoğraf yayımlamıyoruz; rol yayımlıyoruz. Sizi ilgilendiren şey kadronun kalabalığı değil,
            işinize kimin hangi noktada dokunacağı ve o kişinin hangi soruyu cevaplamakla yükümlü olduğu.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {ROLES.map((r) => (
            <Reveal key={r.t} className="h-full">
              <div className="card p-7 h-full flex flex-col">
                <h3 className="font-display text-[20px] tracking-tight">{r.t}</h3>
                <p className="text-[14.5px] text-ink-muted mt-3 leading-relaxed flex-1">{r.d}</p>
                <div className="mt-5 pt-5 border-t border-hairline space-y-2.5">
                  <div className="flex gap-2.5 text-[13.5px] leading-relaxed">
                    <Check className="w-3.5 h-3.5 text-brand shrink-0 mt-1" aria-hidden />
                    <span>
                      <span className="text-ink-faint">Nereye dokunur: </span>
                      {r.touch}
                    </span>
                  </div>
                  <p className="text-[13.5px] text-ink leading-relaxed">
                    <span className="text-ink-faint">Cevapladığı soru: </span>
                    <span className="accent-text">{r.q}</span>
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-8 card p-8 bg-paper-3">
          <h3 className="font-display text-[20px] tracking-tight">Kadro büyük değil, bunu saklamıyoruz.</h3>
          <p className="text-[15px] text-ink-muted mt-3 leading-relaxed max-w-3xl">
            Onlarca kişilik bir yapı yok; olduğunu da söylemiyoruz. Aynı kişiler hem ürünü yazıyor hem müşteri sprintini
            yürütüyor. Bunun iyi tarafı, işinizi anlatacağınız kişinin işi yapan kişi olması ve arada üç katman
            bulunmaması. Zor tarafı ise aynı anda alabileceğimiz müşteri sayısının sınırlı olması: kapasite dolduğunda
            sıraya alıyoruz, “hepsini alırız” demiyoruz.
          </p>
          <div className="mt-7 flex flex-wrap gap-5 text-[13.5px]">
            <Link href="/contact#sales" className="inline-flex items-center gap-1.5 text-brand-deep hover:text-brand">
              Satış görüşmesi <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
            <Link href="/contact#press" className="inline-flex items-center gap-1.5 text-brand-deep hover:text-brand">
              Basın ve kurumsal <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
            <Link href="/bot" className="inline-flex items-center gap-1.5 text-brand-deep hover:text-brand">
              YanitBot (tarayıcımız) <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </Section>

      {/* 6 — Yatırım */}
      <Section
        className="band border-t border-hairline"
        eyebrow="Neden şimdi"
        title="Neden şimdi başlamak önemli?"
        intro="Kısa cevap: cevap katmanı bir kampanya gibi davranmıyor, üstüne biriken bir iş. Bir kez doğru kurulan bilgi, bugün sorulmayan yarınki soruya da kaynaklık ediyor."
      >
        <div className="max-w-3xl space-y-5 text-[16px] text-ink leading-[1.75]">
          <p>
            Reklam bütçesi harcadığınız gün çalışır, durduğunuz gün susar. Cevap katmanı böyle davranmıyor. Kim
            olduğunuzu, neyi kime sattığınızı, fiyatınızın neye göre belirlendiğini ve sık sorulan sorunun cevabını
            makinenin okuyabileceği biçimde bir kez yazdığınızda, o bilgi tek bir sorguya değil o konunun etrafındaki
            bütün sorulara hizmet eder. Sayfayı bir kez kurarsınız, defalarca alıntılanır.
          </p>
          <p>
            Bileşik getiri tam olarak buradan çıkıyor. Bugün yazdığınız karşılaştırma sayfası, yarın ilk kez sorulan bir
            soruda da kaynak olur. Düzelttiğiniz şema, henüz çıkmamış bir modelin sizi doğru tanımasını kolaylaştırır.
            Kaydolduğunuz sektör kaynağı, siz uğraşmasanız da sizin adınıza konuşmaya devam eder. Aynı iş üçüncü ayda da
            çalışır, ikinci yılda da; üstelik ikinci yılda birinci yılın ölçüm kaydıyla karar verirsiniz.
          </p>
        </div>

        <figure className="mt-10 max-w-[460px] mx-auto rounded-2xl border border-hairline bg-paper-3 overflow-hidden">
          <Image
            src="/img/ciz/bilesik-getiri.webp"
            alt="Bir sayfadan yükselen konuşma balonları ve yanında katman katman büyüyen küçük blok yığını"
            width={1200}
            height={675}
            unoptimized
            className="w-full h-auto"
          />
          <figcaption className="text-[12.5px] text-ink-faint px-6 py-4 border-t border-hairline">
            Bir kez doğru kurulan bilgi, sonraki soruların cevabına da kaynaklık eder.
          </figcaption>
        </figure>

        <div className="mt-10 max-w-3xl space-y-5 text-[16px] text-ink leading-[1.75]">
          <p>
            Bir de sırayla ilgili bir gerçek var. Bu katmanda cevaplar, zaman içinde birikmiş kaynaklardan besleniyor.
            Kategorinizde sizden önce net cevap vermiş bir marka, siz aynı işi yaptıktan sonra da bir süre daha anılmaya
            devam eder. Bunu bir korku cümlesi olarak değil, bir sıra meselesi olarak söylüyoruz: erken başlamanın
            maliyeti düşük, geç başlamanın maliyeti tek kalem değil — hem yapılacak iş büyür hem de farkı kapatmak uzar.
            Doğru hamle acele etmek değil; önce ölçmek, nerede durduğunuzu görmek, kararı ondan sonra vermek.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {COMPOUND.map((c, i) => (
            <div key={c.t} className="card p-6 h-full">
              <div className="eyebrow text-brand-deep">{i + 1}. adım</div>
              <h3 className="font-display text-[19px] mt-3 leading-snug">{c.t}</h3>
              <p className="text-[13.5px] text-ink-muted mt-3 leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-5 text-[13.5px]">
          <Link href="/pricing" className="inline-flex items-center gap-1.5 text-brand-deep hover:text-brand">
            Fiyatlandırma <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
          <Link href="/resources/geo-101" className="inline-flex items-center gap-1.5 text-brand-deep hover:text-brand">
            GEO 101: bu katman nasıl çalışıyor <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        </div>
      </Section>

      {/* 7 — Söz vermediklerimiz */}
      <Section
        eyebrow="Söz vermediklerimiz"
        title="Yanıt neye söz vermiyor?"
        intro="Kısa cevap: sıralamaya, sonuca ve tarihe söz vermiyoruz; yönteme söz veriyoruz. Bu bölümü herkesten önce siz okuyun — aşağıdakiler satış görüşmesinde de aynen böyle söylenir."
      >
        <div className="card divide-y divide-hairline">
          {NOT_PROMISED.map((n) => (
            <div key={n.t} className="p-7 flex gap-4">
              <Minus className="w-4 h-4 text-ink-faint shrink-0 mt-1.5" aria-hidden />
              <div>
                <h3 className="font-display text-[18px] tracking-tight leading-snug">{n.t}</h3>
                <p className="text-[14.5px] text-ink-muted mt-2 leading-relaxed max-w-3xl">{n.d}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[15px] text-ink mt-8 max-w-3xl leading-relaxed">
          Bu liste kısaldıkça değil, dürüst kaldıkça işe yarıyor. Ölçemediğimiz bir şeyi ölçüyormuş gibi anlatmaktansa
          sınırını yazmayı tercih ediyoruz; çünkü bu işte güven, ilk ay verilen sözle değil, üçüncü ay tutulan kayıtla
          kuruluyor.
        </p>
        <div className="mt-6 flex flex-wrap gap-5 text-[13.5px]">
          <Link href="/uyumluluk" className="inline-flex items-center gap-1.5 text-brand-deep hover:text-brand">
            Veri ve uyumluluk <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
          <Link href="/changelog" className="inline-flex items-center gap-1.5 text-brand-deep hover:text-brand">
            Neyi ne zaman yayına aldık <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        </div>
      </Section>

      {/* 8 — SSS */}
      <Section className="band border-t border-hairline" eyebrow="Sıkça sorulanlar" title="Şirket ve ekip hakkında.">
        <Faq items={FAQ} defaultOpen={0} />
      </Section>

      {/* 9 — CTA */}
      <CtaBlock
        title={
          <>
            Önce nerede olduğunuzu görelim; <span className="text-brand">gerisini birlikte kararlaştırırız.</span>
          </>
        }
        body="Ücretsiz araçlar hesap istemez. Sürekli ölçüm için hesap açın; kart gerekmez. Uygulamayı üstlenmemizi isterseniz Yanıt Agency teklif verir."
        secondaryHref="/yanit-agency"
        secondaryLabel="Yanıt Agency"
      />
    </>
  );
}
