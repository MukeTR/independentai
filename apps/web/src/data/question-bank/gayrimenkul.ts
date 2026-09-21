import type { SectorQuestionBank } from './types';

/** Gayrimenkul — müşterinin yapay zekâya sorduğu sorular. */
export const BANK: SectorQuestionBank = {
  slug: 'gayrimenkul',
  note:
    'Konut alan insan soruyu ilan diliyle değil hayat diliyle kuruyor: bütçesini, kaç çocuğu olduğunu, işe nasıl gittiğini ve ne zaman taşınması gerektiğini yazıp “bana ne önerirsin” diye soruyor. ' +
    'Cümlelerin çoğu iki seçenek arasında sıkışmış hâlde geliyor — sıfır mı ikinci el mi, bu mahalle mi öteki mi, şimdi mi biraz sonra mı — ve neredeyse her seferinde gerekçe isteniyor. ' +
    'Fiyat sorusu tek başına değil aidat, tapu harcı, komisyon ve “sonradan ek masraf çıkar mı” kuyruğuyla birlikte soruluyor; ofisin adı ise ancak künye, yetki belgesi ve gerçek adres sayfada yazılıysa konuşmaya giriyor.',
  questions: [
    // ——— Keşif ———
    {
      q: 'Eşimle ilk evimizi almak istiyoruz, bütçemiz 4,5 milyon TL civarında ve İstanbul’da nereye bakacağımızı bilmiyoruz — bize nasıl bir yol haritası önerirsin?',
      stage: 'kesif',
      answeredBy: 'ilk ev alım rehberi sayfası',
      signals: ['ilk ev', 'bütçe aralığı', 'hangi ilçe', 'adım adım'],
      why: 'İlk alıcı henüz ilan değil yön arıyor; bu cümleye cevap veren sayfa ofisi konuşmanın en başına yazdırıyor.',
    },
    {
      q: 'Kirada oturuyorum, aylık 30 bin TL kira ödüyorum; bu parayı krediye çevirip ev almak benim durumumda mantıklı olur mu?',
      stage: 'kesif',
      answeredBy: 'kira mı alım mı yazısı / SSS',
      signals: ['konut kredisi', 'aylık taksit', 'peşinat', 'kira ödemek yerine'],
      why: 'Kira-taksit kıyası alıcının kafasındaki ilk hesap; bu hesabı yazan sayfa süreç boyunca tekrar tekrar alıntılanıyor.',
    },
    {
      q: 'Annemden kalan daireyi satmak istiyorum ama değerinin ne olduğunu bilmiyorum; önce ne yapmam gerekiyor, değerleme yapıyor musunuz?',
      stage: 'kesif',
      answeredBy: 'satış ve değerleme hizmeti sayfası',
      signals: ['değerleme', 'ekspertiz', 'portföye alma', 'satış süreci'],
      why: 'Satıcı tarafı da aynı asistana soruyor; değerleme hizmetini yazmayan ofis portföyün girişinde görünmüyor.',
    },
    {
      q: 'İş değişikliği yüzünden ay sonuna kadar taşınmam gerekiyor; hemen oturulabilir, eşyalı bir kiralık daire bulmakta yardımcı olabilir misiniz?',
      stage: 'kesif',
      answeredBy: 'kiralama hizmeti sayfası',
      signals: ['kiralık', 'eşyalı', 'hemen taşınabilir', 'randevu'],
      why: 'Acele eden kiracı en hızlı cevap veren ofise yöneliyor; sayfada süre ve uygunluk yazmazsa aday liste dışı kalıyor.',
    },
    {
      q: 'İzmir’e taşınıyoruz, bölgeyi hiç bilmiyoruz; hafta sonu gelip birkaç daire gezmek istiyoruz, bizimle ilgilenebilecek bir ofis var mı?',
      stage: 'kesif',
      answeredBy: 'iletişim ve çalışma saatleri sayfası + ilçe rehberi',
      signals: ['hafta sonu', 'çalışma saatleri', 'hizmet verdiğimiz ilçeler', 'yerinde gezdirme'],
      why: 'Konum ve zaman kısıtı içeren sorularda cevap, çalışma saatini ve hizmet bölgesini açıkça yazan ofisler üzerinden kuruluyor.',
    },
    {
      q: 'Yurt dışında yaşıyorum ve Türkiye’den ev almak istiyorum; süreç uzaktan nasıl yürüyor, vekâletle hallolur mu?',
      stage: 'kesif',
      answeredBy: 'yabancı alıcı / uzaktan alım rehberi (İngilizce ve Arapça karşılıklarıyla)',
      signals: ['vekâlet', 'tapu devri', 'değerleme raporu', 'uzaktan işlem'],
      why: 'Yurt dışındaki alıcı önce süreci öğreniyor; bu adımları kendi dilinde anlatan sayfa ilk teması da alıyor.',
    },

    // ——— Karşılaştırma ———
    {
      q: 'Sıfır bir projeden daire mi almalıyım, yoksa on yaşında ikinci el bir daire mi? Neden onu önerdiğini, artılarını ve eksilerini de yazar mısın?',
      stage: 'karsilastirma',
      answeredBy: 'sıfır konut ile ikinci el karşılaştırma yazısı',
      signals: ['sıfır konut', 'ikinci el', 'teslim tarihi', 'artıları ve eksileri'],
      why: 'Gerekçe istenen kıyas sorularında cevap, iki tarafı da yazan sayfadan besleniyor; tek yönlü pazarlama metni alıntılanmıyor.',
    },
    {
      q: 'Ataşehir mi Ümraniye mi? İki çocuğumuz var, okul ve metro yakınlığıyla aidat açısından hangisi bize daha uygun olur?',
      stage: 'karsilastirma',
      answeredBy: 'ilçe ve mahalle rehberi sayfası',
      signals: ['metro', 'okul mesafesi', 'aidat aralığı', 'mahalle karşılaştırması'],
      why: 'Mahalle kıyası çoğu alımın ilk gecesinde soruluyor; bölgeyi yazıya döken ofis ilan stoğu küçük olsa bile kaynak olabiliyor.',
    },
    {
      q: 'İki konut projesi arasında kaldım; teslim tarihi, ödeme planı ve kat planı açısından aralarındaki fark ne, hangisi daha mantıklı?',
      stage: 'karsilastirma',
      answeredBy: 'proje sayfaları ve proje karşılaştırma tablosu',
      signals: ['teslim tarihi', 'ödeme planı', 'kat planı', 'iskân durumu'],
      why: 'Bu kalemler yalnız PDF broşürde kalırsa karşılaştırma tablosu rakip projenin metniyle doluyor.',
    },
    {
      q: 'Kat irtifaklı daire mi kat mülkiyetli daire mi almalıyım, aradaki fark benim açımdan ne anlama geliyor?',
      stage: 'karsilastirma',
      answeredBy: 'terimler sözlüğü / SSS',
      signals: ['kat irtifakı', 'kat mülkiyeti', 'iskân', 'tapu türü'],
      why: 'Terimlerin açık karşılığını bir kez yazmak, ilanın doğru eşlenmesini ve sayfanın alıntılanmasını kolaylaştırıyor.',
    },
    {
      q: 'Bir ilanda brüt 120 m², diğerinde net 95 m² yazıyor; bunları nasıl kıyaslayacağım, gerçekte hangisi daha büyük?',
      stage: 'karsilastirma',
      answeredBy: 'ilan sayfası ölçü alanı + terimler/SSS',
      signals: ['brüt metrekare', 'net metrekare', 'ortak alan payı', 'kullanım alanı'],
      why: 'Brüt-net ayrımını yazmayan ilan kıyas sorusunda belirsiz kalıyor ve karşılaştırmanın dışında bırakılıyor.',
    },
    {
      q: 'Aynı parayla merkezde küçük bir daire mi, biraz dışarıda büyük bir daire mi almalıyım? Gerekçesini de anlatır mısın?',
      stage: 'karsilastirma',
      answeredBy: 'bölge rehberi / yatırım değerlendirme yazısı',
      signals: ['ulaşım süresi', 'metrekare fiyatı', 'kira getirisi', 'artıları ve eksileri'],
      why: 'Bu soru bölge metniyle cevaplanıyor; metrekare fiyatını ve ulaşımı yazan sayfa kıyasın içine giriyor.',
    },

    // ——— Fiyat ve kapsam ———
    {
      q: 'Bütçem 6 milyon TL, bu parayla Antalya’da denize yakın bir yerde ne alabilirim, nereye kadar çıkarım?',
      stage: 'fiyat',
      answeredBy: 'ilçe rehberi + fiyat aralıklı portföy sayfası',
      signals: ['fiyat aralığı', 'denize yakın', 'metrekare fiyatı', 'portföy'],
      why: 'Bütçeden başlayan sorularda cevap, yazılı fiyat aralığı olan sayfalardan kuruluyor.',
    },
    {
      q: 'Ev alırken fiyatın dışında ne kadar masraf çıkıyor — tapu harcı, komisyon, DASK derken toplamda ne kadar tutar?',
      stage: 'fiyat',
      answeredBy: 'alım maliyetleri sayfası / SSS',
      signals: ['tapu harcı', 'komisyon oranı', 'dask', 'döner sermaye'],
      why: 'Toplam maliyet sorusu neredeyse her alımda geçiyor; kalem kalem yazan sayfa hesabın kaynağı oluyor.',
    },
    {
      q: 'Emlak komisyonu yüzde kaç, pazarlık payı var mı, sonradan ek ücret çıkar mı?',
      stage: 'fiyat',
      answeredBy: 'hizmet ve ücretlendirme sayfası',
      signals: ['komisyon oranı', 'hizmet bedeli', 'kdv dahil', 'ek masraf'],
      why: 'Ücretini açıkça yazan ofis, gizli maliyet endişesiyle sorulan bu soruda adı geçen taraf oluyor.',
    },
    {
      q: 'İlanda “fiyat için arayınız” yazıyor; telefon etmeden yaklaşık bir aralık öğrenebilir miyim, fiyat neye göre değişiyor?',
      stage: 'fiyat',
      answeredBy: 'ilan sayfası fiyat alanı / SSS',
      signals: ['fiyat aralığı', 'güncelleme tarihi', 'pazarlık payı', 'metrekare fiyatı'],
      why: 'Fiyatı gizleyen ilan makine tarafında kıyas dışında kalıyor; bant hâlinde fiyat bile okunabilir bir cevap üretiyor.',
    },
    {
      q: 'Bu sitede aidat aylık ne kadar tutuyor, ısıtma dahil mi, toplam aylık gider ne olur?',
      stage: 'fiyat',
      answeredBy: 'ilan sayfası aidat alanı / site bilgi sayfası',
      signals: ['aidat', 'ısıtma tipi', 'doğalgaz', 'site giderleri'],
      why: 'Kira getirisi ve aylık bütçe hesapları aidat olmadan yapılamıyor; aidatı yazmayan ilan hesabın dışında kalıyor.',
    },
    {
      q: 'Projeden alırken peşinat ne kadar olmalı, senetli ödeme planında toplam maliyet ne kadara çıkar?',
      stage: 'fiyat',
      answeredBy: 'proje sayfası ödeme planı bölümü',
      signals: ['peşinat', 'taksit sayısı', 'ödeme planı', 'teslim tarihi'],
      why: 'Ödeme planı görsele gömülü kaldığında proje, bütçe sorularının hiçbirinde okunamıyor.',
    },
    {
      q: 'Acaba şimdi mi almalıyım, yoksa birkaç ay bekleyeyim mi — beklemenin bana maliyeti ne olur?',
      stage: 'fiyat',
      answeredBy: 'tarih damgalı piyasa değerlendirme yazısı',
      signals: ['güncelleme tarihi', 'kredi faizi', 'fiyat eğilimi', 'kira çarpanı'],
      why: 'Zamanlama sorusunda yalnız tarihi görünen ve kaynağı belli olan sayfalar alıntılanıyor.',
    },

    // ——— Güven ve yetki ———
    {
      q: 'Şu emlak ofisini duydun mu, taşınmaz ticareti yetki belgesi var mı, müşteri yorumları nasıl?',
      stage: 'guven',
      answeredBy: 'hakkımızda / ofis künyesi sayfası',
      signals: ['yetki belgesi', 'ticaret unvanı', 'ofis adresi', 'müşteri yorumları'],
      why: 'Künyesi olmayan sayfa, içeriği ne kadar iyi olursa olsun firma adı verilmesi gereken yerde atlanıyor.',
    },
    {
      q: 'Projeden daire alacağım; müteahhidin önceki işleri zamanında teslim edilmiş mi, bunu nasıl kontrol ederim?',
      stage: 'guven',
      answeredBy: 'proje ve referans / tamamlanan işler sayfası',
      signals: ['tamamlanan projeler', 'teslim tarihi', 'referans', 'iskân alındı'],
      why: 'Teslim geçmişi yazılı değilse alıcı bunu forumlardan öğreniyor ve konuşma sizin sayfanızda geçmiyor.',
    },
    {
      q: 'Kaparo vermeden önce nelere dikkat etmeliyim, sözleşmede hangi maddeleri kontrol etmem lazım?',
      stage: 'guven',
      answeredBy: 'alım süreci rehberi / SSS',
      signals: ['kaparo', 'sözleşme maddeleri', 'tapu kaydı', 'ipotek şerhi'],
      why: 'Süreci adım adım yazan ofis, riskten korkan alıcının aklında “bunu bilen taraf” olarak kalıyor.',
    },
    {
      q: 'İlandaki fotoğraflar çok iyi görünüyor ama gerçekten o daireye mi ait? Sahte ilandan nasıl kaçınırım?',
      stage: 'guven',
      answeredBy: 'ilan sayfası künye alanı + ilan politikası/SSS',
      signals: ['ilan tarihi', 'ilan numarası', 'danışman adı', 'yerinde çekilmiş fotoğraf'],
      why: 'İlanı kimin, ne zaman yayımladığı yazılıysa sayfa hem alıcı hem makine için doğrulanabilir hâle geliyor.',
    },
    {
      q: 'Ofisiniz tam olarak nerede, gidip yüz yüze görüşebileceğim sabit bir adresiniz ve numaranız var mı?',
      stage: 'guven',
      answeredBy: 'iletişim sayfası',
      signals: ['ofis adresi', 'sabit telefon', 'çalışma saatleri', 'harita'],
      why: 'Yalnız iletişim formu olan, arkasında adres ve telefon yazmayan sitede asistan firma adı vermekten kaçınıyor.',
    },

    // ——— Satın alma sonrası ———
    {
      q: 'Tapu devrini yaptık, şimdi sırayla ne yapmam gerekiyor — abonelikler, DASK ve emlak vergisi nasıl ilerliyor?',
      stage: 'sonrasi',
      answeredBy: 'satış sonrası rehberi / SSS',
      signals: ['tapu devri', 'abonelik', 'dask', 'emlak vergisi'],
      why: 'Devirden sonraki adımları yazan ofis, alım bittikten sonra da aynı alıcının sorularında kaynak kalıyor.',
    },
    {
      q: 'Aldığım daireyi kiraya vermek istiyorum; ortalama ne kadar kira getirir ve kiracı bulma işini siz yürütüyor musunuz?',
      stage: 'sonrasi',
      answeredBy: 'kiralama ve portföy yönetimi sayfası',
      signals: ['kira getirisi', 'kiracı bulma', 'portföy yönetimi', 'kira sözleşmesi'],
      why: 'Yatırımcı alıcı satıştan sonra kiralamayı da soruyor; iki hizmeti birlikte yazmak aynı müşteriyi ikinci kez getiriyor.',
    },
    {
      q: 'Projede teslim tarihi geçti ama daire hâlâ teslim edilmedi; şimdi ne yapabilirim, siz süreci takip ediyor musunuz?',
      stage: 'sonrasi',
      answeredBy: 'satış sonrası destek sayfası / SSS',
      signals: ['teslim gecikmesi', 'sözleşme maddesi', 'süreç takibi', 'iskân'],
      why: 'Sorun anında cevap veren sayfa yoksa alıcı başka bir ofisin içeriğinden yönleniyor ve ilişki orada kuruluyor.',
    },
    {
      q: 'Evimi sattım ama alıcı ödemeyi iki taksitte yapacak; tapuda kendimi nasıl güvenceye alırım?',
      stage: 'sonrasi',
      answeredBy: 'satış süreci rehberi / SSS',
      signals: ['ipotek şerhi', 'tapu müdürlüğü', 'ödeme belgesi', 'satış vaadi sözleşmesi'],
      why: 'Satıcı tarafının süreç soruları çoğu emlak sitesinde hiç yazılmıyor; yazan ofis bu boşlukta tek kaynak oluyor.',
    },
    {
      q: 'Teslim aldığım dairede eksikler çıktı; müteahhide ne kadar süre içinde bildirmem gerekiyor, bu konuda destek veriyor musunuz?',
      stage: 'sonrasi',
      answeredBy: 'satış sonrası destek sayfası',
      signals: ['teslim tutanağı', 'eksik listesi', 'ayıp bildirimi', 'bildirim süresi'],
      why: 'Teslim sonrası sorunlarda süre bilgisi aranıyor; bunu yazan sayfa hem alıcıyı hem cevabı kendine çekiyor.',
    },
  ],
};
