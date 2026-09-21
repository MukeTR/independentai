import type { SectorDeep } from './types';

/** Turizm — derin anlatı. */
export const DEEP: SectorDeep = {
  slug: 'turizm',

  lede:
    'Tatil kararı eskiden sekme sekme verilirdi: portal, tesis sitesi, forum, bir de tanıdık tavsiyesi. Bugün misafir tarihi, kişi sayısını, çocuğun yaşını, bütçeyi ve konsepti tek cümlede yazıp hazır bir kısa liste istiyor; üstelik aynı soruyu Almanca, Rusça ya da İngilizce de soruyor. O listeye girmek için tesisin adının biliniyor olması yetmiyor — cümledeki her koşulun sitenizde yazılı bir karşılığı olması gerekiyor.',

  lossMoments: [
    {
      when: 'Erken rezervasyon penceresi açıldığında',
      what: 'Ocak–Mart arası erken rezervasyon koşulunu çoğu tesis tek bir kampanya görseline ve WhatsApp mesajına gömüyor; site tarafında ne indirim kademesi ne de iptal şartı yazıyla geçiyor. “Erken rezervasyonda iptal edebilir miyim, kapora yanar mı?” diye soran misafir cevabı sizden alamayınca acenta sayfasına düşüyor ve rezervasyon komisyonlu kanaldan kapanıyor.',
    },
    {
      when: 'Konsept ve olanak sorusu geldiğinde',
      what: '“Her şey dahilde à la carte kaç kez ücretsiz?”, “yerli içecekler saat kaça kadar açık?”, “aquapark mayısta çalışıyor mu?” — bunlar satın alma anının tam ortasındaki sorulardır. Pansiyon tipini yalnız fiyat tablosunda bir kısaltmayla (OB, HB, UAI) geçirdiyseniz asistan ayrıntıyı okuyamaz ve sizi “bilgi belirtilmemiş” diye eler.',
    },
    {
      when: 'İptal, kapora ve tarih değişikliği sorulduğunda',
      what: 'Misafirin en çok yazdığı cümlelerden biri “vazgeçersem param ne olur”. İade koşulunuz yalnızca rezervasyon motorunun son adımında beliren onay kutusunun içindeyse ne misafir ne de asistan onu görebilir; aynı soruya açık metinle cevap veren başka bir tesis sayfası öne çıkar.',
    },
    {
      when: 'Yabancı misafir mesafe ve transfer sorduğunda',
      what: 'Dış pazardan gelen misafirin ilk sorusu genelde havalimanı mesafesi, transferin dahil olup olmadığı ve plaja yürüme süresidir. Bu bilgiler yalnız Türkçe alt sayfalarda yazılıysa, İngilizce sürümünüz var olsa bile cevap kurulamaz; iki dil hreflang ile birbirine bağlı değilse asistan onları aynı tesisin iki yüzü olarak değil, iki ayrı zayıf kaynak olarak görür.',
    },
  ],

  sections: [
    {
      heading: 'Soru artık resepsiyona değil, sohbet ekranına geliyor',
      paragraphs: [
        'Misafir eskiden on beş sekme açar, fiyatları kendi kafasında kıyaslardı. Şimdi koşulları tek cümlede sıralayıp hazır bir liste istiyor: tarih aralığı, iki yetişkin bir çocuk, denize yürüme mesafesi, yetişkinlere özel olmasın. Bu cümledeki her koşul bir filtredir ve filtrenin karşılığı sitenizde yazılı değilse liste sizin adınız olmadan kurulur.',
        'İkinci soru neredeyse her zaman aynı yerden gelir: “peki iptal edersem?”, “ek yatak ücreti ne kadar?”, “check-in saat kaçta?”. Bu turda asistan artık isim değil koşul arar. Koşulu sizde bulamazsa cevabı portal sayfanızdan, bir tatil blogundan ya da yıllar önce yazılmış bir forum yorumundan toplar; siz kendi fiyatınızı ve kendi kuralınızı anlatma sırasını kaybedersiniz.',
        'Türkiye’de internet kullanıcılarının %90,0’ı WhatsApp kullanıyor (TÜİK 2026) ve turizmde teklif zincirinin büyük kısmı orada kapanıyor. Asistandan çıkan öneri çoğu zaman bir bağlantı olarak sohbete yapıştırılır; karar da o bağlantının kartında görünen başlık, açıklama ve görselle verilir. Kart boş ya da yanlış görselle geliyorsa konuşma çoğu zaman o mesajda biter.',
      ],
    },
    {
      heading: 'Yapay zekâ tesisinizi hangi sayfadan okuyor?',
      paragraphs: [
        'Bir asistan tesisinizi anlatırken üç kaynağa bakar: makine okunur künye (Hotel ya da LodgingBusiness şeması), koşulları anlatan sayfa metni ve bunların diller arasındaki tutarlılığı. Üçü aynı şeyi söylüyorsa cevabı doğrudan sizden kurar. Şema “otel” der, sayfa metni “apart” der, İngilizce sürüm başka bir kapasite yazarsa kaynak olarak temkinli davranır ve sizi anmak yerine portalı anar.',
        'Oda tipleri en çok karışan yerdir. Standart, deluxe, swim-up, mağara oda, bungalov ve aile suiti tek bir fiyat tablosunda satır olarak duruyorsa asistan bunları ayrı ürün gibi göremez. Her oda tipinin kendi sayfası; metrekaresi, azami kapasitesi, manzarası, yatak düzeni ve dahil olan hizmetleri yazılıysa “balkonlu, deniz manzaralı, iki yetişkin bir çocuk” sorusuna doğrudan eşleşme çıkar.',
        'Politika metinleri de içeriktir. Giriş-çıkış saati, erken giriş ve geç çıkış ücreti, evcil hayvan kabulü, kapora oranı, çocuk yaş kademeleri, havuz ve à la carte restoranların çalışma takvimi, tadilat dönemi — bunlar yalnız rezervasyon motorunun son adımındaki onay kutularında yaşıyorsa hiçbir asistan okuyamaz. Motorun içinde kalan bilgi, pratikte sitede olmayan bilgidir.',
      ],
    },
    {
      heading: 'Otel ve acenta sitelerinde en sık rastladığımız açıklar',
      paragraphs: [
        'Karşımıza çıkan tipik tablo şu: çok iyi çekilmiş on beş fotoğraf, bir drone videosu, iki satır tanıtım metni. Manzara insanı ikna eder ama makine fotoğraftan pansiyon tipi, mesafe veya iptal koşulu çıkaramaz. Görsel ağırlıklı sayfalarda alt metinler de çoğu zaman “otel-1.jpg” olarak kalır; böylece hem görsel hem de cümle tarafı boş kalmış olur.',
        'İkinci sık hata sezonluk sayfaların ömrüdür. “Erken rezervasyon 2026”, “Kurban Bayramı paketi”, “sömestir tatili” sayfaları sezon bitince siliniyor, ertesi yıl yepyeni bir adresle açılıyor. Eski adresler 404 döndüğü için hem misafirin elindeki bağlantı hem de asistanın daha önce gördüğü kaynak kırılıyor. Kalıcı bir adres tutup içeriği yıldan yıla güncellemek, her sene sıfırdan başlamaktan daha az iştir.',
        'Üçüncüsü dil tarafı. İngilizce sürüm çoğu tesiste var; ama alt sayfalar yarım çevrilmiş, oda adları Türkçe kalmış, iki sürüm hreflang ile birbirine bağlanmamış oluyor. Almanca ve Rusça ise genelde tek bir tanıtım sayfasına indiriliyor. Yabancı misafirin sorusu tam da alt sayfalarda yaşayan ayrıntıya — transfer, mesafe, pansiyon kapsamı, çocuk politikası — dair olduğu için cevap üretilemiyor.',
      ],
    },
    {
      heading: 'Ölçüm, rezervasyon masasının işine nasıl dönüşüyor?',
      paragraphs: [
        'Ölçümün çıktısı bir puan değil, sıraya dizilmiş bir eksik listesidir. Satın alma sorusu kapsama aracı sektörün gerçek sorularını sitenizde arar ve “iptal koşulu”, “çocuk indirimi”, “havalimanı mesafesi”, “evcil hayvan” gibi başlıklardan hangisinin karşılıksız kaldığını gösterir. Bu liste, rezervasyon ekibinizin telefonda gün boyu tekrarladığı sorularla neredeyse birebir örtüşür; işe oradan başlamak en ucuzudur.',
        'Teknik taraf aynı mantıkla ilerler: schema denetimi künyenizin ve oda karşılıklarının okunup okunmadığını, hreflang kontrolü dil sürümlerinin karşılıklı bağlanıp bağlanmadığını, robots.txt ve sitemap kontrolü sezonluk paket sayfalarınızın taranabilir olup olmadığını, WhatsApp önizleme ise paylaştığınız bağlantının karşı tarafta nasıl göründüğünü söyler. Her biri tahmin değil, ekranda duran tek tek maddeler üretir.',
        'Düzeltmeden sonra aynı ölçüm tekrarlanır ve iki sonuç yan yana konur; böylece “neyi kapattık, neyi hâlâ kapatmadık” sorusunun yazılı bir cevabı olur. Doluluğu tek başına bu ölçüm açıklamaz — sezon, fiyat politikası, kanal dağılımı ve hava koşulları da işin içindedir. Bizim söyleyebildiğimiz daha dar ve daha kesin bir şey: misafirin sorduğu koşul sitenizde yazılı mı, değil mi.',
      ],
    },
  ],

  weExamine: [
    {
      area: 'Tesis künyesi ve konaklama şeması',
      detail:
        'Hotel / LodgingBusiness işaretlemesinde ad, ticaret unvanı, adres, koordinat, telefon, giriş-çıkış saati ve olanak listesi var mı; şemadaki yıldız veya sınıf bilgisi belgenizle aynı şeyi mi söylüyor; aynı tesis için birbiriyle çelişen iki ayrı künye bırakılmış mı.',
    },
    {
      area: 'Oda ve paket sayfalarının yapısı',
      detail:
        'Her oda tipinin kendi kalıcı adresi var mı, yoksa hepsi tek fiyat tablosunda satır mı; metrekare, azami kapasite, yatak düzeni, manzara ve dahil hizmetler yazıyla geçiyor mu; sezonluk paket sayfaları her yıl silinip yeniden mi açılıyor.',
    },
    {
      area: 'Fiyat, vergi ve ek ücretlerin yazılı olduğu yer',
      detail:
        'Gecelik fiyat bandı oda başı mı kişi başı mı belirtilmiş, para birimi ve konaklama vergisinin dahil olup olmadığı açık mı; transfer, otopark, spa, çocuk kulübü ve à la carte gibi kalemlerin ücretli-ücretsiz ayrımı metin içinde okunabiliyor mu.',
    },
    {
      area: 'İptal, kapora ve değişiklik koşulları',
      detail:
        'İade koşulu yalnız rezervasyon motorunun son adımında mı, yoksa kendi adresi olan ve taranabilen bir sayfada mı; esnek ve iade edilemez tarifelerin farkı yazılı mı; tarih değişikliği, erken ayrılış ve no-show durumunda ne olacağı aynı yerde anlatılmış mı.',
    },
    {
      area: 'Dil sürümleri ve karşılıklı bağlanma',
      detail:
        'Türkçe dışındaki sürümler hangi dillerde ve hangi derinlikte; oda ve politika alt sayfaları da çevrilmiş mi yoksa yalnız ana sayfa mı; sürümler ayrı dil kökünde mi duruyor; her sürüm ötekini alternatif olarak gösteriyor mu ve x-default tanımlı mı.',
    },
    {
      area: 'Konum, ulaşım ve kimlik tutarlılığı',
      detail:
        'Havalimanına mesafe, transfer süresi, plaja ve merkeze yürüme süresi, otobüs-iskele bağlantısı sayısıyla yazılı mı; sitedeki ad, adres ve telefon üçlüsü portal, harita kaydı ve acenta künyesindekiyle aynı mı; işletme belgesi ve iletişim kanalları görünür bir künye sayfasında mı.',
    },
  ],

  roadmap: [
    {
      week: '1. hafta',
      title: 'Envanter ve ilk ölçüm',
      detail:
        'Hangi oda tipleri, hangi paketler, hangi diller yayında — hepsi tek listeye çıkarılır. Satın alma sorusu kapsama ile turizm soru seti sitenizde aranır; schema denetimi, hreflang kontrolü ve robots.txt ve sitemap kontrolü ilk fotoğrafı çeker. Rezervasyon ekibinin telefonda en çok duyduğu on soru da bu listeye eklenir.',
    },
    {
      week: '2. hafta',
      title: 'Oda ve pansiyon bilgisini yazıya dökmek',
      detail:
        'Her oda tipi kendi sayfasına taşınır; metrekare, kapasite, yatak düzeni, manzara ve dahil hizmetler cümleyle yazılır. Pansiyon kısaltmalarının karşılığı açık açık geçirilir. Görsellerin alt metinleri oda adı ve özelliğiyle yeniden yazılır.',
    },
    {
      week: '3. hafta',
      title: 'Politika sayfaları ve künye',
      detail:
        'İptal, kapora, çocuk yaş kademeleri, evcil hayvan, giriş-çıkış saatleri ve erken giriş/geç çıkış koşulları motordan çıkarılıp kendi adresi olan sayfalara yazılır. Tesis künyesi, belge bilgisi ve iletişim kanalları tek yerde toplanır; Hotel/LodgingBusiness işaretlemesi bu metinlerle aynı şeyi söyleyecek biçimde kurulur.',
    },
    {
      week: '4. hafta',
      title: 'Diller, paylaşım kartı ve tekrar ölçüm',
      detail:
        'İngilizce ve varsa Almanca/Rusça sürümlerde alt sayfalar tamamlanır, sürümler karşılıklı bağlanır. WhatsApp önizleme ile rezervasyon ve paket bağlantılarının kartı kontrol edilir. Ay başındaki ölçüm birebir tekrarlanır, iki sonuç yan yana konur ve sonraki sezon penceresi için sıradaki maddeler belirlenir.',
    },
  ],

  notes: [
    {
      title: 'Belge, sınıf ve unvan dili',
      body:
        'Turizm İşletmesi Belgesi ile Basit Konaklama Turizm İşletmesi Belgesi aynı şey değildir; sitedeki sınıf ve yıldız ifadesi elinizdeki belgeyle örtüşmelidir. Seyahat acentaları için TÜRSAB belge grubu ve numarası künyede yer almalıdır. Belgeyle desteklenmeyen sınıf ifadesi hem mevzuat açısından hem de kaynak güvenilirliği açısından risk üretir.',
    },
    {
      title: 'Pansiyon ve konsept kısaltmaları',
      body:
        'OB, BB, HB, FB, AI ve UAI sektörün içinde herkesin bildiği kısaltmalardır; sohbet ekranındaki misafir ve onun sorusunu okuyan model için ise bağlamsız harflerdir. Kısaltmayı kullanacaksanız yanına Türkçe karşılığını ve kapsamını yazın: neyin dahil olduğu, hangi saatler arasında geçerli olduğu, hangi ünitelerin kapsam dışında kaldığı.',
    },
    {
      title: 'Sezon takvimi ve sayfa ömrü',
      body:
        'Turizmde talep dar pencerelerde toplanır: erken rezervasyon, sömestir, Ramazan ve Kurban bayramı köprüleri, kış sezonu açılışı. Bu pencerelerin sayfalarını her yıl silip yeniden açmak yerine kalıcı adreslerde tutup içeriği güncelleyin; adres değiştirmeniz gerekiyorsa eskisini kalıcı yönlendirmeyle yenisine bağlayın ki hem misafirin bağlantısı hem de daha önce görülmüş kaynak kırılmasın.',
    },
  ],

  illustration: {
    src: '/img/sektor/deep/turizm.webp',
    alt: 'Butik otel terası ve yanında oda tipi, pansiyon kapsamı ile iptal koşulunun yazılı sayfalara dönüşmesini gösteren editöryel çizim',
    caption: 'Asistanın kurduğu cevap, misafirin sorduğu koşulun sitenizde yazılı karşılığı kadardır.',
  },

  closing:
    'Manzarayı fotoğraf anlatır; oda tipini, pansiyon kapsamını ve iptal koşulunu ise yalnızca yazdığınız cümleler anlatır — ölçüp eksikleri sırayla kapatmanın tek işi budur.',
};
