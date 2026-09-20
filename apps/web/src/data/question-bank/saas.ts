import type { SectorQuestionBank } from './types';

/** SaaS — müşterinin yapay zekâya sorduğu sorular. */
export const BANK: SectorQuestionBank = {
  slug: 'saas',

  note:
    'SaaS alıcısı ürünü adıyla değil ihtiyaç diliyle sorar: ekip büyüklüğünü, yaptığı işi ve takıldığı yeri tek cümlede anlatıp kendisine uygun bir kısa liste ister. ' +
    'Sorular hızla şartnameye dönüşür; entegrasyon, fiyatın birimi, verinin nerede tutulduğu ve sözleşme süresi gibi tek başına eleme yapan başlıklar aynı cümlenin içine sıkışır. ' +
    'Cevap veren sayfa fiyat tablosu, entegrasyon listesi, güvenlik metni ve yardım merkezidir; bu başlıklar görselde veya PDF’de kaldığında soru cevapsız sayılır.',

  questions: [
    // ————— Keşif —————
    {
      q: 'Beş kişilik bir muhasebe ofisi işletiyorum, faturaları hâlâ Excel’de takip ediyoruz ve ay sonunu kapatmak iki günümüzü alıyor — bunun için nasıl bir program kullanmalıyım?',
      stage: 'kesif',
      answeredBy: 'ürün tanıtım sayfası (kimler için, hangi işi çözüyor)',
      signals: ['ön muhasebe', 'fatura takibi', 'excel', 'küçük işletme'],
      why: 'Alıcı kategori adını bilmediği için ürünü işini anlatarak arar; sayfada işin adı geçmiyorsa eşleşme kurulmaz.',
    },
    {
      q: 'Ekipte 12 kişiyiz, müşteri e-postaları ortak bir gelen kutusuna düşüyor ve kimin neye cevap verdiği sürekli karışıyor; buna çözüm olan bir araç var mı?',
      stage: 'kesif',
      answeredBy: 'özellik sayfası (ekip içi talep yönetimi)',
      signals: ['ortak gelen kutusu', 'yardım masası', 'talep', 'atama'],
      why: 'Sorun cümlesiyle özellik adı arasındaki köprüyü kuran metin yoksa asistan aynı işi yapan başka bir ürünü öneriyor.',
    },
    {
      q: 'İnternetten satış yapıyoruz, pazaryeri siparişlerini ve stokları tek yerden görmek istiyorum — bu işi yapan yazılımın adı ne, neye bakmalıyım?',
      stage: 'kesif',
      answeredBy: 'ürün tanıtım sayfası + entegrasyonlar sayfası',
      signals: ['pazaryeri entegrasyonu', 'stok takibi', 'sipariş yönetimi', 'tek ekran'],
      why: 'Kategori adını öğrenmek isteyen alıcı, kategoriyi ilk açıklayan sayfada karşısına çıkan ürünü kısa listeye alıyor.',
    },
    {
      q: 'Şirkette izin ve bordro işleri hâlâ kâğıt üzerinden yürüyor, 40 kişilik bir firmayız; bizim ölçeğimize uygun bir İK yazılımı tam olarak neleri çözer?',
      stage: 'kesif',
      answeredBy: 'özellik sayfası + kimler için bölümü',
      signals: ['izin yönetimi', 'bordro', 'çalışan sayısı', 'ik süreçleri'],
      why: 'Ölçek bilgisi cümlenin içinde geldiği için, sayfada hangi büyüklükteki ekiplere uygun olduğunu yazmayan ürün eleniyor.',
    },
    {
      q: 'Yeni bir projeye başlıyoruz, ekibin yarısı uzaktan çalışıyor; görev takibi için ne önerirsin, kurması ve ekibe alıştırması uzun sürer mi?',
      stage: 'kesif',
      answeredBy: 'ürün sayfası + yardım merkezi başlangıç rehberi',
      signals: ['proje yönetimi', 'görev takibi', 'kurulum', 'başlangıç rehberi'],
      why: 'Kurulum yükü ilk cümlede soruluyor; “dakikalar içinde başlayın” gibi bir bilgi metinde yoksa soru cevapsız kalıyor.',
    },
    {
      q: 'Durumum şu: butik bir ajans işletiyorum, 30 kadar müşterim var, teklif ve sözleşme takibini WhatsApp üzerinden yapıyorum — bana ne önerirsin?',
      stage: 'kesif',
      answeredBy: 'ürün sayfası + sektöre özel kullanım sayfası',
      signals: ['crm', 'teklif takibi', 'müşteri kaydı', 'ajans'],
      why: 'Alıcı kendi iş kolunu söylediğinde asistan o iş kolunu adıyla anan sayfaları öne alıyor.',
    },

    // ————— Karşılaştırma —————
    {
      q: 'Ön muhasebe programı mı yoksa tam kapsamlı bir ERP mi almalıyım? 15 kişilik, üretim de yapan bir firma için hangisi daha mantıklı?',
      stage: 'karsilastirma',
      answeredBy: 'karşılaştırma sayfası (kategori farkı)',
      signals: ['ön muhasebe', 'erp', 'hangi durumda', 'kullanıcı sayısı'],
      why: 'Kategori sınırını kendi sayfasında çizmeyen ürün, rakibin yazdığı karşılaştırmanın diliyle anlatılıyor.',
    },
    {
      q: 'Bulut tabanlı bir yazılım mı yoksa kendi sunucumuza kurulan bir çözüm mü bizim için daha doğru olur, verilerimiz oldukça hassas?',
      stage: 'karsilastirma',
      answeredBy: 'güvenlik ve altyapı sayfası',
      signals: ['bulut', 'kendi sunucunuza kurulum', 'veri merkezi', 'erişim yetkileri'],
      why: 'Kurulum modeli kararı tek başına kesiyor; sayfada model adı geçmiyorsa ürün ihtimal listesinden çıkıyor.',
    },
    {
      q: 'Şu an kullandığımız yabancı araçtan Türkçe destek veren bir alternatife geçmeyi düşünüyoruz — farkları neler, geçiş sırasında veriler taşınıyor mu?',
      stage: 'karsilastirma',
      answeredBy: 'alternatif sayfası + veri aktarımı sayfası',
      signals: ['alternatif', 'türkçe destek', 'veri aktarımı', 'geçiş'],
      why: 'Geçiş sorusu hem karşılaştırma hem risk sorusudur; ikisini aynı sayfada karşılamayan ürün ikinci turda eleniyor.',
    },
    {
      q: 'İki ürün arasında kaldık; biri kullanıcı başına ücretlendiriyor, diğeri sabit paket veriyor. Sezonluk çalışan bir ekipte hangisi daha hesaplı olur?',
      stage: 'karsilastirma',
      answeredBy: 'fiyat sayfası + paket karşılaştırma tablosu',
      signals: ['kullanıcı başına', 'sabit paket', 'kullanıcı ekleme', 'paket karşılaştırması'],
      why: 'Fiyatlama modelinin mantığı yazılmadığında asistan hesabı yapamıyor ve modeli açık yazan rakibi öneriyor.',
    },
    {
      q: 'Neden bunu önerdin? Artılarını ve eksilerini de yazar mısın, hangi durumlarda bu ürün bize uymaz?',
      stage: 'karsilastirma',
      answeredBy: 'karşılaştırma sayfası + SSS',
      signals: ['hangi durumlarda uygun değil', 'sınırlamalar', 'avantaj', 'karşılaştırma tablosu'],
      why: 'Sınırlarını kendi yazan ürün gerekçeli cevapta daha sağlam durur; eksik bilgiyi asistan başka kaynaktan tamamlıyor.',
    },
    {
      q: 'Ücretsiz planı olan araçlarla ücretli paketler arasındaki gerçek fark ne, ücretsiz planla nereye kadar ilerleyebilirim?',
      stage: 'karsilastirma',
      answeredBy: 'fiyat sayfası (plan sınırları)',
      signals: ['ücretsiz plan', 'kullanıcı sınırı', 'kayıt sınırı', 'paket farkları'],
      why: 'Ücretsiz planın sınırı yazılmazsa ürün ya olduğundan cömert ya da olduğundan kısıtlı anlatılıyor.',
    },

    // ————— Fiyat ve kapsam —————
    {
      q: 'Aylık ne kadar tutuyor, ödeme kullanıcı başına mı yoksa şirket başına mı? Yazan fiyatlar KDV dahil mi?',
      stage: 'fiyat',
      answeredBy: 'fiyat sayfası',
      signals: ['kullanıcı başına', 'aylık', 'kdv dahil', 'fiyat'],
      why: 'Fiyatın birimi ve KDV durumu yazılmadığında asistan eski bir derleme yazısındaki rakamı kullanıyor.',
    },
    {
      q: 'Bütçem aylık 5.000 TL civarı, bu parayla 10 kişilik ekibe kaç kullanıcılık paket alabilirim, hangi özellikler bu bütçenin dışında kalır?',
      stage: 'fiyat',
      answeredBy: 'fiyat sayfası + paket kapsam tablosu',
      signals: ['paket', 'kullanıcı sayısı', 'hangi pakette', 'fiyat listesi'],
      why: 'Bütçeyle paket eşleştirmesi metin olarak yoksa ürün bütçeye uygun seçenekler listesine hiç girmiyor.',
    },
    {
      q: 'Kurulum ve eğitim için ayrıca ücret alıyor musunuz, sonradan ek maliyet çıkar mı?',
      stage: 'fiyat',
      answeredBy: 'fiyat sayfası + SSS',
      signals: ['kurulum ücreti', 'eğitim', 'ek ücret', 'tek seferlik'],
      why: 'Gizli maliyet kaygısı SaaS alımında en sık tekrar eden itiraz; cevabı sayfada olan ürün kısa listede kalıyor.',
    },
    {
      q: 'Yıllık ödesem indirim oluyor mu, yıl ortasında kullanıcı eklersem aradaki fark nasıl hesaplanıyor?',
      stage: 'fiyat',
      answeredBy: 'fiyat sayfası + faturalama SSS’si',
      signals: ['yıllık ödeme', 'indirim', 'kullanıcı ekleme', 'fark fatura'],
      why: 'Faturalama kuralları yazılı değilse finans onayı gecikiyor ve karar başka ürüne kayıyor.',
    },
    {
      q: 'Acaba şimdi mi almalıyım, yoksa yeni yıl bütçesini bekleyeyim mi? Fiyatlarınız dönem dönem değişiyor mu, sözleşme süresince sabit kalıyor mu?',
      stage: 'fiyat',
      answeredBy: 'fiyat sayfası (güncelleme tarihi ve fiyat politikası)',
      signals: ['güncelleme tarihi', 'fiyat değişikliği', 'sözleşme süresince', 'kampanya'],
      why: 'Tarihsiz fiyat sayfası asistan tarafından eski kabul ediliyor ve ürün güncel olmayan rakamla kıyaslanıyor.',
    },
    {
      q: 'Bunun daha uygun fiyatlı bir alternatifi var mı, yeni başlayan küçük işletmeler için daha sade bir paket sunuyor musunuz?',
      stage: 'fiyat',
      answeredBy: 'fiyat sayfası (başlangıç paketi)',
      signals: ['başlangıç paketi', 'küçük işletme', 'uygun fiyatlı', 'paketler'],
      why: 'Giriş paketini adıyla yazan ürün, bütçesi dar alıcının listesinde tek isim olarak kalabiliyor.',
    },

    // ————— Güven ve yetki —————
    {
      q: 'Bu firmayı daha önce duymadım; kaç yıldır bu işi yapıyorsunuz, hangi şirketler kullanıyor, gerçek kullanıcı yorumu var mı?',
      stage: 'guven',
      answeredBy: 'hakkımızda sayfası + referans ve yorum bölümü',
      signals: ['kuruluş yılı', 'referans', 'müşteri yorumları', 'kullanıcı deneyimi'],
      why: 'Şirketi tanıtan metin yoksa asistan cevabına ürünü koymaktan çekiniyor, bilinen adı öne alıyor.',
    },
    {
      q: 'Verilerimiz tam olarak nerede tutuluyor, KVKK’ya uygun musunuz, yurt dışına veri aktarımı oluyor mu?',
      stage: 'guven',
      answeredBy: 'güvenlik ve KVKK sayfası',
      signals: ['veri merkezi', 'kvkk', 'aydınlatma metni', 'veri işleyen sözleşmesi'],
      why: 'Bilgi güvenliği onayı olmadan kurumsal alım ilerlemiyor; bu metinler sadece sözleşme ekindeyse cevap “belirtilmemiş” oluyor.',
    },
    {
      q: 'Bir aksaklık olduğunda ne kadar sürede dönüş alıyoruz, destek hafta sonu da çalışıyor mu, telefonla bir insana ulaşabiliyor muyum?',
      stage: 'guven',
      answeredBy: 'destek sayfası',
      signals: ['destek saatleri', 'yanıt süresi', 'telefon', 'canlı destek'],
      why: 'Destek koşulları sayfada yazılıysa asistan bunu doğrudan aktarıyor; yazılı değilse ürün belirsiz kategorisine düşüyor.',
    },
    {
      q: 'Sözleşmeyi imzalamadan önce nelere dikkat etmeliyim, sizde asgari taahhüt süresi var mı, istediğim ay çıkabiliyor muyum?',
      stage: 'guven',
      answeredBy: 'sözleşme ve SSS sayfası',
      signals: ['sözleşme süresi', 'taahhüt', 'iptal koşulları', 'fesih'],
      why: 'Taahhüt sorusu alımın son adımında çıkıyor ve cevabı bulunmayan ürün riskli görülüyor.',
    },
    {
      q: 'Sistem kesintiye uğrarsa ne oluyor, yedekleme yapıyor musunuz, geçmiş kesintileri görebileceğim bir sayfanız var mı?',
      stage: 'guven',
      answeredBy: 'durum (uptime) sayfası + güvenlik sayfası',
      signals: ['çalışma süresi', 'yedekleme', 'kesinti', 'durum sayfası'],
      why: 'Süreklilik bilgisi, teknik onayı veren tarafın ilk sorduğu madde ve genelde sitede hiç yazmıyor.',
    },
    {
      q: 'Türkiye’de ofisiniz var mı, faturayı şahıs şirketime kesebiliyor musunuz, e-fatura düzenliyor musunuz?',
      stage: 'guven',
      answeredBy: 'iletişim ve kurumsal künye sayfası',
      signals: ['şirket unvanı', 'adres', 'e-fatura', 'vergi dairesi'],
      why: 'Muhasebe tarafı faturalandırmayı netleştiremezse alım, teknik değerlendirme bitse bile duruyor.',
    },

    // ————— Satın alma sonrası —————
    {
      q: 'Satın aldıktan sonra mevcut verilerimizi Excel’den aktarmamıza yardım ediyor musunuz, aktarım ne kadar sürüyor?',
      stage: 'sonrasi',
      answeredBy: 'kurulum ve veri aktarımı sayfası',
      signals: ['veri aktarımı', 'excel', 'geçiş desteği', 'kurulum süreci'],
      why: 'Geçiş yükü alımı erteleten en somut sebep; yazılı bir süreç bu itirazı baştan kaldırıyor.',
    },
    {
      q: 'Yeni mali döneme bu sistemle başlamak istiyoruz, aralık ortasında karar versek kurulum yetişir mi?',
      stage: 'sonrasi',
      answeredBy: 'kurulum süreci sayfası',
      signals: ['kurulum süresi', 'devreye alma', 'takvim', 'başlangıç adımları'],
      why: 'Takvim baskısı olan alıcı, süreyi net yazan ürüne yöneliyor; süre yoksa risk alınmıyor.',
    },
    {
      q: 'Vazgeçersem verilerimi dışarı alabiliyor muyum, aboneliği iptal ettiğimde hesaptaki kayıtlara ne oluyor?',
      stage: 'sonrasi',
      answeredBy: 'SSS + veri politikası sayfası',
      signals: ['veri dışa aktarma', 'iptal', 'hesabın kapatılması', 'yedek alma'],
      why: 'Çıkış yolu belirsiz olan ürün, veriyi kilitleyen çözüm olarak okunuyor ve öneri dışında kalıyor.',
    },
    {
      q: 'Ekibe eğitimi kim veriyor, yeni işe aldığım kişi sistemi kendi başına öğrenebilir mi?',
      stage: 'sonrasi',
      answeredBy: 'yardım merkezi + eğitim sayfası',
      signals: ['eğitim', 'yardım merkezi', 'kullanım kılavuzu', 'video'],
      why: 'Yardım merkezi bota kapalıysa ürünün en ayrıntılı anlatıldığı metinler cevaba hiç girmiyor.',
    },
    {
      q: 'Deneme sürümünde girdiğim kayıtlar ücretli pakete geçince duruyor mu, deneme için kredi kartı istiyor musunuz?',
      stage: 'sonrasi',
      answeredBy: 'ücretsiz deneme sayfası + SSS',
      signals: ['ücretsiz deneme', 'deneme süresi', 'kredi kartı', 'pakete geçiş'],
      why: 'Denemeye başlamanın koşulu netse asistan ürünü “hemen denenebilir” diye anıyor.',
    },
    {
      q: 'Bize özel bir alan ya da rapor eklenmesi gerekirse yapıyor musunuz, yeni özellikler ne sıklıkla geliyor?',
      stage: 'sonrasi',
      answeredBy: 'özelleştirme sayfası + sürüm notları',
      signals: ['özelleştirme', 'sürüm notları', 'yol haritası', 'geliştirme talebi'],
      why: 'Sürüm notları eski tarihte durmuşsa ürün canlı bir yazılım olarak değil, bırakılmış bir proje gibi okunuyor.',
    },
  ],
};
