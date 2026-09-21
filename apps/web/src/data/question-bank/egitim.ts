import type { SectorQuestionBank } from './types';

/** Eğitim — müşterinin yapay zekâya sorduğu sorular. */
export const BANK: SectorQuestionBank = {
  slug: 'egitim',

  note:
    'Eğitimde soruyu çoğunlukla karar veren kişi değil, kararı finanse eden kişi yazar: veli çocuğu için, çalışan yetişkin kendi takvimi için, insan kaynakları uzmanı ekibi için sorar. Cümleler uzundur ve hep bir kısıt taşır — yaş, sınıf, ilçe, hafta sonu, akşam saati, aylık bütçe, dönem başlangıcı. İkinci soru neredeyse her zaman ücretin kapsamı, verilen belgenin geçerliliği ve vazgeçme koşulu üzerinedir; bu üçü sayfada yazılı değilse konuşma başka kuruma kayar.',

  questions: [
    // ————— Keşif —————
    {
      q: 'Kızım eylülde 8. sınıfa geçiyor, LGS için hafta sonu grubu olan bir kursa yazdırmak istiyorum ama nereden başlayacağımı bilmiyorum; Ataşehir ve çevresinde nasıl bir kurum aramalıyım?',
      stage: 'kesif',
      answeredBy: 'program sayfası (LGS hazırlık) + şube sayfası',
      signals: ['hafta sonu grubu', 'lgs hazırlık', '8. sınıf', 'kontenjan'],
      why: 'Veli kurum adı değil, sınıf düzeyi ve gün kısıtıyla arıyor; sayfada bu iki bilgi yazılı değilse kısa listeye hiç girilmiyor.',
    },
    {
      q: 'Tam zamanlı çalışıyorum, ancak akşam 19.00’dan sonra ya da hafta sonu derse girebilirim; İngilizcemi konuşma seviyesinde ilerletmek istiyorum, benim durumuma nasıl bir program uyar?',
      stage: 'kesif',
      answeredBy: 'program sayfası (genel İngilizce) + ders programı bölümü',
      signals: ['akşam grubu', 'hafta içi akşam', 'konuşma kulübü', 'seviye tespit sınavı'],
      why: 'Çalışan yetişkinin tek gerçek kısıtı saat; ders saatleri sayfada yazmıyorsa asistan programı hiç öneremiyor.',
    },
    {
      q: 'Oğlum 3 yaşında, eylülde kreşe başlamasını istiyoruz ama tam gün mü yarım gün mü olsun karar veremedik; bu yaş için neye göre seçim yapmalıyız?',
      stage: 'kesif',
      answeredBy: 'okul öncesi program sayfası + SSS',
      signals: ['tam gün', 'yarım gün', 'yaş grubu', 'günlük akış'],
      why: 'Okul öncesinde seçim kriteri fiyattan önce gün düzeni; bu ayrımı yazan kurum ilk cevapta anılıyor.',
    },
    {
      q: 'Muhasebe bölümünden mezunum ama sektör değiştirmek istiyorum; bir yıl içinde iş arayabileceğim hangi alanda eğitim almalıyım, neden onu önerdiğini de yazar mısın?',
      stage: 'kesif',
      answeredBy: 'kariyer programları listesi + rehber içerik',
      signals: ['ön koşul', 'kariyer değişimi', 'program süresi', 'kimler için uygun'],
      why: 'Aday alan adını bile bilmeden soruyor; “kimler için uygun” başlığı olan sayfalar bu ilk cevabın kaynağı oluyor.',
    },
    {
      q: 'Şirkette 12 kişilik satış ekibimize eğitim aldıracağız; yerinde mi yoksa online mı yapılsın, böyle bir süreç nasıl planlanıyor?',
      stage: 'kesif',
      answeredBy: 'kurumsal eğitim sayfası',
      signals: ['kurumsal eğitim', 'yerinde eğitim', 'katılımcı sayısı', 'eğitim içeriği'],
      why: 'Kurumsal talep bireysel kurs sayfasından okunmuyor; ayrı bir sayfa yoksa kurum bu soruda hiç görünmüyor.',
    },
    {
      q: 'YKS sonucum açıklandı, sıralamam beklediğimin altında kaldı ve bir yıl daha hazırlanmayı düşünüyorum; tekrar hazırlananlar için ayrı bir program açıyor musunuz?',
      stage: 'kesif',
      answeredBy: 'program sayfası (mezun grubu) + kayıt takvimi',
      signals: ['mezun grubu', 'kayıt takvimi', 'ders programı', 'deneme sınavı'],
      why: 'Sonuç açıklanan haftada sorulan bu soru yılın en yoğun trafiğini taşıyor ve takvimi güncel olmayan sayfalar eleniyor.',
    },
    {
      q: 'Kızım 9 yaşında ve resme çok meraklı; oturduğumuz semtte hafta sonu açık olan, yaş gruplarına göre ayrı sınıf açan bir atölye var mı?',
      stage: 'kesif',
      answeredBy: 'branş kursu sayfası + şube/atölye sayfası',
      signals: ['yaş grubu', 'hafta sonu', 'atölye', 'adres'],
      why: 'Konum ve gün kısıtlı çocuk kursu aramalarında adres bilgisi tek listede sıkışmışsa semt bazlı soruda eşleşme olmuyor.',
    },

    // ————— Karşılaştırma —————
    {
      q: 'Özel okul mu, iyi bir devlet okulu artı takviye kurs mu — aynı bütçeyle hangisi çocuğum için daha mantıklı, artılarını ve eksilerini de yazar mısın?',
      stage: 'karsilastirma',
      answeredBy: 'rehber içerik + ücret ve kapsam sayfası',
      signals: ['ücrete dâhil', 'sınıf mevcudu', 'ders saati', 'takviye ders'],
      why: 'Asistan bu tabloyu yalnız sayfada yazılı kapsam bilgisinden kuruyor; kapsamı yazmayan kurumun satırı boş kalıyor.',
    },
    {
      q: 'Online canlı ders mi yüz yüze sınıf mı seçmeliyim; evde odaklanamamaktan endişe ediyorum, ikisinin farkı sizde nasıl işliyor?',
      stage: 'karsilastirma',
      answeredBy: 'program sayfası (biçim bölümü)',
      signals: ['canlı ders', 'yüz yüze', 'karma', 'ders kaydı'],
      why: 'Biçim bilgisi (online, yüz yüze, karma) karşılaştırmanın ilk satırı; sayfada yoksa kurum tabloya hiç girmiyor.',
    },
    {
      q: 'Bire bir özel ders mi, 8 kişilik küçük grup mu — aynı paraya hangisinden daha çok verim alırım, siz hangisini önerirsiniz?',
      stage: 'karsilastirma',
      answeredBy: 'program sayfası + SSS',
      signals: ['bire bir', 'grup dersi', 'sınıf mevcudu', 'haftalık ders saati'],
      why: 'Mevcut ve haftalık saat yazılmadığında iki seçenek kıyaslanamıyor ve karar başka kurumun sayfasında veriliyor.',
    },
    {
      q: 'Yurt dışında yüksek lisans mı, Türkiye’de tezli yüksek lisans mı yapsam; iki yılı ve toplam maliyeti düşünürsen bana ne önerirsin?',
      stage: 'karsilastirma',
      answeredBy: 'yurt dışı eğitim danışmanlığı sayfası + rehber içerik',
      signals: ['denklik', 'program süresi', 'başvuru koşulları', 'toplam maliyet'],
      why: 'Karşılaştırmanın ağırlık merkezi maliyet değil denklik; iki bilgiyi bir arada veren sayfa kaynak olarak anılıyor.',
    },
    {
      q: 'Katılım belgesi veren sertifika programı ile bakanlık onaylı belge veren program arasındaki fark tam olarak ne, işverenler hangisine bakıyor?',
      stage: 'karsilastirma',
      answeredBy: 'SSS + belge ve sertifika bilgisi bölümü',
      signals: ['katılım belgesi', 'bakanlık onaylı', 'verilen belge', 'kurum kodu'],
      why: 'Sektörün en sık karıştırılan iki kavramı bu; ayrımı yazan sayfa hem adayın hem asistanın başvuru kaynağı oluyor.',
    },
    {
      q: '26 yaşındayım ve çalışırken okumam gerekiyor; yoğun bir yazılım programı mı yoksa iki yıllık önlisans mı benim durumuma daha uygun olur?',
      stage: 'karsilastirma',
      answeredBy: 'program sayfası (süre ve ön koşul) + rehber içerik',
      signals: ['program süresi', 'ön koşul', 'çalışanlara uygun', 'ders yükü'],
      why: 'Süre, ön koşul ve haftalık yük üçlüsü yazılı değilse asistan programı çalışan adayla eşleştiremiyor.',
    },

    // ————— Fiyat ve kapsam —————
    {
      q: 'Aylık 6.000 TL ayırabiliyorum, bu bütçeyle sınava hazırlık kursunda nereye kadar çıkarım, hangi programlar bu bandın içinde kalıyor?',
      stage: 'fiyat',
      answeredBy: 'ücret ve ödeme sayfası',
      signals: ['ücret', 'aylık taksit', 'fiyat bandı', 'ödeme planı'],
      why: 'Bütçe cümlesiyle gelen soruda rakam ya da bant yazmayan kurum cevapta hiç geçmiyor.',
    },
    {
      q: 'Söylediğiniz okul ücretine servis, yemek ve kitap dâhil mi; yıl içinde beklemediğim bir ek ödeme çıkar mı?',
      stage: 'fiyat',
      answeredBy: 'ücret ve ödeme sayfası + SSS',
      signals: ['ücrete dâhil', 'servis ücreti', 'yemek', 'kitap ve kırtasiye'],
      why: 'Velinin asıl endişesi rakam değil kapsam; kalemleri ayrı ayrı yazan sayfa “gizli maliyet” sorusunun cevabı oluyor.',
    },
    {
      q: 'Kurs ücretini taksitle ödeyebiliyor muyum, peşin ödersem bir indirim uygulanıyor mu, kaç taksit yapılıyor?',
      stage: 'fiyat',
      answeredBy: 'ücret ve ödeme sayfası',
      signals: ['taksit', 'peşin ödeme', 'erken kayıt indirimi', 'kardeş indirimi'],
      why: 'Ödeme koşulu yalnız telefonda söyleniyorsa karşılaştırma tablosunda kurumun satırı boş kalıyor.',
    },
    {
      q: 'Şimdi mi kaydolsam yoksa erken kayıt dönemi bitene kadar bekleyip fiyatları görsem mi — ücret dönem içinde değişiyor mu?',
      stage: 'fiyat',
      answeredBy: 'kayıt takvimi + ücret sayfası',
      signals: ['erken kayıt', 'son başvuru tarihi', 'kayıt takvimi', 'geçerlilik tarihi'],
      why: 'Tarihi yazılı olan sayfa bu soruda kaynak oluyor; tarihsiz duyurular ise eski ücretle anılmaya devam ediyor.',
    },
    {
      q: 'Bunun daha uygun fiyatlı bir alternatifi var mı; mesela canlı ders yerine kayıtlı videolarla ilerleyen bir sürümü açıyor musunuz?',
      stage: 'fiyat',
      answeredBy: 'program sayfası (paket seçenekleri)',
      signals: ['ders kaydı', 'paket', 'online program', 'daha uygun'],
      why: 'Bütçesi yetmeyen aday alternatif arıyor; ikinci bir seçenek sunulmayan kurum bu adımda tamamen çıkıyor.',
    },
    {
      q: 'Burs veriyor musunuz, bursluluk sınavı ne zaman yapılıyor ve bursun devam etmesi için hangi şartlar aranıyor?',
      stage: 'fiyat',
      answeredBy: 'burs sayfası',
      signals: ['bursluluk sınavı', 'burs oranı', 'başvuru tarihi', 'devam şartı'],
      why: 'Burs bilgisi kayıt kararını doğrudan değiştiriyor ve çoğu sitede yalnız duyuru afişinde kalıyor.',
    },

    // ————— Güven ve yetki —————
    {
      q: 'Şu kurumu duydunuz mu, veli yorumları nasıl, ruhsatlı bir kurum mu — bunu nereden doğrulayabilirim?',
      stage: 'guven',
      answeredBy: 'kurum künyesi / hakkımızda sayfası',
      signals: ['kurum kodu', 'millî eğitim müdürlüğü', 'resmî kurum adı', 'açık adres'],
      why: 'Kimliği sayfadan okunamayan kurum cevaplarda kaynak olarak kullanılmıyor.',
    },
    {
      q: 'Dersleri kim veriyor, eğitmenlerin gerçekten o alanda tecrübesi var mı, isimleri ve özgeçmişleri bir yerde yazıyor mu?',
      stage: 'guven',
      answeredBy: 'eğitmen kadrosu sayfası',
      signals: ['eğitmen kadrosu', 'uzmanlık alanı', 'verdiği dersler', 'deneyim'],
      why: 'Eğitmen künyesi kurumu “kurs veren bir yer” olmaktan çıkarıp adı geçen bir kaynağa dönüştürüyor.',
    },
    {
      q: 'Yurt dışındaki bu üniversitenin YÖK denkliği var mı, döndüğümde diplomam Türkiye’de geçerli sayılır mı?',
      stage: 'guven',
      answeredBy: 'yurt dışı program sayfası + SSS',
      signals: ['denklik', 'tanınan üniversite', 'diploma', 'başvuru süreci'],
      why: 'Yanlış cevabı en pahalıya mal olan soru bu; sayfada yazılı değilse bilgi forum yorumlarından toplanıyor.',
    },
    {
      q: 'Program sonunda aldığım belge e-Devlet’te görünüyor mu, hangi kurum onaylıyor, işe başvururken sorun çıkarır mı?',
      stage: 'guven',
      answeredBy: 'belge ve sertifika bilgisi bölümü',
      signals: ['verilen belge', 'e-devlet', 'onaylı', 'belge sorgulama'],
      why: 'Belgenin nerede görüneceği kararın son adımı ve kurumların çoğunda sayfada hiç yazmıyor.',
    },
    {
      q: 'Kurumun paylaştığı başarı bilgilerini nereden doğrulayabilirim, bu rakamlar hangi döneme ait?',
      stage: 'guven',
      answeredBy: 'SSS + kurum künyesi',
      signals: ['dönem', 'veli onayı', 'kvkk aydınlatma metni', 'güncelleme tarihi'],
      why: 'Özel öğretim kurumlarında tanıtım dili mevzuata tabi olduğu için bu soruya tarihli ve doğrulanabilir bir çerçeveyle cevap vermek gerekiyor.',
    },
    {
      q: 'Kayıt formunda verdiğim bilgiler ne kadar süre saklanıyor, çocuğumun fotoğraflarını sosyal medyada paylaşıyor musunuz?',
      stage: 'guven',
      answeredBy: 'KVKK aydınlatma metni + SSS',
      signals: ['kvkk aydınlatma metni', 'veri saklama', 'açık rıza', 'çerez bildirimi'],
      why: 'Veli için güvenin somut karşılığı bu metin; sitede yoksa güven sinyalleri denetiminde açık kalem olarak çıkıyor.',
    },

    // ————— Satın alma sonrası —————
    {
      q: 'Kayıt sözleşmesini imzalamadan önce nelere dikkat etmeliyim; dönem başladıktan sonra bırakırsam ücretin ne kadarı iade ediliyor?',
      stage: 'sonrasi',
      answeredBy: 'kayıt ve iade koşulları sayfası',
      signals: ['iade koşulları', 'kayıt sözleşmesi', 'cayma hakkı', 'kaydı dondurma'],
      why: 'İade ve dondurma koşulu yazılı değilse aday riski üstlenmek yerine koşulu yazmış kuruma yöneliyor.',
    },
    {
      q: 'Hastalanıp derse giremezsem telafi veriyor musunuz, kaçırdığım dersin kaydını sonradan izleyebiliyor muyum?',
      stage: 'sonrasi',
      answeredBy: 'SSS + program sayfası',
      signals: ['telafi dersi', 'ders kaydı', 'devamsızlık', 'izleme süresi'],
      why: 'Uzun programlarda ilk sorulan işleyiş sorusu bu ve cevabı kayıt kararını erteletebiliyor.',
    },
    {
      q: 'Program bittikten sonra iş başvurularında destek oluyor musunuz, mezunlarınız hangi pozisyonlarda çalışıyor, sizinle iletişimde kalabiliyor muyum?',
      stage: 'sonrasi',
      answeredBy: 'program sayfası (mezuniyet sonrası bölümü)',
      signals: ['işe yerleştirme desteği', 'mezun', 'kariyer desteği', 'staj'],
      why: 'Mesleki programlarda kararı belirleyen son soru bu; sonrası anlatılmayan programlar kısa listede geriye düşüyor.',
    },
    {
      q: 'Çocuğumun gelişimini nasıl takip edeceğim, veli görüşmeleri ne sıklıkta yapılıyor, deneme sınavı sonuçları benimle paylaşılıyor mu?',
      stage: 'sonrasi',
      answeredBy: 'SSS + veli iletişimi bölümü',
      signals: ['veli görüşmesi', 'gelişim raporu', 'deneme sınavı', 'rehberlik'],
      why: 'Velinin kayıt sonrası beklentisi bu ve sayfada yazılı olduğunda kurumun farkını anlatan en somut bilgi oluyor.',
    },
    {
      q: 'Seviyem açılan gruba uymazsa grup değiştirebiliyor muyum; bir üst kura geçerken yeniden ücret ödeyecek miyim?',
      stage: 'sonrasi',
      answeredBy: 'SSS + ücret ve ödeme sayfası',
      signals: ['seviye tespit sınavı', 'kur atlama', 'grup değişikliği', 'ek ücret'],
      why: 'Dil ve beceri kurslarında en sık yaşanan memnuniyetsizlik bu; koşulu önceden yazan kurum sonradan itiraz almıyor.',
    },
  ],
};
