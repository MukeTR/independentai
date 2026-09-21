import type { SectorDeep } from './types';

/** Eğitim — derin anlatı. */
export const DEEP: SectorDeep = {
  slug: 'egitim',

  lede:
    'Eğitimde karar süreci hep uzundu; değişen şey, sürecin ilk adımının nereye taşındığı. Veli ve aday artık ilçedeki kurumların tabelasını değil, telefonuna yazdığı tek bir cümlenin cevabını görüyor: “sekizinci sınıf için hafta sonu LGS kursu, Kadıköy”. O cevaba giren kurumlar tanıtım bütçesi en yüksek olanlar değil, program sayfası makineye açık konuşanlar oluyor.',

  lossMoments: [
    {
      when: 'Sonuç açıklandıktan sonraki tercih haftası',
      what: 'LGS ve YKS sonuçlarının ardından gelen on gün, bir eğitim kurumunun yıl boyunca gördüğü en yoğun soru trafiğidir; “bu puanla hangi bölüm”, “şu ilçede hangi kolej, kontenjan kaldı mı” soruları artık önce asistana gidiyor. Program, kontenjan ve kayıt takvimi sayfalarınız o hafta güncel değilse, yılın en kalabalık kısa listesinde adınız hiç anılmadan geçer.',
    },
    {
      when: 'İki üç kurumun yan yana konduğu karşılaştırma',
      what: 'Aday süreyi, biçimi ve ödeme koşulunu karşılaştırır; asistan da bu tabloyu sayfalardaki yazılı bilgiden kurar. Ücreti, taksit sayısını ve neyin dâhil olduğunu yalnız telefonda söylüyorsanız karşılaştırmada satırınız boş kalır; boş satır çoğu zaman sessizce elenir.',
    },
    {
      when: 'Denklik ve belge sorusu',
      what: 'Yurt dışı programda “YÖK denkliği var mı”, sertifika programında “belge e-Devlet’te görünüyor mu, hangi kurum onaylı” sorusu kararın son adımıdır ve yanlış cevabı en pahalı olandır. Bu bilgi sitede net yazılı değilse asistan forum yorumlarından toparlar; oradaki tek yanlış cümle kurumunuz hakkında kalıcı bir izlenim bırakır.',
    },
    {
      when: 'Yeni grup ne zaman açılıyor sorusu',
      what: 'Dönem başlangıcı ve kalan kontenjan çoğunlukla gece yarısı sorulur; kimse bilgi formu doldurup ertesi günü beklemek istemez. Başlangıç tarihi, hafta içi ile hafta sonu grubu ayrımı ve biçim sayfada yazılı değilse aday, tarihi yazmış olan kuruma yönelir.',
    },
  ],

  sections: [
    {
      heading: 'Aday ve veli soruyu artık nereye soruyor?',
      paragraphs: [
        'Beş yıl önce kurs arayan bir veli ilçedeki üç kurumun tabelasını bilir, komşusuna sorar, sonra telefonla ücret öğrenirdi. Bugün aynı veli gece yarısı telefonuna “kızım için hafta sonu LGS kursu, Kadıköy, sekizinci sınıf” yazıyor ve karşısına tabela değil, üç seçenekli bir liste geliyor. O listeye girmek artık tanıtım bütçesinin değil, sayfalarınızın makineye ne kadar açık konuştuğunun işi.',
        'Yaş grubu bu değişimi hızlandırıyor: Türkiye’de her 5 kişiden 1’i (%19,2) üretken yapay zekâ kullanıyor; 16–24 yaşta her 5 kişiden 2’si (TÜİK 2025). Yani kurs, bootcamp ve üniversite tercihinde kararı fiilen veren kuşak, asistanı günlük alışkanlık hâline getirmiş durumda. Soru da tek seferlik değil; “ücreti ne kadar”, “hafta içi akşam grubu var mı”, “belge e-Devlet’te görünüyor mu” diye üst üste sorulur ve asistan her turda aynı kaynaklara döner.',
        'Bu davranış yalnız üniversite adayında da görülmüyor. Anaokulu arayan çalışan bir anne, yurt dışı yüksek lisans için denklik soran bir mezun, kurumsal eğitim satın alan bir insan kaynakları uzmanı aynı yolu izliyor: önce asistana sor, kısa listeyi al, sonra siteye gir. Sizin siteniz bu sıranın sonunda değil, en başında okunuyor; ilk cevapta adınız geçmiyorsa ikinci ve üçüncü soruda da geçmez, çünkü konuşma daralmış bir aday listesi üzerinden ilerler.',
      ],
    },
    {
      heading: 'Asistan kurumunuzu hangi sayfadan okuyor?',
      paragraphs: [
        'Cevabı kurumsal ana sayfanız değil, tek tek program sayfalarınız kuruyor. Asistan “veri analisti kursu online mı, kaç ay sürüyor” sorusuna cevap verirken kursun kendi sayfasında süreyi, biçimi, başlangıç tarihini ve ücret bandını arar. Bulamazsa ya cümleyi hiç kurmaz ya da ilan sitelerindeki, forumlardaki eski bilgiyi kullanır; ikincisi daha sık oluyor ve düzeltmesi sizin elinizde olmuyor.',
        'İkinci katman şema. Kurslar için Course ve hasCourseInstance içinde biçim, başlangıç tarihi, toplam saat; mesleki programlar için EducationalOccupationalProgram içinde ön koşul, süre ve verilen belge; kurumun kendisi için EducationalOrganization. Bu işaretleme sayfadaki metni değiştirmez, metnin ne anlama geldiğini söyler. Şemasız bir program sayfası, makine tarafında başlığı sökülmüş bir broşür gibi durur.',
        'Üçüncü katman erişim. Program sayfaları yalnız üst menünün açılır kutusunda yaşıyorsa, sitemap’te hiç yoksa ya da içerik ancak form doldurulduktan sonra yükleniyorsa ortada okunacak bir şey kalmaz. robots.txt’te yeni nesil botları kapatan tek satır da aynı sonucu verir; incelediğimiz kurumların çoğunda bu satır bilinçli bir karar değil, devralınan eski bir temadan kalmadır.',
      ],
    },
    {
      heading: 'Program sayfalarında en sık rastladığımız boşluklar',
      paragraphs: [
        'En yaygını ücret. “Bilgi formunu doldurun, sizi arayalım” kutusu çağrı merkezini besler ama makineye tek kelime söylemez. Rakamı hiç yazmak istemiyorsanız bile bandı, taksit sayısını, erken kayıt ve kardeş indirimi koşulunu, özel okullarda servis, yemek ve kitap gibi kalemlerin ücrete dâhil olup olmadığını yazmak, “ne kadar” sorusunda kaynak olarak anılmanız için yeterlidir.',
        'İkincisi dönem artıkları. “2025 Güz kaydı başladı” duyurusu hâlâ yayında, kapanan kontenjan sayfası 404 veriyor, sitemap iki yıllık dönemleri taşıyor. Makine en taze olanı değil, en kolay bulunanı okur; sonuç, kapanmış bir programın eski ücretiyle anılmanız olur. Kayıt masasında duyduğunuz “ama sitede geçen yılın fiyatı yazıyordu” cümlesi tam buradan doğar.',
        'Üçüncüsü müfredatın PDF’te kalması. Modül listesi, saat dağılımı ve ön koşullar taranmış bir broşür görselinin içindeyse ne aday ne makine okuyabilir. Aynı içeriği sayfaya tablo olarak taşımak, eğitmenlerin adını ve hangi modülü verdiğini yazmak, kurumunuzu “kurs veren bir yer” olmaktan çıkarıp “şu müfredatı şu kişilerle veren kurum” hâline getirir.',
      ],
    },
    {
      heading: 'Ölçüm dönem takvimine nasıl bağlanır?',
      paragraphs: [
        'Eğitimde her işin bir tarihi var; ölçümün de olmalı. Kayıt dönemine altı hafta kala yapılan tarama ile dönem ortasında yapılan tarama aynı şeyi ifade etmez. Biz sırayı takvimden kuruyoruz: tanıtım günleri, başvuru açılışı ve erken kayıt haftası hangi tarihteyse, program sayfalarının ve şema düzeltmelerinin o tarihten önce kapanması gerekir.',
        'Ölçüm size puan değil, bir sıra veriyor. Hangi program sayfası şemasız, hangi şube sayfası adressiz, hangi aday sorusunun sitede hiçbir karşılığı yok — bunlar madde madde çıkıyor ve ilk turda çoğu kurumda liste kalabalık oluyor. Sonuç vaadi vermiyoruz: eksiği gösteriyoruz, hangi maddenin önce düzeltileceğini söylüyoruz, düzeltmeden sonra aynı ölçümü tekrarlıyoruz.',
        'Farkı kayıt sayısında değil, ondan önceki adımda görürsünüz: aynı sorunun cevabında kurum adınızın geçip geçmediği, program sayfanızın kaynak olarak anılıp anılmadığı, ücret ve süre bilgisinin doğru okunup okunmadığı. Bunlar tarih damgalı kayıtlar; dönem sonu toplantısında “geçen dönem şu üç madde eksikti, ikisi kapandı, biri duruyor” diyebilmek ölçümün asıl işidir.',
      ],
    },
  ],

  weExamine: [
    {
      area: 'Program şeması: Course ve EducationalOccupationalProgram',
      detail:
        'Her program sayfasında hasCourseInstance içinde biçim (online, yüz yüze, karma), başlangıç tarihi ve toplam saat var mı; mesleki programlarda ön koşul ile verilen belge alanı doldurulmuş mu. Uydurma değerlendirme puanı veya doğrulanamayan mezun sayısı şemaya eklenmiş mi — bunu ayrı bir kalem olarak çıkarıyoruz.',
    },
    {
      area: 'Ücret, burs ve ödeme bilgisi',
      detail:
        'Ücret bandı, taksit sayısı, erken kayıt ve kardeş indirimi koşulu sayfa metninde mi yoksa yalnız bilgi formunun arkasında mı. Özel okullarda eğitim öğretim ücreti ile servis, yemek ve kitap gibi ek kalemlerin ayrı ayrı yazılıp yazılmadığına bakıyoruz.',
    },
    {
      area: 'Kurum künyesi ve ruhsat bilgisi',
      detail:
        'Resmî kurum adı, bağlı bulunduğu il ve ilçe millî eğitim müdürlüğü, kurum kodu, açık adres ve telefon; KVKK aydınlatma metni ve çerez bildirimi. Güven sinyalleri denetimi bu kalemleri tek tek arar, çünkü kimliği belirsiz bir kurum cevaplarda kaynak olarak kullanılmaz.',
    },
    {
      area: 'Müfredat ve eğitmen künyesi',
      detail:
        'Modül listesi ile saat dağılımı sayfada metin olarak mı duruyor, taranmış broşürün içinde mi kalmış; eğitmenlerin adı, uzmanlık alanı ve hangi modülü verdiği yazılı mı. Protokol, resmî liste ya da basında çıkan haber gibi doğrulanabilir atıflar sayfadan erişilebiliyor mu.',
    },
    {
      area: 'Dönem ve takvim hijyeni',
      detail:
        'Kapanan dönem sayfaları 404 mü dönüyor yoksa güncel programa 301 ile mi gidiyor; sitemap’te hangi yılın sayfaları duruyor, lastmod tarihleri gerçek mi. Kırık link bulucu bu artıkların hangi iç linklerde hâlâ yaşadığını gösterir.',
    },
    {
      area: 'Şube sayfaları ve dil alternatifleri',
      detail:
        'Her şubenin kendi adresi, ulaşım tarifi ve ayrı sayfası var mı, yoksa bütün şubeler tek listede mi sıkışmış. Uluslararası öğrenciye açık programlarda İngilizce veya Arapça sayfaların hreflang bağları karşılıklı mı — hreflang kontrolü bunu eşleştirerek bakar.',
    },
  ],

  roadmap: [
    {
      week: '1. hafta',
      title: 'Program envanteri ve ilk ölçüm',
      detail:
        'Açık, kapanmış ve arşivlik bütün program sayfalarını tek listede topluyoruz. Aynı gün robots.txt ve sitemap kontrolü, schema denetimi ve satın alma sorusu kapsama araçlarını çalıştırıp adayın sorduğu hangi sorunun sitede hiç karşılığı olmadığını çıkarıyoruz.',
    },
    {
      week: '2. hafta',
      title: 'Künye, ücret ve güven bilgisi',
      detail:
        'Kurum adını, ruhsat ve iletişim bilgilerini her sayfadan erişilen tek bir künye bloğuna taşıyoruz; ücret bandını, taksiti ve burs koşulunu formun arkasından sayfa metnine çıkarıyoruz. Güven sinyalleri ölçümünü bu değişikliklerden sonra tekrarlıyoruz.',
    },
    {
      week: '3. hafta',
      title: 'Program sayfası iskeleti',
      detail:
        'Tek bir şablon kuruyoruz: süre, biçim, başlangıç tarihi, müfredat tablosu, eğitmen künyesi, verilen belge ve sayfa altında kayıt masasına gerçekten gelen sorulardan oluşan bir SSS. Course ve EducationalOccupationalProgram şemasını şablona gömüp en çok sorulan beş programa uyguluyoruz.',
    },
    {
      week: '4. hafta',
      title: 'Dönem temizliği ve ikinci ölçüm',
      detail:
        'Kapanan dönemlerin yönlendirmelerini kuruyor, kırık linkleri kapatıyor, sitemap’i yalnız güncel programlara indiriyoruz. Ardından birinci haftadaki ölçümün aynısını tekrarlayıp iki tarama arasındaki farkı madde madde raporluyoruz.',
    },
  ],

  notes: [
    {
      title: 'Tanıtım dilinin mevzuat sınırı',
      body:
        'Özel öğretim kurumlarının reklam ve tanıtımı, sınav sonucu ile öğrenci bilgisinin kullanımı dâhil, kendi yönetmeliğine tabidir; kurumsal sitede yazılan cümle de tanıtım sayılır. Asistanlar sayfadaki ifadeyi çoğu zaman olduğu gibi alıntılar, bu yüzden başarı iddiasını sayfaya yazmadan önce kurumunuzun mevzuat sorumlusuna danışın. Biz ölçümde yalnız bilginin var olup olmadığına bakarız, kurum adına başarı iddiası kurmayız.',
    },
    {
      title: 'Sezon takvimi içeriği belirler',
      body:
        'Özel okullarda erken kayıt kış aylarında, dil kurslarında yoğun dönem eylül ve şubatta, sınav hazırlıkta ise sonuç açıklamalarının ertesi haftasında başlar. Sayfa düzeltmelerinin bu tarihlerden en az altı hafta önce bitmesini öneriyoruz; yeni ve değişen sayfaların taranıp kaynak havuzuna girmesi zaman alır ve bu süre sizin denetiminizde değildir.',
    },
    {
      title: 'Kelime seçimi eşleşmeyi belirler',
      body:
        'Kurs, program, sertifika ve diploma aynı şey değildir; katılım belgesi ile bakanlık onaylı belge de. Anaokulu ile kreşin bağlı olduğu kurum bile farklıdır ve veli ikisini farklı kelimelerle arar. Sayfanızda hangi kelimeyi kullandığınız, asistanın sizi hangi soruya eşleyeceğini doğrudan etkiler; kurumun iç jargonunu değil, velinin ve adayın sorduğu kelimeyi yazın.',
    },
  ],

  illustration: {
    src: '/img/sektor/deep/egitim.webp',
    alt: 'Kurs kayıt masasında dönem takvimi ve program broşürleri; yanında bir velinin telefonunda açık duran yapay zekâ asistanına yazdığı kurs sorusu',
    caption:
      'Kayıt dönemi başlamadan sorulan sorular bellidir; ölçüm, bunlardan hangisine sitenizde cevap olmadığını gösterir.',
  },

  closing:
    'Eğitimde ilk temas artık tanıtım gününde değil, adayın gece yarısı sorduğu sorunun cevabında kuruluyor; biz o cevabın sizde hangi bilgiyi bulamadığını gösterip sırayla kapatıyoruz.',
};
