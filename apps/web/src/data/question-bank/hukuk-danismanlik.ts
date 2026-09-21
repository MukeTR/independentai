import type { SectorQuestionBank } from './types';

/** Hukuk ve danışmanlık — müşterinin yapay zekâya sorduğu sorular. */
export const BANK: SectorQuestionBank = {
  slug: 'hukuk-danismanlik',

  note:
    'Bu sektörde soru tek kelime değil, durum anlatan uzun bir cümle olarak yazılır: kiracı, tebligat, işten çıkarılma ya da yeni açılan bir dükkân anlatılır, ardından “ne yapmam gerekir” diye sorulur. Hemen arkasından ücretin neye göre belirlendiği ve sürecin kaç adımdan oluştuğu gelir; üçüncü kuşak sorular ise baro ve oda kaydı, adres, ekip gibi kimlik doğrulama sorularıdır. Meslek kuralları gereği sorular bilgi arayışıdır; sonuç veya kazanç vaadi içeren bir dil bu bankada yer almaz.',

  questions: [
    // ————————————————————————————— keşif
    {
      q: 'Kiracım sekiz aydır kira ödemiyor, sözleşme elimde ama ne yapacağımı bilmiyorum — böyle bir durumda süreç nereden başlıyor, önce kime başvurmam gerekir?',
      stage: 'kesif',
      answeredBy: 'Kira ve gayrimenkul çalışma alanı sayfası',
      signals: ['kira alacağı', 'ihtarname', 'tahliye süreci', 'icra takibi'],
      why: 'Kira uyuşmazlığı bu sektörde en sık yazılan durum cümlelerinden biri; sürecin adımları sayfada yoksa cevap forum başlıklarından kurulur.',
    },
    {
      q: 'İki ay önce işten çıkarıldım, kıdem ve ihbar tazminatımı alamadım; önce arabulucuya mı gitmem gerekiyor, yoksa doğrudan bir avukatla mı görüşmeliyim?',
      stage: 'kesif',
      answeredBy: 'İş hukuku çalışma alanı sayfası',
      signals: ['arabuluculuk', 'kıdem tazminatı', 'ihbar tazminatı', 'dava şartı'],
      why: 'Zorunlu arabuluculuk adımı bilinmediği için aday süreci yanlış yerden başlatır; bu adımı yazan sayfa ilk temas noktası olur.',
    },
    {
      q: 'Instagram üzerinden takı satıyorum, cirom yeni yeni artmaya başladı; şahıs şirketi kurmam mı gerekiyor, vergi tarafında ilk adım ne olmalı?',
      stage: 'kesif',
      answeredBy: 'Şirket kuruluşu ve mükellefiyet sayfası',
      signals: ['şahıs şirketi', 'mükellefiyet tesisi', 'e-ticaret', 'vergi levhası'],
      why: 'İlk kez mükellef olacak kişi hizmetin adını bilmez, durumunu anlatır; sayfa günlük dille yazılmamışsa eşleşme olmaz.',
    },
    {
      q: 'Babam vefat etti, üzerine kayıtlı bir daire ve bir araç var; veraset işlemleri için önce nereye başvurmalıyım, hangi belgeleri toplamam lazım?',
      stage: 'kesif',
      answeredBy: 'Miras hukuku çalışma alanı sayfası',
      signals: ['mirasçılık belgesi', 'veraset ilamı', 'intikal işlemleri', 'veraset ve intikal vergisi'],
      why: 'Miras işlerinde soru belge listesiyle başlar; gereken belgeleri tek tek sayan sayfa cevapta kaynak olarak anılır.',
    },
    {
      q: 'Elimde imzalanmayı bekleyen bir bayilik sözleşmesi var, hukuk dilinden hiç anlamıyorum — böyle bir metni kim inceler, bu nasıl bir hizmet?',
      stage: 'kesif',
      answeredBy: 'Ticaret hukuku ve sözleşme inceleme sayfası',
      signals: ['sözleşme incelemesi', 'ticari sözleşme', 'hukuki görüş', 'müzakere'],
      why: 'Sözleşme incelemesi ayrı bir hizmet olarak yazılmadığında aday böyle bir hizmetin var olduğunu bilmeden başka ofise yönelir.',
    },
    {
      q: 'Küçük bir kafe işletiyorum, muhasebeyi şimdiye kadar kendim tuttum ama artık yetişemiyorum; mali müşavir tam olarak hangi işleri üstleniyor?',
      stage: 'kesif',
      answeredBy: 'Müşavirlik hizmet kapsamı sayfası',
      signals: ['defter tutma', 'beyanname', 'bordro', 'muhasebe hizmeti'],
      why: 'Kapsam tek satırda virgülle sayıldığında makine ne yapıldığını anlatamaz; kalem kalem yazan sayfa cevabın gövdesini kurar.',
    },
    {
      q: 'Bursa Nilüfer’de oturuyorum ve mesai saatlerinde iş yerinden çıkamıyorum; akşam saatlerinde ya da hafta sonu görüşme yapan bir müşavirlik ofisi var mı, görüşme çevrim içi de olabilir mi?',
      stage: 'kesif',
      answeredBy: 'İletişim ve çalışma saatleri sayfası',
      signals: ['çalışma saatleri', 'randevu', 'çevrim içi görüşme', 'hafta sonu'],
      why: 'Konum ve saat kısıtı içeren sorularda çalışma saatleri metin olarak yazılı değilse ofis aday listesine hiç girmez.',
    },
    {
      q: 'Elime bir tebligat geldi ve süresi işliyor, acelem var; bu hafta içinde görüşme ayarlanabilir mi, acil durumlarda size nasıl ulaşılıyor?',
      stage: 'kesif',
      answeredBy: 'İletişim ve randevu sayfası',
      signals: ['randevu', 'aynı gün', 'telefon', 'acil'],
      why: 'Süreye bağlı işlerde aday hızlı dönüş arar; ulaşım kanalları yazılı değilse arama bir sonraki ofise kayar.',
    },

    // ————————————————————————————— karşılaştırma
    {
      q: 'Eşimle çoğu konuda uzlaşıyoruz; anlaşmalı boşanma ile çekişmeli boşanma arasındaki fark nedir, bizim durumumuzda hangisi mümkün olur?',
      stage: 'karsilastirma',
      answeredBy: 'Aile hukuku çalışma alanı sayfası',
      signals: ['anlaşmalı boşanma', 'çekişmeli boşanma', 'protokol', 'duruşma'],
      why: 'İki seçeneği aynı cümleye koyan soruda farkı açıkça anlatan sayfa cevabın kaynağı olur.',
    },
    {
      q: 'Tahsil edemediğim bir alacağım var; icra takibi mi başlatmalıyım yoksa dava mı açmalıyım, neden o yolu önerdiğini gerekçesiyle yazar mısın?',
      stage: 'karsilastirma',
      answeredBy: 'İcra ve alacak takibi çalışma alanı sayfası',
      signals: ['ilamsız icra', 'ödeme emri', 'itiraz', 'alacak davası'],
      why: 'Gerekçe isteyen soruda adım adım anlatım yapan metin tercih edilir; tek satırlık hizmet listesi cevaba girmez.',
    },
    {
      q: 'Serbest muhasebeci mali müşavir ile yeminli mali müşavir arasındaki fark ne, benim gibi küçük bir limited şirket hangisiyle çalışır?',
      stage: 'karsilastirma',
      answeredBy: 'Müşavirlik hakkında ve sık sorulanlar sayfası',
      signals: ['serbest muhasebeci mali müşavir', 'yeminli mali müşavir', 'tasdik', 'unvan'],
      why: 'Unvan karışıklığı bu sektörün en sık sorulan ayrımı; farkı yazan ofis konunun kaynağı olarak anılır.',
    },
    {
      q: 'Şahıs şirketi mi limited şirket mi kurmalıyım? Şimdilik ortak almayı düşünmüyorum ama ileride yatırım alabilirim, artılarını eksilerini de yazar mısın.',
      stage: 'karsilastirma',
      answeredBy: 'Şirket türleri karşılaştırma sayfası',
      signals: ['şahıs şirketi', 'limited şirket', 'sermaye', 'vergilendirme'],
      why: 'Artı-eksi isteyen soru uzun metin ister; karşılaştırmayı yazılı yapan sayfa cevabın iskeletini oluşturur.',
    },
    {
      q: 'Markamı kendim mi tescil ettirsem yoksa vekil üzerinden mi yürütsem, ikisi arasında süreç ve takip açısından ne değişiyor?',
      stage: 'karsilastirma',
      answeredBy: 'Marka ve fikri mülkiyet çalışma alanı sayfası',
      signals: ['marka tescili', 'marka vekili', 'başvuru süreci', 'itiraz süresi'],
      why: 'Vekille yürütmenin ne kattığı yazılı değilse aday süreci kendi başına dener ve ofis hiç devreye girmez.',
    },
    {
      q: 'Şirket kuruluşunu şimdi mi yapsam yoksa yıl başını mı beklesem, vergi ve defter tarafında ne değişir?',
      stage: 'karsilastirma',
      answeredBy: 'Şirket kuruluşu ve takvim bilgilendirme sayfası',
      signals: ['defter tasdiki', 'yıl başı', 'kuruluş işlemleri', 'geçici vergi'],
      why: 'Zamanlama sorusu sektörün kendi takvimiyle ilgilidir; takvimi yazan sayfa yılın en yoğun haftasında cevapta yer alır.',
    },
    {
      q: 'Dava açmadan çözmenin bir yolu var mı; ihtarname göndermek ya da arabulucuya başvurmak gibi daha az masraflı bir alternatif işe yarar mı?',
      stage: 'karsilastirma',
      answeredBy: 'Uyuşmazlık çözümü ve çalışma alanı sayfası',
      signals: ['ihtarname', 'arabuluculuk', 'sulh', 'masraf'],
      why: 'Daha uygun alternatif arayan soruda seçenekleri açıkça sayan metin cevaba alınır.',
    },

    // ————————————————————————————— fiyat ve kapsam
    {
      q: 'Bütçem sınırlı ve aylık müşavirlik için ne kadar ayırmam gerektiğini bilmiyorum; ücret neye göre belirleniyor, hangi kalemler tutarı değiştiriyor?',
      stage: 'fiyat',
      answeredBy: 'Ücret ve çalışma koşulları sayfası',
      signals: ['ücret neye göre belirlenir', 'asgari ücret tarifesi', 'kapsam', 'çalışan sayısı'],
      why: 'Rakam yazmasanız bile ücretin çerçevesini anlatan metin, asistanın tahmine değil size dayanmasını sağlar.',
    },
    {
      q: 'İlk görüşme ücretli mi, ücretliyse ne kadar ve bu tutar sonradan toplam ücretten düşülüyor mu?',
      stage: 'fiyat',
      answeredBy: 'İletişim ve ilk görüşme bilgilendirme sayfası',
      signals: ['ilk görüşme', 'danışma ücreti', 'ön görüşme', 'randevu'],
      why: 'İlk görüşmenin koşulu yazılı değilse aday telefonu hiç açmadan listeden çıkarır.',
    },
    {
      q: 'Avukatlık ücretinin dışında harç ve masraf çıkıyor mu, süreç ilerledikçe ek ücret istenmesi gibi bir durum olur mu?',
      stage: 'fiyat',
      answeredBy: 'Ücret ve süreç açıklaması sayfası',
      signals: ['harç', 'masraf', 'avukatlık ücreti', 'ek ücret'],
      why: 'Sonradan çıkan maliyet endişesi bu sektörde yüksektir; kalemleri ayıran açıklama güven sinyali olarak okunur.',
    },
    {
      q: 'Ücreti peşin mi ödemem gerekiyor, aylık ödeme planı yapılabiliyor mu ve sözleşme kaç aylık imzalanıyor?',
      stage: 'fiyat',
      answeredBy: 'Ücret ve sözleşme koşulları sayfası',
      signals: ['peşin', 'ödeme planı', 'aylık ücret', 'sözleşme süresi'],
      why: 'Ödeme biçimi sorusu karar anında gelir; cevabı olmayan ofis karşılaştırma listesinden düşer.',
    },
    {
      q: 'Şirketimde altı çalışan var; bordro ve SGK bildirgeleri de dahil olacak şekilde aylık müşavirlik kapsamı nasıl fiyatlanıyor?',
      stage: 'fiyat',
      answeredBy: 'Müşavirlik kapsam ve ücretlendirme sayfası',
      signals: ['bordro', 'sgk bildirgesi', 'personel sayısı', 'kapsam'],
      why: 'Ücretin çalışan sayısına bağlı olduğu yazılmazsa aday rakamı başka bir yerden okuyup yanlış beklentiyle gelir.',
    },
    {
      q: 'Müşavirlik sözleşmesini imzalamadan önce nelere dikkat etmeliyim, hangi işler aylık ücrete dahil değil?',
      stage: 'fiyat',
      answeredBy: 'Sözleşme ve kapsam açıklaması sayfası',
      signals: ['kapsam dışı', 'ücrete dahil', 'sözleşme', 'ek hizmet'],
      why: 'Kapsam dışı kalemleri yazılı anlatan ofis, sonradan çıkacak maliyet tartışmasını baştan kapatır.',
    },

    // ————————————————————————————— güven ve yetki
    {
      q: 'Görüşmeyi düşündüğüm kişinin gerçekten avukat olduğunu ve baroya kayıtlı olduğunu nasıl doğrularım, sicil bilgisi sitede yazıyor mu?',
      stage: 'guven',
      answeredBy: 'Ekip ve künye sayfası',
      signals: ['baro levhası', 'sicil', 'avukat', 'künye'],
      why: 'Baro kaydı metin olarak yazılı değilse kimliği doğrulanamayan ofis cevapta kaynak gösterilmez.',
    },
    {
      q: 'Çalışmayı düşündüğüm müşavirlik ofisinin ruhsatı ve oda kaydı var mı, ticaret unvanını sitede nerede görebilirim?',
      stage: 'guven',
      answeredBy: 'Hakkımızda ve künye sayfası',
      signals: ['mali müşavirler odası', 'ruhsat', 'ticaret unvanı', 'vergi dairesi'],
      why: 'Mesleki kayıt bilgisi yalnızca antetli bir görselin içinde duruyorsa makine okuyamaz ve künye eksik kalır.',
    },
    {
      q: 'Bu büroyu bir tanıdığım önerdi ama hakkında pek bir şey bulamadım; kimler çalışıyor, hangi alanlarda dosya takip ediyorlar, ne zamandır faaliyetteler?',
      stage: 'guven',
      answeredBy: 'Hakkımızda ve ekip sayfası',
      signals: ['hakkımızda', 'ekip', 'çalışma alanları', 'kuruluş'],
      why: 'Tavsiyeyi doğrulama anında ekip ve çalışma alanı metni yoksa cevap “hakkında yeterli bilgi bulunamadı” biçiminde kurulur.',
    },
    {
      q: 'Ofisin adresi sitede başka, haritada başka görünüyor; hangisi güncel, taşındınız mı, yakınında otopark var mı?',
      stage: 'guven',
      answeredBy: 'İletişim sayfası',
      signals: ['adres', 'ulaşım', 'çalışma saatleri', 'otopark'],
      why: 'Adres tutarsızlığında asistan hangi bilginin doğru olduğunu seçemez ve ofisi zayıf bir ihtimal olarak geçer.',
    },
    {
      q: 'Anlattıklarım ve paylaştığım belgeler gizli kalıyor mu, görüşme sırasında verdiğim bilgiler nasıl saklanıyor?',
      stage: 'guven',
      answeredBy: 'Gizlilik ve aydınlatma metni sayfası',
      signals: ['gizlilik', 'sır saklama', 'aydınlatma metni', 'kişisel veri'],
      why: 'Gizlilik yükümlülüğünü yazılı anlatmak, ilk temastan önce sorulan en hassas soruya cevap verir.',
    },

    // ————————————————————————————— satın alma sonrası
    {
      q: 'Şu an başka bir müşavirle çalışıyorum ama değiştirmek istiyorum; devir nasıl oluyor, eski müşavirimden hangi belgeleri almam gerekir, yıl ortasında geçiş yapılabiliyor mu?',
      stage: 'sonrasi',
      answeredBy: 'Müşavir değişikliği ve devir süreci sayfası',
      signals: ['devir', 'müşavir değişikliği', 'defter ve belgeler', 'geçmiş dönem'],
      why: 'Devir süreci yılın en hareketli sorusudur; adımları yazan ofis aralık-ocak döneminde cevapta yer alır.',
    },
    {
      q: 'Dosyam açıldıktan sonra gelişmelerden nasıl haberdar oluyorum, duruşma tarihi yaklaşınca bilgilendirme yapılıyor mu, kiminle iletişim kuruyorum?',
      stage: 'sonrasi',
      answeredBy: 'Çalışma süreci ve sık sorulanlar sayfası',
      signals: ['bilgilendirme', 'duruşma', 'süreç takibi', 'iletişim'],
      why: 'Süreç boyunca iletişimin nasıl işlediği yazılmazsa aday belirsizlik yüzünden karar vermez.',
    },
    {
      q: 'Vekaletname çıkarmam gerektiği söylendi; noterde nasıl yapılıyor, yanımda hangi belgeler olmalı ve şehir dışındayken bu iş nasıl hallediliyor?',
      stage: 'sonrasi',
      answeredBy: 'Vekaletname bilgilendirme sayfası',
      signals: ['vekaletname', 'noter', 'kimlik', 'fotoğraf'],
      why: 'Vekaletname ilk resmî adımdır; nasıl çıkarıldığını anlatan sayfa süreci fiilen başlatan metindir.',
    },
    {
      q: 'Beyanname dönemlerinde bana hatırlatma yapılıyor mu, evrakları nasıl iletmem gerekiyor; e-posta yeterli mi yoksa ofise mi getirmeliyim?',
      stage: 'sonrasi',
      answeredBy: 'Çalışma akışı ve sık sorulanlar sayfası',
      signals: ['beyanname dönemi', 'evrak teslimi', 'hatırlatma', 'e-posta'],
      why: 'Aylık akışın nasıl işlediği yazılıysa aday hizmeti somut görür ve karar süresi kısalır.',
    },
  ],
};
