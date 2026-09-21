import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Code2,
  Eye,
  FileText,
  Gauge,
  HelpCircle,
  Layers,
  Link2,
  ListChecks,
  Minus,
  Network,
  Quote,
  Repeat,
  Search,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { Reveal } from '@/components/marketing/reveal';
import { Faq } from '@/components/marketing/faq';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/json-ld';
import { Ciz } from '@/components/marketing/ciz';
import { AgencyBriefForm } from '@/components/marketing/agency-brief-form';
import { buildMetadata } from '@/lib/seo';

const PATH = '/yanit-agency';

export const metadata = buildMetadata({
  title: 'Yanıt Agency — okuruz, düzeltiriz, sonra ölçeriz',
  description:
    'Teknolojinizi ve içeriğinizi okuyoruz, anlatı dilinizi buluyoruz, sayfalarınızı ve şemanızı düzeltiyoruz. Aylık sprint, tek panel, öncesi-sonrası ölçüm.',
  path: PATH,
});

/**
 * Tanım seti — sayfanın tek başına alıntılanabilir bölümü. Her cevap ilk cümlede biter;
 * ikinci cümle yalnızca gerekçe. “Yanıt” (yazılım) ile “Yanıt Agency” (hizmet) ayrımı burada netleşir.
 */
const DEFINITIONS = [
  {
    q: 'Yanıt Agency nedir?',
    a: 'Yanıt Agency, bir markanın yapay zekâ cevaplarında görünmesi için gereken düzeltmeleri aylık sprintle uygulayan hizmet ekibidir.',
    more: 'Sitenizi ve içeriğinizi okur, anlatı dilinizi yazar, sayfa ve şema düzeltmelerini uygular, sonra aynı soruları aynı biçimde tekrar ölçer.',
  },
  {
    q: 'Yanıt ile Yanıt Agency arasındaki fark ne?',
    a: 'Yanıt yazılımdır: ölçer ve yapılacakları çıkarır. Yanıt Agency hizmettir: aynı listeyi uygulayan ekiptir.',
    more: 'Ajans sprintine Yanıt aboneliği dahildir. Yalnızca yazılımı alıp uygulamayı kendi ekibinizle ya da mevcut ajansınızla yapmanız da mümkündür.',
  },
  {
    q: 'Şematik hat nedir?',
    a: 'Şematik hat, bir sitedeki sayfaların, JSON-LD şemalarının ve dış kayıtların aynı varlığı işaret ederek kesintisiz bir anlam zinciri kurmasıdır.',
    more: 'Hizmet sayfası alt hizmete, alt hizmet vakaya, vaka SSS’ye bağlanır; Organization şeması, sayfadaki ad ve dizin kaydı aynı ismi söyler. Zincir koptuğunda iki ayrı şirketmişsiniz gibi okunursunuz.',
  },
  {
    q: 'Bir sprint ne kadar sürer, sonunda ne teslim edilir?',
    a: 'Bir sprint dört haftadır ve altı somut çıktıyla biter: kapsam raporu, anlatı kılavuzu, uygulanmış düzeltmelerin tarihli kaydı, yazılan sayfalar, kaynak çalışması kaydı ve öncesi-sonrası ölçüm.',
    more: 'Devam kararı her ay sonundaki değerlendirme görüşmesinde verilir; uzun dönem taahhüdü istenmez.',
  },
];

/** Sayfanın omurgası: dört adım, dört bölüm. Üstteki şerit ile bölümler aynı sırayı paylaşır. */
const SPINE = [
  {
    n: '01',
    id: 'okuma',
    icon: Search,
    title: 'Önce sizi okuyoruz',
    line: 'Teknolojiniz, yaptığınız işler, geçmiş içeriğiniz, rakipleriniz ve sektörünüzün gerçek soruları.',
    out: 'Kapsam raporu',
  },
  {
    n: '02',
    id: 'anlati',
    icon: Quote,
    title: 'Anlatı dilinizi buluyoruz',
    line: 'Ne yaptığınızı, kimin için yaptığınızı ve neyi farklı yaptığınızı alıntılanabilir cümlelere çeviriyoruz.',
    out: 'Anlatı kılavuzu ve tanım seti',
  },
  {
    n: '03',
    id: 'sayfalar',
    icon: Layers,
    title: 'Sayfaları ve şematik hatları düzeltiyoruz',
    line: 'Sayfa yapısı, JSON-LD şemaları, entity bağlantıları, iç bağlantı hatları ve teknik erişim.',
    out: 'Uygulanmış düzeltmeler ve fark listesi',
  },
  {
    n: '04',
    id: 'sorular',
    icon: HelpCircle,
    title: 'Doğru sorulara çalışıyoruz',
    line: 'Herkesin peşinde olduğu genel soru değil; sizi arayan kişinin sorduğu soru.',
    out: 'Takip edilen soru seti ve haftalık ölçüm',
  },
];

/** Bölüm A — inceleme başlıkları. Her madde taramada karşılığı olan bir kontrol. */
const READ_GROUPS = [
  {
    icon: Code2,
    title: 'Teknoloji ve erişim',
    items: [
      'Altyapı ve CMS: WordPress, Shopify, Ticimax, İdeasoft ya da özel geliştirme — sayfa hangi motordan çıkıyor',
      'Render biçimi: içerik sunucudan mı geliyor, yoksa JavaScript çalışmadan sayfa boş mu kalıyor',
      'robots.txt: Googlebot, GPTBot, ClaudeBot, PerplexityBot için ne yazıyor, farkında olmadan kapatılmış bir şey var mı',
      'Sitemap: hangi sayfalar listelenmiş, hangileri unutulmuş, tarihler gerçeği gösteriyor mu',
      'Yönlendirme zincirleri, canonical etiketleri ve aynı içeriğin iki adreste yaşaması',
      'Mobil erişim, sayfa ağırlığı ve ilk açılışta ekrana ne geldiği',
    ],
  },
  {
    icon: FileText,
    title: 'Yaptığınız işler ve geçmiş içerik',
    items: [
      'Her hizmet ve ürün sayfası hangi soruya cevap veriyor — cevap veriyor mu, yoksa sadece tanıtıyor mu',
      'Blog arşivi: hâlâ doğru olan, güncellenmesi gereken ve artık kaldırılması gereken yazılar',
      'Referans, vaka ve portföy sayfaları — yaptığınız işin sitede yazılı kanıtı var mı',
      'Fiyat, kapsam, teslim süresi, iade, servis bölgesi gibi satın alma öncesi sorular sayfada karşılanıyor mu',
      'Aynı hizmete farklı sayfalarda farklı ad verilmiş mi',
    ],
  },
  {
    icon: Users,
    title: 'Rakipler ve sektörün soruları',
    items: [
      'Sizinle aynı soruda cevapta çıkan markalar ve hangi sayfayla çıktıkları',
      'Karşılaştırma, liste ve “alternatifleri” içeriklerinde kimlerin adı geçiyor',
      'Müşterinizin soruyu nasıl kurduğu: sektör terimiyle mi, günlük dille mi',
      'Rakiplerin cevabında öne çıkan somut ayrıntılar — fiyat aralığı, teslim süresi, kapsam sınırı',
    ],
  },
  {
    icon: Network,
    title: 'Kim sizden bahsediyor',
    items: [
      'Dizinler, oda ve dernek kayıtları, sektör listeleri, bayi ve tedarikçi sayfaları',
      'Haber, röportaj, söyleşi ve konuşmacı kayıtları',
      'Aynı isim, adres ve telefonun her yerde tutup tutmadığı',
      'Sosyal ve profesyonel profillerin site ile bağının kurulu olup olmadığı',
    ],
  },
];

/** Bölüm B — anlatı çalışmasının somut parçaları. */
const NARRATIVE_ITEMS = [
  {
    t: 'Tanım cümlesi',
    d: 'Tek cümlede kim olduğunuz: ne yapan, kimin için yapan, nerede yapan bir şirket. Bu cümle sitede bir yerde yazılı durur ve her sayfada aynı kalır.',
  },
  {
    t: 'Terim sözlüğü',
    d: 'Aynı hizmete üç sayfada üç ayrı ad verilmesi biter. Hangi terimi kullandığınız, hangi terimin eş anlamlısı olduğu ve hangisini hiç kullanmayacağınız yazılır.',
  },
  {
    t: 'Kapsam sınırı',
    d: 'Ne yaptığınız kadar ne yapmadığınız da yazılır. “Şu işi almıyoruz” cümlesi, sizi yanlış sorularda çıkmaktan korur.',
  },
  {
    t: 'Kanıt cümleleri',
    d: 'Yıl, şehir, kapasite, sertifika, çalışılan sektör — doğrulanabilir olanlar. Doğrulanamayan hiçbir ifade kılavuza girmez.',
  },
  {
    t: 'Kimin için, kimin için değil',
    d: 'Alıcı profili ve uygun olmayan profil. Satış ekibinizin zaten bildiği ayrımın yazılı hâli.',
  },
  {
    t: 'Yazılmayacaklar listesi',
    d: 'Abartılı vaat, ölçülemeyen üstünlük iddiası ve içi boş sıfatlar. Bu liste sizin kadar bizim de elimizi bağlar.',
  },
];

/** Bölüm C — sayfa, şema ve bağlantı çalışması. */
const SCHEMA_GROUPS = [
  {
    icon: Layers,
    title: 'Sayfa düzeni',
    items: [
      'Tek H1 — sayfanın ne hakkında olduğunu söyleyen tek başlık',
      'Başlık hiyerarşisi: H2 ve H3 sırayla, atlamadan',
      'Soruyu başlığa taşıyan bölümler, ilk paragrafta doğrudan cevap',
      'Karşılaştırmada tablo, adım anlatımında numaralı liste, koşullarda madde',
      'Her sayfanın tek işi olması — bir sayfa, bir soru ailesi',
      'SSS bölümlerinin sayfadaki metinle aynı şeyi söylemesi',
    ],
  },
  {
    icon: Code2,
    title: 'JSON-LD şemaları',
    items: [
      'Organization — şirketin kimliği, adı, adresi, iletişim bilgisi',
      'Service ve Product — ne sattığınız, hangi kapsamda',
      'FAQPage — sayfadaki soru-cevapların makine tarafında karşılığı',
      'LocalBusiness — şubesi, servis bölgesi, çalışma saati olan işler için',
      'BreadcrumbList — sayfanın site içindeki yeri',
      'Sayfada yazanla şemada yazanın birebir aynı olması; çift ve hatalı şemaların temizlenmesi',
    ],
  },
  {
    icon: Link2,
    title: 'Bağlantı ve teknik erişim',
    items: [
      'sameAs ile doğrulanabilir profillere bağ: dizin kaydı, oda kaydı, profesyonel profiller',
      'İç bağlantı hatları: hizmet → alt hizmet → vaka → SSS → iletişim',
      'Bot izinleri ve llms.txt — hangi kaynağın okunmasına izin verdiğinizin açık kaydı',
      'Canonical ve sitemap düzeni; yönlendirme zincirlerinin tek adıma indirilmesi',
      'Kaldırılan sayfaların doğru karşılığa bağlanması',
    ],
  },
];

/** Bölüm D — soru setinin kaynakları. */
const QUESTION_SOURCES = [
  {
    t: 'Müşteri görüşmeleri',
    d: 'Son kazanılan ve kaybedilen işlerde ilk toplantıda ne soruldu. Çoğu soru setinin omurgası buradan çıkar.',
  },
  {
    t: 'Satış ekibinin duyduğu itirazlar',
    d: '“Pahalı”, “bizim sistemimize uyar mı”, “ne kadar sürede teslim” — itiraz, cevaplanmamış bir sorudur.',
  },
  {
    t: 'Arama verisi',
    d: 'İnsanların gerçekten yazdığı ifadeler ve bunların soru hâline gelmiş biçimleri.',
  },
  {
    t: 'Rakip cevapları',
    d: 'Aynı soruda çıkan markaların hangi ayrıntıyla çıktığı; cevabın hangi kısmını sizin sayfanız hiç karşılamıyor.',
  },
  {
    t: 'Destek ve teklif kayıtları',
    d: 'Satıştan sonra tekrar tekrar sorulan şeyler. Bunlar genelde sitede olmayan bilgidir.',
  },
];

/** Temsili soru tablosu — gerçek bir müşteri vakası değildir. */
const QUESTION_ROWS = [
  {
    q: 'Küçük bir otel için kanal yönetimi ile rezervasyon motoru ayrı ayrı mı alınır?',
    who: 'İki yazılım firması ve bir sektör blogu',
    you: 'Adınız geçmiyor',
    gap: 'Bu ayrımı anlatan bir sayfanız yok; bilgi teklif e-postalarında kalmış',
  },
  {
    q: '50 adetin altındaki CNC siparişlerini kimler alıyor?',
    who: 'Üç atölye, ikisi fiyat aralığı vererek',
    you: 'Adınız geçiyor ama kapsamınız yanlış anlatılıyor',
    gap: 'Alt sipariş sınırı sitede yazılı değil',
  },
  {
    q: 'Kurumsal muhasebe yazılımı geçişi kaç haftada tamamlanır?',
    who: 'İki rakip, biri adım adım takvimle',
    you: 'Adınız geçmiyor',
    gap: 'Geçiş süreci sayfası var ama süre ve sorumluluk dağılımı yok',
  },
];

/** Kapsam kolonları — her biri panelde ölçülen bir bulgu türüne karşılık gelir. */
const SERVICES = [
  {
    icon: Wrench,
    title: 'Teknik düzeltme',
    body: 'Bot erişimi, yönlendirme zinciri, canonical, sayfa hızı ve güvenlik başlıkları. Görünmemenin en ucuz sebepleri genelde burada.',
    items: ['robots.txt ve bot erişimi', 'Yönlendirme ve canonical', 'Güvenlik başlıkları ve TLS'],
  },
  {
    icon: FileText,
    title: 'Cevap veren içerik',
    body: 'Müşterinizin sorduğu soruyu başlığa taşıyan, ilk paragrafta doğrudan cevap veren sayfalar. Karşılaştırma ve fiyat sayfaları dahil.',
    items: ['Satın alma sorusu sayfaları', 'Karşılaştırma içerikleri', 'SSS ve şema uyumu'],
  },
  {
    icon: Link2,
    title: 'Şema, entity ve kaynak',
    body: 'Kim olduğunuzu makinenin anlayacağı biçimde yazmak; dizinlerde, karşılaştırma sitelerinde ve sektör kaynaklarında doğru kayıt.',
    items: ['Organization ve sektör şeması', 'Ad-adres-telefon tutarlılığı', 'Kaynak ve dizin çalışması'],
  },
  {
    icon: Gauge,
    title: 'Ölçüm ve raporlama',
    body: 'Aynı sorular her gün aynı biçimde sorulur. Ay sonunda ne değişti, hangi soruda kim öne geçti; hepsi aynı panelde.',
    items: ['Günlük ölçüm', 'Aylık değerlendirme', 'Paylaşılabilir rapor bağlantısı'],
  },
];

/** Aylık sprint — dört hafta, her haftanın çıktısı ve sizden gerekeni belli. */
const SPRINT = [
  {
    w: '1. hafta',
    t: 'Okuma ve sıralama',
    d: 'Site taraması, teknoloji ve içerik incelemesi, soru setinin ilk hâli ve bulguların etkiye göre sıralanması. Sprintte neyin yapılacağı burada yazılı hâle gelir.',
    need: 'Sizden: panel erişimi, bir saatlik açılış görüşmesi',
  },
  {
    w: '2. hafta',
    t: 'Teknik ve şema',
    d: 'Erişim, yönlendirme, canonical, JSON-LD şemaları ve sayfa düzeyindeki hızlı kazanımlar. Geliştirici ekibinizle birlikte ya da doğrudan panelinizde.',
    need: 'Sizden: yayına alma izni ya da geliştiricinizle tek kanal',
  },
  {
    w: '3. hafta',
    t: 'Anlatı ve içerik',
    d: 'Tanım cümleleri ve terim sözlüğü netleşir; cevap veren sayfalar yazılır, karşılaştırma içerikleri kurulur, kaynak ve dizin başvuruları yapılır.',
    need: 'Sizden: teknik doğruluk kontrolü ve içerik onayı',
  },
  {
    w: '4. hafta',
    t: 'Ölçüm ve devir',
    d: 'Aynı sorularla yeniden ölçüm, ay sonu değerlendirmesi ve bir sonraki sprintin listesi. Her şey panelde kalır, kimse kimseye dosya göndermez.',
    need: 'Sizden: 45 dakikalık değerlendirme görüşmesi',
  },
];

/** Raporlama ilkeleri. */
const REPORTING = [
  {
    icon: Repeat,
    t: 'Aynı sorular, aynı biçim',
    d: 'Soru seti sprint ortasında değiştirilmez. Değişecekse ne zaman ve neden değiştiği rapora yazılır; yoksa öncesi ile sonrası karşılaştırılamaz.',
  },
  {
    icon: CalendarDays,
    t: 'Öncesi ve sonrası yan yana',
    d: 'Sprint başındaki ölçüm dondurulur. Ay sonunda aynı ekranda iki tarih görünür; yorum değil, iki tarihin farkı konuşulur.',
  },
  {
    icon: Eye,
    t: 'Tek panel, ekibiniz de içeride',
    d: 'Rapor ayrı bir yerde hazırlanmaz. Bizim baktığımız ekrana siz de bakarsınız; pazarlama ekibiniz ve geliştiriciniz de davet edilir.',
  },
  {
    icon: ListChecks,
    t: 'Yapılan işin kaydı',
    d: 'Hangi sayfada ne değişti, hangi şema eklendi, hangi başvuru yapıldı ve ne döndü. Her madde tarihli.',
  },
  {
    icon: BookOpen,
    t: 'Paylaşılabilir bağlantı',
    d: 'Yönetime tek bağlantı gönderirsiniz. Sunum hazırlamak zorunda kalmazsınız.',
  },
  {
    icon: ShieldCheck,
    t: 'Ölçemediğimizi de yazarız',
    d: 'Bir soruda cevaplar oturumdan oturuma değişiyorsa bunu “iyileşme” diye sunmayız; kararsız olduğunu yazar, seriye bakarız.',
  },
];

/** Somut teslimler — hepsi üründe ya da dosyada karşılığı olan şeyler. */
const DELIVERABLES = [
  {
    t: 'Kapsam raporu',
    d: 'Teknoloji, içerik, rakip ve kaynak incelemesinin tek belgesi. Etkiye ve zorluğa göre sıralı.',
  },
  { t: 'Anlatı kılavuzu ve tanım seti', d: 'Tanım cümleleri, terim sözlüğü, kanıt listesi ve yazılmayacaklar.' },
  { t: 'Uygulanan düzeltmeler', d: 'Sprint içinde kapatılan maddeler ve yapılan her değişikliğin tarihli kaydı.' },
  { t: 'Yazılan sayfalar', d: 'Soru odaklı içerik, karşılaştırma bölümleri, SSS ve bunların şema karşılıkları.' },
  { t: 'Kaynak çalışması kaydı', d: 'Başvurulan dizin ve kaynaklar, dönen sonuçlar, bekleyenler.' },
  { t: 'Soru seti ve ölçüm', d: 'Takip edilen sorular, günlük çalıştırma serisi ve öncesi-sonrası karşılaştırma.' },
];

const FIT = {
  yes: [
    'Sitesi yayında ve düzeltme yapılabilecek bir ekip ya da ajans erişimi olan markalar',
    'Kategorisinde rakiplerinin önerildiğini gördüğü hâlde sebebini bilmeyenler',
    'Ne yaptığını iyi bilen ama bunu sitesine yazmamış şirketler — anlatı çalışmasının en hızlı ilerlediği yer burası',
    'İçerik ve teknik işi yapacak vakti olmayan, ölçümü yine de kendisi takip etmek isteyenler',
    'Satış ekibi olan işler: sorular ve itirazlar hazır veriyle gelir',
  ],
  no: [
    'Kesin sonuç sözü arayanlar — biz böyle bir söz vermiyoruz',
    'Tek seferlik “bir bakıp gitsin” işi arayanlar; sprint aylık çalışır',
    'Sitesine hiçbir değişiklik yapılamayacak durumda olanlar',
    'İçeriğin doğruluğunu kontrol edecek kimsenin ayrılamayacağı ekipler; teknik doğruluk sizin alanınız',
    'Anlatısını netleştirmeye niyeti olmayanlar; sayfa düzeltmek tek başına o boşluğu kapatmaz',
  ],
};

const PROMISES = {
  do: [
    'Ölçeriz: sorularınız her gün aynı biçimde çalıştırılır, sonuç panelde durur',
    'Neyin eksik olduğunu gösteririz: bulgu, sebep ve düzeltme yolu bir arada',
    'Düzeltme sırası veririz: önce hangisi, neden önce o',
    'Uygularız ya da uygulatırız: işi biz yaparız, ekibiniz yapacaksa yönlendiririz',
    'Tekrar ölçeriz: aynı soru, aynı model, aynı biçim; öncesi ve sonrası yan yana',
    'Yaptığımız her değişikliğin kaydını tutarız',
  ],
  dont: [
    'Modellerin ne söyleyeceğine söz vermeyiz — bu bizim kontrolümüzde değil',
    'Belirli bir tarihte belirli bir sonuç taahhüt etmeyiz',
    'Tek bir cevaba bakıp “oldu” demeyiz; seriye bakarız',
    'Doğrulayamadığımız bir iddiayı sitenize yazmayız',
    'Ölçümü süslemeyiz; düşüş varsa düşüş yazarız',
    'Sizi aylık taahhüde kilitlemeyiz; devam kararı her ay sonunda verilir',
  ],
};

/** Fiyat rakamı sayfada YAZMAZ: kapsam görüşmesinden sonra teklif edilir. */
const faqItems = () => [
  {
    question: 'Yanıt Agency nedir?',
    answer:
      'Yanıt Agency, bir markanın yapay zekâ cevaplarında görünmesi için gereken düzeltmeleri aylık sprintle uygulayan hizmet ekibidir. Sitenizi ve içeriğinizi okur, anlatı dilinizi yazar, sayfa yapısını ve JSON-LD şemalarını düzeltir, takip edilecek soru setini kurar ve aynı soruları aynı biçimde tekrar ölçer. Ölçümü yapan yazılım olan Yanıt, bu hizmete dahildir.',
  },
  {
    question: 'Şematik hat ne demek?',
    answer:
      'Şematik hat, bir sitedeki sayfaların, JSON-LD şemalarının ve dış kayıtların aynı varlığı işaret ederek kesintisiz bir anlam zinciri kurmasıdır. Hizmet sayfası alt hizmete, alt hizmet vakaya, vaka SSS’ye bağlanır; Organization şeması, sayfadaki şirket adı ve dizin kaydı aynı ismi söyler. Bir yerde “CNC işleme”, başka bir yerde “talaşlı imalat” yazılıp aralarında bağ kurulmazsa hat kopar ve site iki ayrı şirket gibi okunur.',
  },
  {
    question: 'Yanıt Agency ne kadar?',
    answer:
      'Yanıt Agency’nin liste fiyatı yoktur; teklif kapsam görüşmesinden sonra yazılır. Fiyatı belirleyen şeyler: sitenin büyüklüğü, takip edilecek soru sayısı, yazılacak içerik hacmi, sektörün rekabeti ve düzeltmeleri kimin uygulayacağı. Bu sayfadaki formu doldurun, sitenizi okuyup gelelim ve kapsamı birlikte çıkaralım. Yanıt aboneliği sprinte dahildir; uzun dönem taahhüdü yoktur, devam kararı her ay sonunda verilir.',
  },
  {
    question: 'Ne kadar sürede sonuç görürüm?',
    answer:
      'Teknik düzeltmelerin etkisi taramada hemen görünür. Yapay zekâ cevaplarındaki değişim içerik ve kaynak çalışmasının olgunlaşmasına bağlıdır; bunu tarih vererek değil, her sabah aynı soruyu sorarak takip ederiz.',
  },
  {
    question: 'Sonuç sözü veriyor musunuz?',
    answer:
      'Hayır. Modellerin ne söyleyeceği bizim kontrolümüzde değil. Söz verdiğimiz şey yöntem: ölçeriz, eksikleri gösteririz, düzeltme sırası veririz, uygularız ve değişimi aynı biçimde tekrar ölçeriz. Rakamlar panelde, istediğiniz an bakarsınız.',
  },
  {
    question: 'Anlatı dilini siz mi yazıyorsunuz, biz mi?',
    answer:
      'İkisi birlikte. Cümleleri biz kurarız ama içindeki her bilgi sizden gelir ve onayınızdan geçer. Doğrulayamadığımız hiçbir ifadeyi kılavuza koymayız; teknik doğruluğun son kontrolü her zaman sizde kalır.',
  },
  {
    question: 'Sitemize doğrudan müdahale ediyor musunuz?',
    answer:
      'Nasıl isterseniz. Erişim verirseniz düzeltmeleri biz uygularız. Geliştirici ekibiniz varsa değişiklikleri onların akışına uygun biçimde hazırlar, uygulamayı onlar yapar; iki durumda da yapılan her değişikliğin kaydı tutulur.',
  },
  {
    question: 'Kendi ajansımız var, çakışır mı?',
    answer:
      'Çakışmaz, çoğu zaman birlikte çalışırız. Biz bulguyu ve sırayı veririz; uygulamayı sizin ekibiniz yapıyorsa yalnızca ölçüm ve yönlendirme tarafında kalırız. Ajanslar için ayrı bir ortaklık programımız da var.',
  },
  {
    question: 'Sözleşme süresi var mı?',
    answer:
      'Sprint aylıktır. Uzun dönem taahhüdü istemiyoruz; devam kararını her ay sonundaki ölçüme bakarak birlikte veririz.',
  },
];

/** Bölüm sonundaki tek satırlık çıktı kartı. */
function OutputCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-6 lg:p-7 bg-paper-3">
      <div className="eyebrow text-brand-deep">Bu adımın çıktısı</div>
      <h3 className="font-display text-[19px] mt-3">{title}</h3>
      <p className="text-[14px] text-ink-muted mt-2.5 leading-relaxed">{body}</p>
    </div>
  );
}

export default async function YanitAgencyPage() {
  const FAQ = faqItems();

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
                Önce sizi okuyoruz. <span className="text-brand">Sonra sizi okunabilir hâle getiriyoruz.</span>
              </h1>
              <p className="text-[17px] lg:text-[19px] text-ink-muted mt-6 leading-relaxed">
                Teknolojinizi, yaptığınız işleri ve geçmiş içeriğinizi inceliyoruz. Size özel anlatı dilinizi buluyoruz.
                Sayfalarınızı ve şematik hatlarınızı düzeltiyoruz. Sonra da herkesin peşinde olduğu genel soruya değil,
                işinizi getiren soruya çalışıyoruz.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {SPINE.map((s) => (
                  <Link key={s.id} href={`#${s.id}`} className="chip hover:border-brand transition">
                    {s.n} · {s.title}
                  </Link>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="#teklif" className="btn-primary inline-flex items-center gap-2">
                  Kapsam görüşmesi ayarlayın <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
                <Link href="/arac" className="btn-secondary">
                  Önce ücretsiz tarayın
                </Link>
              </div>
              <p className="text-[13px] text-ink-faint mt-4">
                aylık sprint · kapsam görüşmesinden sonra teklif · sonuç sözü yok, ölçüm var
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

      {/* Kısa cevaplar — sayfanın tanım bölümü */}
      <Section
        id="tanimlar"
        className="border-t border-hairline scroll-mt-20"
        eyebrow="Kısa cevaplar"
        title="Yanıt Agency nedir, Yanıt’tan farkı ne?"
        intro="Dört soru, dört cevap. Her cevabın ilk cümlesi tek başına okunduğunda da anlamlıdır; gerisi gerekçedir."
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

      {/* Omurga şeridi */}
      <Section
        className="band border-t border-hairline"
        eyebrow="Çalışma biçimi"
        title="Nasıl çalışıyoruz? Dört adım, dört çıktı."
        intro="Her adımın sonunda elinizde bir belge, bir değişiklik listesi ya da bir ölçüm kalır. Adımlar sırayla ilerler; birini atlarsak sonraki adım boşluğa yaslanır."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {SPINE.map((s, i) => (
            <Reveal key={s.id} delay={i * 70}>
              <Link href={`#${s.id}`} className="card p-6 h-full block hover:border-brand transition">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-brand-glow flex items-center justify-center shrink-0">
                    <s.icon className="w-4 h-4 text-brand" aria-hidden />
                  </span>
                  <span className="font-mono text-[12px] text-ink-faint tabular">{s.n}</span>
                </div>
                <h3 className="font-display text-[18px] mt-4 leading-snug">{s.title}</h3>
                <p className="text-[13.5px] text-ink-muted mt-2.5 leading-relaxed">{s.line}</p>
                <div className="text-[12.5px] text-brand-deep mt-4">Çıktı: {s.out}</div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* BÖLÜM A — Önce sizi okuyoruz */}
      <Section id="okuma" eyebrow="01 — Önce sizi okuyoruz" title="Teknolojinizi, işinizi ve geçmişinizi inceliyoruz.">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7">
            <div className="space-y-5 text-[15.5px] text-ink-muted leading-relaxed">
              <p>
                İlk hafta hiçbir şey yazmıyoruz; okuyoruz. Çünkü bir sitenin yapay zekâ cevaplarında görünmemesinin
                sebebi çoğu zaman içerik değil, içeriğin nasıl sunulduğudur. Sayfanız sunucuda mı üretiliyor, yoksa
                metin JavaScript’in arkasında mı kalıyor; bir bot sayfayı açtığında elinde ne kalıyor — bunu bilmeden
                yazılan her paragraf görünmeyen bir yere yazılmış olur.
              </p>
              <p>
                Aynı bakışı işin kendisine de uyguluyoruz. Ne sattığınız, hangi işi aldığınız, hangisini almadığınız,
                geçmişte hangi içerikleri yayımladığınız ve bunların hâlâ doğru olup olmadığı. Sonra dışarı bakıyoruz:
                sizinle aynı soruda kim çıkıyor, hangi sayfayla çıkıyor, cevabında sizin sayfanızda bulunmayan hangi
                ayrıntı var. Ve kim sizden bahsediyor — dizinler, oda kayıtları, haberler, sektör listeleri.
              </p>
              <p>
                Bu inceleme tek bir amaç için yapılır: sprintte neyin önce yapılacağını rastgele değil, sebebini
                söyleyerek seçmek. Aynı incelemeyi ay sonunda tekrarladığımızda neyin gerçekten değiştiğini de aynı
                yerden görürüz.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
              {READ_GROUPS.map((g) => (
                <div key={g.title} className="card p-6 h-full">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-brand-glow flex items-center justify-center shrink-0">
                      <g.icon className="w-4 h-4 text-brand" aria-hidden />
                    </span>
                    <h3 className="font-display text-[18px]">{g.title}</h3>
                  </div>
                  <ul className="mt-4 space-y-2.5">
                    {g.items.map((i) => (
                      <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                        <Check className="w-3.5 h-3.5 text-brand shrink-0 mt-1" aria-hidden />
                        <span>{i}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-hairline bg-paper-3 overflow-hidden">
              <Ciz
                name="analiz"
                alt="Büyüteçle taranan bir web sayfası ve üzerinde işaretlenmiş bulgular"
                className="p-3"
              />
            </div>
            <OutputCard
              title="Kapsam raporu"
              body="Bulguların etkiye ve zorluğa göre sıralandığı tek belge. Her maddede ne olduğu, neden önemli olduğu, nasıl düzeltileceği ve kimin yapacağı yazılı. Sprint listesi bu belgeden çıkar."
            />
          </div>
        </div>
      </Section>

      {/* BÖLÜM B — Anlatı dili */}
      <Section
        id="anlati"
        className="band border-t border-hairline"
        eyebrow="02 — Size özel anlatı dili"
        title="Şirketinizin anlatısı vardır; çoğu sitede yazılı değildir."
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7">
            <div className="space-y-5 text-[15.5px] text-ink-muted leading-relaxed">
              <p>
                Her şirketin bir anlatısı vardır: ne yaptığı, kimin için yaptığı, neyi farklı yaptığı. Bu anlatı genelde
                satış toplantılarında, teklif e-postalarında ve kurucunun ağzında yaşar. Sitede ise yerine jenerik
                cümleler geçer. Sonuç şu olur: sizi en net tarif eden cümle sitenizde değildir.
              </p>
              <p>
                Bir model sizi kendi cümlenizle değil, bulabildiği en net cümleyle anlatır. O cümle bir rakibin
                karşılaştırma sayfasındaysa, sizi o sayfanın gözünden tarif eder. Bu yüzden anlatı çalışması süsleme
                değil, ilk sıradaki iştir: alıntılanabilir, doğrulanabilir, her sayfada aynı kalan cümleler yazmak.
              </p>
              <p>
                Çalışma biçimi basit. Kurucu ve satış ekibiyle konuşuruz, tekliflerinizi ve geçmiş içeriğinizi okuruz,
                sonra aynı şeyi üç ayrı sayfada üç ayrı biçimde anlatan cümleleri tek dile indiririz. Slogan aramıyoruz;
                bir insanın da bir modelin de olduğu gibi alıntılayabileceği cümleler arıyoruz.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
              {NARRATIVE_ITEMS.map((n) => (
                <div key={n.t} className="card p-6 h-full">
                  <h3 className="font-display text-[17px] leading-snug">{n.t}</h3>
                  <p className="text-[13.5px] text-ink-muted mt-2.5 leading-relaxed">{n.d}</p>
                </div>
              ))}
            </div>

            <div className="card p-6 lg:p-7 mt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="font-display text-[18px]">Ne demek istediğimiz</div>
                <span className="chip !text-[10.5px]">temsili</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                <div className="rounded-xl border border-hairline p-5">
                  <div className="eyebrow">Çoğu sitede yazan</div>
                  <p className="text-[14.5px] text-ink-muted mt-3 leading-relaxed">
                    “20 yıllık tecrübemizle dijital dünyada fark yaratıyor, müşterilerimize kaliteli çözümler
                    sunuyoruz.”
                  </p>
                  <p className="text-[12.5px] text-ink-faint mt-4 leading-relaxed">
                    Bu cümleden bir model ne yaptığınızı, kime yaptığınızı ve ne zaman size gelinmesi gerektiğini
                    çıkaramaz. Alıntılansa bile kimseyi size yönlendirmez.
                  </p>
                </div>
                <div className="rounded-xl border border-hairline p-5 bg-brand-glow">
                  <div className="eyebrow text-brand-deep">Yazılabilecek olan</div>
                  <p className="text-[14.5px] mt-3 leading-relaxed">
                    “Konya’da 2004’ten beri otomotiv yan sanayiye CNC talaşlı imalat yapan 40 kişilik bir atölyeyiz; 50
                    adetin altındaki seri işleri almıyor, prototip ve kalıp işlerine bakıyoruz.”
                  </p>
                  <p className="text-[12.5px] text-ink-muted mt-4 leading-relaxed">
                    Şehir, yıl, sektör, kapasite ve kapsam sınırı var. Hem doğrulanabilir hem alıntılanabilir; yanlış
                    soruda çıkmanızı da engeller.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            <div className="card overflow-hidden">
              <Image
                src="/img/ajans/icerik.webp"
                alt="Bir el, başlık ve paragraf blokları olan bir sayfaya yazıyor"
                width={1200}
                height={675}
                unoptimized
                className="w-full h-auto"
              />
            </div>
            <OutputCard
              title="Anlatı kılavuzu ve tanım seti"
              body="Tanım cümleleri, terim sözlüğü, kanıt listesi, alıcı profili ve yazılmayacaklar listesi. Ekibiniz de biz de bundan sonra aynı belgeden yazarız; yeni sayfa açıldığında dil yeniden tartışılmaz."
            />
          </div>
        </div>
      </Section>

      {/* BÖLÜM C — Sayfalar ve şematik hatlar */}
      <Section
        id="sayfalar"
        eyebrow="03 — Sayfalar ve şematik hatlar"
        title="Sayfa yapısını düzeltiyoruz, anlam bağını kuruyoruz."
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7">
            <div className="space-y-5 text-[15.5px] text-ink-muted leading-relaxed">
              <p>
                Bir sayfanın cevap olarak kullanılabilmesi için düzenli olması gerekir. Tek bir H1, sırayla giden başlık
                hiyerarşisi, soruyu başlığa taşıyan bölümler, ilk paragrafta doğrudan verilen cevap, karşılaştırmada
                tablo, adım anlatımında numaralı liste. Bunlar biçim tercihleri değil; metnin parçalara ayrılabilmesini
                sağlayan şeyler. Parçalanamayan bir sayfa alıntılanmaz.
              </p>
              <p>
                İkinci kat, sayfanın makine tarafıdır: JSON-LD şemaları. Organization ile kim olduğunuz, Service ve
                Product ile ne sattığınız, FAQPage ile sayfadaki soru-cevaplar, LocalBusiness ile şubeniz ve servis
                bölgeniz, BreadcrumbList ile sayfanın site içindeki yeri yazılır. Buradaki tek kural şu: şemada yazan
                ile sayfada yazan birebir aynı olmalı. Uyuşmayan şema, olmayan şemadan daha kötüdür.
              </p>
              <p>
                <strong className="text-ink">Şematik hat</strong>, sayfalar arasındaki anlam bağının kopmadan akmasıdır.
                Hizmet sayfanız alt hizmete, alt hizmet ilgili vakaya, vaka SSS’ye, SSS iletişime bağlanır; Organization
                şeması hizmeti, hizmet şeması sayfayı, sayfa da aynı adı işaret eder. Bir yerde “CNC işleme”, başka bir
                yerde “talaşlı imalat” yazıp ikisi arasında hiçbir bağ kurulmazsa hat kopar: iki ayrı şirketmişsiniz
                gibi okunursunuz. sameAs ile dışarıdaki doğrulanabilir kayıtlarınıza bağ kurmak da bu hattın devamıdır.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
              {SCHEMA_GROUPS.map((g) => (
                <div key={g.title} className="card p-6 h-full">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-brand-glow flex items-center justify-center shrink-0">
                      <g.icon className="w-4 h-4 text-brand" aria-hidden />
                    </span>
                    <h3 className="font-display text-[18px]">{g.title}</h3>
                  </div>
                  <ul className="mt-4 space-y-2.5">
                    {g.items.map((i) => (
                      <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                        <Check className="w-3.5 h-3.5 text-brand shrink-0 mt-1" aria-hidden />
                        <span>{i}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="card p-6 h-full bg-paper-3">
                <h3 className="font-display text-[18px]">Hat nerede kopar</h3>
                <ul className="mt-4 space-y-2.5">
                  {[
                    'Vaka sayfası hizmete bağlı değil; iş yapıldığı hâlde kanıt ortada duruyor',
                    'Şemada şirket adı başka, sayfada başka yazılmış',
                    'SSS’deki cevap hizmet sayfasındaki cevapla çelişiyor',
                    'İletişim bilgisi üç sayfada üç farklı biçimde',
                    'Kaldırılan sayfa ana sayfaya yönlendirilmiş, karşılığına değil',
                  ].map((x) => (
                    <li key={x} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-muted">
                      <Minus className="w-3.5 h-3.5 text-ink-faint shrink-0 mt-1" aria-hidden />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Kaynak: uydurduğumuz bir standart yok — hangi belgeye göre yazdığımız açık dursun. */}
            <p className="text-[13px] text-ink-faint mt-6 leading-relaxed">
              Kaynaklar: şema tipleri{' '}
              <a
                href="https://schema.org/Organization"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-deep hover:text-brand"
              >
                schema.org/Organization
              </a>{' '}
              ve{' '}
              <a
                href="https://schema.org/FAQPage"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-deep hover:text-brand"
              >
                schema.org/FAQPage
              </a>
              ; yapısal veri kuralları{' '}
              <a
                href="https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-deep hover:text-brand"
              >
                Google yapısal veri belgeleri
              </a>
              ; bot izinleri{' '}
              <a
                href="https://www.rfc-editor.org/rfc/rfc9309.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-deep hover:text-brand"
              >
                RFC 9309 (robots.txt)
              </a>
              ; model kaynağı bildirimi{' '}
              <a
                href="https://llmstxt.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-deep hover:text-brand"
              >
                llms.txt
              </a>
              .
            </p>
          </div>

          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            <div className="card overflow-hidden">
              <Image
                src="/img/ajans/teknik.webp"
                alt="Bir kişi web sitesi iskeletinin içini anahtarla düzeltiyor"
                width={1200}
                height={675}
                unoptimized
                className="w-full h-auto"
              />
            </div>
            <div className="rounded-2xl border border-hairline bg-paper-3 overflow-hidden">
              <Ciz
                name="uyum"
                alt="Farklı şekillerdeki bloklar tek bir bağlantı noktasına bağlanıyor"
                className="p-3"
              />
            </div>
            <OutputCard
              title="Uygulanmış düzeltmeler ve fark listesi"
              body="Hangi sayfada ne değişti, öncesi ve sonrası. Erişim verirseniz düzeltmeleri biz uygularız; geliştirici ekibiniz varsa değişiklikleri onların akışına uygun biçimde hazırlarız."
            />
          </div>
        </div>
      </Section>

      {/* BÖLÜM D — Doğru sorular */}
      <Section
        id="sorular"
        className="band border-t border-hairline"
        eyebrow="04 — Doğru sorulara çalışıyoruz"
        title="Herkesin peşinde olduğu soru değil; işinizi getiren soru."
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7">
            <div className="space-y-5 text-[15.5px] text-ink-muted leading-relaxed">
              <p>
                “Muhasebe yazılımı hangisi” gibi geniş sorular kalabalıktır ve o kalabalıkta cevabın size dönmesi
                zordur. Oysa sizi arayan kişi genelde daha dar bir soru sorar: kaç kullanıcıya kadar yettiği, mevcut
                sisteminden veri taşınıp taşınamayacağı, geçişin kaç hafta süreceği, kendi sektörüne uygun olup
                olmadığı. Satışı getiren soru budur ve rekabeti de daha azdır.
              </p>
              <p>
                Soru setini masabaşında uydurmuyoruz. Kurucu ve satış ekibiyle konuşuyor, son kazanılan ve kaybedilen
                işlerde ilk toplantıda ne sorulduğuna bakıyor, satışın duyduğu itirazları topluyor, arama verisindeki
                gerçek ifadeleri ekliyor ve rakiplerin cevaplarında öne çıkan ayrıntıları çıkarıyoruz. Ortaya sizin
                işinize ait, sayılabilir ve takip edilebilir bir soru listesi çıkıyor.
              </p>
              <p>
                Sonrası ölçüm işi. Her soru her gece ChatGPT, Claude ve Gemini’ye aynı biçimde sorulur; cevapta kimin
                geçtiği, sizin geçip geçmediğiniz ve hangi bağlamda geçtiğiniz kaydedilir. Tek bir cevaba bakıp karar
                vermeyiz — cevaplar oturumdan oturuma değişir, biz seriye bakarız. Eksik olan neyse sprint listesine
                girer; ay sonunda aynı sorular yeniden sorulur.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
              {QUESTION_SOURCES.map((s) => (
                <div key={s.t} className="card p-6 h-full">
                  <h3 className="font-display text-[17px] leading-snug">{s.t}</h3>
                  <p className="text-[13.5px] text-ink-muted mt-2.5 leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>

            <div className="card p-6 lg:p-7 mt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="font-display text-[18px]">Soru başına ne görüyoruz</div>
                <span className="chip !text-[10.5px]">temsili</span>
              </div>
              <div className="mt-6 space-y-4">
                {QUESTION_ROWS.map((r) => (
                  <div key={r.q} className="rounded-xl border border-hairline p-5">
                    <div className="text-[14.5px] leading-relaxed">{r.q}</div>
                    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                      <div>
                        <dt className="eyebrow">Cevapta kim var</dt>
                        <dd className="text-[13px] text-ink-muted mt-1.5 leading-relaxed">{r.who}</dd>
                      </div>
                      <div>
                        <dt className="eyebrow">Siz</dt>
                        <dd className="text-[13px] text-ink-muted mt-1.5 leading-relaxed">{r.you}</dd>
                      </div>
                      <div>
                        <dt className="eyebrow">Eksik olan</dt>
                        <dd className="text-[13px] text-ink-muted mt-1.5 leading-relaxed">{r.gap}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
              <p className="text-[12.5px] text-ink-faint mt-6">
                Yukarıdaki satırlar örnektir, gerçek bir müşteri vakası değildir. Sizin listeniz kendi sorularınızın
                ölçümünden çıkar.
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            <div className="card overflow-hidden">
              <Image
                src="/img/panel/prompts.webp"
                alt="Panelde izlenen sorular listesi ve yeni soru ekleme alanı"
                width={900}
                height={332}
                unoptimized
                className="w-full h-auto"
              />
              <div className="p-6">
                <div className="font-display text-[17px]">Sorular panelde durur</div>
                <p className="text-[13.5px] text-ink-muted mt-2 leading-relaxed">
                  Hangi soruların takip edildiğini siz de görürsünüz; gece çalıştırmaları, cevaplar ve tarihler aynı
                  ekranda kayıtlıdır.
                </p>
              </div>
            </div>
            <OutputCard
              title="Takip edilen soru seti ve haftalık ölçüm"
              body="Sorular, neden seçildikleri, gece çalıştırma serisi ve her soruda eksik kalan şey. Haftalık bakışta hangi sorunun sprintte kapanacağı buradan seçilir."
            />
          </div>
        </div>
      </Section>

      {/* Kapsam */}
      <Section
        eyebrow="Kapsam"
        title="Kapsama neler dahil? Dört kolon, hepsi panelde ölçülen bir bulguya bağlı."
        intro="Soyut bir “GEO çalışması” değil. Her kalem, taramada çıkan somut bir eksikliğin karşılığıdır."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SERVICES.map((s, i) => (
            <Reveal key={s.title} delay={i * 60}>
              <div className="card p-7 h-full">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-brand-glow flex items-center justify-center shrink-0">
                    <s.icon className="w-4 h-4 text-brand" aria-hidden />
                  </span>
                  <h3 className="font-display text-[20px]">{s.title}</h3>
                </div>
                <p className="text-[14.5px] text-ink-muted mt-3 leading-relaxed">{s.body}</p>
                <ul className="mt-4 space-y-1.5">
                  {s.items.map((i2) => (
                    <li key={i2} className="flex items-center gap-2 text-[13.5px]">
                      <Check className="w-3.5 h-3.5 text-brand shrink-0" aria-hidden /> {i2}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Bir ay neye benziyor */}
      <Section
        className="band border-t border-hairline"
        eyebrow="Bir ay neye benziyor"
        title="Bir ay neye benziyor? Dört hafta, dört çıktı."
        intro="Her haftanın ne bıraktığı da, o hafta sizden ne gerektiği de baştan belli."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {SPRINT.map((s, i) => (
            <Reveal key={s.w} delay={i * 70}>
              <div className="card p-6 h-full flex flex-col">
                <div className="eyebrow text-brand-deep">{s.w}</div>
                <h3 className="font-display text-[19px] mt-3 leading-snug">{s.t}</h3>
                <p className="text-[13.5px] text-ink-muted mt-3 leading-relaxed flex-1">{s.d}</p>
                <p className="text-[12.5px] text-ink-faint mt-5 pt-4 border-t border-hairline leading-relaxed">
                  {s.need}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Örnek ay — temsili */}
      <Section eyebrow="Bir sprint neye benzer" title="Örnek bir ay.">
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
                  'Organization ve hizmet şeması eklendi, iletişim bilgileri tutarlı hâle getirildi',
                  'Tanım cümlesi ve terim sözlüğü yazıldı; iki sayfadaki çelişkili anlatım düzeltildi',
                  'Dört satın alma sorusu için cevap-önce sayfa yazıldı',
                  'İki sektör dizininde kayıt açıldı, bir karşılaştırma sayfasına eklenildi',
                  'Ay başındaki ölçüm donduruldu, ay sonunda aynı sorularla tekrar ölçüldü',
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
                height={371}
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

      {/* Nasıl raporluyoruz */}
      <Section
        className="band border-t border-hairline"
        eyebrow="Nasıl raporluyoruz"
        title="Nasıl raporluyoruz? Her şey aynı panelde, aynı sorularla, öncesi ve sonrasıyla."
        intro="Rapor ayrı bir yerde hazırlanan bir sunum değil; bizim de sizin de baktığı aynı ekranın ay sonundaki hâli."
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {REPORTING.map((r) => (
                <div key={r.t} className="card p-6 h-full">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-brand-glow flex items-center justify-center shrink-0">
                      <r.icon className="w-4 h-4 text-brand" aria-hidden />
                    </span>
                    <h3 className="font-display text-[17px] leading-snug">{r.t}</h3>
                  </div>
                  <p className="text-[13.5px] text-ink-muted mt-3 leading-relaxed">{r.d}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="card overflow-hidden">
              <Image
                src="/img/ajans/rapor.webp"
                alt="İki kişi masada yükselen bir grafiği inceliyor"
                width={1200}
                height={675}
                unoptimized
                className="w-full h-auto"
              />
              <div className="p-6">
                <div className="font-display text-[17px]">Ay sonu görüşmesi</div>
                <p className="text-[13.5px] text-ink-muted mt-2 leading-relaxed">
                  45 dakika: ne yapıldı, ölçüm ne diyor, gelecek ay hangi maddeler var. Karar birlikte verilir; devam
                  etmeme kararı da bu görüşmenin sonucudur.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Teslimler */}
      <Section eyebrow="Ne teslim ediyoruz" title="Ne teslim ediyoruz? Altı somut çıktı.">
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
      <Section
        className="band border-t border-hairline"
        eyebrow="Kimlerle iyi çalışıyoruz"
        title="Kimlerle iyi çalışıyoruz, kimlerle çalışmıyoruz?"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-7 h-full">
            <div className="font-display text-[19px]">İyi çalışıyoruz</div>
            <ul className="mt-4 space-y-3">
              {FIT.yes.map((x) => (
                <li key={x} className="flex gap-3 text-[14px] leading-relaxed">
                  <Check className="w-4 h-4 text-positive shrink-0 mt-0.5" aria-hidden /> {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-7 h-full">
            <div className="font-display text-[19px]">Çalışmıyoruz</div>
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

      {/* Söz */}
      <Section
        eyebrow="Söz"
        title="Neye söz veriyoruz, neye vermiyoruz?"
        intro="Bu işte kimse modellerin ne söyleyeceğini taahhüt edemez. Biz de etmiyoruz; onun yerine yöntemi taahhüt ediyoruz."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-7 h-full">
            <div className="font-display text-[19px]">Söz veriyoruz</div>
            <ul className="mt-4 space-y-3">
              {PROMISES.do.map((x) => (
                <li key={x} className="flex gap-3 text-[14px] leading-relaxed">
                  <Check className="w-4 h-4 text-positive shrink-0 mt-0.5" aria-hidden /> {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-7 h-full">
            <div className="font-display text-[19px]">Söz vermiyoruz</div>
            <ul className="mt-4 space-y-3">
              {PROMISES.dont.map((x) => (
                <li key={x} className="flex gap-3 text-[14px] leading-relaxed text-ink-muted">
                  <Minus className="w-4 h-4 text-ink-faint shrink-0 mt-0.5" aria-hidden /> {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Fiyat */}
      <Section className="band border-t border-hairline" eyebrow="Teklif" title="Yanıt Agency ne kadar?">
        <div className="card p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5">
              <p className="text-[15.5px] text-ink leading-relaxed">
                <strong className="text-ink">Yanıt Agency’nin liste fiyatı yoktur.</strong> Teklif, kapsam
                görüşmesinden sonra size özel yazılır.
              </p>
              <p className="text-[15.5px] text-ink-muted mt-4 leading-relaxed">
                Tek bir liste fiyatı yazmıyoruz, çünkü kapsam işten işe değişiyor: sitenin büyüklüğü, takip edilecek
                soru sayısı, yazılacak içerik hacmi, sektörün rekabeti ve düzeltmeleri kimin uygulayacağı. Önce sitenizi
                tarar, ne gerektiğini birlikte konuşur, sonra tek sayfalık bir teklif göndeririz. Yanıt aboneliği
                sprinte dahildir.
              </p>
              <p className="text-[14px] text-ink-muted mt-4 leading-relaxed">
                Görüşme satış toplantısı değil; kapsam çıkarma toplantısıdır. Sonunda ne bulduğumuzu, ilk sprintte neyin
                yapılacağını ve bunun neden o sırayla yapılacağını yazılı olarak alırsınız.
              </p>
              <Link href="#teklif" className="btn-primary inline-flex items-center gap-2 mt-7">
                Kapsam görüşmesi ayarlayın <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </div>
            <div className="lg:col-span-7">
              <div className="eyebrow">Aylık sprinte dahil</div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 mt-4">
                {[
                  'Kapsam raporu ve yol haritası',
                  'Anlatı kılavuzu ve tanım seti',
                  'Teknik düzeltme uygulaması',
                  'Şema, entity ve iç bağlantı çalışması',
                  'Cevap veren içerik üretimi',
                  'Kaynak ve dizin başvuruları',
                  'Günlük ölçüm ve aylık rapor',
                  'Panel erişimi (ekibiniz dahil)',
                  'Ay sonu değerlendirme görüşmesi',
                  'Taahhütsüz, aylık devam kararı',
                ].map((x) => (
                  <li key={x} className="flex items-center gap-2 text-[14px]">
                    <Check className="w-3.5 h-3.5 text-brand shrink-0" aria-hidden /> {x}
                  </li>
                ))}
              </ul>
              <p className="text-[12.5px] text-ink-faint mt-6 leading-relaxed">
                Uygulamayı kendi ekibiniz yapacaksa yalnızca ölçüm tarafı yeterli olabilir;{' '}
                <Link href="/pricing" className="text-brand-deep hover:text-brand">
                  Yanıt aboneliğinin fiyatlandırmasını görün
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Teklif formu — sayfadaki bütün "kapsam görüşmesi" bağlantıları buraya iner (#teklif). */}
      <Section eyebrow="Başlayalım" title="Sitenizi okuyup gelelim.">
        <div className="max-w-3xl">
          <AgencyBriefForm />
        </div>
      </Section>

      <Section className="band border-t border-hairline" eyebrow="Sıkça sorulanlar" title="Yanıt Agency hakkında.">
        <Faq items={FAQ} defaultOpen={0} />
      </Section>

      <CtaBlock
        eyebrow="Önce ücretsiz"
        title={
          <>
            Önce sitenizi okuyalım, <span className="text-brand">sonra konuşalım.</span>
          </>
        }
        body="Alan adınızı girin, ücretsiz taramayı görün. Kapsam görüşmesinde aynı bulguların üzerinden birlikte geçeriz."
        primaryHref="/arac"
        primaryLabel="Ücretsiz tarayın"
        secondaryHref="#teklif"
        secondaryLabel="Kapsam görüşmesi ayarlayın"
      />
    </>
  );
}
