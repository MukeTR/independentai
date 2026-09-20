import type { SectorQuestionBank } from './types';

/** Klinik — müşterinin yapay zekâya sorduğu sorular. */
export const BANK: SectorQuestionBank = {
  slug: 'klinik',

  note:
    'Hasta adayı klinik adıyla değil şikâyet cümlesiyle başlıyor: “diş etim kanıyor”, “saçım şakaklardan geriliyor”, “babamın protezi durmuyor”. Cümleler uzun, halk dilinde ve çoğu zaman yaş, kullanılan ilaç, şehir, çalışma saati gibi kişisel bağlamla birlikte geliyor; sorunun büyük kısmı işlemin kendisinden çok süreci, hazırlığı, kimin uyguladığı ve ücretin neye göre değiştiğiyle ilgili. Sağlıkta sonuç vaadi sorulmaz, bilgi sorulur; bu yüzden bankadaki her soru bilgilendirme sayfasıyla karşılanabilecek biçimde kurulmuştur.',

  questions: [
    // ————— Keşif —————
    {
      q: 'Sabah dişimi fırçalarken diş etim kanıyor, birkaç aydır ağzımda da kötü bir tat var; bu ne anlama geliyor, hangi bölüme başvurmam gerekir?',
      stage: 'kesif',
      answeredBy: 'İşlem sayfası — diş eti tedavisi (periodontoloji)',
      signals: ['diş eti kanaması', 'diş eti hastalığı', 'periodontoloji', 'ilk muayene'],
      why: 'Hasta adayı şikâyetini halk diliyle yazıyor; sayfada yalnızca tıbbi terim geçiyorsa doğru bilgi soruyla eşleşmiyor.',
    },
    {
      q: 'Babam 68 yaşında, alt çenesinde hiç dişi kalmadı ve takma protezi ağzında durmuyor; bu yaşta hangi seçenekler var, nereden başlamamız gerekir?',
      stage: 'kesif',
      answeredBy: 'İşlem sayfası — implant üstü protez',
      signals: ['tam protez', 'implant üstü protez', 'alt çene', 'ilk değerlendirme'],
      why: 'Araştırmayı çoğu zaman hastanın kendisi değil çocuğu yapıyor ve süreci baştan anlatan bir sayfa arıyor.',
    },
    {
      q: 'Saçım şakaklardan geriliyor ve iki yıldır ilerliyor; saç ekimi tam olarak nasıl bir işlem, önce kime görünmem ve hangi tahlilleri yaptırmam gerekiyor?',
      stage: 'kesif',
      answeredBy: 'İşlem sayfası — saç ekimi',
      signals: ['saç dökülmesi', 'greft', 'ön görüşme', 'kan tahlili'],
      why: 'Sektörün en çok sorulan işleminde soru “nedir” değil “nereden başlanır” biçiminde geliyor.',
    },
    {
      q: 'Beş yaşındaki oğlumun ön süt dişinde çürük var, çevredekiler “nasıl olsa düşecek” diyor; çocuk diş hekimine götürmeli miyim, muayenede neler yapılıyor?',
      stage: 'kesif',
      answeredBy: 'İşlem sayfası — çocuk diş hekimliği',
      signals: ['süt dişi', 'çocuk diş hekimliği', 'çürük', 'koruyucu tedavi'],
      why: 'Ebeveyn sorusu bir yanlış bilgiyi doğrulatmak için soruluyor; sayfa bu inanışa değiniyorsa cevabın içine giriyor.',
    },
    {
      q: 'Kadıköy tarafında oturuyorum ve hafta içi 18.00’den önce izin alamıyorum; akşam saatlerinde ya da cumartesi muayene yapan bir yer var mı, randevuyu nasıl alabilirim?',
      stage: 'kesif',
      answeredBy: 'İletişim ve randevu sayfası',
      signals: ['çalışma saatleri', 'cumartesi', 'randevu', 'adres'],
      why: 'Konum ve saat kısıtı olan sorularda çalışma saatleri sayfada ve şemada yazılı değilse klinik listeye hiç girmiyor.',
    },
    {
      q: '45 yaşındayım, tansiyon ilacı ve kan sulandırıcı kullanıyorum; bu işlem benim durumumda uygulanabilir mi, öncesinde hangi tahliller ve hekim onayı isteniyor?',
      stage: 'kesif',
      answeredBy: 'İşlem sayfası — hazırlık ve uygulanmasının uygun olmadığı durumlar bölümü',
      signals: ['kan sulandırıcı', 'ilaç kullanımı', 'işlem öncesi hazırlık', 'uygun olmadığı durumlar'],
      why: 'Uygunluk sorusu yalnız işlemi tarif eden sayfadan cevaplanamaz; hazırlık ve kısıt başlıkları yoksa cevap başka kaynaktan derleniyor.',
    },

    // ————— Karşılaştırma —————
    {
      q: 'Üst çenede iki azı dişim eksik; implant mı köprü mü daha mantıklı, iki yöntemin süresi, bakımı ve komşu dişlere etkisi bakımından farkı ne?',
      stage: 'karsilastirma',
      answeredBy: 'İşlem sayfası — implant (karşılaştırma bölümü)',
      signals: ['implant', 'köprü', 'komşu diş', 'tedavi süresi'],
      why: 'İki yöntemi tek sayfada karşılaştıran metin yoksa asistan karşılaştırmayı forum içeriğinden kuruyor.',
    },
    {
      q: 'Arka dişimdeki büyük çürük için kompozit dolgu mu porselen dolgu mu yapılmalı, hangisinin ne kadar dayandığını ve aradaki farkı gerekçesiyle anlatır mısın?',
      stage: 'karsilastirma',
      answeredBy: 'İşlem sayfası — dolgu ve restorasyon',
      signals: ['kompozit dolgu', 'porselen dolgu', 'inlay', 'seans sayısı'],
      why: 'Malzeme seçimi sorusu hem gerekçe hem seans sayısı istiyor; tek cümlelik işlem tarifi bu soruya yetmiyor.',
    },
    {
      q: 'Saç ekiminde DHI ile FUE arasındaki fark tam olarak ne; seans süresi, iyileşme takvimi ve kimin için hangisinin uygun olduğu açısından karşılaştırır mısın?',
      stage: 'karsilastirma',
      answeredBy: 'İşlem sayfası — saç ekimi yöntemleri',
      signals: ['dhi', 'fue', 'greft', 'iyileşme süreci'],
      why: 'Yöntem kısaltmaları sohbetin ilk mesajında geçiyor; sayfada yalnız bir yöntem anlatılıyorsa karşılaştırma sorusunda klinik anılmıyor.',
    },
    {
      q: 'Ön dişlerim için zirkonyum kaplama mı lamina mı önerirsin; neden onu önerdiğini, artılarını ve eksilerini de yazar mısın?',
      stage: 'karsilastirma',
      answeredBy: 'İşlem sayfası — estetik diş hekimliği',
      signals: ['zirkonyum', 'lamina', 'kaplama', 'diş kesimi'],
      why: 'Gerekçe istenen sorularda artı ve eksileri birlikte yazan sayfa, tek yönlü tanıtım metnine göre çok daha sık alıntılanıyor.',
    },
    {
      q: 'Yirmi yaş dişim yatık çıkmış ama şu anda ağrım yok; şimdi mi çektirmeliyim, yoksa bir sorun çıkana kadar beklemeli miyim, beklemenin riski ne olur?',
      stage: 'karsilastirma',
      answeredBy: 'İşlem sayfası — yirmi yaş dişi çekimi',
      signals: ['yirmi yaş dişi', 'gömülü diş', 'çekim', 'panoramik film'],
      why: '“Şimdi mi, sonra mı” sorusu klinikte çok sık kuruluyor ve cevabı ancak bekleme durumunu da anlatan bir metinden çıkıyor.',
    },
    {
      q: 'Başka bir yerde çıkarılan tedavi planım elimde: dört dolgu, bir kanal ve iki kaplama yazılmış; bu kadarı gerçekten gerekli mi, ikinci görüş için nasıl bir yol izlemeliyim?',
      stage: 'karsilastirma',
      answeredBy: 'SSS — ikinci görüş / muayene süreci',
      signals: ['ikinci görüş', 'tedavi planı', 'muayene', 'röntgen'],
      why: 'İkinci görüş anı kliniğin en sık kaçırdığı sohbetlerden biri; sitede bu başlık yoksa hasta adayı planını başka yere okutuyor.',
    },

    // ————— Fiyat ve kapsam —————
    {
      q: 'İmplant tedavisinin toplam maliyeti neye göre değişiyor; kemik tozu, geçici protez ve kontrol muayeneleri ayrı ayrı mı ücretlendiriliyor?',
      stage: 'fiyat',
      answeredBy: 'Ücret bilgilendirme sayfası (rakam yerine maliyeti belirleyen kalemler)',
      signals: ['ücretlendirme', 'kemik tozu', 'geçici protez', 'kontrol muayenesi'],
      why: 'Mevzuat rakam yazmaya izin vermese de maliyeti neyin değiştirdiğini anlatan sayfa bu soruyu karşılayabiliyor.',
    },
    {
      q: 'Saç ekiminde ücretin greft sayısına göre değiştiğini okudum; greft sayısı nasıl belirleniyor ve muayenede söylenen sayı işlem sırasında değişebilir mi?',
      stage: 'fiyat',
      answeredBy: 'Ücret bilgilendirme sayfası + saç ekimi işlem sayfası',
      signals: ['greft sayısı', 'ön görüşme', 'seans', 'ücreti belirleyen'],
      why: 'Hesabın nasıl kurulduğu açıklanmazsa boşluk aracı platformlardan derlenen rakamlarla doluyor.',
    },
    {
      q: 'Ayırabildiğim bütçe sınırlı, hepsini bir anda yaptıramam; tedaviyi aylara yayıp öncelikli dişten başlamak mümkün mü, planı nasıl kurarsınız?',
      stage: 'fiyat',
      answeredBy: 'Ücret bilgilendirme sayfası — tedavi planlaması',
      signals: ['tedavi planı', 'öncelikli tedavi', 'seanslara bölme', 'ödeme koşulları'],
      why: 'Bütçe kısıtı olan hasta adayı ücreti değil planlanabilirliği soruyor; bunu yazan klinik sohbette kalıyor.',
    },
    {
      q: 'Özel sağlık sigortam var; bu işlemin hangi kısmı poliçe kapsamına giriyor, ödeme doğrudan kliniğe mi yapılıyor, bana fark ücreti çıkar mı?',
      stage: 'fiyat',
      answeredBy: 'SSS — anlaşmalı kurumlar ve ödeme',
      signals: ['özel sağlık sigortası', 'anlaşmalı kurum', 'fark ücreti', 'poliçe'],
      why: 'Anlaşmalı kurum listesi sayfada yazılı değilse hasta adayı kliniği kapsam dışı sayıp listeden çıkarıyor.',
    },
    {
      q: 'Ortalama ne kadar tutuyor ve sonradan ek ücret çıkar mı; kontrol muayeneleri ile gerekirse ikinci seans bu tutara dâhil mi?',
      stage: 'fiyat',
      answeredBy: 'Ücret bilgilendirme sayfası — kapsam ve ek kalemler',
      signals: ['ek ücret', 'kontrol muayenesi', 'dâhil', 'ücretlendirme'],
      why: 'Sohbetin ilk mesajlarında gelen bu soruda kapsamın sınırı yazılmazsa klinik “belirsiz” olarak anılıyor.',
    },
    {
      q: 'Bana çıkarılan plan bütçemi aşıyor; bunun daha uygun maliyetli bir alternatifi var mı, aradaki fark neyi değiştirir?',
      stage: 'fiyat',
      answeredBy: 'İşlem sayfası — tedavi seçenekleri bölümü',
      signals: ['alternatif tedavi', 'tedavi seçenekleri', 'malzeme tercihi', 'maliyeti etkileyen'],
      why: 'Alternatif sorusu cevapsız kalırsa hasta adayı aynı soruyu başka bir kliniğin sayfasında cevaplanmış hâlde buluyor.',
    },

    // ————— Güven ve yetki —————
    {
      q: 'İşlemi hekimin kendisi mi yapıyor, yoksa büyük kısmını ekip mi yapıyor; işlem sırasında kimler bulunuyor ve hekimin uzmanlık belgesini nereden görebilirim?',
      stage: 'guven',
      answeredBy: 'Hekim künyesi sayfası + ilgili işlem sayfası',
      signals: ['uzmanlık dalı', 'hekim kadrosu', 'mezuniyet', 'işlemi uygulayan'],
      why: 'Sağlık turizminde en çok tekrarlanan sorulardan biri; cevabı yalnız adı, unvanı ve eğitimi yazılı hekim sayfasından çıkıyor.',
    },
    {
      q: 'Kliniğin Sağlık Bakanlığı ruhsatı ve sağlık turizmi yetki belgesi var mı, bu belgeleri nereden doğrulayabilirim?',
      stage: 'guven',
      answeredBy: 'Künye / hakkımızda sayfası',
      signals: ['sağlık bakanlığı', 'ruhsat', 'yetki belgesi', 'künye'],
      why: 'Yetki bilgisi sayfada görünmüyorsa asistan bunu tahmin etmiyor, kliniği hiç anmıyor.',
    },
    {
      q: 'Şu klinikten bahsedildiğini duydum; hekim kadrosunun eğitim geçmişi, uzmanlık alanları ve üyesi olduğu dernekler hakkında ne biliyorsun?',
      stage: 'guven',
      answeredBy: 'Hakkımızda + hekim künyesi sayfaları',
      signals: ['hakkımızda', 'hekim kadrosu', 'dernek üyeliği', 'uzmanlık eğitimi'],
      why: 'Adı doğrudan sorulan kliniklerde cevabın kaynağı sitenin kendisi olmalı; künye zayıfsa bilgi üçüncü sitelerden toplanıyor.',
    },
    {
      q: 'İnternette bu işlemle ilgili birbirini tutmayan bilgiler var; sitedeki yazıyı kim hazırladı, hangi kaynaklara dayanıyor ve en son ne zaman güncellendi?',
      stage: 'guven',
      answeredBy: 'İşlem sayfası — yazar, kaynak ve güncelleme bilgisi',
      signals: ['yazan hekim', 'gözden geçiren', 'güncelleme tarihi', 'kaynaklar'],
      why: 'İmzasız ve tarihsiz tıbbi metin ayırt edici sinyal taşımadığı için cevapta kaynak olarak kullanılmıyor.',
    },
    {
      q: 'Randevu formunda kimlik bilgimi ve şikâyetimi soruyorsunuz; bu bilgiler nerede saklanıyor, kimlerle paylaşılıyor ve rızamı sonradan geri çekebilir miyim?',
      stage: 'guven',
      answeredBy: 'KVKK aydınlatma metni ve açık rıza sayfası',
      signals: ['aydınlatma metni', 'açık rıza', 'kişisel veri', 'veri sorumlusu'],
      why: 'Sağlık verisi özel nitelikli sayıldığı için aydınlatma metninin varlığı hem hasta adayı hem asistan için güven sinyali.',
    },

    // ————— Satın alma sonrası —————
    {
      q: 'İşlemden sonra kaç gün kendimi toparlayamam; işe ve spora ne zaman dönebilirim, ilk haftada nelerden kaçınmam gerekir?',
      stage: 'sonrasi',
      answeredBy: 'İşlem sayfası — iyileşme takvimi bölümü',
      signals: ['iyileşme süreci', 'işe dönüş', 'ilk hafta', 'dikkat edilmesi gerekenler'],
      why: 'Randevudan önceki gecenin en sık sorusu bu; takvim yazılı değilse cevap forum yorumlarından kuruluyor.',
    },
    {
      q: 'Ameliyattan sonra dikişler ne zaman alınıyor, kontrollere kaç kez gelmem gerekiyor ve bu kontroller için ayrıca randevu mu alıyorum?',
      stage: 'sonrasi',
      answeredBy: 'İşlem sonrası bakım sayfası',
      signals: ['kontrol muayenesi', 'dikiş alımı', 'takip randevusu', 'işlem sonrası'],
      why: 'Kontrol sayısı ve takvimi kararın parçası; yazılmadığında hasta adayı süreci belirsiz sayıyor.',
    },
    {
      q: 'Şehir dışında yaşıyorum ve her kontrol için gelmem zor; kontrollerin bir kısmını kendi şehrimde yaptırabilir miyim, uzaktan takip nasıl işliyor?',
      stage: 'sonrasi',
      answeredBy: 'SSS — şehir dışından gelen hastalar',
      signals: ['kontrol randevusu', 'şehir dışı', 'uzaktan takip', 'iletişim hattı'],
      why: 'Şehir dışı hasta adayının kararı ulaşım yüküne bağlı; bu başlık sayfada yoksa sohbet başka kliniğe dönüyor.',
    },
    {
      q: 'Gece şişlik ya da kanama olursa kimi arayacağım; mesai dışında ulaşabileceğim bir hat var mı?',
      stage: 'sonrasi',
      answeredBy: 'İletişim sayfası + işlem sonrası bakım sayfası',
      signals: ['mesai dışı', 'acil durum', 'iletişim', 'işlem sonrası bakım'],
      why: 'Sorular gecenin geç saatlerine kayıyor ve o saatte klinik adına konuşan tek şey sayfada yazılı olan iletişim bilgisi.',
    },
    {
      q: 'Yaptırdığım kaplamada birkaç ay sonra kırık olursa ne oluyor; yenileme koşulları ve takip süreci nasıl işliyor?',
      stage: 'sonrasi',
      answeredBy: 'SSS — işlem sonrası takip ve yenileme koşulları',
      signals: ['yenileme koşulları', 'takip', 'kullanım ömrü', 'işlem sonrası'],
      why: 'Sonrasında ne olacağını yazan sayfa, hasta adayının riski nasıl değerlendirdiğini doğrudan etkiliyor.',
    },
    {
      q: 'Kardeşimin düğününe üç hafta kaldı; bu işlem o tarihe yetişir mi, iyileşme takvimi kaç gün sürüyor?',
      stage: 'sonrasi',
      answeredBy: 'İşlem sayfası — işlem günü ve iyileşme takvimi',
      signals: ['iyileşme takvimi', 'işlem günü', 'kaç gün', 'randevu planı'],
      why: 'Tarihe yetişme sorusu çok sık geliyor ve gün gün yazılmış bir takvim olmadan cevaplanamıyor.',
    },
  ],
};
