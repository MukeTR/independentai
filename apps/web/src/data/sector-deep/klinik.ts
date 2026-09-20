import type { SectorDeep } from './types';

/** Klinik — derin anlatı. */
export const DEEP: SectorDeep = {
  slug: 'klinik',

  lede:
    'Klinik arayışı artık hekim adıyla değil, şikâyet cümlesiyle başlıyor. Hasta adayı “ön dişimde çatlak var, kaplama mı gerekir” ya da “saç ekiminde DHI ile FUE farkı ne” diye yazıyor; gelen cevabın içinde birkaç klinik adı, bazen de birkaç yanlış bilgi oluyor. Yanıt bu cevabı bir tanıtım alanı gibi değil, kliniğinizin kamuya açık bilgilerinin doğru okunup okunmadığını gösteren bir ölçüm alanı gibi ele alır.',

  lossMoments: [
    {
      when: 'Muayeneden önceki gece',
      what:
        'Hasta adayı randevu almadan önce şikâyetini kendi cümlesiyle asistana anlatıyor ve karşısına birkaç klinik adıyla bir işlem açıklaması çıkıyor. Sitenizde o şikâyetin halk dilindeki karşılığı hiç geçmiyorsa, kliniğiniz o konuşmanın tamamen dışında kalır.',
    },
    {
      when: 'İkinci görüş arayışı',
      what:
        'Elinde bir tedavi planı olan hasta adayı planı olduğu gibi asistana yazıp “bu gerçekten gerekli mi, bunu kimler yapıyor” diye soruyor. Bu an, işlem sayfanızın hangi durumlarda uygulamanın uygun olmadığını da anlatıp anlatmadığıyla ilgilidir; yalnız işlemi tarif eden sayfa bu soruya cevap üretmez.',
    },
    {
      when: '“Ne kadar tutar” sorusu',
      what:
        'Ücret sorusu sohbetin ilk birkaç mesajında geliyor, oysa tanıtım mevzuatı nedeniyle sitenizde rakam yazamazsınız. Ücretin neye göre değiştiğini — greft sayısı, seans adedi, malzeme tercihi, kontrol muayeneleri — anlatan bir bilgilendirme sayfanız yoksa asistan bu boşluğu forumlardan ve aracı platformlardan derlediği rakamlarla doldurur.',
    },
    {
      when: 'Eski adres, devredilmiş şube, verilmeyen bir hizmet',
      what:
        'Taşındığınız binayı, kapattığınız şubeyi veya kadronuzda karşılığı olmayan bir işlemi asistanın cevabında görmek kliniklerde sık rastlanan bir durumdur. Yanlış bilgiyle anılmak hiç anılmamaktan daha pahalıya gelir: hasta adayı yanlış adrese gider, olmayan bir işlemi sorar, resepsiyon gününün yarısını düzeltmeyle geçirir.',
    },
  ],

  sections: [
    {
      heading: 'Soru artık resepsiyona değil, telefona soruluyor',
      paragraphs: [
        'Klinik arayışının klasik hâlinde sıra bellidir: tanıdıktan bir hekim adı alınır, o ad arama kutusuna yazılır, birkaç sayfa karşılaştırılır. Bugün araya yeni bir basamak girdi. Hasta adayı hiçbir ad bilmeden şikâyetini anlatıyor; “kaplama mı zirkonyum mu”, “burun ameliyatından sonra kaç gün izin gerekir”, “çocuğumun süt dişi çürüğü çekilir mi” gibi cümleler doğrudan asistana gidiyor ve klinik adları ilk kez o cevapta duyuluyor.',
        'İkinci değişiklik saatlerde. Resepsiyona gelen sorular gündüze sıkışırken asistana sorulanlar gecenin ilerleyen saatlerine kayıyor; kimse gece on birde kliniği arayıp “bu ilacı ameliyattan önce kesmeli miyim” diye sormaz, ama sohbet penceresine yazar. O saatte sizin adınıza konuşan tek şey sitenizde yazılı olanlardır: hekim sayfaları, işlem açıklamaları, hazırlık talimatları ve iletişim bilgisi.',
        'Üçüncüsü dil. Saç ekimi, diş implantı ve estetik cerrahide soruların önemli bir bölümü İngilizce ve Arapça geliyor; “all-inclusive package”, “is the doctor performing the surgery himself”, “konaklama dâhil mi” gibi kalıplar tekrar ediyor. Bu sorulara Türkçe sayfadan cevap üretilemez; asistan hangi dilde soruluyorsa o dilde yazılmış, kendi adresi olan bir sayfa arar.',
      ],
    },
    {
      heading: 'Asistan kliniğinizi hangi sayfalardan okuyor?',
      paragraphs: [
        'Bir asistan klinik sorusuna cevap kurarken kliniğinizi bütün olarak değil, parça parça okur. Ana sayfadaki tanıtım cümlesinden çok şunlar belirleyicidir: hekim künyesi, uzmanlık alanı, adres ve telefonun sayfa boyunca aynı yazılması, hangi işlemin hangi başlık altında anlatıldığı ve bu bilgilerin makine tarafından okunabilir bir şema katmanında tekrarlanıp tekrarlanmadığı. Şema yoksa bu bilgiler tahmin edilir.',
        'Sağlıkta ikinci katman, bilginin kim tarafından söylendiğidir. Bir işlem sayfasının altında adı, unvanı ve uzmanlık dalı yazılı bir hekim varsa, sayfanın güncellenme tarihi görünüyorsa ve metin dayandığı kaynaklara bağlanıyorsa, o sayfa asistan için kimliği belli bir kaynaktır. İmzasız, tarihsiz ve onlarca klinik sitesinde aynı cümlelerle duran işlem metni ise ayırt edici hiçbir sinyal taşımaz.',
        'Üçüncü katman tutarlılıktır. Sitenizdeki telefon ile harita kaydındaki telefon, şube adresi ile iletişim sayfasındaki adres, çalışma saatleri ile çevrimiçi randevu sisteminin gösterdiği saatler birbirini tutmuyorsa asistan hangisinin doğru olduğunu bilemez; çoğu zaman en çok tekrar edeni seçer. Bu yüzden klinik ölçümü tek bir sayfanın değil, kimlik bilgisinin bütün kopyalarının denetimidir.',
      ],
    },
    {
      heading: 'Klinik sitelerinde tekrar eden eksikler',
      paragraphs: [
        'İlk eksik dil uyuşmazlığıdır. Sayfalar tıbbi terminolojiyle yazılıyor — “rinoplasti”, “periodontoloji”, “FUE greft” — ama hasta adayı “burun estetiği”, “diş eti hastalığı”, “saç ekimi kaç kök” diye soruyor. İki dili aynı sayfada buluşturan tek bir cümle bile yoksa, metniniz doğru bilgiyi taşıdığı hâlde sorunun kendisiyle eşleşmez.',
        'İkincisi hekim sayfalarının zayıflığıdır. Çoğu klinikte hekim sayfası bir fotoğraf, bir unvan ve iki satırdan ibarettir; mezuniyet, uzmanlık eğitimi, ilgilendiği işlemler, yayınlar ve dernek üyelikleri yazılmaz. Oysa hasta adayının “bunu kim yapıyor, yetki alanı ne” sorusuna cevap veren tek sayfa budur ve burası aynı zamanda mevzuatın bilgilendirmeye açık bıraktığı alanın tam ortasıdır.',
        'Üçüncüsü süreç bilgisinin eksikliğidir. İşlem sayfaları çoğunlukla işlemin ne olduğunu anlatıp biter; hazırlık, işlem günü, iyileşme takvimi, kontrol muayeneleri, uygulamanın uygun olmadığı durumlar ve ücretin neye göre değiştiği yazılmaz. Hasta adayının gerçekte sorduğu sorular tam olarak bunlardır; bu başlıklar sayfada yoksa cevap başka kaynaklardan derlenir.',
      ],
    },
    {
      heading: 'Ölçüm nasıl düzeltme listesine dönüşüyor?',
      paragraphs: [
        'Ölçüm tek bir puanla bitmez. Kliniğin verdiği işlemler ve hizmet verdiği şehirler için hasta adaylarının gerçekten kurduğu soru kalıplarını çıkarırız, bu soruları asistanlara sorar ve kliniğin nasıl anıldığını kaydederiz: adınız geçiyor mu, hangi işlemle birlikte anılıyorsunuz, adres ve telefon doğru mu, size ait olmayan bir iddia var mı. Bu kayıt tarihlidir ve sonraki ölçümle karşılaştırılabilir.',
        'İkinci adım eksik listesidir. Satın alma soruları aracı sektörün soru kümesini sitenizin başlıklarıyla eşleştirir; Schema denetimi kimlik ve sayfa tipi katmanını, Güven sinyalleri künye, iletişim ve KVKK metinlerini, hreflang kontrolü yabancı dil sayfalarının birbirine doğru bağlanıp bağlanmadığını gösterir. Çıktı bir öneri yazısı değil, sayfa ve satır düzeyinde bir düzeltme listesidir.',
        'Üçüncü adım aynı ölçümün tekrarıdır. Düzeltmeler yayına alındıktan sonra ilk gün sorulan sorular aynı biçimde yeniden sorulur ve iki kayıt yan yana konur: hangi soruda artık anılıyorsunuz, hangi yanlış bilgi düzeldi, hangisi hâlâ duruyor. Söz verdiğimiz şey bir netice değil, bu döngünün düzenli işlemesi ve her adımın kayda geçmesidir.',
      ],
    },
  ],

  weExamine: [
    {
      area: 'Şema katmanı: klinik, hekim, işlem',
      detail:
        'Kliniğin kendisi, kadrodaki hekimler ve sunulan işlemler ayrı ayrı işaretlenmiş mi; JSON-LD içindeki ad, adres, telefon ve çalışma saatleri sayfadaki metinle birebir aynı mı.',
    },
    {
      area: 'Hekim künyesi ve yetki alanı',
      detail:
        'Her hekimin kendi adresi, unvanı, uzmanlık dalı, mezuniyet ve uzmanlık eğitimi bilgisi ile ilgilendiği işlemler yazılı mı; işlem sayfaları ilgili hekimin sayfasına bağlanıyor mu.',
    },
    {
      area: 'Tıbbi içeriğin kaynak ve tarih sinyalleri',
      detail:
        'Metni kimin yazdığı veya gözden geçirdiği, son güncelleme tarihi ve dayandığı kaynaklar sayfada görünüyor mu; aynı metin başka sitelerde birebir tekrarlanıyor mu.',
    },
    {
      area: 'İşlem sayfalarında halk dili ile tıbbi terimin eşleşmesi',
      detail:
        'Halk dilindeki ad ile tıbbi terim aynı sayfada birlikte geçiyor mu; hazırlık, iyileşme süreci ve uygulamanın uygun olmadığı durumlar kendi başlıkları altında ayrı ayrı anlatılıyor mu.',
    },
    {
      area: 'Ücret ve süreç bilgilendirmesinin çerçevesi',
      detail:
        'Rakam vermeden ücretin neye göre değiştiğini açıklayan bir bilgilendirme bölümü var mı; kampanya, indirim ve hediye dili mevzuata aykırı biçimde sayfalara sızmış mı.',
    },
    {
      area: 'Şube, konum ve dil katmanı',
      detail:
        'Her şubenin kendi sayfası ve tutarlı adres bilgisi var mı; İngilizce ve Arapça sayfalar ayrı adreste hreflang ile karşılıklı bağlanmış mı, telefon +90 biçiminde yazılmış mı.',
    },
  ],

  roadmap: [
    {
      week: '1. hafta',
      title: 'Mevcut durumu kayda geçirme',
      detail:
        'Kliniğin verdiği işlemler ve hizmet verdiği şehirler için hasta adaylarının kurduğu soru kümesi çıkarılır; Türkçe ve gerekiyorsa İngilizce, Arapça olarak asistanlara sorulur, adınızın geçtiği, geçmediği ve yanlış geçtiği cevaplar tarihiyle kaydedilir. Aynı hafta şube, telefon, adres ve hekim listesinin tek bir doğru kopyası oluşturulur.',
    },
    {
      week: '2. hafta',
      title: 'Kimlik katmanının düzeltilmesi',
      detail:
        'Klinik ve hekim şeması kurulur; iletişim sayfası, künye, KVKK aydınlatma ve çerez metinleri tamamlanır; sitedeki her telefon ve adres yazımı ilk haftada çıkarılan tek kopyaya göre eşitlenir. Hekim sayfaları unvan, uzmanlık dalı ve ilgilendiği işlemlerle yeniden yazılır.',
    },
    {
      week: '3. hafta',
      title: 'İşlem sayfalarının yeniden kurgusu',
      detail:
        'Her işlem sayfasına halk dilindeki karşılık, hazırlık, işlem günü, iyileşme takvimi, kontrol muayeneleri ve uygulamanın uygun olmadığı durumlar başlıkları eklenir; ücretin neye göre değiştiğini anlatan bölüm rakam vermeden yazılır. Metinlerin altına yazan ya da gözden geçiren hekim ile güncelleme tarihi konur.',
    },
    {
      week: '4. hafta',
      title: 'Dil katmanı ve ikinci ölçüm',
      detail:
        'Uluslararası hasta sayfaları kendi adreslerinde yayımlanır, hreflang karşılıklı bağlanır, telefon +90 biçimine çekilir ve sağlık turizmi yetki bilgisi görünür bir yere alınır. Birinci haftadaki soru kümesi aynı biçimde tekrar sorulur; iki kayıt yan yana konup neyin düzeldiği, neyin beklediği yazılı hâle getirilir.',
    },
  ],

  notes: [
    {
      title: 'Tanıtım değil, bilgilendirme',
      body:
        'Sağlık hizmetlerinde tanıtım ve bilgilendirme faaliyetleri ayrı bir yönetmelikle sınırlandırılmıştır: hasta beyanına dayalı yorum, işlem öncesi ve sonrası görsel, kampanya, indirim, hediye ve üstünlük iddiası içeren dil kullanılamaz. Bizim işimiz bu sınırın içinde kalır; ölçtüğümüz şey bilginin doğru, güncel ve makine tarafından okunabilir olup olmadığıdır. Sayfalarınızda mevzuata aykırı bir dil görürsek onu da eksik listesine yazarız.',
    },
    {
      title: 'Sağlık verisi ayrı bir kategori',
      body:
        'Sağlık verisi KVKK’da özel nitelikli kişisel veri sayılır; randevu formu, dosya yükleme alanı, WhatsApp hattı ve çevrimiçi randevu sistemleri bu kapsamdadır. Araçlarımız yalnızca herkese açık sayfaları okur; form içeriğine, hasta kaydına veya görüntüsüne hiçbir biçimde erişmez. Sitede baktığımız şey aydınlatma metninin varlığı, formun HTTPS üzerinden gönderilmesi ve açık rıza alanlarının ayrı ayrı sunulmasıdır.',
    },
    {
      title: 'Halk dili, tıbbi terim ve klinik takvimi',
      body:
        'Hasta adayı “diş eti çekilmesi” der, siz “periodontal tedavi” yazarsınız; iki dili aynı sayfada buluşturmadığınız sürece doğru bilgi soruya ulaşmaz. Takvim de kliniğe göre değişir: kimi klinikte yıl sonuna doğru özel sağlık sigortası hakkını kullanmak isteyenler yoğunlaşır, kiminde yurt dışından gelen soruların arttığı aylar başkadır. Kendi randevu defterinizdeki yoğun dönemleri söylerseniz ölçüm takvimini ona göre kurarız.',
    },
  ],

  illustration: {
    src: '/img/sektor/deep/klinik.webp',
    alt: 'Klinik resepsiyonunun duvarındaki hekim künyesi ile hasta adayının telefonunda beliren yapay zekâ cevabının yan yana durduğu çizim',
    caption: 'Duvardaki künye ile asistanın cevabındaki künye aynı şeyi söylüyor mu — ölçtüğümüz soru budur.',
  },

  closing:
    'Klinikte görünürlük bir iddia meselesi değil, kamuya açık bilgilerinizin doğru okunması meselesidir; biz o bilgiyi ölçer, eksiğini gösterir, düzeltme sırasını verir ve düzeldikten sonra yeniden ölçeriz.',
};
