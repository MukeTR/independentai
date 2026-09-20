/**
 * Sektör landing verisi — TEK kaynak (`/sektor/<slug>`, nav "Sektöre göre", footer, sitemap, llms.txt, onboarding
 * sektör seçimi, `PublicScan.sector`). Sunucu importu YOK (istemci seçicileri de okur).
 *  - `slug` `SECTOR_SLUGS` (lib/tool-registry.ts) ile birebir; `checks[].tool` ve `featuredTool` registry slug'ıdır.
 *  - `showcaseQuestions` RESEARCH_BRIFING §C.3'ten (müşterinin yapay zekâya sorduğu sorular; FaqJsonLd'ye konmaz).
 *  - `regulated:true` (klinik, hukuk-danismanlik): "bilgilendirme ve görünürlük ölçümü" dili; "en iyi", "sıralama",
 *    "garanti" ifadeleri YOK (tests/unit/sectors.test.ts tarar). İstatistik cümlesi yalnız `stat` → data/stats.ts.
 */
import type { SectorSlug } from '@/lib/tool-registry';
import type { StatKey } from './stats';

export type SectorCheck = {
  /** TOOL_REGISTRY slug'ı */
  tool: string;
  /** Bu sektörde neden önemli (tek cümle) */
  why: string;
};

export type SectorFaq = { q: string; a: string };

export type Sector = {
  slug: SectorSlug;
  /** Kısa ad (nav, chip) */
  name: string;
  /** h1: "{Sektör} siteleri için yapay zekâ görünürlük testi" */
  headline: string;
  /** Hero paragrafı (C.3 örnek sorusu + konumlandırma) */
  intro: string;
  /** Hero'daki istatistik cümlesi (STATS anahtarı — cümle oradan alınır) */
  stat: StatKey;
  image: `/img/sektor/${SectorSlug}.webp`;
  imageAlt: string;
  /** "Müşteriniz bunu soruyor" — 5 kart */
  showcaseQuestions: [string, string, string, string, string];
  /** "Bu sektörde 3 kontrol" — araç linkli */
  checks: [SectorCheck, SectorCheck, SectorCheck];
  /** Sayfada gömülü/öne çıkan araç */
  featuredTool: string;
  faq: [SectorFaq, SectorFaq, SectorFaq, SectorFaq, SectorFaq];
  regulated: boolean;
  /** Ajans sektöründe ortaklık programı CTA'sı */
  partnerCta?: boolean;
};

const KVKK_A =
  'Yalnızca herkese açık web sitenizi tarıyoruz; kişisel verinizi yapay zekâ servislerine göndermiyoruz. Ücretsiz araçlar hesap, e-posta veya kart istemez.';

const HOW_A =
  'Araçlar deterministik tarayıcılardır: sayfanızı, robots.txt, sitemap ve şema verilerinizi okur; ChatGPT’nin gerçek davranışını değil, sitenizin yapay zekâ asistanlarına hazırlığını ölçer. Gerçek görünürlük takibi Yanıt panelinde günlük ölçümle yapılır.';

export const SECTORS: Sector[] = [
  {
    slug: 'saas',
    name: 'SaaS',
    headline: 'SaaS siteleri için yapay zekâ görünürlük testi',
    intro:
      'Potansiyel müşteriniz “20 kişilik ekip için Türkçe destekli CRM öner” diye soruyor. Cevapta siz mi çıkıyorsunuz, rakibiniz mi? Sitenizin bu sorulara hazır olup olmadığını 20 saniyede ölçün.',
    stat: 'genAiUsage',
    image: '/img/sektor/saas.webp',
    imageAlt: 'SaaS ürün panelini gösteren ekran ve yapay zekâ asistanına yöneltilen satın alma sorusu',
    showcaseQuestions: [
      'KOBİ için e-fatura entegrasyonu olan ön muhasebe programı hangisi?',
      'Türkiye’de 20 kişilik ekip için Türkçe destekli CRM öner, aylık fiyatı ne kadar?',
      'X ile Y arasında hangisini seçmeliyim, farkları neler?',
      'KVKK uyumlu, verileri Türkiye’de tutan e-posta pazarlama aracı var mı?',
      'Ücretsiz planı olan Türkçe proje yönetim yazılımları hangileri?',
    ],
    checks: [
      {
        tool: 'seo-karnesi',
        why: 'Title ve meta açıklama, yapay zekânın ürününüzü tek cümlede nasıl tanımladığını belirler.',
      },
      {
        tool: 'schema-denetimi',
        why: 'SoftwareApplication ve Organization şeması olmadan asistan fiyat planınızı ve kim olduğunuzu tahmin eder.',
      },
      {
        tool: 'rakip-kiyas',
        why: '“X mi Y mi” sorusunda rakibinizle 14 maddede yan yana: hangi teknik eksik sizi geride bırakıyor?',
      },
    ],
    featuredTool: 'satin-alma-sorusu-kapsama',
    faq: [
      {
        q: 'Yapay zekâ asistanları SaaS ürünlerini nasıl öneriyor?',
        a: 'Sitenizdeki açık fiyat, özellik karşılaştırması, entegrasyon listesi ve yapılandırılmış veriyi (JSON-LD) okuyarak. Fiyatı gizli, özellikleri PDF’de olan ürünler cevaplarda geride kalır.',
      },
      {
        q: 'Fiyat sayfamız yoksa ne olur?',
        a: '“Aylık ne kadar?” sorusunda asistan başka kaynaklardan (yorum siteleri, rakip karşılaştırmaları) tahmin üretir. En azından fiyat bandı ve neye bağlı olduğunu yazmanızı öneririz.',
      },
      {
        q: 'Skor ChatGPT’nin beni önerdiğini gösterir mi?',
        a: HOW_A,
      },
      {
        q: 'Verilerim yapay zekâya gönderiliyor mu?',
        a: KVKK_A,
      },
      {
        q: 'Sonuçları ekibimle nasıl paylaşırım?',
        a: 'Her tarama kalıcı bir rapor bağlantısı üretir; bağlantıyı WhatsApp veya e-posta ile ekibinize ya da ajansınıza gönderebilirsiniz. Rapor 30 gün erişilebilir kalır.',
      },
    ],
    regulated: false,
  },
  {
    slug: 'ajans',
    name: 'Ajans',
    headline: 'Ajanslar için yapay zekâ görünürlük testi',
    intro:
      'Müşteriniz “ChatGPT’de görünmek için GEO ajansı hangisi?” diye soruyor. Hem kendi sitenizi hem müşterilerinizin sitelerini aynı deterministik araçlarla ölçün; raporu marka adınızla paylaşmadan önce bulguları görün.',
    stat: 'chatgptShare',
    image: '/img/sektor/ajans.webp',
    imageAlt: 'Dijital ajans ekibinin müşteri sitelerinin yapay zekâ görünürlük raporlarını incelediği çalışma masası',
    showcaseQuestions: [
      'KOBİ için uygun fiyatlı dijital pazarlama ajansı İstanbul, aylık ne kadar?',
      'E-ticaret için Meta reklam yönetimi yapan performans ajansı öner.',
      'ChatGPT’de görünmek için GEO ajansı hangisi?',
      'Kurumsal web sitesi yaptırmak istiyorum, referansı olan ajans?',
      'Sağlık turizmi için Arapça içerik üreten ajans var mı?',
    ],
    checks: [
      {
        tool: 'rakip-kiyas',
        why: 'Müşteri adayına “siz C, rakibiniz A” kartını göstermek satış görüşmesini açar.',
      },
      {
        tool: 'whatsapp-onizleme',
        why: 'Müşteriye attığınız her link WhatsApp’ta önce kart olarak görünür; boş kart ajans imajını zedeler.',
      },
      {
        tool: 'seo-karnesi',
        why: 'Kendi sitenizin title, meta ve H1 düzeni, sunduğunuz hizmetin ilk kanıtıdır.',
      },
    ],
    featuredTool: 'satin-alma-sorusu-kapsama',
    faq: [
      {
        q: 'Müşterilerimin sitelerini de tarayabilir miyim?',
        a: 'Evet; araçlar herkese açık her siteyi tarar. Aynı siteye saatlik tarama tavanı ve IP başına limit uygulanır. Çok sayıda müşteri için Yanıt ajans portföyü ve ortaklık programı vardır.',
      },
      {
        q: 'Raporları kendi markamla paylaşabilir miyim?',
        a: 'Kalıcı rapor bağlantısı “Yanıt ile hazırlandı” ibaresi taşır. Beyaz etiket rapor yol haritasındadır; ortaklık programı sayfasında güncel durumu görebilirsiniz.',
      },
      {
        q: 'Yanıt bir ajans mı, araç mı?',
        a: 'İkisi de: Yanıt SaaS panelinde ölçüm ve takip yaparsınız; Yanıt Agency düzeltmeleri teklifle uygular. Ajans ortaklığı ayrı bir programdır ve müşteri portföyünüzü kendi panelinizden yönetirsiniz.',
      },
      { q: 'Skor ne ölçer, ne ölçmez?', a: HOW_A },
      { q: 'Müşteri verisi yapay zekâya gider mi?', a: KVKK_A },
    ],
    regulated: false,
    partnerCta: true,
  },
  {
    slug: 'klinik',
    name: 'Klinik',
    headline: 'Klinik siteleri için yapay zekâ görünürlük testi',
    intro:
      'Hasta adayı “İstanbul’da saç ekimi kliniği öner, fiyatlar ne kadar?” diye soruyor. Yapay zekâ kliniğinizi tanıyor mu, telefon ve adresinizi doğru okuyor mu? Bilgilendirme odaklı, ölçülebilir bir kontrol.',
    stat: 'genAiUsage',
    image: '/img/sektor/klinik.webp',
    imageAlt: 'Modern bir klinik resepsiyonu ve hasta adayının telefonda yapay zekâ asistanına klinik sorusu sorması',
    showcaseQuestions: [
      'İstanbul’da güvenilir saç ekimi kliniği hangisi, fiyatlar ne kadar?',
      'Saç ekiminde DHI mi FUE mi daha uygun, hangi klinik yapıyor?',
      'Sağlık Bakanlığı ruhsatlı, doktorun bizzat yaptığı saç ekimi merkezi öner.',
      'Ankara’da çocuk diş hekimi / implant için hangi klinik?',
      'Which hair transplant clinics in Istanbul offer all-inclusive packages?',
    ],
    checks: [
      {
        tool: 'schema-denetimi',
        why: 'MedicalClinic / Physician şeması olmadan asistan uzmanlık alanınızı ve adresinizi tahmin eder.',
      },
      {
        tool: 'guven-sinyalleri',
        why: 'Telefon, adres, KVKK aydınlatma metni ve hakkımızda sayfası; yapay zekâ kimliği görünmeyen kliniği anmaz.',
      },
      {
        tool: 'guvenlik-basliklari',
        why: 'Hasta formu taşıyan site için HTTPS, HSTS ve güncel TLS sertifikası temel güven şartıdır.',
      },
    ],
    featuredTool: 'satin-alma-sorusu-kapsama',
    faq: [
      {
        q: 'Bu test klinikleri karşılaştırıp puanlıyor mu?',
        a: 'Hayır. Sağlık alanında tanıtım kuralları vardır; araçlar yalnızca sitenizin teknik ve bilgilendirme hazırlığını ölçer, klinikler arasında tercih bildirmez.',
      },
      {
        q: 'Yapay zekâ kliniğim hakkında yanlış bilgi verirse ne yapmalıyım?',
        a: 'Önce sitenizdeki kimlik bilgilerini (Organization/MedicalClinic şeması, telefon, adres, doktor kadrosu) tutarlı hâle getirin; Yanıt panelindeki halüsinasyon tespiti yanlış iddiaları düzenli izler.',
      },
      {
        q: 'Yabancı hastalar için ne gerekir?',
        a: 'İngilizce/Arapça sayfalar ayrı URL’de, hreflang ile bağlanmış olmalı; +90 telefon biçimi ve uluslararası hasta sayfası yapay zekânın yabancı soruda sizi bulmasını kolaylaştırır.',
      },
      { q: 'Skor ne ölçer, ne ölçmez?', a: HOW_A },
      {
        q: 'Hasta verisi yapay zekâya gider mi?',
        a: 'Hayır. Yalnızca herkese açık web sitenizi tarıyoruz; formlardaki hasta verisine erişmiyor ve hiçbir kişisel veriyi yapay zekâ servislerine göndermiyoruz.',
      },
    ],
    regulated: true,
  },
  {
    slug: 'hukuk-danismanlik',
    name: 'Hukuk ve danışmanlık',
    headline: 'Hukuk ve danışmanlık siteleri için yapay zekâ görünürlük testi',
    intro:
      'Müvekkil adayı “Kadıköy’de mali müşavir ücreti aylık ne kadar, kimi önerirsin?” diye soruyor. Büronuzun veya ofisinizin kimliği, uzmanlık alanı ve iletişim bilgileri yapay zekâ tarafından doğru okunuyor mu? Bilgilendirme odaklı ölçüm.',
    stat: 'internetUsage',
    image: '/img/sektor/hukuk-danismanlik.webp',
    imageAlt: 'Hukuk bürosu toplantı odası ve dizüstü bilgisayarda yapay zekâ asistanına yöneltilen danışmanlık sorusu',
    showcaseQuestions: [
      'Şirket kurarken mali müşavir ücreti aylık ne kadar, Kadıköy’de kimi önerirsin?',
      'E-ticaret yapan şahıs şirketi için hangi mali müşavir?',
      'İş davası için İstanbul’da iş hukuku avukatı nasıl bulurum?',
      'Kira tahliye davası ne kadar sürer, avukat ücreti ne kadar?',
      'Yabancı yatırımcı için Türkiye’de şirket kuruluşu yapan hukuk bürosu öner.',
    ],
    checks: [
      {
        tool: 'guven-sinyalleri',
        why: 'Baro/oda bilgisi, adres, telefon ve aydınlatma metni; yapay zekâ kimliği belirsiz büroyu kaynak göstermez.',
      },
      {
        tool: 'schema-denetimi',
        why: 'LegalService / AccountingService şeması uzmanlık alanınızı ve hizmet bölgenizi makineye açıkça söyler.',
      },
      {
        tool: 'seo-karnesi',
        why: 'Title ve H1 “hangi alanda, hangi şehirde” sorusuna tek cümlede cevap vermeli.',
      },
    ],
    featuredTool: 'satin-alma-sorusu-kapsama',
    faq: [
      {
        q: 'Avukatlık ve mali müşavirlik için reklam kısıtları var; bu araç uygun mu?',
        a: 'Araç bilgilendirme ve görünürlük ölçümü yapar: sitenizin teknik hazırlığını ve kimlik bilgilerinin okunabilirliğini gösterir; bürolar arasında tercih bildirmez, üstünlük iddiası üretmez.',
      },
      {
        q: 'Ücret bilgisini siteye yazmalı mıyım?',
        a: 'Meslek kurallarınız elverdiği ölçüde “ücret neye göre belirlenir” açıklaması ve görüşme akışı, “ne kadar?” sorusunda asistanın sizi kaynak göstermesine yardımcı olur.',
      },
      {
        q: 'Hangi şema tipini kullanmalıyım?',
        a: 'Hukuk büroları için LegalService (veya Attorney), mali müşavirlik için AccountingService; her ikisinde ad, adres, telefon, hizmet bölgesi ve sameAs alanları temel alanlardır.',
      },
      { q: 'Skor ne ölçer, ne ölçmez?', a: HOW_A },
      { q: 'Müvekkil verisi yapay zekâya gider mi?', a: KVKK_A },
    ],
    regulated: true,
  },
  {
    slug: 'eticaret-altyapi',
    name: 'E-ticaret altyapısı',
    headline: 'E-ticaret altyapısı siteleri için yapay zekâ görünürlük testi',
    intro:
      'Mağaza kurmak isteyen “ikas mı ideasoft mu Ticimax mi, küçük butik için hangisi?” diye soruyor. Altyapı sağlayıcıları ve o altyapıda kurulu mağazalar için: yönlendirme zinciri, robots/sitemap sağlığı ve Product şeması.',
    stat: 'internetUsage',
    image: '/img/sektor/eticaret-altyapi.webp',
    imageAlt:
      'E-ticaret yönetim paneli ve ürün kataloğunun yapay zekâ asistanı tarafından okunmasını simgeleyen görsel',
    showcaseQuestions: [
      'ikas mı ideasoft mu Ticimax mi, küçük butik için hangisi?',
      'Trendyol ve Hepsiburada entegrasyonu olan e-ticaret altyapısı hangisi?',
      'Shopify Türkiye’de kullanılır mı, iyzico/PayTR bağlanır mı?',
      'Komisyonsuz, aylık sabit ücretli e-ticaret paketi öner.',
      'Yurt dışına satış için hangi altyapı, çoklu dil ve döviz?',
    ],
    checks: [
      {
        tool: 'e-ticaret-ai-gorunurluk-testi',
        why: 'Katalog yapısı, Product JSON-LD ve AI bot erişimi — mağazanın 6 eksenli hazırlık skoru.',
      },
      {
        tool: 'yonlendirme-zinciri',
        why: 'www/https varyantları tek adımda birleşmiyorsa ürün linkleri botlar için yavaş ve çift sayılır.',
      },
      {
        tool: 'robots-sitemap-kontrol',
        why: 'Tema kaynaklı “Disallow: /” veya bayat sitemap, binlerce ürünü görünmez bırakır.',
      },
    ],
    featuredTool: 'satin-alma-sorusu-kapsama',
    faq: [
      {
        q: 'Platformumu otomatik tanıyor musunuz?',
        a: 'Evet; Shopify, ikas, Ticimax, WooCommerce, İdeasoft, T-Soft ve diğer yaygın platformlar herkese açık sinyallerden tespit edilir ve öneriler platforma göre adımlanır.',
      },
      {
        q: 'Ürün sayfalarımı da test edebilir miyim?',
        a: 'Ürün sayfası testi tek bir ürün adresini Product şeması, açıklama özgünlüğü, görsel alt metni ve SSS açısından puanlar; mağaza testi ise anasayfa ve katalog yapısına bakar.',
      },
      {
        q: 'JavaScript ile render edilen temalarda sonuç güvenilir mi?',
        a: 'Araçlar JavaScript çalıştırmaz; içerik yalnızca JS ile geliyorsa “içerik JavaScript’e bağımlı olabilir” uyarısı verilir ve bu bir hata değil, yorumlanması gereken bir bulgudur.',
      },
      { q: 'Skor ne ölçer, ne ölçmez?', a: HOW_A },
      { q: 'Müşteri verisi yapay zekâya gider mi?', a: KVKK_A },
    ],
    regulated: false,
  },
  {
    slug: 'egitim',
    name: 'Eğitim',
    headline: 'Eğitim siteleri için yapay zekâ görünürlük testi',
    intro:
      'Öğrenci adayı “Sıfırdan yazılımcı olmak için hangi bootcamp, işe yerleştirme desteği var mı?” diye soruyor. Program sayfalarınız, sitemap’iniz ve Course şemanız bu soruya cevap veriyor mu?',
    stat: 'genAiUsage',
    image: '/img/sektor/egitim.webp',
    imageAlt: 'Eğitim kurumunun derslik ortamı ve öğrencinin yapay zekâ asistanına kurs sorusu sorduğu ekran',
    showcaseQuestions: [
      'Sıfırdan yazılımcı olmak için hangi bootcamp, işe yerleştirme desteği var mı?',
      'Veri analisti kursu online mı yüz yüze mi, fiyatı ne kadar?',
      'İŞKUR destekli ücretsiz yazılım eğitimi veren kurumlar?',
      'IELTS 7 için hangi dil kursu, kaç ayda?',
      'Çocuğum için robotik kodlama kursu Ankara, hangisi güvenilir?',
    ],
    checks: [
      {
        tool: 'robots-sitemap-kontrol',
        why: 'Dönem dönem açılan program sayfaları sitemap’te yoksa asistan güncel kursunuzu bulamaz.',
      },
      {
        tool: 'kirik-link-bulucu',
        why: 'Kapanan dönem sayfalarına giden kırık linkler adayı ve botu boş sayfaya yollar.',
      },
      {
        tool: 'schema-denetimi',
        why: 'Course ve EducationalOrganization şeması süre, biçim (online/yüz yüze) ve ücreti makineye açıkça söyler.',
      },
    ],
    featuredTool: 'satin-alma-sorusu-kapsama',
    faq: [
      {
        q: 'Kurs fiyatını yazmak zorunda mıyım?',
        a: 'Zorunlu değil; ancak “ne kadar?” sorusunda asistan fiyat bilgisini başka kaynaklardan tahmin eder. Fiyat bandı, taksit ve burs koşullarını yazmak cevapta sizi kaynak yapar.',
      },
      {
        q: 'Course şemasında hangi alanlar olmalı?',
        a: 'name, description, provider (kurum), hasCourseInstance (biçim, başlangıç, süre) ve varsa offers (fiyat, para birimi). Uydurma değerlendirme puanı eklemeyin.',
      },
      {
        q: 'Sitemap’te binlerce eski sayfa var; sorun mu?',
        a: 'Kapanan dönemler 404 dönüyorsa sitemap örneklem kontrolünde uyarı alırsınız; eski sayfaları güncel programa 301 ile yönlendirin ve sitemap’ten çıkarın.',
      },
      { q: 'Skor ne ölçer, ne ölçmez?', a: HOW_A },
      { q: 'Öğrenci verisi yapay zekâya gider mi?', a: KVKK_A },
    ],
    regulated: false,
  },
  {
    slug: 'gayrimenkul',
    name: 'Gayrimenkul',
    headline: 'Gayrimenkul siteleri için yapay zekâ görünürlük testi',
    intro:
      'Alıcı “İstanbul Anadolu yakasında yatırımlık daire nerede alınır?” diye soruyor; ilan linkiniz WhatsApp’ta boş kart olarak mı gidiyor? Paylaşım önizlemesi, kırık ilan linkleri ve güven sinyalleri bu sektörün üç kritik kontrolü.',
    stat: 'whatsappUsage',
    image: '/img/sektor/gayrimenkul.webp',
    imageAlt: 'Konut projesi dış görünümü ve telefonda WhatsApp üzerinden paylaşılan ilan bağlantısı önizlemesi',
    showcaseQuestions: [
      'İstanbul Anadolu yakasında 10 milyon TL’ye yatırımlık daire nerede alınır?',
      'Vatandaşlık için 400 bin dolarlık konut alımında hangi emlak firması güvenilir?',
      'Antalya’da kiralık villa için hangi emlak ofisi?',
      'Projeden daire alırken nelere dikkat etmeliyim, hangi müteahhit güvenilir?',
      'Kira getirisi yüksek ilçeler hangileri?',
    ],
    checks: [
      {
        tool: 'whatsapp-onizleme',
        why: 'İlan linkleri WhatsApp’ta paylaşılır; og:image yoksa kart boş görünür ve tıklanmaz.',
      },
      {
        tool: 'kirik-link-bulucu',
        why: 'Satılan/kaldırılan ilanlara giden linkler alıcıyı ve botu 404’e yollar.',
      },
      {
        tool: 'guven-sinyalleri',
        why: 'Ofis adresi, telefon ve yetki belgesi bilgisi; yapay zekâ kimliksiz emlakçıyı önermez.',
      },
    ],
    featuredTool: 'satin-alma-sorusu-kapsama',
    faq: [
      {
        q: 'İlan sayfaları için hangi şema tipi?',
        a: 'RealEstateListing veya Offer + Residence/Apartment; ofis için RealEstateAgent (ad, adres, telefon, hizmet bölgesi). Fiyat ve metrekare şemada da yer almalı.',
      },
      {
        q: 'WhatsApp’ta kart neden boş görünüyor?',
        a: 'Çoğunlukla og:image göreli adresli, 300 KB’tan büyük ya da erişime kapalı. WhatsApp önizleme aracı görselin adresini, boyutunu ve HTTP durumunu kontrol eder.',
      },
      {
        q: 'Portal ilanları (sahibinden vb.) yerine kendi sitem mi görünmeli?',
        a: 'Portallar güçlü kaynaktır; kendi sitenizde ilan, bölge rehberi ve fiyat açıklaması olursa asistan sizi de kaynak gösterebilir. İkisi birlikte çalışır.',
      },
      { q: 'Skor ne ölçer, ne ölçmez?', a: HOW_A },
      { q: 'Alıcı verisi yapay zekâya gider mi?', a: KVKK_A },
    ],
    regulated: false,
  },
  {
    slug: 'turizm',
    name: 'Turizm',
    headline: 'Turizm siteleri için yapay zekâ görünürlük testi',
    intro:
      'Misafir “Kapadokya’da balon manzaralı butik otel öner, bütçe 5.000 TL/gece” diye soruyor — İngilizce de soruyor. hreflang, paylaşım kartı ve sitemap sağlığı ile yabancı ve yerli misafirin sizi bulup bulamayacağını ölçün.',
    stat: 'whatsappUsage',
    image: '/img/sektor/turizm.webp',
    imageAlt: 'Butik otel terası manzarası ve gezginin telefonda yapay zekâ asistanına otel sorusu sorması',
    showcaseQuestions: [
      'Kapadokya’da balon manzaralı butik otel öner, bütçe 5.000 TL/gece.',
      'Bodrum’da çocuklu aile için her şey dahil otel hangisi?',
      'Sultanahmet’te yürüme mesafesinde 4 yıldızlı otel, kahvaltı dahil?',
      'Which boutique hotels in Cappadocia have cave rooms?',
      'Balayı için Fethiye’de sadece yetişkin otel?',
    ],
    checks: [
      {
        tool: 'hreflang-kontrol',
        why: 'İngilizce/Almanca/Rusça sayfalar hreflang ile bağlı değilse yabancı misafirin sorusunda görünmezsiniz.',
      },
      {
        tool: 'whatsapp-onizleme',
        why: 'Rezervasyon linki WhatsApp’ta kart olarak gider; görselsiz kart tıklanmaz.',
      },
      {
        tool: 'robots-sitemap-kontrol',
        why: 'Sezonluk oda/paket sayfaları sitemap’te yoksa asistan güncel teklifinizi bulamaz.',
      },
    ],
    featuredTool: 'satin-alma-sorusu-kapsama',
    faq: [
      {
        q: 'Booking/Airbnb varken kendi sitem neden önemli?',
        a: 'Asistanlar portalları kaynak gösterir; ancak oda tipi, konum ve politika bilgisi kendi sitenizde açık ve çok dilliyse doğrudan sizi de kaynak gösterir ve komisyonsuz rezervasyon yolu açılır.',
      },
      {
        q: 'Hangi şema tipi?',
        a: 'Hotel / LodgingBusiness (ad, adres, telefon, checkinTime, amenityFeature) ve oda/paketler için Offer. Uydurma değerlendirme puanı eklemeyin.',
      },
      {
        q: 'hreflang’de en sık hata ne?',
        a: 'en-UK gibi geçersiz bölge kodu, eksik x-default ve karşılıklı olmayan alternatifler. hreflang aracı bunları ISO listesiyle ve alternatif erişimiyle kontrol eder.',
      },
      { q: 'Skor ne ölçer, ne ölçmez?', a: HOW_A },
      { q: 'Misafir verisi yapay zekâya gider mi?', a: KVKK_A },
    ],
    regulated: false,
  },
  {
    slug: 'b2b-uretici',
    name: 'B2B üretici',
    headline: 'B2B üretici siteleri için yapay zekâ görünürlük testi',
    intro:
      'Satın almacı “Turkish manufacturer of X with export experience to EU?” diye soruyor. İngilizce sayfalarınız hreflang ile bağlı mı, sertifikalarınız şemada mı, siteniz güvenlik başlıklarıyla kurumsal alıcıya güven veriyor mu?',
    stat: 'internetUsage',
    image: '/img/sektor/b2b-uretici.webp',
    imageAlt:
      'Üretim tesisi ve ihracat sorgusunun yapay zekâ asistanında üretici sitesiyle eşleşmesini simgeleyen görsel',
    showcaseQuestions: [
      'Türkiye’de OEM üretim yapan tekstil/metal/plastik fabrikası, MOQ düşük olan?',
      'ISO 9001 belgeli endüstriyel mutfak ekipmanı üreticisi öner.',
      'Turkish manufacturer of X with export experience to EU?',
      'Bursa’da fason dikim atölyesi, 500 adet kapasiteli?',
      'CE belgeli makine üreticisi, Avrupa’ya ihracat yapan?',
    ],
    checks: [
      {
        tool: 'hreflang-kontrol',
        why: 'İngilizce katalog sayfaları hreflang ile bağlanmadıysa yabancı alıcının sorusunda görünmezsiniz.',
      },
      {
        tool: 'guvenlik-basliklari',
        why: 'Kurumsal alıcının BT ekibi HSTS, TLS ve güvenlik başlıklarına bakar; harf notu paylaşılır.',
      },
      {
        tool: 'schema-denetimi',
        why: 'Organization şemasında sertifikalar, üretim yeri ve ihracat pazarları makineye açıkça söylenmeli.',
      },
    ],
    featuredTool: 'satin-alma-sorusu-kapsama',
    faq: [
      {
        q: 'Ürün kataloğum PDF; sorun mu?',
        a: 'Evet. Asistanlar PDF’i sayfadan zor okur; her ürün grubu için HTML sayfa (özellik tablosu, MOQ, teslim süresi) ve İngilizce sürüm önerilir.',
      },
      {
        q: 'Sertifikaları nasıl göstermeliyim?',
        a: 'Hakkımızda/kalite sayfasında belge adı, kapsam ve veren kurum metin olarak; Organization şemasında hasCredential veya description alanında. Yalnızca görsel olarak koymak yeterli değildir.',
      },
      {
        q: 'Alibaba/ThomasNet gibi platformlar yerine kendi sitem mi?',
        a: 'Platformlar güçlü kaynaktır; kendi sitenizde kapasite, MOQ, ihracat pazarları ve iletişim açıksa asistan sizi de doğrudan kaynak gösterir.',
      },
      { q: 'Skor ne ölçer, ne ölçmez?', a: HOW_A },
      { q: 'Alıcı verisi yapay zekâya gider mi?', a: KVKK_A },
    ],
    regulated: false,
  },
];

export const SECTOR_BY_SLUG: Record<SectorSlug, Sector> = Object.fromEntries(SECTORS.map((s) => [s.slug, s])) as Record<
  SectorSlug,
  Sector
>;

export function sectorBySlug(slug: string): Sector | undefined {
  return SECTORS.find((s) => s.slug === slug);
}

/** /sektor/<slug> */
export function sectorPath(slug: SectorSlug): string {
  return `/sektor/${slug}`;
}
