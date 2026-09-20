import type { SectorQuestionBank } from './types';

/** Ajans — müşterinin yapay zekâya sorduğu sorular. */
export const BANK: SectorQuestionBank = {
  slug: 'ajans',

  note:
    'Ajans arayan kişi tek bir şey sormuyor: önce ihtiyacını tarif ediyor, sonra kapsamı, sonra parayı soruyor. Cümleler uzun ve koşullu; sektör, şehir, ekip durumu, aylık bütçe ve takvim aynı soruya sıkışıyor. “Ajans mı freelancer mı”, “retainer mı proje mi”, “medya bütçesi dahil mi” gibi kıyas ve kapsam soruları, teklif istenmeden çok önce soruluyor.',

  questions: [
    // ——— Keşif ———
    {
      q: 'Butik bir mobilya markasıyız, Instagram hesabını şu ana kadar ben yönettim ama artık yetişemiyorum. Bir ajansa devretsem işin tam olarak hangi kısmını devretmiş olurum, bende ne kalır?',
      stage: 'kesif',
      answeredBy: 'sosyal medya yönetimi hizmet sayfası',
      signals: ['kapsam', 'içerik takvimi', 'aylık', 'sizden beklediklerimiz'],
      why: 'Devredilen ve markada kalan işin sınırı yazılı değilse müşteri adayı hizmetin ne olduğunu anlayamıyor.',
    },
    {
      q: 'Yeni bir kahve dükkânı açıyoruz, sosyal medya hesaplarını sıfırdan kuracak ve düzenli içerik üretecek birine ihtiyacımız var. Bu iş ajansın işi mi, yoksa serbest çalışan bir içerik üreticisi mi yeter?',
      stage: 'kesif',
      answeredBy: 'hizmet sayfası + SSS',
      signals: ['hesap kurulumu', 'içerik üretimi', 'kimin için uygun', 'çalışma modeli'],
      why: 'Ajansın hangi ölçekteki işi aldığı yazılıysa küçük müşteri de doğru kapıyı çalıyor.',
    },
    {
      q: 'Şirketin sitesi 2018’den kalma, hem baştan yenilenmesi hem de arama motorlarında bulunur hâle gelmesi lazım. Bunu tek bir ajans baştan sona yapar mı, yoksa web için ayrı SEO için ayrı mı anlaşmam gerekir?',
      stage: 'kesif',
      answeredBy: 'web tasarımı ve SEO hizmet sayfaları',
      signals: ['yeniden tasarım', 'teknik seo', 'tek elden', 'teslim süresi'],
      why: 'Hizmetler tek sayfada iki satırla sıralandığında bu soru cevapsız kalıyor.',
    },
    {
      q: 'B2B makine üretiyoruz, müşterilerimiz Avrupa ve Ortadoğu’da. Bizim durumumuzda klasik bir dijital ajans mı işe yarar, yoksa ihracata çalışan bir yapı mı gerekir — bana ne önerirsin?',
      stage: 'kesif',
      answeredBy: 'B2B / ihracat pazarlaması hizmet sayfası',
      signals: ['b2b', 'ihracat', 'yurt dışı', 'çok dilli'],
      why: 'B2B ve ihracat müşterisi, kendi işini tarif eden bir cümle göremezse siteyi kapatıyor.',
    },
    {
      q: 'Kasım kampanya dönemine üç hafta kaldı ve elimizde hazır kreatif yok. Bu sürede bir ajans devreye girip kampanyayı yetiştirebilir mi, yoksa artık geç mi kaldık?',
      stage: 'kesif',
      answeredBy: 'kampanya / kreatif üretim hizmet sayfası',
      signals: ['teslim süresi', 'kreatif üretim', 'kampanya dönemi', 'başlangıç süreci'],
      why: 'Teslim süresi ve devreye girme adımları yazılmadığında acele eden müşteri adayı cevap veren tarafa gidiyor.',
    },
    {
      q: 'Şirkette pazarlamadan sorumlu kimse yok, kararları ben veriyorum. Bir ajansla çalışmaya başlamadan önce bizim tarafta neyin hazır olması gerekiyor, ilk ay nasıl ilerliyor?',
      stage: 'kesif',
      answeredBy: 'çalışma süreci / nasıl çalışıyoruz sayfası',
      signals: ['başlangıç toplantısı', 'sizden beklediklerimiz', 'ilk ay', 'onay süreci'],
      why: 'Sürecin ilk adımları yazılıysa hazırlıksız müşteri adayı da teklif istemeye cesaret ediyor.',
    },

    // ——— Karşılaştırma ———
    {
      q: 'Aylık sabit ücretle ajansla mı çalışsam, yoksa serbest çalışan bir reklam uzmanıyla mı devam etsem? İkisinin farkını, artılarını eksilerini de yazar mısın?',
      stage: 'karsilastirma',
      answeredBy: 'SSS veya “neden ajans” blog yazısı',
      signals: ['serbest çalışan', 'ekip', 'süreklilik', 'yedeklilik'],
      why: 'Bu kıyas satın alma kararının merkezinde ve ajansın cevabı sitede yoksa kıyas rakibin metniyle yapılıyor.',
    },
    {
      q: 'Reklam ajansı, dijital ajans, performans ajansı derken kafam karıştı. Benim ihtiyacım reklam yönetimiyse hangisine gitmem gerekiyor, aralarındaki fark tam olarak ne?',
      stage: 'karsilastirma',
      answeredBy: 'hizmet sayfası + hakkımızda',
      signals: ['performans reklamları', 'medya yönetimi', 'kreatif', 'odak alanımız'],
      why: 'Ajans kendini tek bir etiketle tanımlamazsa müşteri adayı yanlış kelimeyle arayıp sizi bulamıyor.',
    },
    {
      q: 'Aylık retainer mı yoksa tek seferlik proje anlaşması mı bizim için daha mantıklı? Üç aylık bir kampanyamız var ama sonrasında devam eder mi bilmiyorum.',
      stage: 'karsilastirma',
      answeredBy: 'ücretlendirme / çalışma modeli sayfası',
      signals: ['retainer', 'proje bazlı', 'sözleşme süresi', 'aylık'],
      why: 'Çalışma modelleri ayrıştırılmadığında teklif görüşmesi model tartışmasıyla başlıyor.',
    },
    {
      q: 'Şirket içinde iki kişilik bir pazarlama ekibi kurmakla ajansla çalışmak arasında kaldım. Maliyet ve işin sürekliliği açısından hangisini seçmeliyim?',
      stage: 'karsilastirma',
      answeredBy: 'blog yazısı veya SSS',
      signals: ['şirket içi ekip', 'maliyet', 'uzmanlık', 'devir'],
      why: 'Bu karşılaştırmayı kendi sayfasında dürüstçe yapan ajans, kıyas sorusunda anılacak metni üretmiş oluyor.',
    },
    {
      q: 'Sosyal medya için bir ajansla, reklam için başka bir ajansla çalışıyoruz ve iki taraf birbirinden habersiz. Hepsini tek ajansta toplasam ne kazanırım, ne kaybederim?',
      stage: 'karsilastirma',
      answeredBy: 'hizmet sayfası + çalışma süreci',
      signals: ['tek elden', 'bütünleşik', 'raporlama', 'devir süreci'],
      why: 'Ajans değiştirme ve birleştirme kararı, karşılaştırılabilir kapsam metni olmadan verilemiyor.',
    },
    {
      q: 'Kısa listemde biri büyük bir ajans, diğeri altı kişilik butik bir ekip var. Bizim gibi orta ölçekli bir firmaya hangisi daha uygun olur, neden?',
      stage: 'karsilastirma',
      answeredBy: 'hakkımızda / ekip sayfası',
      signals: ['ekip', 'kişi sayısı', 'müşteri portföyü', 'kimin için uygun değil'],
      why: 'Ekip büyüklüğü ve müşteri profili yazılmazsa ajans kıyas tablosunda boş sütun oluyor.',
    },

    // ——— Fiyat ve kapsam ———
    {
      q: 'Sosyal medya yönetimi aylık ortalama ne kadar tutuyor? Ajansa ödediğim ücretin içinde reklam bütçesi de var mı, yoksa o ayrı mı çıkıyor?',
      stage: 'fiyat',
      answeredBy: 'ücretlendirme sayfası',
      signals: ['aylık', 'medya bütçesi hariç', 'ajans ücreti', 'başlangıç bütçesi'],
      why: 'Medya bütçesinin dahil olup olmadığı yazılmadığında fiyat sorusu rakibin sayfasından cevaplanıyor.',
    },
    {
      q: 'Aylık 30 bin TL ayırabiliyorum, bunun içinde hem reklam hem ajans ücreti olacak. Bu parayla nereye kadar çıkarım, gerçekçi bir beklenti nedir?',
      stage: 'fiyat',
      answeredBy: 'ücretlendirme sayfası + SSS',
      signals: ['başlangıç bandı', 'bütçe', 'kapsam', 'öneri paket'],
      why: 'Bütçe bandı yazılı olan ajans, elemenin ilk turunda “bütçesi belirsiz” diye kenara çekilmiyor.',
    },
    {
      q: 'Kurumsal bir web sitesi yaptıracağız, yaklaşık ne kadar tutar? Teslimden sonra bakım, hosting, içerik güncellemesi gibi ek ücretler çıkar mı?',
      stage: 'fiyat',
      answeredBy: 'web tasarımı hizmet sayfası',
      signals: ['bakım', 'hosting', 'ek ücret', 'teslim sonrası'],
      why: 'Gizli maliyet kaygısı, kapsam dışı kalemler yazılmadığında teklifi baştan öldürüyor.',
    },
    {
      q: 'Sözleşme kaç aylık oluyor, başlangıçta ayrı bir kurulum bedeli alınıyor mu? İlk ay ödeyeceğim toplam rakamı önden bilmek istiyorum.',
      stage: 'fiyat',
      answeredBy: 'ücretlendirme / sözleşme koşulları',
      signals: ['kurulum bedeli', 'sözleşme süresi', 'asgari süre', 'ödeme planı'],
      why: 'İlk ay çıkacak toplam tutar netse görüşme fiyat pazarlığıyla değil kapsamla başlıyor.',
    },
    {
      q: 'Acaba şimdi mi başlamalıyım, yoksa yeni yılın bütçesi açılana kadar bekleyip ocakta mı anlaşayım? Beklemenin bize maliyeti olur mu?',
      stage: 'fiyat',
      answeredBy: 'blog yazısı veya SSS',
      signals: ['bütçe dönemi', 'ne zaman başlamalı', 'hazırlık süresi', 'ilk sonuçlar'],
      why: 'Zamanlama sorusuna cevap veren metin, kararı erteleyen müşteri adayını görüşmeye çekiyor.',
    },
    {
      q: 'Tam kapsamlı ajans hizmeti şu an bütçemizi aşıyor. Bunun daha uygun bir alternatifi var mı — mesela danışmanlık alıp uygulamayı kendimiz yapsak olur mu?',
      stage: 'fiyat',
      answeredBy: 'hizmet sayfası (danışmanlık / eğitim paketi)',
      signals: ['danışmanlık', 'eğitim', 'daha küçük paket', 'kimin için uygun'],
      why: 'Küçük bütçeli müşteri adayına bir giriş kapısı yazılıysa ilişki tamamen kaybedilmiyor.',
    },

    // ——— Güven ve yetki ———
    {
      q: 'Şu ajansı duydun mu, gerçek bir şirket mi? Ofisleri nerede, kaç kişilik bir ekip ve müşteri yorumları nasıl?',
      stage: 'guven',
      answeredBy: 'hakkımızda + künye',
      signals: ['ticari unvan', 'adres', 'kurucu', 'ekip'],
      why: 'Künye ve adres metinle doğrulanamayan ajans, son kontrolde listeden düşüyor.',
    },
    {
      q: 'Portföydeki işleri gerçekten kendileri mi yapmış? Hangi sektörlerde çalışmışlar, bizimkine benzer bir müşterileri olmuş mu?',
      stage: 'guven',
      answeredBy: 'vaka çalışmaları sayfası',
      signals: ['vaka çalışması', 'sektör', 'süre', 'ekibin rolü'],
      why: 'Vakalar görselin ve sunumun içinde kaldığı sürece o iş metin tarafında yapılmamış sayılıyor.',
    },
    {
      q: 'Sözleşmeyi imzalamadan önce nelere dikkat etmeliyim, ajanslarla çalışırken en sık hangi konuda sorun çıkıyor?',
      stage: 'guven',
      answeredBy: 'SSS veya blog yazısı',
      signals: ['sözleşme', 'kapsam dışı', 'fesih', 'revizyon'],
      why: 'Riskleri kendi sayfasında açıkça yazan ajans, tedirgin karar vericinin güvenini önden kazanıyor.',
    },
    {
      q: 'İşi kim yönetecek, benim muhatabım kim olacak? Toplantıda gördüğüm ekip mi çalışacak yoksa iş stajyerlere mi kalacak?',
      stage: 'guven',
      answeredBy: 'ekip / çalışma süreci sayfası',
      signals: ['müşteri temsilcisi', 'ekip', 'kim ilgilenecek', 'iletişim'],
      why: 'Muhatabın kim olacağı yazılmazsa ajans ile serbest çalışan arasındaki fark anlaşılmıyor.',
    },
    {
      q: 'Sitelerinde reklam platformu iş ortaklığı rozetleri var, bunlar gerçek mi ve nasıl doğrulayabilirim? Bir de referans müşterilerle görüşebilir miyim?',
      stage: 'guven',
      answeredBy: 'hakkımızda + vaka sayfası',
      signals: ['iş ortağı', 'sertifika', 'referans', 'doğrulama'],
      why: 'Rozet yalnızca görselse doğrulanabilir bir iz bırakmıyor; bağlantı ve metin gerekiyor.',
    },

    // ——— Satın alma sonrası ———
    {
      q: 'Ay sonunda bana ne raporlanıyor? Rakamları sadece sunumda mı görürüm, yoksa reklam hesabına kendim de bakabilir miyim?',
      stage: 'sonrasi',
      answeredBy: 'çalışma süreci / raporlama sayfası',
      signals: ['aylık rapor', 'raporlama', 'hesap erişimi', 'toplantı'],
      why: 'Raporlama ritmi yazılıysa müşteri adayı ilişkinin nasıl yürüyeceğini önceden görüyor.',
    },
    {
      q: 'Çalışmadan memnun kalmazsam nasıl çıkarım? Fesih için kaç ay önceden haber vermem gerekiyor, cezai şart var mı?',
      stage: 'sonrasi',
      answeredBy: 'SSS / sözleşme koşulları',
      signals: ['fesih', 'ihbar süresi', 'sözleşme sonu', 'çıkış'],
      why: 'Çıkış koşulu belirsiz kalan ajansla uzun süreli sözleşmeye girmek istemiyorlar.',
    },
    {
      q: 'Ayrılırsak reklam hesapları, alan adı ve üretilen görseller kimde kalıyor? Hepsi bizim mülkiyetimizde mi olacak?',
      stage: 'sonrasi',
      answeredBy: 'SSS veya sözleşme koşulları',
      signals: ['mülkiyet', 'hesap devri', 'kaynak dosya', 'erişim'],
      why: 'Varlıkların kimde kalacağı yazılı değilse karar verici riskli buluyor.',
    },
    {
      q: 'Hazırlanan içerikte kaç tur revizyon hakkım var? Beğenmediğim bir tasarım için ek ücret ödemek zorunda kalır mıyım?',
      stage: 'sonrasi',
      answeredBy: 'hizmet sayfası (kapsam bölümü)',
      signals: ['revizyon', 'onay süreci', 'kapsam dışı', 'ek ücret'],
      why: 'Revizyon sınırı yazılmadığında en sık yaşanan anlaşmazlık baştan doğuyor.',
    },
    {
      q: 'Anlaştıktan sonra ne zaman ilk somut sonucu görürüm? İlk üç ayda neyin değişmesini beklemeliyim, neyin değişmeyeceğini de söyler misin?',
      stage: 'sonrasi',
      answeredBy: 'çalışma süreci sayfası + SSS',
      signals: ['ilk ay', 'üç ay', 'beklenti', 'ne ölçüyoruz'],
      why: 'Gerçekçi bir zaman çizelgesi yazmak, abartılı vaat veren rakiplerin yanında güven kazandırıyor.',
    },
  ],
};
