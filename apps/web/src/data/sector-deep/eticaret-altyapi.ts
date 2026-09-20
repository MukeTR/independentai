import type { SectorDeep } from './types';

/** E-ticaret altyapısı — derin anlatı. */
export const DEEP: SectorDeep = {
  slug: 'eticaret-altyapi',

  lede:
    'Altyapı seçimi uzun yıllar sekme işiydi: dört beş sağlayıcının fiyat sayfası yan yana açılır, paket satırları bir deftere not edilir, sonra demo formu doldurulurdu. Bugün bu turun ilk yarısı sohbet penceresinde bitiyor — “üç yüz ürünlü bir butik için, Trendyol entegrasyonu ve e-fatura lazım, aylık sabit ücret istiyorum” cümlesinin karşılığı doğrudan kısa bir aday listesi oluyor. Mağaza tarafında da aynı kayma var: alıcı ürünü aramadan önce “bu modeli Türkiye’den satan, iadeyi kolay yapan bir site var mı” diye soruyor.',

  lossMoments: [
    {
      when: 'Paket karşılaştırma anı',
      what:
        'Kullanıcı “komisyon alıyor mu, kurulum ücreti var mı, ürün limiti kaç” diye tek seferde soruyor ve cevabı hazır bekliyor. Fiyat tablonuz bir görsel olarak yerleştirildiyse ya da ek ücretler yalnızca sözleşme ekinde yazıyorsa, karşılaştırmayı kuran taraf sizi satır olarak yazamaz; listede yeriniz boş kalır.',
    },
    {
      when: 'Entegrasyon sorgusu',
      what:
        'Pazaryeri, e-fatura, kargo ve sanal POS listesi çoğu sitede logo ızgarası biçiminde duruyor; alt metni olmayan logo makine tarafında hiçbir şey söylemez. “Trendyol, e-arşiv ve iyzico üçünü birden destekleyen hangisi” sorusunda destek verdiğiniz halde kapsam dışında kalırsınız.',
    },
    {
      when: 'Geçiş ve veri taşıma sorusu',
      what:
        'Mevcut mağazasını taşımak isteyen “eski ürün adreslerim ne olacak, taşımayı siz mi yapıyorsunuz” diye soruyor; bu soru satın almanın hemen öncesinde gelir. Taşıma akışını, yönlendirme eşlemesini ve kimin ne yaptığını anlatan bir sayfa yoksa, cevap belirsiz kalır ve belirsizlik aday listesinden düşürür.',
    },
    {
      when: 'İndirim haftası ve stok dalgalanması',
      what:
        'Kasım indirim haftasında kampanya sayfaları aceleyle açılıp sonra siliniyor, tükenen ürünler kategoriye yönlendiriliyor. Ürün kaydındaki fiyat ve stok alanı gerçekle ayrışınca, alıcıya sunulan cevap eski fiyatı ya da satışta olmayan bir varyantı gösterir; itiraz size döner, düzeltme sizde olmaz.',
    },
  ],

  sections: [
    {
      heading: 'Karşılaştırma tablosunu artık müşteri değil, asistan kuruyor',
      paragraphs: [
        'Bir altyapı sağlayıcısının sayfası uzun süre “ikna eden” metin olarak yazıldı: büyük başlık, kayan referans logoları, iki cümlelik vaat. Bu düzen insan gözü için kurulmuştu. Bugün aynı sayfayı ilk okuyan taraf çoğu zaman bir asistan ve onun aradığı şey vaat değil; paket adı, aylık ücret, kurulum bedeli, işlem payı, ürün limiti, kullanıcı sayısı gibi kıyaslanabilir satırlar.',
        'Fark şurada ortaya çıkıyor: karşılaştırmayı sizin sayfanızdaki tablo değil, sohbet penceresindeki özet kuruyor. O özete girmek için bilginin düz metin olarak, aynı sayfada ve tek anlamlı biçimde durması gerekiyor. Ücretin görsele gömülmesi, “fiyat için iletişime geçin” cümlesi ya da yalnızca oturum açınca görünen paket tablosu, insanı biraz yavaşlatır; makineyi tamamen durdurur.',
        'Mağaza tarafında aynı davranış ürün seviyesine iniyor. Alıcı önce marka değil çözüm soruyor; “şu bedende, kapıda ödemeli, iki gün içinde gelen” gibi. Bu cümlenin karşılığı ürün kaydınızdaki fiyat, stok ve teslimat alanlarıdır. Katalog güzel görünüp kaydı eksik kaldığında mağaza vitrinde var, cevapta yok olur.',
      ],
    },
    {
      heading: 'Yapay zekâ sizi nereden okuyor? Ürün kaydı, fiyat satırı, entegrasyon envanteri',
      paragraphs: [
        'Ürün sayfasında belirleyici olan üç şey var: Product şemasının gerçekten dolu olması, Offer altında fiyat, para birimi ve stok durumunun sayfadaki metinle çelişmemesi, varyantların kendi adreslerinde açılması. Beden ve renk seçimi yalnızca istemci tarafında değişiyorsa, dışarıdan bakan için tek bir belirsiz ürün vardır; hangi varyantın satışta olduğu okunmaz.',
        'Sağlayıcı tarafında okunan yer fiyatlandırma ve entegrasyon sayfalarıdır. Her entegrasyonun tek satırlık logo yerine kendi açıklaması olması işi değiştirir: hangi pazaryeri, hangi yönde veri akışı, sipariş mi stok mu fiyat mı, hangi pakette dahil, kurulumu kim yapıyor. Aynı mantık e-fatura, kargo ve ödeme kuruluşları için de geçerlidir; envanter metin olduğunda kapsama girer.',
        'Üçüncü katman erişimdir. Tema kaynaklı bir engelleme satırı, bayat kalmış bir ürün sitemap’i veya yalnızca tarayıcıda çalışan bir fiyat bileşeni, iyi yazılmış içeriği bile görünmez kılar. Bunlar tek tek küçük ayarlar; birlikte ele alındığında kataloğun tamamının okunup okunmadığını belirler.',
      ],
    },
    {
      heading: 'Altyapı ve mağaza sitelerinde sık gördüğümüz eksikler',
      paragraphs: [
        'En sık karşılaştığımız tablo, fiyat sayfasının tasarım dosyasından çıkmış bir görsel olması. İkincisi, ek ücretlerin sayfada hiç geçmemesi: kurulum, ek kullanıcı, ek depo, tema, işlem payı, yıllık ödemedeki fark. Kullanıcı bunları zaten soruyor; sayfada yoksa cevap ya eksik kurulur ya da başka bir kaynaktan, çoğu zaman bir forum yorumundan derlenir.',
        'Katalog tarafında filtre ve sıralama bağlantılarının kendi başına çoğalması yaygın. Aynı ürün listesi onlarca adreste tekrar edince hangi adresin asıl olduğu belirsizleşir. Tükenen ürünün kategoriye yönlendirilmesi de sessiz bir kayıptır: ürün kayboldu sinyali verir, oysa doğru davranış ürünü stok durumu belirtilmiş biçimde ayakta tutmak veya kalıcı bir halefe bağlamaktır.',
        'Üçüncü küme zorunlu sayfalar. Künye, mesafeli satış sözleşmesi, iade ve teslimat koşulları çoğu temada altbilgide bir bağlantı olarak duruyor ama içerik ince kalıyor: unvan, adres, iletişim kanalı, kargo süresi, iade adımları net yazılmamış. Bu sayfalar hem mevzuat gereğidir hem de bir sitenin gerçek bir işletmeye ait olduğunu makineye anlatan en somut yerdir.',
      ],
    },
    {
      heading: 'Ölçüm nasıl iş sırasına dönüşüyor?',
      paragraphs: [
        'Yaptığımız iş şu üç adımdan ibarettir: ölçeriz, neyin eksik olduğunu gösteririz, düzeltme sırası veririz — sonra aynı yerden tekrar ölçeriz. Sonuç vaadi vermiyoruz; verdiğimiz şey, katalogunuzun ve fiyat sayfanızın dışarıdan nasıl okunduğunun kayda geçmiş hâli ve hangi işin hangi sırayla yapılmasının daha az emekle daha çok sayfayı etkileyeceği.',
        'Sıra, e-ticarette neredeyse her zaman şablon düzeyinden başlar. Ürün şablonundaki tek bir düzeltme binlerce sayfada birden karşılık bulur; tek bir kampanya sayfasını elle iyileştirmek ise yalnızca o sayfayı ilgilendirir. Bu yüzden önce tema ve şablon kaynaklı eksikleri, sonra kategori mimarisini, en sonda tekil sayfaları listeye alırız.',
        'Tekrar ölçüm kısmı çoğu yerde atlanıyor. Aynı soruları aynı biçimde tekrar sormak, değişimin gerçekten olup olmadığını gösteren tek yoldur; “değişmedi” de geçerli bir sonuçtur ve sıradaki işi belirler. Ölçümü yaptığınız günün ve sorunun kayıtlı kalması, üç ay sonra tartışmayı fikirden çıkarıp kayda taşır.',
      ],
    },
  ],

  weExamine: [
    {
      area: 'Ürün kaydı ve varyantlar',
      detail:
        'Product ve Offer alanları dolu mu; fiyat, para birimi ve stok durumu sayfadaki metinle aynı şeyi mi söylüyor; beden ve renk varyantları kendi adreslerinde açılıyor mu.',
    },
    {
      area: 'Fiyat ve paket sayfası',
      detail:
        'Paket satırları metin olarak okunuyor mu; kurulum, ek kullanıcı, ek depo, tema ve işlem payı gibi kalemler sayfada geçiyor mu; yıllık ve aylık ödeme farkı yazılı mı.',
    },
    {
      area: 'Entegrasyon envanteri',
      detail:
        'Pazaryeri, e-fatura, kargo ve ödeme kuruluşu listesi yalnız logo mu; her entegrasyonun yönü, kapsamı ve hangi pakette geldiği yazıyla anlatılmış mı.',
    },
    {
      area: 'Katalog mimarisi ve adres düzeni',
      detail:
        'Filtre ve sıralama bağlantıları asıl adrese bağlanmış mı; sayfalama izlenebilir mi; kategori ve ürün kırılımı gezinti verisiyle birlikte veriliyor mu.',
    },
    {
      area: 'Künye ve mesafeli satış sayfaları',
      detail:
        'Unvan, adres ve iletişim kanalı okunabilir yerde mi; iade, teslimat ve cayma bilgisi metin olarak duruyor mu; e-ticaret kayıt bilgileri siteden doğrulanabiliyor mu.',
    },
    {
      area: 'Erişim, tazelik ve dil',
      detail:
        'Yapay zekâ tarayıcılarına açık mısınız; ürün sitemap’i güncel mi; içerik yalnız tarayıcıda mı oluşuyor; yurt dışına satış varsa dil ve para birimi ayrımı düzgün kurulmuş mu.',
    },
  ],

  roadmap: [
    {
      week: '1. hafta',
      title: 'Kataloğun dışarıdan görünümünü kayda alma',
      detail:
        'E-ticaret AI görünürlük testi ve robots.txt ve sitemap kontrolü ile başlangıç fotoğrafını çekeriz. Platform tespiti yapılır, şablon kaynaklı engeller ayrı bir listeye alınır; kataloğu temsil eden on ürünlük temsili bir örneklem seçilir.',
    },
    {
      week: '2. hafta',
      title: 'Ürün şablonunu düzeltme',
      detail:
        'Ürün sayfası testi ile örneklem incelenir: eksik Offer alanları, stok durumu ile metin çelişkisi, görsel alt metni, sayfa içi soru-cevap bloğu. Düzeltmeler tek tek ürüne değil şablona yazılır; ürün açıklama yazıcı yalnız tedarikçiden kopyalanmış açıklamalarda kullanılır.',
    },
    {
      week: '3. hafta',
      title: 'Fiyat, paket ve entegrasyon sayfaları',
      detail:
        'Paket tablosu metne çevrilir, ek ücret kalemleri açık yazılır, her entegrasyon kendi açıklamasına kavuşur. Satın alma sorusu kapsama ile “komisyon var mı, taşıma nasıl oluyor, hangi pazaryeri dahil” türü soruların sayfalarda karşılığı olup olmadığına bakılır.',
    },
    {
      week: '4. hafta',
      title: 'Adres düzeni ve ikinci ölçüm',
      detail:
        'Yönlendirme zinciri ve kırık link bulucu ile taşınmış ürünler, kapanmış kampanya sayfaları ve çoğalmış filtre adresleri toplanır. Ardından birinci haftanın soruları aynı biçimde tekrar sorulur; değişen ve değişmeyen kalemler yan yana yazılır.',
    },
  ],

  notes: [
    {
      title: 'Mevzuat sayfaları aynı zamanda kimlik sayfanızdır',
      body:
        'Mesafeli satış sözleşmesi, ön bilgilendirme, iade ve teslimat koşulları ile künye bilgisi mevzuat gereği zaten sitede bulunur. Bu sayfaları altbilgideki bir bağlantı olmaktan çıkarıp gerçekten okunabilir hâle getirmek, hem yükümlülüğü karşılar hem de işletmenin var olduğunu dışarıya kanıtlayan en somut metni üretir. Elektronik ticaret kayıt bilgilerinizin siteden doğrulanabilmesi de aynı işi görür.',
    },
    {
      title: 'Sezon sayfalarını silmeyin, dinlendirin',
      body:
        'Kasım indirim haftası, yılbaşı, Ramazan ve okula dönüş dönemlerinde açılan kampanya sayfaları genelde sezon bitince kaldırılıyor. Sayfayı silmek yerine aynı adreste tutup içeriği güncellemek, bir sonraki sezonda sıfırdan başlamayı önler; kaldırmak gerekiyorsa yönlendirmenin kategoriye değil gerçekten karşılığı olan sayfaya gitmesi gerekir.',
    },
    {
      title: 'Hangi kimlikle yazdığınız net olsun',
      body:
        '“Altyapı” kelimesi bu sektörde iki ayrı tarafı anlatıyor: yazılımı satan sağlayıcı ve o yazılımda mağaza işleten satıcı. Aynı sitede iki dil karışınca, dışarıdan bakan sizi hangisi sayacağını bilemez. “Komisyonsuz”, “sınırsız ürün”, “kurulumlu” gibi sektör terimlerinin de sayfada bir kez tanımlanması, sonradan çıkan yanlış anlamayı baştan keser.',
    },
  ],

  illustration: {
    src: '/img/sektor/deep/eticaret-altyapi.webp',
    alt: 'Bir ürün kartının fiyat, stok ve varyant alanlarının paket karşılaştırma satırlarıyla birlikte makine tarafından okunuşunu gösteren editöryel çizim',
    caption: 'Katalogda görünen ile ürün kaydında yazan ayrıştığında, cevabı kuran taraf kayda bakar.',
  },

  closing:
    'Kataloğunuzu ve paket sayfanızı bir kere dışarıdan okuyalım; eksikleri sıraya koyup dört hafta sonra aynı soruları tekrar soralım.',
};
