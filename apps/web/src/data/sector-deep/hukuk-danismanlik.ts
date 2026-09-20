import type { SectorDeep } from './types';

/** Hukuk ve danışmanlık — derin anlatı. */
export const DEEP: SectorDeep = {
  slug: 'hukuk-danismanlik',

  lede:
    'Müvekkil adayı eskiden ilk soruyu çevresine sorardı: muhasebecisine, iş arkadaşına, aynı hanı paylaştığı esnafa. Bugün aynı cümle çoğu zaman bir yapay zekâ asistanına yazılıyor ve cevap, o kişi sizinle hiç konuşmadan önce kuruluyor. Tavsiye zinciri ortadan kalkmadı; zincirin başına, sizin haberdar olmadığınız yeni bir halka eklendi.',

  lossMoments: [
    {
      when: 'Ücret sorusu ilk temastan önce soruluyor',
      what:
        '“Şirket kuruluşu ve ilk yıl müşavirlik ne kadar tutar” sorusu artık telefonda değil, ekranda soruluyor. Sitenizde ücretin neye göre belirlendiğine dair tek satır yoksa cevap forum başlıklarından, ilan sitelerinden ve başka büroların yazılarından toplanır; siz o cevabın içinde hiç geçmezsiniz.',
    },
    {
      when: 'İki ofis aynı cümleye yazıldığında',
      what:
        'Aday, aklındaki iki büronun adını yan yana koyup farkını sorar: kim hangi alana bakıyor, hangisi o ilde, ekipte kimler var. Künyesi metin hâlinde okunabilen, çalışma alanı sayfaları dolu olan taraf ayrıntılı anlatılır; diğeri “hakkında yeterli bilgi bulunamadı” cümlesine düşer.',
    },
    {
      when: 'Aralık–ocak geçiş dönemi',
      what:
        'Müşavirlik sözleşmeleri büyük ölçüde yıl başında yenilenir; defter tasdiki haftalarında “müşavir değiştirsem devir nasıl olur, hangi belgeler istenir” soruları yoğunlaşır. Devir sürecini ve hangi mükellef tipine baktığınızı yazılı anlatan bir sayfanız yoksa, yılın en hareketli sorusunda adınız geçmez.',
    },
    {
      when: 'Görüşme öncesi doğrulama anı',
      what:
        'Randevudan önce aday, ofisinizin adını yazıp “burası nerede, hangi alana bakıyor, kayıtlı mı” diye doğrulama yapar. Taşındığınız hâlde eski adresin altbilgide kalması, ayrılmış bir ortağın hâlâ ekip sayfasında durması ya da baro ve oda bilgisinin yalnızca görsel içinde olması, cevabın eksik veya yanlış kurulmasına yol açar.',
    },
  ],

  sections: [
    {
      heading: 'Soru artık tanıdığa değil, ekrana soruluyor',
      paragraphs: [
        'Hukuk ve danışmanlıkta işin geleneği tavsiyeye dayanır: bir müvekkil gelir, yanında iki müvekkil daha getirir. Bu zincir hâlâ çalışıyor, ama zincirin ilk halkası değişti. Aday çoğu zaman tanıdığından duyduğu ismi bile doğrudan aramıyor; önce o ismi asistana yazıp ne tür bir ofis olduğunu okuyor, sonra telefonu eline alıyor.',
        'Bu davranış dar bir kesimin alışkanlığı da değil. Türkiye’de her 5 kişiden 1’i (%19,2) üretken yapay zekâ kullanıyor; 16–24 yaşta her 5 kişiden 2’si (TÜİK 2025). Bu genç kesim, şahıs şirketi kuran, e-ticarete başlayan, ilk kira sözleşmesini imzalayan grupla büyük ölçüde örtüşüyor; yani danışmanlık hizmetini ilk kez satın alacak kişilerle.',
        'Sorunun biçimi de değişti. Kimse arama kutusuna tek kelime yazmıyor; “kiracım altı aydır ödemiyor, tahliye için ne yapmam gerekir, avukat ücreti nasıl hesaplanır” gibi uzun ve durum anlatan cümleler kuruluyor. Asistan bu cümleyi karşılarken hem konuyu anlatan hem de o konuya bakan bir ofisi tarif eden metin arar; ikisini aynı sitede bulduğunda o siteyi kaynak olarak anar.',
      ],
    },
    {
      heading: 'Asistan sizi hangi sayfalardan okuyor?',
      paragraphs: [
        'Makine sizi kurumsal broşürünüzden değil, dört sayfadan okur: hakkımızda, ekip, çalışma alanları ve iletişim. Bu sayfalardaki bilgi metin olarak duruyorsa okunur; antetli bir görsele, taranmış belgeye veya PDF sirkülere gömülüyse okunmaz. Hukuk ve danışmanlık sitelerinde en sık rastladığımız durum, ofisin bütün kimliğinin zamanla bir tasarım öğesine dönüşmüş olmasıdır.',
        'İkinci katman, bu bilgiyi doğrulayan dış izlerdir: baro levhası kaydı, oda veya TÜRMOB sicil bilgisi, ticaret unvanı, MERSİS kaydı, işletme kaydındaki adres ve telefon. Asistan sitenizdeki künyeyle bu kaynakları karşılaştırır. Adres bir yerde eski şube, bir yerde yeni ofis olarak görünüyorsa, cevabı kuran taraf hangisinin doğru olduğunu bilemez; çoğu zaman ikisini de zayıf bir ihtimal olarak geçer.',
        'Üçüncü katman yazdığınız bilgi notlarıdır. “Güncel mevzuata göre” cümlesi makine için bir şey ifade etmez; hangi kanun, hangi düzenleme, hangi değişiklik ve yazının tarihi ifade eder. Tarihi olmayan, yazarı belirsiz, dayandığı hükümden söz etmeyen bir metin, aynı konuyu kaynağıyla birlikte anlatan bir metnin yanında cevaba hiç alınmaz.',
      ],
    },
    {
      heading: 'Bu sektörün sitelerinde en sık gördüğümüz eksikler',
      paragraphs: [
        'En yaygın eksik, çalışma alanlarının tek satırda virgülle sayılması. “İş hukuku, icra, kira, aile, ticaret hukuku” dizisi insana bir fikir verir, makineye hiçbir şey anlatmaz. Her alan için o alanın tipik sorusunu, sürecin nasıl işlediğini ve hangi belgelerle başlandığını anlatan ayrı bir sayfa, adayın kurduğu uzun cümleyle eşleşebilecek tek yapıdır.',
        'İkincisi, metnin PDF içinde yaşaması. Müşavirlik ofislerinde sirküler, mevzuat duyurusu ve beyan takvimi genellikle PDF olarak paylaşılır; hukuk bürolarında bilgi notları ve örnek süreç anlatımları aynı yolu izler. Bu dosyalar sitenin en emek verilmiş metinleridir ve çoğu zaman ne sayfa olarak yayımlanır ne de site haritasına girer.',
        'Üçüncüsü tamamen teknik: bakım eklentisinden kalan noindex etiketi, www ve https varyantlarının ayrı ayrı açılması, robots.txt dosyasında yapay zekâ botlarının kapalı bırakılması, telefonun tıklanabilir olmaması. Bunların hiçbiri mesleki bir eksiklik değil, ama hepsi aynı sonuca çıkar: ofis vardır, cevapta yoktur. Üstelik dördü de bir öğleden sonrada kapanabilecek işlerdir.',
      ],
    },
    {
      heading: 'Ölçüm gündelik işe nasıl dönüşüyor?',
      paragraphs: [
        'Yaptığımız iş vaat değil, ölçüm. Sitenizi tarar, adayın sorduğu soruların karşılığının sitede bulunup bulunmadığını gösterir, eksikleri tek tek listeler ve bir öncelik listesi çıkarırız. Siz ya da siteyi kuran ajans düzeltmeleri yaptıktan sonra aynı taramayı tekrarlar, neyin kapandığını ve neyin açık kaldığını aynı ölçütle karşılaştırırız.',
        'Bu listenin büro içinde kime düşeceği genelde baştan bellidir: künye ve adres düzeltmesi sekretarya işidir, çalışma alanı metinleri avukatın veya müşavirin kendi kalemini ister, şema ve yönlendirme işleri siteyi kuran ajansa gider. Ayrımı baştan yapmak, “site baştan yenilenecek” diye aylarca bekleyen bir işi üç küçük işe böler.',
        'Ritim aylıktır. Mevzuat değişince, ofis taşınınca, ekibe yeni bir avukat veya müşavir katılınca ölçüm tekrarlanır; çünkü asistanın okuduğu bilgi o gün neyse cevap da odur. Meslek kurallarınız açısından da rahat bir çerçevedir bu: ortaya çıkan çıktı bir üstünlük iddiası değil, kendi sitenizdeki bilginin doğru ve okunabilir olduğuna dair bir kontrol listesidir.',
      ],
    },
  ],

  weExamine: [
    {
      area: 'Şema tipi ve dolu alanlar',
      detail:
        'Hukuk bürosunda LegalService veya Attorney, muhasebe ve denetim tarafında AccountingService kullanılıyor mu; ad, adres, telefon, hizmet bölgesi, çalışma alanları ve sameAs bağlantıları dolu mu diye bakarız. Schema denetimi bu alanları tek tek gösterir.',
    },
    {
      area: 'Künye ve mesleki kayıt sinyalleri',
      detail:
        'Baro levhası kaydı, oda veya TÜRMOB sicil bilgisi, ticaret unvanı, vergi dairesi ve MERSİS kaydının sitede metin olarak geçip geçmediğine; altbilgideki adresle iletişim sayfasındaki adresin aynı olup olmadığına bakarız. Güven sinyalleri bu kalemleri tek ekranda toplar.',
    },
    {
      area: 'Çalışma alanı sayfalarının mimarisi',
      detail:
        'Her uzmanlık alanı için ayrı ve gerçekten dolu bir sayfa var mı, yoksa hepsi tek listede mi duruyor; başlıklar adayın kullandığı günlük dille mi yazılmış; her sayfada süreç, gereken belgeler ve tipik süre anlatılıyor mu diye okuruz.',
    },
    {
      area: 'Ücret ve süreç bilgisinin çerçevesi',
      detail:
        'Meslek kurallarınızın izin verdiği ölçüde “ücret neye göre belirlenir, tarife nasıl uygulanır, ilk görüşme nasıl işler” açıklamasının sitede bulunup bulunmadığına bakarız. Rakam yazmak zorunda değilsiniz; asistanın tahmine değil size dayanması için çerçevenin yazılı olması yeter.',
    },
    {
      area: 'Konum, adliye ve hizmet bölgesi',
      detail:
        'Hangi ildesiniz, hangi adliyeler ve hangi vergi dairesi çevresinde çalışıyorsunuz, birden çok ofis varsa her biri ayrı sayfada mı duruyor; harita kaydı, işletme kaydı ve sitedeki adres birbiriyle tutarlı mı diye kontrol ederiz.',
    },
    {
      area: 'Bilgi notlarında tarih, mevzuat atfı ve yazar',
      detail:
        'Yazının yayım ve güncelleme tarihi görünüyor mu, hangi kanuna ve hangi değişikliğe dayandığı yazılı mı, kaleme alan avukat veya müşavirin adı ile unvanı sayfada geçiyor mu; kaynak gösterilmesini bekleyen bir metnin bu üç işareti taşıması gerekir.',
    },
  ],

  roadmap: [
    {
      week: '1. hafta',
      title: 'Kimlik ve künye temizliği',
      detail:
        'Güven sinyalleri ve SEO karnesi ile başlarız: baro ve oda bilgisi, adres, telefon, unvan ve aydınlatma metni doğru mu, metin hâlinde mi duruyor. Aynı hafta AI crawler testi ile yapay zekâ botlarının siteye girip giremediğine bakar, eski adres ve ayrılmış isim kalıntılarını temizleriz.',
    },
    {
      week: '2. hafta',
      title: 'Çalışma alanlarını sayfaya çevirmek',
      detail:
        'Adayın en çok sorduğu konuları alan alan ayırır, her biri için başlığı günlük dille, gövdesi mevzuat diliyle yazılmış birer sayfa iskeleti kurarız. PDF içinde kalmış sirküler, beyan takvimi ve bilgi notlarını sayfa hâline getirip site haritasına dâhil ederiz.',
    },
    {
      week: '3. hafta',
      title: 'Makineye açıkça söyleme katmanı',
      detail:
        'LegalService veya AccountingService şemasını hizmet bölgesi, çalışma alanları ve sameAs bağlantılarıyla kurar, Schema denetimi ile doğrularız. Yabancı müvekkile açık bir sayfanız varsa hreflang kontrolü ile dil eşlemesini, robots.txt ve sitemap kontrolü ile de haritanın tazeliğini test ederiz.',
    },
    {
      week: '4. hafta',
      title: 'Aynı soruları yeniden sormak',
      detail:
        'Satın alma sorusu kapsama ile ayın başında sorduğumuz soruları yeniden sorar, hangisinin karşılığı artık sitede var diye bakarız. Güven sinyallerini tekrar ölçer, kapanan ve açık kalan kalemleri ayrı iki listede bırakıp aylık ritmi kurarız.',
    },
  ],

  notes: [
    {
      title: 'Reklam ve tanıtım sınırı',
      body:
        'Avukatlık ve mali müşavirlikte tanıtım, meslek kuralları ve reklam yasağı düzenlemeleriyle sınırlıdır: üstünlük iddiası, iş vaadi veya sonuç ima eden ifade kullanılamaz. Burada anlatılan her şey bu sınırın içinde durur; ölçtüğümüz şey bilginin doğruluğu ve okunabilirliğidir. Tereddüt ettiğiniz metni bağlı olduğunuz baronun veya odanın kurallarına göre kontrol ettirin.',
    },
    {
      title: 'Sektörün kendi takvimi',
      body:
        'Bu işin takvimi bellidir: aralık ve ocak defter tasdiki ile sözleşme yenileme dönemidir, mart ve nisan beyan yoğunluğudur, temmuzun ikinci yarısında başlayıp ağustos sonunda biten adli tatil hukuk tarafında tempoyu düşürür. Sayfa ve bilgi notu güncellemelerini bu takvimin bir adım önüne almak, sorunun yoğunlaştığı haftada metnin hazır olmasını sağlar.',
    },
    {
      title: 'Halkın dili ile mevzuatın dili',
      body:
        'Aday “mali müşavir” demez, “muhasebeci” der; “ecrimisil” demez, “izinsiz oturanın ödediği bedel” der. Sayfalarınız yalnızca mevzuat diliyle yazılmışsa günlük dille sorulan soruyla eşleşmez. Yabancı müvekkil tarafında da unvanlar karışır: İngilizce sayfada avukat, serbest muhasebeci mali müşavir ve yeminli mali müşavir ayrımını açıkça yazmak gerekir.',
    },
  ],

  illustration: {
    src: '/img/sektor/deep/hukuk-danismanlik.webp',
    alt: 'Hukuk bürosunun künyesinin, çalışma alanlarının ve iletişim bilgilerinin bir yapay zekâ asistanı tarafından satır satır okunmasını gösteren çizim',
    caption: 'Asistan dosyanızı değil künyenizi okur: ad, unvan, çalışma alanı, adres ve tarih.',
  },

  closing:
    'Buradaki hiçbir madde size müvekkil sözü vermez; hepsi tek bir soruya bakar: siz odada yokken hakkınızdaki bilgi doğru anlatılıyor mu?',
};
