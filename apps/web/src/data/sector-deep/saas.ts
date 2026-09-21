import type { SectorDeep } from './types';

/** SaaS — derin anlatı. */
export const DEEP: SectorDeep = {
  slug: 'saas',

  lede:
    'Türkiye’de SaaS alımı uzun süre arama kutusundan başlıyordu: kategori adı yazılır, beş sekme açılır, fiyat sayfaları yan yana konurdu. ' +
    'Şimdi ilk adım bir sohbet penceresinde atılıyor; alıcı ekip büyüklüğünü, entegrasyon şartını ve bütçesini tek cümlede söyleyip üç isimlik bir kısa liste istiyor. ' +
    'O listede olmadığınızda kaybı analitikte göremezsiniz, çünkü ziyaret hiç başlamaz.',

  lossMoments: [
    {
      when: 'Kısa liste kurulurken',
      what:
        'Alıcı “20 kişilik ekip için Türkçe destekli CRM öner” dediğinde asistan üç isim sayıyor ve gerekçesini tek satırda yazıyor. ' +
        'Bu bilgiler sitenizde dağınıksa liste sizsiz kuruluyor; demo formunuz o gün hiç açılmadığı için panelinizde de hiçbir şey değişmiyor.',
    },
    {
      when: '“Aylık ne kadar?” sorusunda',
      what:
        'Fiyatı tamamen “Teklif alın” formunun arkasına koyduğunuzda asistan boşluğu boş bırakmıyor, bulduğu yerden dolduruyor: iki yıl önceki bir derleme yazısı, bir bayi sayfası ya da eski bir ekran görüntüsü. ' +
        'Ürününüz bugünkü paket yapınızla değil, o eskimiş rakamla kıyaslanıyor.',
    },
    {
      when: 'İkili karşılaştırma adımında',
      what:
        'Satın alma kurulunun son adımı neredeyse her zaman “X mi Y mi” karşılaştırmasıdır ve bu içerik çoğu zaman yalnız rakibinizin sitesinde durur. ' +
        'Asistan farkları o metinden okuduğunda ürününüz rakibin seçtiği başlıklarla, rakibin cümleleriyle anlatılır.',
    },
    {
      when: 'Entegrasyon ve uyum şartı sorulduğunda',
      what:
        '“Logo ile konuşuyor mu, e-fatura entegrasyonu var mı, veriler nerede tutuluyor?” soruları alım kararını tek başına kesebiliyor. ' +
        'Entegrasyonlar yalnız logo şeridinde, veri yerleşimi yalnız sözleşme ekinde yazıyorsa asistanın cevabı “belirtilmemiş” oluyor ve eleme tam orada gerçekleşiyor.',
    },
  ],

  sections: [
    {
      heading: 'Kısa liste artık sitenizde değil, sohbet penceresinde kuruluyor',
      paragraphs: [
        'Kurumsal alımda kararı veren kişi çoğu zaman yazılımı kullanacak kişi değildir; finans müdürü, operasyon sorumlusu ya da kurucunun kendisidir. ' +
          'Bu kişi kategoriyi bilir ama ürün adlarını bilmez, o yüzden soruyu ihtiyaç diliyle sorar: “e-fatura entegrasyonu olan ön muhasebe programı”, “ekip için Türkçe destekli yardım masası aracı”. ' +
          'Asistan bu cümleyi bir şartname gibi okur ve şartları sitesinde açıkça yazan ürünleri öne alır.',
        'Bu davranış artık dar bir çevrenin alışkanlığı değil. Türkiye’de her 5 kişiden 1’i (%19,2) üretken yapay zekâ kullanıyor; 16–24 yaşta her 5 kişiden 2’si (TÜİK 2025). ' +
          'SaaS alımında bu dağılım ayrıca önemli, çünkü aracı ilk açan kişi genellikle karar vericinin yanındaki genç analisttir: kısa listeyi o hazırlar, toplantıya üç isimle girer.',
        'Kayıp sessiz olduğu için tehlikelidir. Reklamda tıklama düşüşünü görürsünüz, organik trafikte sıra kaybını görürsünüz; ama kısa listeye alınmadığınız bir konuşmanın izi hiçbir panele düşmez. ' +
          'Bu yüzden ölçümü sitenin trafiğinden değil alıcının kurduğu cümlelerden başlatıyoruz: önce sorular yazılır, sonra o sorulara karşılık veren sayfalar aranır.',
      ],
    },
    {
      heading: 'Asistan sizi nereden okuyor? Fiyat tablosu, entegrasyon listesi, doküman alanı',
      paragraphs: [
        'Bir asistan ürününüzü tanımak için panelinize giremez. Elinde yalnız herkese açık sayfalarınız vardır: ana sayfadaki tek cümlelik tanım, fiyat tablosu, özellik sayfaları, entegrasyon listesi, yardım merkezi ve varsa API dokümanı. ' +
          'Ürünün gerçek yeteneği ile cevaplarda görünen yeteneği arasındaki fark, çoğu SaaS ekibinde ürünün kendisinden değil vitrinin eksikliğinden doğar.',
        'Yapılandırılmış veri bu okumayı tahmin olmaktan çıkarır. SoftwareApplication şeması ürünün kategorisini ve çalıştığı ortamı, Offer alanı fiyatı, para birimini ve faturalama dönemini makineye doğrudan söyler; ' +
          'Organization şeması da arkadaki şirketi, unvanı ve iletişim bilgisini bağlar. Bunlar yoksa asistan aynı bilgiyi serbest metinden çıkarmaya çalışır ve “kullanıcı başına” ile “ay başına” kolayca birbirine karışır.',
        'Bir de erişim tarafı var. Yardım merkezi ayrı bir alt alan adında duruyor, dokümanlar tarayıcıda çalışan bir uygulamanın içinden geliyor ya da robots.txt yapay zekâ botlarını topluca kapatıyorsa, ürünün en ayrıntılı anlatıldığı metinler cevaba hiç girmez. ' +
          'Tanıtım sayfası kalır, kurulum ve sınır bilgileri kaybolur; “şunu yapabiliyor mu” sorusunda ortaya boşluk çıkar.',
      ],
    },
    {
      heading: 'SaaS sitelerinde en sık rastladığımız eksikler',
      paragraphs: [
        'En sık göreni önce söyleyelim: fiyatın tamamen gizlenmesi. Kurumsal pakette görüşmeye bağlı bir fiyat olması anlaşılır, ama sayfada hiçbir sayı, hiçbir bant ve fiyatı neyin belirlediğine dair tek cümle bulunmaması ürünü karşılaştırmanın dışına atar. ' +
          'Bandı, birimi (kullanıcı mı, kayıt mı, işlem mi) ve KDV durumunu yazmak çoğu ekibin bir öğleden sonrada kapatabileceği bir eksiktir.',
        'İkincisi logo şeridi. Entegrasyonlar yirmi görselden oluşan bir bantta duruyor, görsellerin alt metni boş, hiçbirinin kendi sayfası yok. Aynı şey özellik listelerinde de olur: karşılaştırma tablosu bir PDF’e, kurulum adımları bir tanıtım videosuna gömülür. ' +
          'Makine tarafında bunların hepsi okunmayan alandır; “Trendyol entegrasyonu var mı” sorusunun cevabı sitede vardır ama metinde yoktur.',
        'Üçüncüsü karşılaştırma boşluğu ve tarihsiz içerik. Alternatif ve “X ile Y farkı” sayfalarını yazmayan ekiplerin ürünü, o sayfayı yazmış olan rakibin diliyle anlatılır. ' +
          'Sürüm notları iki yıl önce durmuşsa, fiyat sayfasında güncelleme tarihi yoksa ve blogdaki ekran görüntüleri eski arayüzden geliyorsa asistan ürünü canlı bir yazılım olarak değil, donmuş bir fotoğraf olarak okur.',
      ],
    },
    {
      heading: 'Ölçüm satış konuşmasına nasıl dönüşüyor?',
      paragraphs: [
        'Sonuç vaat etmiyoruz: ölçüyoruz, neyin eksik olduğunu gösteriyoruz, düzeltme sırası veriyoruz ve aynı ölçümü tekrarlıyoruz. ' +
          'Başlangıç noktası satış ekibinin zaten bildiği cümlelerdir: kaybedilen fırsat kayıtlarındaki gerekçeler, demo çağrılarında tekrar eden üç soru, rakip adının geçtiği e-postalar. ' +
          'Bunlar satın alma sorularına çevrilir ve ölçümün sabit listesi olur.',
        'Sonra araçlar devreye girer. Satın alma sorusu kapsama bu listenin hangi sorusuna sitenizde karşılık olduğunu çıkarır, SEO karnesi başlık ve açıklama düzeyinde ürünün tek cümlelik tanımını denetler, ' +
          'Schema denetimi SoftwareApplication ve Offer alanlarını kontrol eder, AI crawler testi doküman alanınızın botlara açık olup olmadığını söyler. Rakip kıyası ise ikili karşılaştırmayı madde madde yan yana koyar.',
        'Çıktı bir skordan ibaret kalmaz. Her eksik bir ekiple ve bir sayfayla eşleşir: fiyat bandı pazarlamaya, Offer şeması geliştirmeye, entegrasyon metinleri ürün ekibine gider. ' +
          'Aynı tarama dört hafta sonra tekrarlandığında hangi maddenin kapandığı, hangisinin açık kaldığı tek ekranda görünür; tartışma kanaatten çıkıp kayda döner.',
      ],
    },
  ],

  weExamine: [
    {
      area: 'SoftwareApplication ve Offer şeması',
      detail:
        'Ürünün kategorisi, çalıştığı ortam, fiyatı, para birimi (TRY) ve faturalama dönemi JSON-LD içinde var mı; şemadaki fiyat sayfadaki tabloyla aynı şeyi mi söylüyor. Puan alanı kullanılıyorsa arkasında gerçek bir kaynak olup olmadığına bakıyoruz.',
    },
    {
      area: 'Fiyat ve paket sayfasının okunabilirliği',
      detail:
        'Fiyatın birimi (kullanıcı başına mı, işlem başına mı), KDV dahil mi hariç mi, yıllık ödemede farkın ne olduğu ve kurumsal pakette fiyatı neyin belirlediği metin olarak yazılmış mı; sayfada güncelleme tarihi duruyor mu.',
    },
    {
      area: 'Entegrasyon ve API sayfaları',
      detail:
        'Entegrasyonlar logo bandı yerine ad ve açıklamayla mı listeleniyor, en çok sorulanlar ayrı URL’lerde mi anlatılıyor; e-fatura, ödeme, pazaryeri ve muhasebe bağlantıları adlarıyla geçiyor mu; API dokümanı herkese açık mı.',
    },
    {
      area: 'Karşılaştırma ve alternatif içerikleri',
      detail:
        '“X ile Y farkı” ve “X alternatifi” sayfaları kendi cümlelerinizle mi yazılmış, tarihli mi, tablo görsel değil metin mi. Bu sayfalar yoksa kıyası sizin adınıza kimin yazdığını not ediyoruz.',
    },
    {
      area: 'Yardım merkezi, doküman ve sürüm notları erişimi',
      detail:
        'Doküman alt alan adı robots.txt ile kapalı mı, sayfalar yalnız tarayıcıda mı üretiliyor, noindex var mı; sürüm notlarının son tarihi ne; llms.txt ile ürünün özeti ve ana sayfaları bildirilmiş mi.',
    },
    {
      area: 'Kurumsal künye ve güven sinyalleri',
      detail:
        'Şirket unvanı, adresi ve iletişim bilgisi Organization şemasına bağlı mı; KVKK aydınlatma metni, veri işleyen sözleşmesi, verilerin tutulduğu ülke, çalışma süresi (uptime) sayfası ve varsa bağımsız denetim belgesi sitede metin olarak duruyor mu.',
    },
  ],

  roadmap: [
    {
      week: '1. hafta',
      title: 'Soru listesi ve başlangıç ölçümü',
      detail:
        'Kaybedilen fırsat kayıtlarındaki gerekçeler, demo çağrılarında tekrar eden itirazlar ve destek biletlerindeki “bunu yapabiliyor mu” soruları toplanıp yirmi satın alma sorusuna çevrilir. Aynı hafta SEO karnesi, AI crawler testi ve Satın alma sorusu kapsama ile başlangıç ölçümü alınır.',
    },
    {
      week: '2. hafta',
      title: 'Fiyat ve paket sayfası',
      detail:
        'Fiyat bandı, birimi ve KDV durumu metne dökülür; kurumsal pakette fiyatı neyin belirlediği tek paragrafta yazılır. SoftwareApplication ve Offer şeması eklenir, sayfaya güncelleme tarihi konur, Schema denetimi ile alanların doğru okunduğu kontrol edilir.',
    },
    {
      week: '3. hafta',
      title: 'Entegrasyonlar ve ikili karşılaştırmalar',
      detail:
        'Logo bandı, her entegrasyon için adı ve ne yaptığı yazılı kısa bölümlere ayrılır; en çok sorulan üç bağlantı kendi sayfasını alır. Rakip kıyası çıktısına bakılarak iki adet “X ile Y farkı” sayfası kendi cümlelerinizle yazılır.',
    },
    {
      week: '4. hafta',
      title: 'Doküman alanı ve tekrar ölçüm',
      detail:
        'Yardım merkezi ile API dokümanının bot erişimi açılır, sürüm notları güncel tarihe getirilir, llms.txt yazılır. Ardından 1. haftadaki yirmi soru ChatGPT rank checker ve Claude rank checker ile aynı biçimde tekrar sorulur; kapanan ve açık kalan maddeler yan yana konur.',
    },
  ],

  notes: [
    {
      title: 'KVKK ve verinin tutulduğu yer',
      body:
        'Kurumsal alıcı, hukuk ve bilgi güvenliği onayını sizden yazılı bekler. Aydınlatma metni, veri işleyen sözleşmesi taslağı, alt işleyen listesi ve verilerin hangi ülkede tutulduğu sitede metin olarak durduğunda hem alıcı hem asistan aynı cevabı bulur. Bu sayfalardaki uyum ifadelerini hukuk tarafınıza onaylatmadan yayımlamayın.',
    },
    {
      title: 'Fiyatın para birimi ve tarihi',
      body:
        'TL fiyat listesi zam ve kur dönemlerinde hızla eskir; dövizle yazılan fiyat ise KDV ve ödeme tarafında ek soru üretir. Fiyat sayfasına güncelleme tarihi koymak, eski bir derleme yazısındaki rakamın bugünkü fiyatınızın yerine geçmesini zorlaştırır. Kampanyalı rakamı ana fiyat gibi yazmak da sonradan itiraza dönüşür.',
    },
    {
      title: 'Kategori adı ile ürün adının ayrışması',
      body:
        'Alıcı ürününüzü adıyla değil kategori adıyla arar ve bu adlar Türkiye’de birbirine karışır: ön muhasebe, ERP, CRM, yardım masası, İK yazılımı. Kendinizi hangi kategoriyle tanımladığınız sitede net değilse asistan sizi yanlış sorunun cevabına yerleştirir. Yıl sonu bütçe döneminde (kasım–aralık) bu netlik daha da önem kazanır, çünkü karşılaştırmalar kısa sürede yapılır.',
    },
  ],

  illustration: {
    src: '/img/sektor/deep/saas.webp',
    alt: 'SaaS ürününün fiyat tablosu, entegrasyon listesi ve yardım merkezi sayfalarının yapay zekâ asistanının okuduğu alanlar olarak işaretlendiği çizim',
    caption: 'Asistan panelinizi görmez; cevabı fiyat tablosu, entegrasyon listesi ve doküman alanı gibi herkese açık sayfalardan kurar.',
  },

  closing:
    'Ürününüzün gücünü biz takdir etmiyoruz; alıcının kurduğu cümlelerde sitenizin ne söylediğini ölçüyor, eksikleri sırasıyla önünüze koyuyoruz.',
};
