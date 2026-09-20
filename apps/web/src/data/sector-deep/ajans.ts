import type { SectorDeep } from './types';

/** Ajans — derin anlatı. */
export const DEEP: SectorDeep = {
  slug: 'ajans',

  lede:
    'Ajans arayan kişi işe artık tanıdık tavsiyesiyle ya da “dijital ajans İstanbul” sorgusuyla başlamıyor; brief’in taslağını asistana yazdırıyor, sonra aynı ekranda “bu işi kim yapar, aylık kaç para tutar” diye soruyor. Kısa liste böylece siz haberdar olmadan kuruluyor; teklif çağrısı ancak o listeden sonra e-postanıza düşüyor. Ajansın vitrini bu yüzden portföy görselleri değil, sitenizden okunabilen metin hâline geldi.',

  lossMoments: [
    {
      when: 'Brief masada yazılırken',
      what:
        'Pazarlama sorumlusu ihtiyacı asistana anlattırıp kapsamı maddeletiyor, aynı oturumda “bunu yapan ajanslar kimler” diye devam ediyor. Siteniz hizmeti kapsam, çıktı ve çalışma modeli diliyle anlatmıyorsa o listeye girecek cümleniz yok; teklif isteği üç rakibinize gidiyor, size uğramıyor.',
    },
    {
      when: 'Bütçe sorusu sorulduğunda',
      what:
        '“Sosyal medya yönetimi aylık ne kadar, ajans ücreti medya bütçesine dahil mi?” sorusu satın alma görüşmesinden önce soruluyor. Sitenizde başlangıç bandı ve ücretlendirme modeli yazmıyorsa cevap forum eşiklerinden ve rakibin fiyat sayfasından kuruluyor; siz “bütçesi belirsiz” diye daha ilk elemede kenara çekiliyorsunuz.',
    },
    {
      when: 'İki ajans yan yana konduğunda',
      what:
        'Karar verici kısa listedeki iki adı aynı anda sorduruyor: kim hangi sektörde çalışmış, ekipte kim var, raporlama hangi sıklıkta. Vaka çalışmalarınız görsel ve PDF içinde kaldığı için karşılaştırmada sizin sütununuz büyük ölçüde boş kalıyor, rakibinizin sütunu metinle doluyor.',
    },
    {
      when: 'Sözleşme öncesi son kontrolde',
      what:
        'Teklif beğenilse bile son adımda “bu ajans gerçekten kim, işi kim yönetecek” kontrolü yapılıyor. Künye, adres, ekip ve iş ortaklığı rozetleri yalnızca görsel olarak duruyorsa doğrulanacak metin çıkmıyor; karar, hakkında daha çok şey okunabilen tarafa kayıyor.',
    },
  ],

  sections: [
    {
      heading: 'Kısa liste teklif istenmeden önce kuruluyor',
      paragraphs: [
        'Ajansı seçen taraf tek kişi değildir: ihtiyacı yazan pazarlama sorumlusu, bütçeyi onaylayan patron, sözleşmeyi okuyan mali işler. Bu üç kişi de artık aynı yere soruyor. Türkiye’de her 5 kişiden 1’i (%19,2) üretken yapay zekâ kullanıyor; 16–24 yaşta her 5 kişiden 2’si (TÜİK 2025) — brief yazan kuşak tam olarak orada duruyor.',
        'Sorunun biçimi de değişti. Eskiden iki üç kelimelik bir sorgu vardı; bugün soru uzun ve koşullu: sektör, şehir, mevcut altyapı, aylık bütçe bandı, beklenen raporlama, hatta “ajans mı freelancer mı” kıyası tek cümlede geliyor. Cevap ise on mavi bağlantı değil, üç beş adlık gerekçeli bir liste oluyor; gerekçe cümlesi sitenizden çıkmıyorsa listede yerinizi kimse sizin için savunmuyor.',
        'Bu durum ajans için tuhaf bir ikilik yaratıyor. Müşterinize “içeriğiniz okunabilir olmalı, hizmet sayfanız kapsam anlatmalı” diyorsunuz; kendi siteniz ise sloganla, animasyonla ve logo bandıyla dolu. Satın alma tarafındaki ilk elemede ajansı ajans yapan dosya, görsel dil değil; o görsel dilin arkasındaki okunabilir metin oluyor.',
      ],
    },
    {
      heading: 'Yapay zekâ bir ajansı neye bakarak anlatıyor?',
      paragraphs: [
        'Model sitenizi gezerken portföydeki kampanya görsellerini değil, sayfada duran cümleleri okuyor. Aradığı şey basit: hizmetin adı, kapsamı, kimin için uygun olduğu, teslim süresi, çalışma modeli ve iletişim yolu. “Markanızı büyütüyoruz” cümlesinden çıkan tek bilgi, bu ajansın ne yaptığının yazılmadığıdır. “Shopify mağazaları için aylık Meta reklam yönetimi; kreatif üretim dahil, medya bütçesi hariç” cümlesi ise doğrudan alıntılanabilir bir bilgidir.',
        'İkinci baktığı katman kimliktir: ticari unvan, marka adı, adres, telefon, ekipte kimin ne yaptığı. Organization ya da ProfessionalService şeması burada ajansın kartviziti gibi çalışıyor; sameAs alanı da sosyal hesapları, iş ortağı dizin profillerini ve firma kayıtlarını aynı adın altında birleştiriyor. Şema yoksa asistan bu bilgileri sayfadan tahmin etmek zorunda kalıyor ve çoğu zaman tahmin etmiyor, atlıyor.',
        'Üçüncü katman sitenizin dışındadır. İş ortağı dizinleri, basında çıkan haber, ödül listesi, müşteri sitelerinin altındaki “tasarım ve yönetim: …” satırı — hepsi ajansın adını dışarıdan doğrulayan izlerdir. Burada en sık kırılan yer, sitede kullanılan marka adıyla sözleşmelerdeki ticari unvanın birbirini tutmamasıdır; iki farklı ad, dışarıdaki izlerin tek bir ajansta toplanmasını engeller.',
      ],
    },
    {
      heading: 'Kunduracının çocuğu: ajans sitelerinde tekrarlayan boşluklar',
      paragraphs: [
        'En sık gördüğümüz yapı, tek bir “Hizmetlerimiz” sayfasında altı hizmetin ikişer satırla sıralanmasıdır. Sosyal medya yönetimi, performans reklamları, kreatif üretim, web tasarımı ve içerik aynı URL’de yan yana durunca hiçbiri bir soruya cevap veremez. Her hizmetin kendi sayfası, kendi kapsam listesi, kendi teslim süresi ve kendi sorusu olduğunda ajans sayfa sayısı değil, cevap yüzeyi kazanır.',
        'İkinci boşluk portföyde. Vakalar çoğu zaman bir ızgara dolusu görselden ve müşteri logolarının aktığı bir banttan ibaret; sonuçlar ise sunum PDF’inin içinde kalır. Metne dönmediği sürece o iş yapılmamış sayılır. Sektör, şehir, işin süresi, kapsamı ve ekibin ne yaptığı yazıyla anlatıldığında — paylaşma izni olmayan rakamı zorlamadan — vaka hem okunur hem kıyaslanabilir olur.',
        'Üçüncüsü ücret ve iletişim sessizliği. “Fiyat için bize ulaşın” cümlesiyle tek bir forma bağlanan sitede ne başlangıç bandı ne çalışma modeli vardır; adres, telefon ve KVKK aydınlatması da çoğu zaman eksiktir. Blog tarafında ise ajansın kendi işinden çıkmayan jenerik ipucu yazıları birikir. Oysa müşteri adayının gerçekten sorduğu şey, teklif kalemlerinin ve raporlama ritminin nasıl kurulduğudur.',
      ],
    },
    {
      heading: 'Ölçüm ajans işine nasıl dönüşüyor?',
      paragraphs: [
        'Ajans için ölçümün iki ayrı kullanımı var. Birincisi kendi siteniz: aynı deterministik araçlarla bakıp eksikleri kendi önceliklerinize göre sıraya koyarsınız. İkincisi portföy: teklif hazırlamadan önce müşteri adayının sitesini tarayıp bulguları teklifin ilk sayfasına koyarsınız. Rakip kıyası kartı, satış görüşmesinin ilk on dakikasını tartışmadan açar; çünkü iki site aynı formülle ölçülmüştür.',
        'Bunu aylık ritme oturtmak da kolay: ayın başında tarama, düzeltmelerin sırası, ay sonunda aynı taramanın tekrarı ve raporda iki ölçümün yan yana konması. Söz verdiğimiz şey sonuç değil, döngüdür — ölçeriz, neyin eksik olduğunu gösteririz, düzeltme sırası veririz, tekrar ölçeriz. Retainer sözleşmesine yeni bir kalem eklemek isteyen ajans için bu döngü, ay sonunda gösterilebilir somut bir çıktı üretir.',
        'Ölçümün ne olmadığını da baştan söylemek gerekiyor. Bu araçlar reklam performansını, ROAS’ı ya da kreatifin işe yarayıp yaramadığını ölçmez; bir modelin belirli bir soruda kimi anacağını da kimse taahhüt edemez. Ölçtüğü şey, o cevabın kurulabilmesi için sitede bulunması gereken bilginin var olup olmadığıdır: kimlik, kapsam, ücret bandı, erişim ve okunabilirlik.',
      ],
    },
  ],

  weExamine: [
    {
      area: 'Kimlik şeması',
      detail:
        'Organization veya ProfessionalService şeması duruyor mu; ticari unvan, marka adı, adres ve telefon şemadaki değerlerle sayfadaki metni tutuyor mu; sameAs sosyal hesapları ve iş ortağı dizin profillerini aynı ada bağlıyor mu.',
    },
    {
      area: 'Künye ve ekip',
      detail:
        'Ajans mı, serbest çalışan mı ayrımını yapan sinyaller: ekipte kimin hangi işi yaptığı, ofis adresi, vergi dairesi ve ticaret sicil bilgisi, kurucu sayfası. Yalnızca form bırakan siteler bu ayrımı yaptıramıyor.',
    },
    {
      area: 'Hizmet sayfası mimarisi',
      detail:
        'Her hizmet kendi URL’inde mi, yoksa tek listede mi; sayfada kapsam kalemleri, çıktı listesi, teslim süresi ve “kimin için uygun değil” bölümü var mı; hizmet adları müşterinin kullandığı kelimelerle mi yazılmış.',
    },
    {
      area: 'Ücretlendirme metni',
      detail:
        'Başlangıç bütçesi bandı, retainer / proje / performans ayrımı, kurulum bedeli, medya bütçesinin ajans ücretine dahil olup olmadığı ve sözleşme süresi yazılı mı; bunlar yazılıysa fiyat sorusu sizin sayfanızdan cevaplanıyor.',
    },
    {
      area: 'Vaka ve atıf',
      detail:
        'Vakalar görselin ve PDF’in dışına çıkıp metne dönmüş mü; sektör, şehir, süre ve kapsam yazılı mı; iş ortaklığı rozetleri ile basın ve ödül atıfları metinde geçip doğrulanabilir bağlantıya bağlanıyor mu.',
    },
    {
      area: 'Konum ve dil',
      detail:
        'Hizmet verilen şehirler ve uzaktan çalışma düzeni yazılı mı; yurt dışı müşteri hedefleyen ajanslarda İngilizce sayfalar gerçekten çevrilmiş mi, hreflang eşleşmesi doğru mu, iletişim bilgileri her dilde aynı mı.',
    },
  ],

  roadmap: [
    {
      week: '1. hafta',
      title: 'Kendi sitenizi müşteri gözüyle ölçün',
      detail:
        'SEO karnesi, Güven sinyalleri ve Satın alma soruları taramalarını kendi sitenizde çalıştırın; ardından Rakip kıyası ile sık karşılaştığınız iki ajansı yan yana koyun. Çıkan liste, müşterilerinize sattığınız işin kendi sitenizde ne kadarının yapıldığını gösterir.',
    },
    {
      week: '2. hafta',
      title: 'Hizmetleri ayırın, bandı yazın',
      detail:
        'Tek “Hizmetlerimiz” sayfasını böleceğiniz hizmetleri seçin; her biri için kapsam kalemleri, çıktı listesi, teslim süresi ve başlangıç bütçesi bandını yazın. Retainer, proje ve performans modellerinin farkını ve medya bütçesinin nereye yazıldığını aynı sayfada açıklayın.',
    },
    {
      week: '3. hafta',
      title: 'Vakaları metne, kimliği şemaya taşıyın',
      detail:
        'Üç vakayı PDF ve görselden çıkarıp yazıya dökün: sektör, şehir, süre, kapsam, ekibin rolü, izin verilen ölçüde sonuç. Aynı hafta künye, ekip ve iletişim bilgilerini tamamlayıp Organization şemasını ve sameAs bağlantılarını kurun; Schema denetimiyle doğrulayın.',
    },
    {
      week: '4. hafta',
      title: 'Ölçümü portföye taşıyın',
      detail:
        'Teklif hazırladığınız iki müşteri adayının sitesini tarayıp bulguları teklifin ilk sayfasına koyun. Mevcut müşterileriniz için aylık tarama ritmini başlatın ve teklif bağlantılarınızın WhatsApp önizlemesini kontrol edin; ayın sonunda ilk taramayı tekrarlayıp iki ölçümü yan yana raporlayın.',
    },
  ],

  notes: [
    {
      title: 'Vaat dili ve Reklam Kurulu',
      body:
        'Ajans hem kendi sitesinin hem müşterisinin reklam metninin sorumlusudur. Sonuç taahhüdü içeren ifadeler, kanıtlanmamış üstünlük iddiaları ve doğrulanamayan karşılaştırmalar Reklam Kurulu tarafında sorun çıkarır; etkileyici iş birliklerinde iş birliği bildiriminin açıkça yapılması gerekir. Sitenizde ölçülebilir kapsam yazmak, iddia yazmaktan hem daha dayanıklı hem daha ikna edicidir.',
    },
    {
      title: '“Ajans” kelimesinin altı ayrı anlamı',
      body:
        'Reklam ajansı, dijital ajans, performans ajansı, medya satın alma, prodüksiyon ve yazılım atölyesi aynı kelimeyle anılıyor; müşteri adayı da çoğu zaman aradığı şeyi yanlış kelimeyle soruyor. Kendinizi tek bir etiketle tanımlayıp hizmet sayfalarında müşterinin kullandığı karşılıkları da yazmak, bu eşleşme sorununu sitenin kendi metniyle çözer.',
    },
    {
      title: 'Bütçe takvimi ajansın sezonudur',
      body:
        'Yıllık pazarlama bütçeleri sonbaharda kapanır, retainer görüşmeleri aralık–ocak hattında yoğunlaşır; e-ticaret müşterisi arayan ajans için ikinci yoğunluk kasım kampanya dönemi öncesine, eylül–ekim aylarına düşer. Sitedeki hizmet ve ücret metinlerini bu dönemler başlamadan hazır tutmak, teklif isteğinin geldiği hafta yapılan aceleci düzeltmelerden daha iyi sonuç verir.',
    },
  ],

  illustration: {
    src: '/img/sektor/deep/ajans.webp',
    alt: 'Ajans ekibinin toplantı masasında müşteri adayının sitesine ait görünürlük raporunu ve teklif taslağını yan yana incelemesi',
    caption: 'Teklif hazırlanırken müşteri adayının sitesi de, ajansın kendi sitesi de aynı formülle ölçülür.',
  },

  closing:
    'Müşterilerinize sattığınız okunabilirliği önce kendi sitenizde göstermek, bugün ajansın en kısa referansıdır.',
};
