import type { SectorDeep } from './types';

/** B2B üretici — derin anlatı. */
export const DEEP: SectorDeep = {
  slug: 'b2b-uretici',

  lede:
    'Satın almacı uzun yıllar fuar kataloğu, sektör rehberi ve tanıdık tavsiyesiyle çalıştı; kısa listeyi masasındaki dosyadan kurardı. Bugün o listenin ilk hâli çoğu zaman bir sohbet penceresinde, üç cümlelik bir iş tarifiyle çıkıyor: işlenen malzeme, aylık hacim, hedef pazar, belge durumu. Sizi o cevaba taşıyan şey tesis fotoğrafınız değil; sitenizde düz metin olarak duran kapasite, ürün ailesi ve belge bilgisi oluyor.',

  lossMoments: [
    {
      when: 'Teklif talebi gelmeden önceki eleme',
      what:
        'Satın almacı formu doldurmadan önce beş altı üreticiyi kafasında eliyor ve bu eleme artık sitenizde geçirilen iki dakikada değil, asistana sorulan tek cümlede oluyor. Ürün aileniz, işlediğiniz malzeme ve kapasiteniz sayfada yazmıyorsa teklif talebi hiç gelmez; kaybettiğiniz şey bir görüşme değil, formun kendisidir ve istatistiğe düşmediği için fark edilmez.',
    },
    {
      when: 'Teknik şartnameyle eşleştirme',
      what:
        'Alıcının elinde malzeme kalitesi, tolerans, yüzey işlem ve test isteklerini içeren bir şartname vardır; sorusunu da o dille sorar. Siteniz “kaliteli üretim” diyor, şartname “304 paslanmaz, ±0,1 mm tolerans, eloksallı” diyorsa (örnek temsili) eşleşme kurulamaz; o işi fiilen yapabildiğiniz hâlde kapsam dışında sayılırsınız.',
    },
    {
      when: 'MOQ, numune ve kalıp bedeli sorusu',
      what:
        'Küçük hacimli alıcı ilk turda hep aynı üçlüyü sorar: en az kaç adetten üretiyorsunuz, numune veriyor musunuz, kalıp ve aparat bedeli kime ait. Bu üç satır sitenizde hiç geçmiyorsa cevabı kuran taraf ya sessiz kalır ya da başka bir kaynaktan tahmin eder; ilk temas sizin verdiğiniz bilgiyle değil, sizi tanımayan bir listeyle kurulur.',
    },
    {
      when: 'Sertifika ve tedarikçi denetimi sorusu',
      what:
        'Yurt dışı alıcı ve zincir tedarikçi, görüşmeden önce belge durumunu sorar: kalite yönetim belgesinin kapsamı, CE teknik dosyası, malzeme sertifikası, sosyal uygunluk denetiminin tarihi. Belgeler yalnızca taranmış görsel olarak duvarda ve sayfada asılıysa okunacak metin yok demektir; belgeniz vardır ama dışarıdan bakan için yoktur.',
    },
  ],

  sections: [
    {
      heading: 'Kısa liste artık teklif talebinden önce kuruluyor',
      paragraphs: [
        'Bir üreticinin sitesi uzun yıllar fuarda verilen kartın dijital karşılığı olarak kuruldu: tesis fotoğrafı, birkaç ürün görseli, bir iletişim formu. Alıcı sizi zaten bir yerden tanıyordu, site yalnızca teyit görevi görüyordu. Şimdi sıra tersine döndü. Sizi tanımayan alıcı önce soruyor, kısa listeyi o cevaptan kuruyor, teklif talebini de o listeye gönderiyor. Sitenin işi teyit etmek değil, listeye girebilmek.',
        'Değişimin en somut yanı sorunun biçiminde. Alıcı marka adı yazmıyor, iş tarifi yazıyor: işlenen malzeme, üretim yöntemi, aylık hacim, hedef pazar ve belge durumu. Cevabı kuran taraf bu beş başlığı sitenizde arıyor; hangisinde boşluk varsa eleme orada oluyor. Üstelik bu eleme sessiz ilerliyor — form dolmadığı için ziyaretçi raporunuza bile düşmüyor, kaybı ancak boş geçen bir çeyrekte fark ediyorsunuz.',
        'İhracat tarafında ikinci bir katman var: soru çoğu zaman İngilizce geliyor. Üretici sitelerinde İngilizce sürüm genelde Türkçesinin kısaltılmış bir kopyasıdır; ürün aileleri eksiktir, belge tablosu hiç çevrilmemiştir, kapasite satırları düşmüştür. Yabancı alıcının sorusunda karşılığınızın olması için iki sürümün aynı bilgiyi taşıması ve birbirine bağlı olduğunun dışarıdan anlaşılması gerekiyor.',
      ],
    },
    {
      heading: 'Sizi vitrin değil, kapasite ve belge satırlarınız anlatıyor',
      paragraphs: [
        'Dışarıdan bakan taraf önce kim olduğunuzu çözmeye çalışıyor: unvan, tesisin bulunduğu il ve organize sanayi bölgesi, kuruluş yılı, kapalı alan, hat sayısı, vardiya düzeni, çalışan sayısı. Bu satırlar kapasite raporunuzda zaten yazılıdır; çoğu sitede ise “modern tesisimizde üretim yapıyoruz” cümlesine dönüşmüştür. Rapordaki bilgiyi sayfaya düz metin olarak taşımak, kimlik sorusunu tek hamlede kapatır.',
        'İkinci okunan yer ürün ailesi sayfalarıdır. Bir ailenin kendi adresi varsa ve o sayfada ölçü aralığı, çalışılan malzeme ve kalitesi, tolerans, yüzey işlem seçenekleri, uygulanan standart, ambalaj ile paletleme biçimi yazılıysa şartnameyle eşleşme kurulabilir. Aynı bilgi bir PDF’in içindeki tabloda ya da teknik çizim görselinin içinde duruyorsa, insan indirip açar; dışarıdan okuyan taraf o tabloyu hiç görmez.',
        'Üçüncü katman ticaret koşullarıdır: en az sipariş adedi, numune politikası, kalıp ve aparat bedelinin kime ait olduğu, teslim süresi, teslim şekli ve ödeme biçimi. Fiyat yazmak zorunda değilsiniz, ama bu başlıkların hiçbirinin geçmediği bir sitede ilk soru-cevap turu hiç başlamaz. Belge tarafında da kural aynı: belge adı, kapsamı, veren kurum ve geçerlilik tarihi metin olarak durmalı.',
      ],
    },
    {
      heading: 'Fabrika sitelerinde tekrar eden eksikler',
      paragraphs: [
        'Sık gördüğümüz tablo, ana sayfanın tek bir somut bilgi taşımaması. “Yılların deneyimiyle kaliteli üretim” cümlesi hemen her üretici sitesinde aynı biçimde duruyor ve hiçbir alıcı sorusuna karşılık vermiyor. Kapasite, tezgâh parkı, işlenen malzeme ve üretim yöntemi yazılmadığında site sizi rakibinizden ayıran hiçbir şey taşımaz; oysa ayıran bilgi, teklif talebini getiren bilgiyle aynı bilgidir.',
        'İkinci eksik kataloğun indirme formunun arkasına kilitlenmesi: form doldurulmadan açılmayan bir PDF, dışarıdan bakan için hiç yok demektir. Üçüncüsü ürün ailelerinin ayrı sayfasının olmaması. Bütün ürünler tek bir “Ürünlerimiz” sayfasında galeri olarak dizilince ne aile adı ne teknik özellik okunabilir kalır; on beş ürün ailesi tek bir belirsiz başlığa sıkışır.',
        'Kalan eksikler kurumsal güven tarafında toplanıyor. İletişim sayfasında yalnız form var; açık adres, sabit telefon ve kurumsal e-posta yok. Belgeler taranmış görsel olarak duruyor, metin karşılıkları yazılmamış. Duyuru bölümü yıllar önce durmuş; katıldığınız fuarlar, devreye aldığınız yeni hatlar, yenilenen belgeler hiç yazılmamış. Her biri tek başına küçük, birlikte “bu tesis hâlâ çalışıyor mu” sorusunu doğuruyor.',
      ],
    },
    {
      heading: 'Ölçüm nasıl teklif masasına bağlanıyor?',
      paragraphs: [
        'Yaptığımız iş dört adımdan ibaret: ölçeriz, neyin eksik olduğunu gösteririz, düzeltme sırası veririz, sonra aynı soruları aynı biçimde tekrar sorup yeniden ölçeriz. Sonuç sözü vermiyoruz. Verdiğimiz şey, fabrikanızın dışarıdan nasıl okunduğunun kayda geçmiş hâli ve hangi işin hangi sırayla yapılmasının daha az emekle daha çok sayfayı etkileyeceği.',
        'Sıra üretici sitelerinde neredeyse her zaman kurumsal künye ve ürün ailesi şablonundan başlıyor. Künyeyi bir kez düzgün yazmak sitenin tamamını etkiliyor; ürün ailesi şablonuna eklenen tek bir teknik özellik tablosu bütün aileler için birden karşılık veriyor. Tek bir ürün sayfasını elle iyileştirmek ise yalnız o sayfayı ilgilendiriyor, bu yüzden listenin sonunda duruyor.',
        'Tekrar ölçüm kısmı atlanmasın. Teklif talebi formuna “bizi nasıl buldunuz” alanını eklemek ve gelen taleplerin hangi dilde, hangi ürün ailesi için geldiğini not etmek, ölçümü iş tarafına bağlayan en ucuz adım. Dört hafta sonra cevaplar değişmediyse bu da bir sonuçtur: sıradaki işi belirler ve tartışmayı fikir olmaktan çıkarıp kayda taşır.',
      ],
    },
  ],

  weExamine: [
    {
      area: 'Tesis künyesi ve tüzel kimlik',
      detail:
        'Unvan, ticaret sicil ve vergi bilgisi, tesis adresi, kuruluş yılı, kapalı alan ve çalışan sayısı sayfada metin olarak var mı; kurum kaydında (Organization) aynı bilgiler sayfadakiyle aynı şeyi mi söylüyor.',
    },
    {
      area: 'Kapasite ve üretim yöntemi',
      detail:
        'Hat sayısı, vardiya düzeni, aylık veya yıllık üretim adedi, tezgâh parkı ve işlenen malzemeler yazılı mı; kapasite raporundaki bilgi siteye aktarılmış mı, yoksa yalnız “yüksek kapasite” ifadesiyle mi geçiştirilmiş.',
    },
    {
      area: 'Ürün ailesi sayfası yapısı',
      detail:
        'Her ürün ailesinin kendi adresi var mı; ölçü aralığı, malzeme kalitesi, tolerans, yüzey işlem, uygulanan standart, ambalaj ve paletleme bilgisi tablo hâlinde metin mi, yoksa PDF ve görsel içinde mi kalmış.',
    },
    {
      area: 'Belge, denetim ve izlenebilirlik',
      detail:
        'Belge adı, kapsamı, veren kurum, numara ve geçerlilik tarihi metin olarak yazılmış mı; CE kapsamındaki ürün grubu ayrıca belirtilmiş mi; malzeme sertifikası ve tedarikçi denetimi bilgisi sayfadan okunabiliyor mu.',
    },
    {
      area: 'Ticaret koşulları',
      detail:
        'En az sipariş adedi, numune ve kalıp bedeli politikası, teslim süresi, teslim şekli, ambalaj ve ödeme biçimi sayfada geçiyor mu; fiyat verilmiyorsa alıcının teklif öncesi ihtiyaç duyduğu bilgi yerine ne konmuş.',
    },
    {
      area: 'Dil, ihracat pazarları ve erişim',
      detail:
        'İngilizce sürüm ürün ailelerini ve belge tablosunu kapsıyor mu, iki sürüm birbirine bağlı mı; ihracat yaptığınız ülkeler yazılı mı; yapay zekâ tarayıcıları sayfalara erişebiliyor mu, kurumsal alıcının bilgi işlem tarafının baktığı başlıklar yerinde mi.',
    },
  ],

  roadmap: [
    {
      week: '1. hafta',
      title: 'Fabrikanın dışarıdan görünümünü kayda alma',
      detail:
        'AI crawler testi, robots.txt ve sitemap kontrolü ve SEO karnesi ile başlangıç fotoğrafını çekeriz. Aynı hafta ürün ailesi envanteri çıkarılır: kaç aile üretiyorsunuz, kaçının sayfası var, kaçı yalnızca katalog PDF’inde duruyor.',
    },
    {
      week: '2. hafta',
      title: 'Künye, kapasite ve belge bloğu',
      detail:
        'Schema denetimi ve güven sinyalleri ile kurumsal kimliğe bakarız. Tesis künyesi, kapasite satırları ve belge tablosu görselden metne çevrilir; her belgenin kapsamı ve veren kurumu yazılır, iletişim bilgisi açık adres ve sabit telefonla tamamlanır.',
    },
    {
      week: '3. hafta',
      title: 'İngilizce sürüm ve kurumsal alıcı denetimi',
      detail:
        'hreflang kontrolü ile Türkçe ve İngilizce ürün ailelerinin eşleşip eşleşmediğine bakılır; eksik kalan aileler ve çevrilmemiş belge tablosu listeye alınır. Güvenlik başlıkları ile alıcının bilgi işlem tarafına gidecek harf notu çıkarılır.',
    },
    {
      week: '4. hafta',
      title: 'Satın alma sorularıyla ikinci ölçüm',
      detail:
        'Satın alma sorusu kapsama ile MOQ, teslim süresi, sertifika ve ihracat pazarı sorularının sayfalarda karşılığı olup olmadığı ölçülür; rakip kıyası ile aynı ürün ailesinde bir başkasıyla yan yana konur. Ardından birinci haftanın soruları aynı biçimde tekrar sorulur.',
    },
  ],

  notes: [
    {
      title: 'Kapsamı yazılmayan belge, belge sayılmaz',
      body:
        'Kalite yönetim belgesi bir kapsam alanıyla verilir; CE işareti ürün grubu bazlıdır ve arkasında teknik dosya ile uygunluk beyanı durur. Sayfada yalnız belge adını yazmak bu ayrımı anlatmaz: hangi tesis, hangi ürün grubu, hangi standart, hangi tarihe kadar geçerli — dördü birden yazılmalı. Demir-çelik, alüminyum, çimento ve gübre gruplarında Avrupa Birliği alıcıları ayrıca gömülü karbon verisi istiyor; bu talebi de belge sayfasının bir parçası saymak gerekiyor. Makine grubundaysanız Avrupa Birliği’nin yeni makine mevzuatına geçiş tarihini takvimde tutun; belge dili o tarihte güncellenecek.',
    },
    {
      title: 'Sizin sezonunuz fuar ve denetim takvimidir',
      body:
        'Üretici tarafında talebin yükseldiği dönem tatil sezonu değil, sektör fuarı öncesindeki altı haftadır: alıcı görüşme listesini o aralıkta kurar. Fuar sayfanızda salon ve stant bilgisinin, görüşme talebi kanalının ve hangi ürün ailelerini götürdüğünüzün yazılı olması, fuardan sonra da işe yarar; çünkü kartvizit alan alıcı ilk işi sitenizde teyit aramakla olur. Aynı şey tedarikçi denetimi dönemleri için de geçerli: denetim tarihini ve kapsamını yazmak, bir sonraki alıcının aynı soruyu sormasını gereksiz kılar.',
    },
    {
      title: 'Terimleri alıcının kullandığı gibi yazın',
      body:
        'Fason, OEM, ODM ve özel etiket aynı iş değildir; sitede hangisini yaptığınız tek cümleyle ayrılmazsa, size uymayan taleplerle uğraşır, uyan talepleri kaçırırsınız. İkinci nokta terminoloji: aynı parçanın atölye dilindeki adı, şartnamedeki standart adı ve gümrük tarife adı farklıdır; üçü de sayfada geçerse üç ayrı soru biçiminde karşılığınız olur. Üçüncüsü ölçü birimi: adet, metretül, ton ve kilogram karışık kullanıldığında kapasite cümleniz okuyan için anlamsızlaşır, bir birim seçip her sayfada ona sadık kalın.',
    },
  ],

  illustration: {
    src: '/img/sektor/deep/b2b-uretici.webp',
    alt: 'Teknik şartname maddeleriyle bir ürün ailesi sayfasındaki tolerans, malzeme, kapasite ve belge satırlarının yan yana eşleştirilmesini gösteren editöryel çizim',
    caption: 'Teklif talebi, şartnamedeki satırın sitenizde bir karşılığı bulunduğunda geliyor.',
  },

  closing:
    'Fabrikanızı bir kere dışarıdan okuyalım; eksikleri sıraya koyup dört hafta sonra aynı satın alma sorularını tekrar soralım.',
};
