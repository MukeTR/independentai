import type { SectorDeep } from './types';

/** Gayrimenkul — derin anlatı. */
export const DEEP: SectorDeep = {
  slug: 'gayrimenkul',

  lede:
    'Konut alan insan artık ofise gelmeden önce kararının yarısını vermiş oluyor; mahalle, bütçe ve “şimdi mi bekleyeyim mi” sorusunu portalda filtre çevirerek değil, asistana yazarak konuşuyor. ' +
    'Portal ilanı hâlâ işini görüyor ama alıcı oraya, elinde iki üç mahalle ve birkaç firma adıyla geliyor. ' +
    'Bu sayfa, o kısa listenin nasıl kurulduğunu ve sizin sitenizin bu listede okunup okunmadığını nasıl ölçtüğümüzü anlatıyor.',

  lossMoments: [
    {
      when: 'Mahalle araştırmasının ilk gecesi',
      what:
        'Alıcı henüz kimseyi aramadan “Ataşehir mi Ümraniye mi, okul ve metro tarafı nasıl?” diye soruyor ve karşısına mahalle kıyası çıkıyor. ' +
        'Sitenizde o ilçeyi anlatan, ulaşımı ve dönüşüm durumunu yazan tek bir sayfa yoksa, o sokakları yıllardır gezen ofis olmanız bu konuşmanın hiçbir yerine yazılmıyor.',
    },
    {
      when: 'Yatırım getirisi hesaplanırken',
      what:
        'Soru “bu bütçeyle kira getirisi hangi ilçede daha makul?” biçiminde geliyor; alıcı aidat, ısıtma tipi ve bina yaşı gibi kalemleri de sorduruyor. ' +
        'İlanlarınızda aidat yazmıyor, fiyat “Arayınız” diyorsa cevabı kuran taraf sizin envanterinizi hesaba katamıyor; kıyas, bu bilgileri açıkça yazan ofisler üzerinden yapılıyor.',
    },
    {
      when: 'İki proje yan yana konurken',
      what:
        'Alıcı iki konut projesini teslim tarihi, ödeme planı, kat planı ve iskân durumu üzerinden karşılaştırmak istiyor. ' +
        'Proje sayfanızda bu kalemler PDF broşürün içinde ya da görsele gömülü kaldığında, makine okunur tarafta boş kalıyorsunuz ve karşılaştırma tablosu rakip projenin metniyle doluyor.',
    },
    {
      when: 'Yabancı alıcı süreci sorarken',
      what:
        'Yurt dışından gelen soru çoğu zaman İngilizce ya da Arapça oluyor ve önce süreci öğrenmek istiyor: tapu devri nasıl yürüyor, değerleme raporu şart mı, ödeme nasıl belgeleniyor. ' +
        'Bu adımları kendi dilinde anlatan bir sayfanız yoksa, alıcı o süreci başka bir ofisin sayfasından öğreniyor ve ilk temasını da orada kuruyor.',
    },
  ],

  sections: [
    {
      heading: 'Alıcı ilk soruyu portala değil, sohbete soruyor',
      paragraphs: [
        'Eski yol belliydi: portalda filtre, on beş ilan, üç ofise telefon. Şimdi aynı alıcı numarayı tuşlamadan önce yazıyor: “Bu bütçeyle 3+1 nereden çıkar, hangi mahalle daha mantıklı?” Cevap geldiğinde elinde ilan listesi değil, kısa bir mahalle kıyası ve birkaç firma adı oluyor. Portaldaki ilanınız hâlâ yerinde duruyor ama alıcının zihnindeki eleme, o ilana bakmadan önce yapılmış oluyor.',
        'Karar da tek başına verilmiyor. Türkiye’de internet kullanıcılarının %90,0’ı WhatsApp kullanıyor (TÜİK 2026); beğenilen ilanın linki aynı akşam aile grubuna düşüyor, eş, kardeş ve “işten anlayan” bir tanıdık aynı karta bakıyor. Kart başlıksız ve görselsiz geldiğinde konuşma o linkte durmuyor, grupta paylaşılan diğer ilana kayıyor. Bu, ölçülebilir ve tek seferde düzeltilebilir bir kayıp.',
        'Kısa listenin bir de kalıcılık tarafı var. Alıcı süreç boyunca aynı soruyu haftalarca farklı biçimlerde tekrar soruyor; “şu firma güvenilir mi”, “bu projede teslim gecikmiş mi” gibi. Adınız ilk turda geçmediyse, ikinci ve üçüncü turda da kendiliğinden belirmiyor. Bu yüzden ölçümü tek seferlik bir fotoğraf olarak değil, aynı soru listesiyle tekrarlanan bir kontrol olarak kuruyoruz.',
      ],
    },
    {
      heading: 'Asistan sizi hangi sayfadan okuyor?',
      paragraphs: [
        'Asistanın elinde ofisinizin sicili yok; yalnız erişebildiği sayfalardaki yazı var. Bir ilan sayfasında fiyat görselin üstüne basılmışsa, metrekare yalnız fotoğraf galerisinde geçiyorsa ve oda sayısı sadece başlıkta duruyorsa, sayfa insan için dolu, makine için neredeyse boş sayılıyor. Aynı bilgiyi hem metinde hem yapılandırılmış veride yazmak, ilanı okunabilir kılmanın en doğrudan yolu.',
        'İkinci kaynak, ilan değil bölge metni. “Hangi mahalle” sorusuna cevap kurulurken alıntılanabilecek cümleler aranıyor: ulaşım hattı, okul ve hastane mesafesi, kentsel dönüşüm durumu, site aidat aralığı, hangi tip alıcının o bölgeye yöneldiği. Bunları yazan ofis, ilan stoğu küçük olsa bile bölge sorusunda kaynak olabiliyor. Bölge yazısı burada pazarlama metni değil, sahadaki bilginin yazıya dökülmüş hâli.',
        'Üçüncüsü kimlik. Portal ilanları güçlü kaynaktır; ancak asistan bir firma adı verirken o adın arkasında doğrulanabilir bir künye arıyor: ofis unvanı, açık adres, telefon, taşınmaz ticareti yetki belgesi bilgisi, danışman adları. Künyesi olmayan sayfa, içeriği ne kadar iyi yazılmış olursa olsun, isim verilmesi gereken yerde atlanıyor. Güven sinyalleri bu yüzden içerikten önce geliyor.',
      ],
    },
    {
      heading: 'Emlak sitelerinde tekrar tekrar karşımıza çıkan eksikler',
      paragraphs: [
        'En sık gördüğümüz sorun, satılan ilanın akıbeti. İlan panelden kaldırılıyor, sayfa 404 veriyor, ama link portalda, sosyal medyada ve sitemap dosyasında yaşamaya devam ediyor. Kırık link bulucu bunları toplu çıkarıyor; ardından her ilan için ya “satıldı” durumunu koruyan bir arşiv sayfası ya da doğru bölge sayfasına kalıcı yönlendirme kuruyoruz. Böylece birikmiş bağlantılar boşa düşmüyor.',
        'İkinci sırada fiyat ve ölçü bilgisi geliyor. “Fiyat için arayınız” yazan ilan, telefonu artırmak için konuyor ama makine tarafında ilanı kıyas dışında bırakıyor. Aynı şekilde brüt ve net metrekare ayrımının yazılmaması, aidatın hiç geçmemesi, “3+1” ifadesinin açık karşılığının verilmemesi ilanı belirsizleştiriyor. Bant hâlinde fiyat bile hiç fiyat vermemekten okunabilir bir cevap üretiyor.',
        'Üçüncüsü şablon körlüğü. Yüzlerce ilan tek bir şablondan üretildiği için, şablondaki bir eksik yüzlerce sayfaya aynen kopyalanıyor: boş açıklama alanı, tekrar eden başlık, konumun yalnız gömülü haritada kalması, paylaşım kartının site logosunu göstermesi. İyi haber şu ki bu körlük tersine de çalışıyor; şablonu bir kez düzeltmek envanterin tamamını aynı anda toparlıyor.',
      ],
    },
    {
      heading: 'Ölçüm masadaki işe nasıl dönüşüyor?',
      paragraphs: [
        'Önce soru listesini sahadan kuruyoruz. Danışmanların telefonda gerçekten duyduğu on beş soruyu yazıya döküyoruz — mahalle kıyası, bütçe sorusu, proje karşılaştırması, süreç soruları — ve ChatGPT rank checker, Claude rank checker ile Gemini rank checker üzerinden aynı listeyi soruyoruz. Çıkan cevap metinlerini olduğu gibi kaydediyoruz; kimin adı geçmiş, hangi kaynağa dayanmış, görünüyor.',
        'Sonra eksikleri sıraya koyuyoruz. Sıralama tahminle değil, etki genişliğiyle yapılıyor: ilan şablonundaki bir düzeltme tüm envantere yayıldığı için genelde başa geliyor, künye ve yetki bilgisi hemen arkasından, bölge metinleri üçüncü sırada. Her madde için ne yapılacağı, kimin yapacağı ve hangi sayfada biteceği yazılı duruyor; iş listesi ajans jargonuyla değil, ofisin kendi diliyle çıkıyor.',
        'Dördüncü adım tekrar ölçüm. Aynı on beş soruyu aynı biçimde tekrar soruyoruz ve iki cevabı yan yana koyuyoruz. Vaadimiz belli bir sonuç değil; hangi soruda okunur hâle geldiğinizi, hangisinde hâlâ görünmediğinizi ve nedenini göstermek. Bu döngü ayda bir tekrarlandığında, sezon değiştikçe ve envanter döndükçe nerede geri düştüğünüzü de aynı tabloda görüyorsunuz.',
      ],
    },
  ],

  weExamine: [
    {
      area: 'İlan ve ofis şeması',
      detail:
        'Schema denetimi ile ilan sayfasında RealEstateListing veya Offer artı Residence/Apartment, ofis sayfasında RealEstateAgent var mı bakıyoruz. Fiyat, para birimi, floorSize (m² birim kodu dahil), oda sayısı ve konum alanlarının dolu olmasına; şemadaki değerin sayfadaki metinle çelişmemesine bakıyoruz.',
    },
    {
      area: 'Künye ve yetki bilgisi',
      detail:
        'Güven sinyalleri tarafında ofis unvanı, açık adres, sabit telefon, taşınmaz ticareti yetki belgesi bilgisi ve danışman adları sayfada görünür mü diye bakıyoruz. Yalnız iletişim formu olan, arkasında kimliği yazmayan sitede asistan firma adı vermekten kaçınıyor.',
    },
    {
      area: 'Fiyat, aidat ve ödeme bilgisi',
      detail:
        'Fiyatın yazılı olup olmadığına, “Arayınız” ile gizlenip gizlenmediğine, aidat ve site giderlerinin geçip geçmediğine, projede ödeme planı ile teslim tarihinin metinde bulunup bulunmadığına bakıyoruz. Kıyas soruları bu üç kalem olmadan sizin envanterinize uğramıyor.',
    },
    {
      area: 'Konum yazımı',
      detail:
        'İlçe ve mahalle adının başlıkta, açıklamada ve şemada geçip geçmediğine; konumun yalnız gömülü haritaya bırakılıp bırakılmadığına bakıyoruz. Ulaşım hattı, okul ve hastane mesafesi gibi çevre bilgisinin metinde olması, bölge sorularında sayfayı alıntılanabilir kılıyor.',
    },
    {
      area: 'Yabancı alıcı için dil',
      detail:
        'hreflang kontrolü ile İngilizce, Arapça veya Rusça sayfaların karşılıklı bağlanıp bağlanmadığına, x-default’un olup olmadığına bakıyoruz. Ayrıca kat irtifakı, iskân ve tapu devri gibi terimlerin o dilde açıklanıp açıklanmadığına; çeviri sayfanın içerikte de tam karşılık verip vermediğine bakıyoruz.',
    },
    {
      area: 'İlanın yaşam döngüsü',
      detail:
        'Kırık link bulucu ile satılan veya kaldırılan ilanların 404 mü verdiğini, robots.txt ve sitemap kontrolü ile sitemap dosyasının ölü ilanlarla şişip şişmediğini görüyoruz. WhatsApp önizleme ise ilan linkinin grupta hangi kartla göründüğünü tek tek gösteriyor.',
    },
  ],

  roadmap: [
    {
      week: '1. hafta',
      title: 'Envanterin ve soruların fotoğrafı',
      detail:
        'Aktif, satılmış ve kaldırılmış ilan sayısını çıkarıyoruz; kırık linkleri ve sitemap’teki ölü kayıtları listeliyoruz. Aynı hafta danışmanların telefonda duyduğu on beş soruyu yazıya döküp rank checker araçlarıyla soruyor, cevap metinlerini kaynaklarıyla kaydediyoruz.',
    },
    {
      week: '2. hafta',
      title: 'Ofis kimliği ve güven sinyalleri',
      detail:
        'Ofis sayfasını künyeli hâle getiriyoruz: unvan, açık adres, sabit telefon, yetki belgesi bilgisi, hizmet verilen ilçeler, danışman kadrosu. RealEstateAgent şemasını bu bilgilerle kuruyor, hakkımızda sayfasındaki bilgiyle çelişen eski verileri temizliyoruz.',
    },
    {
      week: '3. hafta',
      title: 'İlan şablonunun düzeltilmesi',
      detail:
        'Tek şablonu düzeltip envantere yayıyoruz: fiyat ve aidatın yazılı geçmesi, brüt/net metrekare ayrımı, “3+1” ifadesinin açık karşılığı, ilçe ve mahalle adının metinde bulunması, ilana özel paylaşım kartı görseli. Ardından satılan ilanlar için arşiv ya da kalıcı yönlendirme kuralını kuruyoruz.',
    },
    {
      week: '4. hafta',
      title: 'Bölge metni ve yeniden ölçüm',
      detail:
        'Çalıştığınız iki üç ilçe için sahadan yazılmış bölge sayfaları hazırlıyoruz; ulaşım, dönüşüm durumu, aidat aralığı, hangi alıcı tipinin geldiği. Sonra birinci haftadaki aynı on beş soruyu tekrar sorup iki tabloyu yan yana koyuyoruz.',
    },
  ],

  notes: [
    {
      title: 'Yetki belgesi ve ilan sorumluluğu',
      body:
        'Taşınmaz ticareti mevzuatı, ilanda bulunmayan özelliğin yazılmasını ve yetkisiz ilan verilmesini kabul etmiyor. Sitedeki metinleri makine için zenginleştirirken sahada olmayan bir özelliği eklememek gerekiyor; şemaya yazılan fiyat, metrekare ve durum bilgisi sayfadaki ilanla birebir aynı kalmalı. Denetimde ilk baktığımız tutarlılık bu.',
    },
    {
      title: 'Değişen eşikler ve tarih damgası',
      body:
        'Yabancıya satış, vatandaşlık başvurusu eşikleri ve kredi koşulları dönem dönem değişiyor; bu konudaki sayfaların hangi tarihte güncellendiğini yazmak ve rakamı resmî kaynağa bağlamak şart. Tarihi olmayan bir süreç yazısı, eşik değiştiği gün yanlış bilgi kaynağına dönüşüyor ve o sayfadan alıntı alan cevap da yanlış çıkıyor.',
    },
    {
      title: 'Sezon ve terminoloji',
      body:
        'Yaz aylarında sahil ve kiralama soruları, yılbaşında emlak vergisi ve değerleme soruları artıyor; ilan stoğu da bu ritimle dönüyor. Ayrıca “3+1”, brüt/net metrekare, kat irtifakı ile kat mülkiyeti farkı, iskân, DASK gibi terimlerin açık karşılığını sayfada bir kez yazmak, makinenin ilanı doğru eşlemesini kolaylaştırıyor.',
    },
  ],

  illustration: {
    src: '/img/sektor/deep/gayrimenkul.webp',
    alt: 'Emlak ofisi masasında kat planı, tapu klasörü ve telefonda paylaşılan ilan kartı önizlemesi; arkada konut projesi silueti',
    caption: 'İlan sayfasındaki bilgi, paylaşım kartı ve ofis künyesi aynı hikâyeyi anlattığında ilan okunur hâle geliyor.',
  },

  closing:
    'Bölgeyi sahada bilen ofisin, o bilgiyi yazıya ve makine okunur alanlara geçirmesi gerekiyor; biz de bunun neresinin eksik olduğunu ölçüp sıraya koyuyor ve bir ay sonra aynı soruları tekrar soruyoruz.',
};
