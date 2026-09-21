/**
 * Blog batch 5 — gece programı (spec §7.7). 6 yazı, publishedAt 2026-09-15..20, yazar "Yanıt ekibi".
 * Kurallar: ≥350 kelime; gövde yalnız p/h2/h3/ul/quote/code; inline link YOK (sektör/araç yolları düz metin);
 * yüzdeler yalnız TÜİK / Digital 2026 / EY / TÜSİAD kaynaklı ve aynı cümlede kaynak adıyla (tests/unit/blog-batch-5.test.ts);
 * "garanti", "en iyi", "Türkiye’nin ilk" yok. Araç gömme: INTEGRATE `blog/[slug]/page.tsx` INLINE_TOOLS (.registry/W8.json).
 */
import type { BlogPost } from './blog-posts';

const marketing = { name: 'Yanıt ekibi', role: 'Pazarlama' };
const strategy = { name: 'Yanıt ekibi', role: 'Strateji' };
const tech = { name: 'Yanıt ekibi', role: 'Teknik içerik' };

export const BATCH_5: BlogPost[] = [
  {
    slug: 'whatsapp-link-onizlemesi-bos-gorunuyor',
    title: 'WhatsApp’ta attığınız link neden boş görünüyor? OG etiketleri rehberi',
    excerpt:
      'Müşteriye attığınız link WhatsApp’ta başlıksız, görselsiz bir kutu olarak gidiyorsa sorun WhatsApp’ta değil, sitenizin Open Graph etiketlerinde. Beş dakikalık teşhis ve düzeltme.',
    publishedAt: '2026-09-15',
    readTimeMin: 5,
    category: 'Pazarlama',
    author: marketing,
    body: [
      {
        type: 'p',
        text: 'Türkiye’de internet kullanıcılarının %90,0’ı WhatsApp kullanıyor (TÜİK 2026). Bu, sitenize gelen linklerin büyük bölümünün bir sohbet penceresinde, kart olarak açıldığı anlamına gelir. Kart boşsa tıklanmaz; tıklanmayan link de satış görüşmesini başlatmaz. Bu yazı, boş kartın nedenlerini ve düzeltmesini adım adım anlatır.',
      },
      { type: 'h2', text: 'WhatsApp kartı nereden beslenir?' },
      {
        type: 'p',
        text: 'WhatsApp, LinkedIn, X ve Telegram bir link paylaşıldığında sayfanın HTML’ini çeker ve Open Graph (OG) etiketlerini okur: og:title, og:description, og:image ve og:url. Bu etiketler yoksa uygulama sayfa başlığını ve ilk bulduğu görseli tahmin etmeye çalışır; çoğu zaman tahmin edemez ve kartı boş bırakır. JavaScript ile sonradan yazılan etiketler de görülmez, çünkü önizleyici sayfayı bir tarayıcı gibi çalıştırmaz.',
      },
      { type: 'h2', text: 'Beş tipik neden' },
      {
        type: 'ul',
        items: [
          'og:image göreli adresli: “/img/kapak.jpg” yerine tam adres gerekir, “https://siteniz.com/img/kapak.jpg”.',
          'Görsel çok büyük: 300 KB üstündeki görseller bazı uygulamalarda hiç yüklenmez; 1200×630 piksel ve 200 KB altı hedefleyin.',
          'Görsel erişime kapalı: CDN veya bot koruması önizleyiciye 403 dönüyorsa kart boş kalır.',
          'Etiket yalnız anasayfada: ürün, ilan veya hizmet sayfalarında og:title ve og:image eksikse o sayfaların kartı boş gider.',
          'Önbellek: etiketleri düzelttiniz ama WhatsApp eski kartı gösteriyor; sorgu parametresi ekleyerek yeni önizleme tetiklenir.',
        ],
      },
      { type: 'h2', text: 'Nasıl teşhis edersiniz?' },
      {
        type: 'p',
        text: 'Sayfanın kaynak kodunda head bölümünde og: ile başlayan meta etiketlerini arayın. Dört etiketin dördü de varsa görselin adresini tarayıcıda açın; açılıyorsa boyutuna bakın. Bunu elle yapmak istemiyorsanız ücretsiz WhatsApp önizleme aracı (/arac/whatsapp-onizleme) sayfanızı tarar, kartın WhatsApp, LinkedIn ve X’te nasıl görüneceğini çizer ve görselin HTTP durumunu, boyutunu ve adres biçimini kontrol eder.',
      },
      { type: 'h2', text: 'Düzeltme: dört satır' },
      {
        type: 'code',
        text: '<meta property="og:title" content="Kapadokya’da mağara odalı butik otel — Taş Konak">\n<meta property="og:description" content="Balon manzaralı 12 oda, kahvaltı dahil. Fiyat ve müsaitlik için tıklayın.">\n<meta property="og:image" content="https://taskonak.example/og/otel-1200x630.jpg">\n<meta property="og:url" content="https://taskonak.example/odalar/">',
      },
      {
        type: 'p',
        text: 'Başlık 60 karakteri, açıklama 110 karakteri geçmesin; kartta kesilir. Görsel yatay, metinsiz ve markayı ilk bakışta anlatan bir kare olsun. Her sayfa tipine (ürün, ilan, hizmet, blog) ayrı şablon yazın; tek bir genel görselle yetinmek karttaki tıklamayı düşürür.',
      },
      { type: 'h2', text: 'Kart neden yapay zekâ görünürlüğüyle ilgili?' },
      {
        type: 'p',
        text: 'OG etiketleri, sayfanızın “tek cümlelik özeti”dir. Yapay zekâ asistanları ve arama motorları da bu özeti okur; başlık ve açıklama net değilse asistan sayfanızı yanlış tanımlar ya da hiç anmaz. Kartı düzelten iş, aynı zamanda asistanın sizi doğru tarif etmesini kolaylaştırır. Yanıt paneli bu tür teknik bulguları sektörünüzün sorularıyla birlikte izler; ücretsiz araç ise tek sayfada anında sonuç verir.',
      },
      {
        type: 'quote',
        text: 'Boş kart bir tasarım sorunu değil, dört meta etiketinin eksikliğidir. Düzeltmesi bir öğle arası sürer.',
      },
    ],
  },
  {
    slug: 'musteriniz-chatgpt-ye-ne-soruyor-sektor-sektor',
    title: 'Müşteriniz ChatGPT’ye ne soruyor? Sektör sektör satın alma soruları',
    excerpt:
      'Satın alma sorusu artık üç parçadan oluşuyor: konum, fiyat ve güven işareti. Dokuz sektörden örnek sorular ve sitenizin bu sorulara hazır olup olmadığını nasıl ölçeceğiniz.',
    publishedAt: '2026-09-16',
    readTimeMin: 6,
    category: 'Strateji',
    author: strategy,
    body: [
      {
        type: 'p',
        text: 'Türkiye’de her 5 kişiden 1’i (%19,2) üretken yapay zekâ kullanıyor; 16–24 yaşta bu oran her 5 kişiden 2’si (TÜİK 2025). Yapay zekâ araçlarından gelen web trafiğinin %94,49’u ise tek bir kaynaktan, ChatGPT’den geliyor (Digital 2026). Yani soru “yapay zekâda görünmek” değil; ChatGPT’nin sizi söyleyip söylemediği.',
      },
      { type: 'h2', text: 'Satın alma sorusunun kalıbı' },
      {
        type: 'p',
        text: 'Sektörden bağımsız olarak sorular aynı iskelete oturuyor: bir konum (“Kadıköy’de”, “Bursa’da”), bir öneri isteği (“hangisi”, “öner”), bir fiyat sorusu (“ne kadar”, “aylık”) ve bir güven işareti (“ruhsatlı”, “belgeli”, “referansı olan”). Asistan bu dört parçayı sitenizde bulamazsa başka kaynaklara gider ve sizi anmaz.',
      },
      { type: 'h2', text: 'Dokuz sektörden örnekler' },
      {
        type: 'ul',
        items: [
          'SaaS: “Türkiye’de 20 kişilik ekip için Türkçe destekli CRM öner, aylık fiyatı ne kadar?”',
          'Klinik: “Sağlık Bakanlığı ruhsatlı, doktorun bizzat yaptığı saç ekimi merkezi öner.”',
          'Hukuk ve danışmanlık: “Şirket kurarken mali müşavir ücreti aylık ne kadar, Kadıköy’de kimi önerirsin?”',
          'E-ticaret altyapısı: “Trendyol ve Hepsiburada entegrasyonu olan e-ticaret altyapısı hangisi?”',
          'Eğitim: “Veri analisti kursu online mı yüz yüze mi, fiyatı ne kadar?”',
          'Gayrimenkul: “Antalya’da kiralık villa için hangi emlak ofisi?”',
          'Turizm: “Bodrum’da çocuklu aile için her şey dahil otel hangisi?”',
          'B2B üretici: “ISO 9001 belgeli endüstriyel mutfak ekipmanı üreticisi öner.”',
          'Ajans: “E-ticaret için Meta reklam yönetimi yapan performans ajansı öner.”',
        ],
      },
      { type: 'h2', text: 'Siteniz bu sorulara cevap veriyor mu?' },
      {
        type: 'p',
        text: 'Dört soru sorun. Fiyat: sitenizde fiyat, fiyat bandı ya da “fiyat neye göre belirlenir” açıklaması var mı? Konum: hizmet bölgeniz ve adresiniz metin olarak yazılı mı, yoksa yalnızca harita görselinde mi? Güven: belge, ruhsat, referans ve iletişim kanalları bir sayfada toplanmış mı? Soru başlıkları: sık sorulan sorular bölümünüz müşterinin kelimeleriyle mi yazılmış, yoksa kurumsal başlıklarla mı?',
      },
      {
        type: 'p',
        text: 'Bunu elle yapmak yerine ücretsiz satın alma sorusu kapsama aracını (/arac/satin-alma-sorusu-kapsama) kullanabilirsiniz: sektörünüzü seçersiniz, araç sektörün 25 sorusunu sitenizdeki soru başlıkları, SSS bölümleri ve fiyat/konum sinyalleriyle eşleştirir. Sonuç, hangi sorunun cevabının sitede olmadığını gösterir. Sektör sayfalarında (/sektor) araç sektör ön-seçili gelir.',
      },
      { type: 'h2', text: 'Kanıt beklentisi' },
      {
        type: 'p',
        text: 'EY Geleceğin Tüketicisi Endeksi 2026’ya göre tüketicilerin %95’i satın alma kararında somut kanıt bekliyor ve %93’ü bilgiyi birden fazla kaynaktan doğruluyor. Asistan da aynı davranışı taklit eder: tek kaynağa güvenmez, sitenizdeki bilgiyi başka kaynaklarla çapraz kontrol eder. Bu yüzden fiyat ve belge bilgisinin yalnızca sitenizde değil, tutarlı biçimde dış kaynaklarda da geçmesi önemlidir.',
      },
      { type: 'h2', text: 'Ölçmeden strateji olmaz' },
      {
        type: 'p',
        text: 'Tek bir ChatGPT cevabı hüküm değildir; cevaplar oturumdan oturuma değişir. Sağlıklı yaklaşım, sektörünüzün sorularını her sabah aynı modellerde sormak, tarih damgasıyla kaydetmek ve rakiplerle birlikte okumaktır. Yanıt paneli bunu yapar; ücretsiz araç ise “bugün, bu sayfa, bu sorular” fotoğrafını çeker. İkisi birlikte, neyi düzelteceğinizi ve düzeltmenin işe yarayıp yaramadığını gösterir.',
      },
    ],
  },
  {
    slug: 'organization-localbusiness-schema-turkiye',
    title: 'Organization ve LocalBusiness şeması: yapay zekâ sizi nasıl tanır?',
    excerpt:
      'Asistan sitenizi okurken “bu kim, nerede, ne yapıyor” sorusuna JSON-LD ile cevap arar. Organization ve LocalBusiness şemasının Türkiye’deki KOBİ için doğru kurulumu, alan alan.',
    publishedAt: '2026-09-17',
    readTimeMin: 6,
    category: 'GEO',
    author: tech,
    body: [
      {
        type: 'p',
        text: 'Bir yapay zekâ asistanı sayfanızı okuduğunda önce kimliğinizi kurmaya çalışır: adınız, adresiniz, telefonunuz, ne yaptığınız, nerede hizmet verdiğiniz. Bu bilgiler sayfada dağınıksa asistan tahmin eder; tahmin çoğu zaman rakibinizin bilgisiyle karışır. Yapılandırılmış veri (JSON-LD) bu tahmini ortadan kaldırır: kimliğinizi makinenin okuyacağı biçimde, tek blokta söylersiniz.',
      },
      { type: 'h2', text: 'Organization mı, LocalBusiness mı?' },
      {
        type: 'p',
        text: 'Organization, tüzel kimliğinizdir: şirket adı, logo, kurumsal iletişim ve sosyal profiller. LocalBusiness ise fiziksel bir mekânda hizmet veren işletmedir ve Organization’ın alt tipidir; adres, çalışma saatleri ve hizmet bölgesi taşır. Klinik, hukuk bürosu, emlak ofisi, otel ve okul gibi işletmeler LocalBusiness’ın daha özel alt tiplerini kullanır: MedicalClinic, LegalService, RealEstateAgent, Hotel, EducationalOrganization. SaaS ve B2B üretici için Organization yeterlidir; ürün varsa SoftwareApplication veya Product ayrı düğüm olarak eklenir.',
      },
      { type: 'h2', text: 'Temel alanlar' },
      {
        type: 'ul',
        items: [
          'name: Ticari adınız; sayfa başlığındaki ve footer’daki yazımla birebir aynı olsun.',
          'url ve @id: Sitenizin kök adresi; @id sabit bir kimlik (ör. https://siteniz.com/#organization) olsun, tüm sayfalarda aynı kalsın.',
          'address: PostalAddress olarak sokak, ilçe, il, posta kodu ve ülke (TR); yalnızca metin olarak yazmayın.',
          'telephone: +90 biçiminde tek numara; WhatsApp hattı da aynı biçimde.',
          'areaServed: Hizmet verdiğiniz il veya bölge; ihracatçıysanız ülke listesi.',
          'sameAs: LinkedIn, Instagram, Google İşletme Profili ve varsa Wikidata bağlantıları; boş dizi yazmayın, alanı bırakın.',
          'logo ve image: Mutlak adresli, erişilebilir görseller.',
        ],
      },
      { type: 'h2', text: 'Örnek: mali müşavirlik ofisi' },
      {
        type: 'code',
        text: '{\n  "@context": "https://schema.org",\n  "@type": "AccountingService",\n  "@id": "https://ornek-musavirlik.example/#organization",\n  "name": "Örnek Mali Müşavirlik",\n  "url": "https://ornek-musavirlik.example/",\n  "telephone": "+90 216 000 00 00",\n  "address": {\n    "@type": "PostalAddress",\n    "streetAddress": "Bağdat Cad. No: 1",\n    "addressLocality": "Kadıköy",\n    "addressRegion": "İstanbul",\n    "postalCode": "34710",\n    "addressCountry": "TR"\n  },\n  "areaServed": "İstanbul",\n  "sameAs": ["https://www.linkedin.com/company/ornek-musavirlik"]\n}',
      },
      { type: 'h2', text: 'Sık yapılan hatalar' },
      {
        type: 'ul',
        items: [
          'Uydurma değerlendirme puanı: aggregateRating alanını gerçek, sayfada görünen yorumlar olmadan eklemek hem politika ihlalidir hem de güven kaybettirir.',
          'Her sayfada farklı ad: “Örnek A.Ş.”, “Örnek”, “ÖRNEK Mali Müşavirlik” aynı kimlik olarak okunmaz.',
          'Şemada olup sayfada olmayan bilgi: telefon şemada var ama sayfada yazmıyorsa tutarsızlık sayılır.',
          'Yanlış tip: kliniğe Organization yazmak yanlış değildir ama MedicalClinic uzmanlık ve adres alanlarını daha iyi taşır.',
          'Söz dizimi hatası: tek bir eksik virgül tüm bloğu geçersiz kılar; yayınlamadan önce doğrulayın.',
        ],
      },
      { type: 'h2', text: 'Nasıl kontrol edersiniz?' },
      {
        type: 'p',
        text: 'Ücretsiz schema denetimi aracı (/arac/schema-denetimi) sayfanızdaki tüm JSON-LD bloklarını okur, Organization veya LocalBusiness tipinin varlığını, zorunlu alanları, söz dizimini ve sayfadaki metinle tutarlılığı kontrol eder; eksik alan için “nasıl düzelir” adımını verir. Sektörünüze göre hangi alt tipi kullanmanız gerektiğini sektör sayfalarında (/sektor) bulabilirsiniz. Şema, yapay zekâ görünürlüğünün tek şartı değildir; ama kimliği belirsiz bir siteyi hiçbir asistan kaynak göstermez.',
      },
    ],
  },
  {
    slug: 'klinik-web-sitesi-ai-gorunurluk-kontrol-listesi',
    title: 'Klinik web sitesi için yapay zekâ görünürlük kontrol listesi',
    excerpt:
      'Hasta adayı kliniği asistana soruyor. Sağlık alanının tanıtım kurallarına uygun, bilgilendirme odaklı 12 maddelik teknik kontrol listesi: kimlik, şema, güven, erişim ve yabancı hasta.',
    publishedAt: '2026-09-18',
    readTimeMin: 6,
    category: 'Sektör',
    author: strategy,
    body: [
      {
        type: 'p',
        text: 'Hasta adayı “İstanbul’da saç ekimi kliniği öner, fiyatlar ne kadar?” diye soruyor; İngilizce ve Arapça da soruyor. Asistanın cevabı sizin sitenizi kaynak gösteriyor mu, yoksa kliniğinizin adresini ve uzmanlık alanını başka bir siteden mi tahmin ediyor? Bu liste, sağlık alanının tanıtım kurallarını gözeterek yalnızca bilgilendirme ve görünürlük ölçümüne odaklanır: kliniği karşılaştırmaz, üstünlük iddiası üretmez.',
      },
      { type: 'h2', text: 'Kimlik: asistan sizi doğru tanıyor mu?' },
      {
        type: 'ul',
        items: [
          'Klinik adı, adres ve telefon her sayfada aynı yazımla ve metin olarak var (yalnızca görselde değil).',
          'MedicalClinic veya Physician şeması: ad, adres, telefon, uzmanlık alanı (medicalSpecialty), çalışma saatleri.',
          'Doktor kadrosu sayfası: ad, unvan, uzmanlık; her hekim için ayrı bölüm veya sayfa.',
          'Ruhsat ve yetki bilgisi: Sağlık Bakanlığı ruhsat bilgisi ve mesul müdür, hakkımızda sayfasında metin olarak.',
        ],
      },
      { type: 'h2', text: 'Güven: hasta verisi ve aydınlatma' },
      {
        type: 'ul',
        items: [
          'KVKK aydınlatma metni ve çerez politikası ayrı sayfalarda, footer’dan erişilebilir.',
          'Randevu ve iletişim formları HTTPS altında; HSTS başlığı gönderiliyor.',
          'Güvenlik başlıkları (X-Content-Type-Options, Referrer-Policy, X-Frame-Options) sunucudan geliyor.',
          'TLS sertifikası geçerli ve süresi yakın değil.',
        ],
      },
      { type: 'h2', text: 'Erişim ve sorular' },
      {
        type: 'ul',
        items: [
          'robots.txt asistan botlarını (GPTBot, ClaudeBot, PerplexityBot) bilinçli olarak engellemiyor ya da engelliyor; karar belgelenmiş.',
          'Sitemap güncel; kapanan hizmet sayfaları 301 ile yönlendirilmiş.',
          'Sık sorulan sorular bölümü hastanın kelimeleriyle yazılmış: “işlem kaç saat sürer”, “iyileşme süreci”, “fiyat neye göre belirlenir”.',
          'Yabancı hasta: İngilizce ve Arapça sayfalar ayrı adreste, hreflang ile karşılıklı bağlı; +90 telefon biçimi.',
        ],
      },
      { type: 'h2', text: 'Fiyat konusunda dürüst çerçeve' },
      {
        type: 'p',
        text: 'Sağlık hizmetlerinde fiyat ilanı mevzuata tabidir; bu yazı hukuki görüş değildir. Yine de asistanın “ne kadar” sorusuna sitenizi kaynak göstermesi için, meslek kurallarının izin verdiği ölçüde “fiyat neye göre belirlenir” açıklaması (işlem türü, greft sayısı, konaklama dahil mi) ve görüşme akışı yazılabilir. Rakam vermeden yapılan bu açıklama, asistanın başka sitelerden tahmin üretmesini azaltır.',
      },
      { type: 'h2', text: 'Nasıl ölçersiniz?' },
      {
        type: 'p',
        text: 'Klinik sektör sayfası (/sektor/klinik) bu listenin üç temel kontrolünü ücretsiz araçlara bağlar: schema denetimi (MedicalClinic ve Physician şeması), güven sinyalleri (adres, telefon, aydınlatma metni, hakkımızda) ve güvenlik başlıkları (HTTPS, HSTS, TLS). Aynı sayfadaki satın alma sorusu kapsama testi, hasta adayının sorduğu 25 soruyu sitenizdeki soru başlıklarıyla eşleştirir ve hangi sorunun cevapsız kaldığını gösterir. Tüm araçlar yalnızca herkese açık siteyi tarar; hasta verisine erişmez ve hiçbir kişisel veriyi yapay zekâ servislerine göndermez.',
      },
      { type: 'h2', text: 'Neyi ölçmeyiz?' },
      {
        type: 'p',
        text: 'Araçlar kliniğinizin tıbbi kalitesini, hasta memnuniyetini ya da asistanın sizi önerip önermediğini ölçmez; sitenizin teknik ve bilgilendirme hazırlığını ölçer. Asistanın gerçek davranışı tarih damgalı günlük ölçümle, Yanıt panelinde izlenir. Kontrol listesini tamamlamak, asistanın kliniğinizi doğru tanımasını kolaylaştırır; sonrasını ölçüm gösterir.',
      },
    ],
  },
  {
    slug: 'www-https-yonlendirme-zinciri-tek-adres',
    title: 'www, https ve yönlendirme zinciri: sitenizin tek adresi olsun',
    excerpt:
      'Siteniz http://, https://, www’lu ve www’suz olmak üzere dört adresten açılıyor. Hangisi asıl adres? Botlar ve müşteriler için tek kanonik adres kurmanın teknik rehberi.',
    publishedAt: '2026-09-19',
    readTimeMin: 5,
    category: 'Teknik',
    author: tech,
    body: [
      {
        type: 'p',
        text: 'Bir sitenin en az dört adresi vardır: http://siteniz.com, https://siteniz.com, http://www.siteniz.com ve https://www.siteniz.com. Bu dördü aynı sayfayı gösterse bile arama motoru ve yapay zekâ botları için dört ayrı sitedir. Yönlendirme zinciri, bu dört adresin tek bir kanonik adrese kaç adımda ulaştığını anlatır; adım sayısı arttıkça sayfa yavaşlar, bot bütçesi harcanır ve link değeri bölünür.',
      },
      { type: 'h2', text: 'Zincir nasıl bozulur?' },
      {
        type: 'ul',
        items: [
          'http → https → www → sayfa: üç adım. İdeal olan tek adımdır: her varyant doğrudan kanonik adrese 301 dönmeli.',
          '302 kullanmak: geçici yönlendirme kalıcı adres değişikliğini anlatmaz; 301 (veya 308) kullanın.',
          'Döngü: www → çıplak → www; tarayıcı “çok fazla yönlendirme” hatası verir, bot vazgeçer.',
          'Farklı sayfalar farklı kanonik: anasayfa www’lu, ürün sayfaları www’suz; sitemap ise üçüncü bir biçim.',
          'Sonda eğik çizgi: /odalar ve /odalar/ ikisi de 200 dönüyorsa çift içerik sayılır.',
        ],
      },
      { type: 'h2', text: 'Karar: www mu, çıplak mı?' },
      {
        type: 'p',
        text: 'İkisi de doğru; önemli olan tek birini seçip her yerde aynı kalmaktır. Seçiminizi sitemap, canonical etiketi, OG etiketleri ve JSON-LD’deki url alanında da uygulayın. Marka adı kısa ve akılda kalıcıysa çıplak alan adı sohbet uygulamalarında daha temiz görünür; büyük kurumsal sitelerde alt alan adı yönetimi için www tercih edilir.',
      },
      { type: 'h2', text: 'Örnek kurulum' },
      {
        type: 'code',
        text: '# nginx — tüm varyantlar tek adımda https://siteniz.com\nserver {\n  listen 80;\n  server_name siteniz.com www.siteniz.com;\n  return 301 https://siteniz.com$request_uri;\n}\nserver {\n  listen 443 ssl;\n  server_name www.siteniz.com;\n  return 301 https://siteniz.com$request_uri;\n}',
      },
      {
        type: 'p',
        text: 'Apache, IIS veya bir e-ticaret altyapısı kullanıyorsanız panelde “kanonik alan adı” ya da “www yönlendirmesi” ayarı bulunur; ayarı yaptıktan sonra dört varyantı da elle deneyin. CDN kullanıyorsanız yönlendirmeyi CDN katmanında yapmak kaynak sunucuya gelen isteği azaltır; ancak iki katmanda birden yönlendirme tanımlamak zinciri uzatır.',
      },
      { type: 'h2', text: 'HSTS ile tamamlayın' },
      {
        type: 'p',
        text: 'Strict-Transport-Security başlığı, tarayıcıya siteye yalnızca https ile bağlanmasını söyler; böylece http varyantına bir daha istek gitmez ve ilk adım tarayıcı içinde çözülür. Başlığı yalnızca https sunucusundan gönderin ve alt alan adlarını kapsayıp kapsamayacağına önce karar verin.',
      },
      { type: 'h2', text: 'Ölçün' },
      {
        type: 'p',
        text: 'Ücretsiz yönlendirme zinciri aracı (/arac/yonlendirme-zinciri) dört varyantı ayrı ayrı çağırır, her biri için adım sayısını, durum kodlarını ve döngü olup olmadığını listeler; tek kanonik hosta ulaşılıp ulaşılmadığını hükümle söyler. E-ticaret altyapısı sektör sayfasında (/sektor/eticaret-altyapi) bu kontrol robots/sitemap ve mağaza testiyle birlikte gelir. Yönlendirme, görünürlük çalışmasının en ucuz adımıdır: bir saatlik iş, aylarca sürecek bölünmüş sinyali ortadan kaldırır.',
      },
    ],
  },
  {
    slug: 'guvenlik-basliklari-kobi-rehberi',
    title: 'Güvenlik başlıkları: KOBİ sitesi için A notuna 30 dakikada',
    excerpt:
      'HSTS, CSP, X-Frame-Options ve TLS: kurumsal alıcının BT ekibi teklifi onaylamadan önce bunlara bakıyor. Yazılım değiştirmeden, sunucu ayarıyla A notuna çıkmanın adım adım rehberi.',
    publishedAt: '2026-09-20',
    readTimeMin: 6,
    category: 'Teknik',
    author: tech,
    body: [
      {
        type: 'p',
        text: 'Kurumsal bir müşteriye teklif verdiniz; satın alma ekibi onayladı, sıra BT’ye geldi. BT ekibinin ilk yaptığı iş sitenizin güvenlik başlıklarını taramak ve harf notuna bakmaktır. Not F ise teklif masada bekler. Bu rehber, çoğu KOBİ sitesinin yarım saatte A notuna çıkabileceği beş başlığı ve TLS kontrolünü anlatır; kod değiştirmeden, yalnızca sunucu ya da CDN ayarıyla.',
      },
      { type: 'h2', text: 'Başlıklar neyi engeller?' },
      {
        type: 'ul',
        items: [
          'Strict-Transport-Security (HSTS): tarayıcıyı yalnızca https kullanmaya zorlar; http üzerinden araya girme saldırısını kapatır.',
          'X-Content-Type-Options: nosniff: tarayıcının dosya türünü tahmin etmesini engeller; script gibi çalıştırılan görsel saldırılarını keser.',
          'X-Frame-Options: DENY veya SAMEORIGIN: sitenizin başka bir sitede çerçeve içine alınmasını (clickjacking) engeller.',
          'Referrer-Policy: strict-origin-when-cross-origin: sayfa adreslerinizin dış sitelere sızmasını sınırlar.',
          'Content-Security-Policy (CSP): hangi kaynaklardan script ve stil yüklenebileceğini kısıtlar; en etkili ama en dikkat isteyen başlık.',
          'Permissions-Policy: kamera, mikrofon ve konum gibi API’leri kapatır; çoğu KOBİ sitesi hiçbirine ihtiyaç duymaz.',
        ],
      },
      { type: 'h2', text: 'Otuz dakikalık plan' },
      {
        type: 'p',
        text: 'İlk on dakika: HSTS, nosniff, X-Frame-Options ve Referrer-Policy. Bu dördü hiçbir sitede işlevi bozmaz ve tek başına notu F’den B’ye taşır. İkinci on dakika: Permissions-Policy; kullanmadığınız API’leri kapatın. Son on dakika: CSP’yi önce yalnızca raporlama modunda (Content-Security-Policy-Report-Only) açın, bir hafta tarayıcı raporlarını izleyin, sonra zorlayıcı moda geçin. CSP’yi ilk günden zorlamak sitedeki üçüncü taraf scriptleri (sohbet balonu, analitik, harita) kırabilir.',
      },
      { type: 'h2', text: 'Örnek sunucu ayarı' },
      {
        type: 'code',
        text: '# nginx — https sunucu bloğu\nadd_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\nadd_header X-Content-Type-Options "nosniff" always;\nadd_header X-Frame-Options "SAMEORIGIN" always;\nadd_header Referrer-Policy "strict-origin-when-cross-origin" always;\nadd_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;',
      },
      {
        type: 'p',
        text: 'Cloudflare veya benzeri bir CDN kullanıyorsanız aynı başlıklar “dönüşüm kuralları” ya da “yanıt başlıkları” bölümünden eklenir; kaynak sunucuya dokunmanız gerekmez. Hazır e-ticaret altyapılarında başlıkların bir kısmı platform tarafından gönderilir; eksik olanları destek ekibinden isteyin ve isteği yazılı tutun.',
      },
      { type: 'h2', text: 'TLS: sertifika ve protokol' },
      {
        type: 'p',
        text: 'Başlıklar kadar önemli ikinci kalem sertifikadır: süresi dolmuş ya da alan adıyla eşleşmeyen sertifika tarayıcıda kırmızı uyarı üretir ve botlar sayfayı okumayı bırakır. Sertifikanın bitiş tarihini takvime alın; otomatik yenileme kuruluysa yenilemenin gerçekten çalıştığını üç ayda bir doğrulayın. Eski TLS sürümlerini (1.0 ve 1.1) kapatın; modern tarayıcılar ve botlar TLS 1.2 ve 1.3 ile bağlanır.',
      },
      { type: 'h2', text: 'Yanlış pozitiflere dikkat' },
      {
        type: 'p',
        text: 'Bazı tarayıcı araçları kullanımdan kalkmış X-XSS-Protection başlığının eksikliğini hata sayar; modern tarayıcılar bu başlığı yok sayar, eklemeniz gerekmez. Aynı şekilde CSP’nin eksikliği düşük not getirir ama sitenin “güvensiz” olduğu anlamına gelmez; önce dört temel başlığı kurun, CSP’yi planlı ilerletin.',
      },
      { type: 'h2', text: 'Notunuzu görün' },
      {
        type: 'p',
        text: 'Ücretsiz güvenlik başlıkları aracı (/arac/guvenlik-basliklari) altı başlığı ve TLS sertifikasını kontrol eder, A+’dan F’ye harf notu verir ve her eksik başlık için “nasıl düzelir” adımını gösterir; sonuç kalıcı rapor bağlantısıyla BT ekibine iletilebilir. B2B üretici sektör sayfasında (/sektor/b2b-uretici) bu kontrol hreflang ve şema denetimiyle birlikte gelir. Yapay zekâ görünürlüğü açısından güvenlik başlıkları doğrudan sıralama sinyali değildir; ancak kurumsal alıcının sizi kaynak olarak kabul etmesinin ön şartıdır.',
      },
    ],
  },
];
