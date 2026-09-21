/**
 * Sektör başına satın alma soruları — `satin-alma-sorusu-kapsama` aracının veri kaynağı (9 sektör × 20–25 soru).
 * RESEARCH_BRIFING §C.3 kalıbından türetildi: konum + "hangisi/öner" + fiyat/"ne kadar" + güven işareti.
 *
 *  - `keywords: string[][]` → dış OR, iç AND (`tr-text.ts` kök eşleşmesi; eş anlamlılar orada). Örn.
 *    `[['fiyat'], ['ücret', 'aylık']]` = "fiyat" geçiyor VEYA ("ücret" VE "aylık") geçiyor.
 *  - `intent`: fiyat | konum | guven | karsilastirma | surec | uygunluk | ozellik — sonuç ekranında gruplama.
 *  - Yasak ifadeler (tests/unit/sector-questions.test.ts tarar): "en iyi", "garanti", "Türkiye'nin ilk", "hükmed";
 *    regulated sektörlerde (klinik, hukuk-danismanlik) ayrıca "sıralama", "hasta garantisi". Sorular müşterinin
 *    ağzından yazılır ama bu ifadeler bilinçli olarak dışarıda bırakılmıştır ("güvenilir", "hangisi", "öner").
 *  - Sunucu importu YOK (istemci sektör seçici soru sayısını gösterir).
 */
import type { SectorSlug } from '@/lib/tool-registry';

export type QuestionIntent = 'fiyat' | 'konum' | 'guven' | 'karsilastirma' | 'surec' | 'uygunluk' | 'ozellik';

export const INTENT_LABELS: Record<QuestionIntent, string> = {
  fiyat: 'Fiyat',
  konum: 'Konum',
  guven: 'Güven',
  karsilastirma: 'Karşılaştırma',
  surec: 'Süreç',
  uygunluk: 'Uygunluk',
  ozellik: 'Özellik',
};

export type SectorQuestion = {
  /** Sektör içinde benzersiz kısa kimlik (kebab) */
  id: string;
  /** Müşterinin yapay zekâya sorduğu soru */
  q: string;
  intent: QuestionIntent;
  /** Dış OR, iç AND — sayfa başlığı/gövdesinde aranan kökler */
  keywords: string[][];
};

const q = (id: string, text: string, intent: QuestionIntent, keywords: string[][]): SectorQuestion => ({
  id,
  q: text,
  intent,
  keywords,
});

export const SECTOR_QUESTIONS: Record<SectorSlug, SectorQuestion[]> = {
  saas: [
    q('fiyat-aylik', 'Aylık fiyatı ne kadar, kullanıcı başına mı?', 'fiyat', [['fiyat'], ['aylık', 'ücret']]),
    q('ucretsiz-plan', 'Ücretsiz planı veya deneme süresi var mı?', 'fiyat', [['ücretsiz'], ['deneme']]),
    q('kobi-uygun', 'KOBİ için uygun mu, kaç kullanıcıya kadar?', 'uygunluk', [['kobi'], ['kullanıcı', 'ekip']]),
    q('e-fatura', 'E-fatura ve e-arşiv entegrasyonu var mı?', 'ozellik', [['e fatura'], ['efatura'], ['e arşiv']]),
    q('turkce-destek', 'Türkçe destek veriyor musunuz, hangi saatlerde?', 'ozellik', [['türkçe', 'destek'], ['destek', 'saat']]),
    q('kvkk', 'KVKK uyumlu mu, veriler Türkiye’de mi tutuluyor?', 'guven', [['kvkk'], ['veri', 'türkiye'], ['veri merkezi']]),
    q('entegrasyon', 'Hangi programlarla entegre çalışıyor?', 'ozellik', [['entegrasyon'], ['api']]),
    q('rakip-fark', 'Rakiplerinden farkı ne, neden sizi seçmeliyim?', 'karsilastirma', [['karşılaştır'], ['fark'], ['neden']]),
    q('kurulum-suresi', 'Kurulum ne kadar sürer, veri aktarımı yapılıyor mu?', 'surec', [['kurulum'], ['veri aktar'], ['geçiş']]),
    q('egitim', 'Ekibime eğitim veriliyor mu?', 'surec', [['eğitim'], ['onboarding'], ['başlangıç']]),
    q('iptal', 'İstediğim zaman iptal edebilir miyim, taahhüt var mı?', 'fiyat', [['iptal'], ['taahhüt']]),
    q('mobil', 'Mobil uygulaması var mı?', 'ozellik', [['mobil'], ['ios'], ['android']]),
    q('guvenlik', 'Verilerim nasıl korunuyor, yedekleme var mı?', 'guven', [['güvenlik'], ['yedek'], ['şifreleme']]),
    q('referans', 'Hangi firmalar kullanıyor, referanslarınız kimler?', 'guven', [['referans'], ['müşteri']]),
    q('demo', 'Demo talep edebilir miyim?', 'surec', [['demo'], ['tanıtım']]),
    q('odeme', 'Ödeme nasıl yapılıyor, yıllık indirim var mı?', 'fiyat', [['ödeme'], ['yıllık']]),
    q('api', 'API dokümantasyonu açık mı?', 'ozellik', [['api'], ['geliştirici'], ['dokümantasyon']]),
    q('sla', 'Çalışma süresi (uptime) taahhüdü ve SLA var mı?', 'guven', [['sla'], ['uptime'], ['kesinti']]),
    q('coklu-sube', 'Birden çok şube veya şirket tek hesaptan yönetilir mi?', 'ozellik', [['şube'], ['çoklu'], ['çok şirket']]),
    q('rapor', 'Hangi raporları alabilirim?', 'ozellik', [['rapor'], ['analitik'], ['dashboard']]),
    q('kimsiniz', 'Şirket kim, ne zamandır bu işi yapıyor?', 'guven', [['hakkımızda'], ['kuruluş'], ['yıl']]),
    q('iletisim', 'Satış ekibine nasıl ulaşırım?', 'konum', [['iletişim'], ['telefon'], ['satış ekibi']]),
  ],
  ajans: [
    q('aylik-ucret', 'Aylık ajans ücreti ne kadar, sabit mi bütçeye bağlı mı?', 'fiyat', [['fiyat'], ['ücret'], ['bütçe']]),
    q('kobi-fiyat', 'KOBİ için uygun fiyatlı paketiniz var mı?', 'fiyat', [['kobi'], ['paket']]),
    q('hizmetler', 'Hangi hizmetleri veriyorsunuz (SEO, reklam, sosyal medya)?', 'ozellik', [['hizmet'], ['seo'], ['reklam']]),
    q('meta-reklam', 'Meta ve Google reklam yönetimi yapıyor musunuz?', 'ozellik', [['meta'], ['google ads'], ['reklam yönetimi']]),
    q('geo', 'ChatGPT ve yapay zekâ aramalarında görünürlük için ne yapıyorsunuz?', 'ozellik', [['chatgpt'], ['yapay zekâ'], ['geo'], ['ai']]),
    q('referans', 'Referanslarınız ve vaka çalışmalarınız var mı?', 'guven', [['referans'], ['vaka'], ['müşteri']]),
    q('sektor-deneyim', 'Benim sektörümde çalıştınız mı?', 'guven', [['sektör'], ['deneyim']]),
    q('raporlama', 'Nasıl raporluyorsunuz, hangi sıklıkla?', 'surec', [['rapor'], ['aylık', 'toplantı']]),
    q('sozlesme', 'Sözleşme süresi ne kadar, taahhüt var mı?', 'fiyat', [['sözleşme'], ['taahhüt'], ['süre']]),
    q('ekip', 'Ekibinizde kimler var, kaç kişisiniz?', 'guven', [['ekip'], ['kadro']]),
    q('konum', 'Ofisiniz nerede, uzaktan çalışıyor musunuz?', 'konum', [['ofis'], ['adres'], ['uzaktan']]),
    q('web-sitesi', 'Kurumsal web sitesi yapıyor musunuz, ne kadar sürer?', 'surec', [['web sitesi'], ['site tasarım']]),
    q('e-ticaret', 'E-ticaret siteleri için performans pazarlaması yapıyor musunuz?', 'uygunluk', [['e ticaret'], ['eticaret'], ['performans']]),
    q('icerik', 'İçerik üretimi ve Arapça/İngilizce içerik yapıyor musunuz?', 'ozellik', [['içerik'], ['arapça'], ['ingilizce']]),
    q('baslangic', 'Çalışmaya başlamak için süreç nasıl işliyor?', 'surec', [['süreç'], ['nasıl çalış'], ['başlangıç']]),
    q('teklif', 'Teklif almak için ne yapmalıyım?', 'surec', [['teklif'], ['iletişim']]),
    q('sonuc-suresi', 'Sonuçlar ne kadar sürede görünür?', 'surec', [['sonuç'], ['kaç ay'], ['süre']]),
    q('odeme', 'Ödeme nasıl, fatura kesiyor musunuz?', 'fiyat', [['ödeme'], ['fatura']]),
    q('fark', 'Sizi diğer ajanslardan ayıran ne?', 'karsilastirma', [['fark'], ['neden'], ['ayıran']]),
    q('araclar', 'Hangi araçları ve teknolojileri kullanıyorsunuz?', 'ozellik', [['araç'], ['teknoloji'], ['platform']]),
    q('blog', 'Sektörle ilgili yazılarınız var mı?', 'guven', [['blog'], ['makale'], ['rehber']]),
    q('kimsiniz', 'Ajans ne zaman kuruldu, hikâyeniz ne?', 'guven', [['hakkımızda'], ['kuruluş'], ['hikâye']]),
  ],
  klinik: [
    q('fiyat', 'Tedavi fiyatları ne kadar, paket fiyat var mı?', 'fiyat', [['fiyat'], ['paket'], ['ücret']]),
    q('ruhsat', 'Sağlık Bakanlığı ruhsatı var mı?', 'guven', [['ruhsat'], ['sağlık bakanlığı'], ['lisans']]),
    q('doktor', 'İşlemi doktor mu yapıyor, kim?', 'guven', [['doktor'], ['hekim'], ['uzman']]),
    q('yontem', 'Hangi yöntemleri uyguluyorsunuz (DHI, FUE, implant vb.)?', 'ozellik', [['yöntem'], ['teknik'], ['dhi'], ['fue']]),
    q('konum', 'Klinik nerede, hangi ilde ve semtte?', 'konum', [['adres'], ['konum'], ['istanbul'], ['ankara'], ['izmir']]),
    q('randevu', 'Nasıl randevu alırım, online randevu var mı?', 'surec', [['randevu'], ['online randevu']]),
    q('sure', 'İşlem ne kadar sürer, iyileşme süreci nasıl?', 'surec', [['süre'], ['iyileşme'], ['kaç gün']]),
    q('once-sonra', 'Önce/sonra örnekleri görebilir miyim?', 'guven', [['önce sonra'], ['sonuç'], ['galeri']]),
    q('yorum', 'Hasta deneyimleri ve yorumlar nerede?', 'guven', [['yorum'], ['deneyim'], ['görüş']]),
    q('konaklama', 'Şehir dışından geliyorum; konaklama ve transfer var mı?', 'ozellik', [['konaklama'], ['transfer'], ['otel']]),
    q('yabanci', 'İngilizce veya Arapça hizmet veriyor musunuz?', 'ozellik', [['ingilizce'], ['arapça'], ['yabancı hasta']]),
    q('odeme', 'Taksit veya kredi kartı ile ödeme yapılabilir mi?', 'fiyat', [['taksit'], ['ödeme'], ['kredi kartı']]),
    q('kontrol', 'Kontrol ve takip ziyaretleri dahil mi?', 'surec', [['kontrol'], ['takip']]),
    q('risk', 'Yan etkiler ve riskler neler?', 'uygunluk', [['yan etki'], ['risk'], ['komplikasyon']]),
    q('uygun-muyum', 'Bu tedavi bana uygun mu, kimler yaptıramaz?', 'uygunluk', [['uygun'], ['kimler'], ['aday']]),
    q('anestezi', 'Anestezi türü ne, ağrı olur mu?', 'surec', [['anestezi'], ['ağrı']]),
    q('calisma-saat', 'Çalışma saatleriniz ne, hafta sonu açık mısınız?', 'konum', [['çalışma saatleri'], ['hafta sonu'], ['saat']]),
    q('ekipman', 'Kullandığınız cihaz ve teknolojiler neler?', 'ozellik', [['cihaz'], ['teknoloji'], ['ekipman']]),
    q('kvkk', 'Sağlık verilerim nasıl korunuyor?', 'guven', [['kvkk'], ['gizlilik'], ['kişisel veri']]),
    q('deneyim', 'Kaç yıldır hizmet veriyorsunuz, kaç işlem yaptınız?', 'guven', [['yıl'], ['deneyim'], ['işlem sayısı']]),
    q('iletisim', 'WhatsApp veya telefonla ulaşabilir miyim?', 'konum', [['whatsapp'], ['telefon'], ['iletişim']]),
    q('sss', 'Sık sorulan sorular nerede?', 'surec', [['sık sorulan'], ['sss'], ['soru']]),
  ],
  'hukuk-danismanlik': [
    q('ucret', 'Danışmanlık veya vekâlet ücreti ne kadar?', 'fiyat', [['ücret'], ['fiyat'], ['tarife']]),
    q('aylik-musavir', 'Aylık mali müşavirlik ücreti ne kadar?', 'fiyat', [['aylık', 'ücret'], ['müşavir', 'ücret']]),
    q('alan', 'Hangi alanlarda çalışıyorsunuz (iş hukuku, kira, şirketler)?', 'ozellik', [['iş hukuku'], ['kira'], ['şirket'], ['alan']]),
    q('konum', 'Ofisiniz hangi ilde ve ilçede?', 'konum', [['adres'], ['ofis'], ['istanbul'], ['ankara'], ['kadıköy']]),
    q('online', 'Online görüşme yapıyor musunuz?', 'ozellik', [['online'], ['uzaktan'], ['görüntülü']]),
    q('ilk-gorusme', 'İlk görüşme ücretli mi?', 'fiyat', [['ilk görüşme'], ['ön görüşme'], ['ücretsiz']]),
    q('sirket-kurulus', 'Şirket kuruluşu için süreç ve maliyet ne?', 'surec', [['şirket kurulu'], ['kuruluş'], ['limited']]),
    q('e-ticaret-sahis', 'E-ticaret yapan şahıs şirketi için hizmet veriyor musunuz?', 'uygunluk', [['e ticaret'], ['şahıs şirket'], ['eticaret']]),
    q('yabanci', 'Yabancı yatırımcılara hizmet veriyor musunuz, İngilizce?', 'uygunluk', [['yabancı'], ['ingilizce'], ['uluslararası']]),
    q('sure', 'Dava veya işlem ne kadar sürer?', 'surec', [['süre'], ['ne kadar sürer'], ['kaç ay']]),
    q('ekip', 'Ekipte kimler var, uzmanlıkları ne?', 'guven', [['ekip'], ['kadro'], ['avukat'], ['müşavir']]),
    q('baro', 'Baro veya oda kaydınız var mı?', 'guven', [['baro'], ['oda'], ['sicil']]),
    q('referans', 'Hangi tür müvekkillerle çalıştınız?', 'guven', [['referans'], ['müvekkil'], ['müşteri']]),
    q('gizlilik', 'Bilgilerim gizli tutulur mu, KVKK?', 'guven', [['gizlilik'], ['kvkk'], ['sır']]),
    q('randevu', 'Randevu nasıl alınır?', 'surec', [['randevu'], ['görüşme talep']]),
    q('belgeler', 'İlk görüşmeye hangi belgeleri getirmeliyim?', 'surec', [['belge'], ['evrak'], ['hazırlık']]),
    q('odeme', 'Ödeme planı veya taksit mümkün mü?', 'fiyat', [['ödeme'], ['taksit']]),
    q('e-fatura-vergi', 'E-fatura, KDV ve vergi takvimi konusunda destek veriyor musunuz?', 'ozellik', [['e fatura'], ['vergi'], ['kdv'], ['beyanname']]),
    q('deneyim', 'Kaç yıllık deneyiminiz var?', 'guven', [['yıl'], ['deneyim'], ['kuruluş']]),
    q('blog', 'Güncel mevzuat yazılarınız var mı?', 'guven', [['blog'], ['makale'], ['mevzuat']]),
    q('iletisim', 'Telefon veya WhatsApp ile ulaşabilir miyim?', 'konum', [['telefon'], ['whatsapp'], ['iletişim']]),
    q('calisma-saat', 'Çalışma saatleriniz nedir?', 'konum', [['çalışma saatleri'], ['saat'], ['mesai']]),
  ],
  'eticaret-altyapi': [
    q('paket-fiyat', 'Paket fiyatları ne kadar, aylık mı yıllık mı?', 'fiyat', [['fiyat'], ['paket'], ['aylık']]),
    q('komisyon', 'Satıştan komisyon alıyor musunuz?', 'fiyat', [['komisyon'], ['satış payı']]),
    q('pazaryeri', 'Trendyol ve Hepsiburada entegrasyonu var mı?', 'ozellik', [['trendyol'], ['hepsiburada'], ['pazaryeri']]),
    q('odeme-altyapi', 'iyzico, PayTR gibi ödeme altyapıları bağlanıyor mu?', 'ozellik', [['iyzico'], ['paytr'], ['sanal pos'], ['ödeme']]),
    q('kargo', 'Kargo entegrasyonları hangileri?', 'ozellik', [['kargo'], ['yurtiçi'], ['aras'], ['mng']]),
    q('butik', 'Küçük butik için uygun mu, kaç ürün?', 'uygunluk', [['butik'], ['küçük işletme'], ['ürün sayısı']]),
    q('yurt-disi', 'Yurt dışına satış için çoklu dil ve döviz var mı?', 'ozellik', [['yurt dışı'], ['çoklu dil'], ['döviz']]),
    q('tema', 'Hazır temalar var mı, tasarım özelleştirilebilir mi?', 'ozellik', [['tema'], ['tasarım'], ['şablon']]),
    q('seo', 'SEO ayarları ve hız performansı nasıl?', 'ozellik', [['seo'], ['hız'], ['performans']]),
    q('tasima', 'Mevcut sitemi ve ürünlerimi taşıyabilir miyim?', 'surec', [['taşı'], ['aktar'], ['geçiş']]),
    q('kurulum', 'Kurulum ne kadar sürer?', 'surec', [['kurulum'], ['kaç gün'], ['süre']]),
    q('destek', 'Teknik destek nasıl, 7/24 mü?', 'ozellik', [['destek'], ['7/24'], ['canlı destek']]),
    q('rakip', 'Diğer altyapılardan farkınız ne?', 'karsilastirma', [['fark'], ['karşılaştır'], ['neden']]),
    q('deneme', 'Ücretsiz deneme var mı?', 'fiyat', [['deneme'], ['ücretsiz']]),
    q('muhasebe', 'Muhasebe ve e-fatura entegrasyonu var mı?', 'ozellik', [['muhasebe'], ['e fatura'], ['efatura']]),
    q('mobil', 'Mobil uygulama veya mobil uyumlu tema var mı?', 'ozellik', [['mobil'], ['uygulama']]),
    q('b2b', 'B2B / bayi satışı yapılabilir mi?', 'uygunluk', [['b2b'], ['bayi'], ['toptan']]),
    q('guvenlik', 'SSL, yedekleme ve güvenlik nasıl sağlanıyor?', 'guven', [['ssl'], ['güvenlik'], ['yedek']]),
    q('referans', 'Hangi markalar bu altyapıyı kullanıyor?', 'guven', [['referans'], ['marka'], ['müşteri']]),
    q('iptal', 'Sözleşmeyi istediğim zaman iptal edebilir miyim?', 'fiyat', [['iptal'], ['taahhüt'], ['sözleşme']]),
    q('pazarlama', 'Kampanya, kupon ve e-posta pazarlama araçları var mı?', 'ozellik', [['kampanya'], ['kupon'], ['e posta']]),
    q('egitim', 'Panel kullanımı için eğitim veriyor musunuz?', 'surec', [['eğitim'], ['akademi'], ['yardım merkezi']]),
    q('iletisim', 'Satış ekibine nasıl ulaşırım?', 'konum', [['iletişim'], ['telefon'], ['demo']]),
  ],
  egitim: [
    q('fiyat', 'Kurs ücreti ne kadar, taksit var mı?', 'fiyat', [['fiyat'], ['ücret'], ['taksit']]),
    q('sure', 'Eğitim kaç ay sürüyor, haftada kaç saat?', 'surec', [['süre'], ['kaç ay'], ['haftada']]),
    q('online-yuzyuze', 'Online mı yüz yüze mi?', 'ozellik', [['online'], ['yüz yüze'], ['canlı ders']]),
    q('ise-yerlestirme', 'İşe yerleştirme veya kariyer desteği var mı?', 'ozellik', [['işe yerleştirme'], ['kariyer'], ['istihdam']]),
    q('iskur', 'İŞKUR desteği veya ücretsiz eğitim var mı?', 'fiyat', [['işkur'], ['ücretsiz'], ['burs']]),
    q('sertifika', 'Eğitim sonunda sertifika veriliyor mu, geçerli mi?', 'guven', [['sertifika'], ['belge'], ['onaylı']]),
    q('egitmen', 'Eğitmenler kim, deneyimleri ne?', 'guven', [['eğitmen'], ['kadro'], ['öğretmen']]),
    q('mufredat', 'Müfredat neleri kapsıyor?', 'ozellik', [['müfredat'], ['program'], ['içerik']]),
    q('onkosul', 'Sıfırdan başlayan biri katılabilir mi?', 'uygunluk', [['sıfırdan'], ['ön koşul'], ['başlangıç']]),
    q('konum', 'Kampüs veya sınıf nerede?', 'konum', [['adres'], ['kampüs'], ['ankara'], ['istanbul']]),
    q('cocuk', 'Çocuklar için robotik/kodlama kursu var mı, hangi yaş?', 'uygunluk', [['çocuk'], ['yaş'], ['robotik']]),
    q('dil-sinav', 'IELTS veya TOEFL hazırlık kaç ayda?', 'surec', [['ielts'], ['toefl'], ['sınav hazırlık']]),
    q('mezun', 'Mezunlar nerede çalışıyor, başarı oranı?', 'guven', [['mezun'], ['başarı'], ['hikâye']]),
    q('kayit', 'Kayıt nasıl yapılır, ne zaman başlıyor?', 'surec', [['kayıt'], ['başlangıç tarihi'], ['dönem']]),
    q('iade', 'İptal ve iade koşulları ne?', 'fiyat', [['iade'], ['iptal']]),
    q('sinif', 'Sınıf mevcudu kaç kişi?', 'ozellik', [['sınıf'], ['kontenjan'], ['kişi']]),
    q('deneme-dersi', 'Ücretsiz deneme dersi var mı?', 'fiyat', [['deneme dersi'], ['ücretsiz'], ['tanıtım']]),
    q('kayit-video', 'Dersler kayıt altına alınıyor mu?', 'ozellik', [['kayıt'], ['tekrar izle'], ['video']]),
    q('proje', 'Proje veya portfolyo çalışması var mı?', 'ozellik', [['proje'], ['portfolyo'], ['uygulama']]),
    q('kurum', 'Kurum ne zaman kuruldu, akredite mi?', 'guven', [['kuruluş'], ['akredit'], ['hakkımızda']]),
    q('iletisim', 'Danışmanla nasıl görüşürüm?', 'konum', [['iletişim'], ['telefon'], ['whatsapp']]),
    q('yorum', 'Öğrenci yorumları nerede?', 'guven', [['yorum'], ['değerlendirme'], ['görüş']]),
  ],
  gayrimenkul: [
    q('fiyat', 'Fiyatlar ne kadar, metrekare fiyatı?', 'fiyat', [['fiyat'], ['metrekare'], ['m2']]),
    q('bolge', 'Hangi bölgelerde hizmet veriyorsunuz?', 'konum', [['bölge'], ['ilçe'], ['anadolu yakası'], ['avrupa yakası']]),
    q('yatirim', 'Yatırımlık daire için hangi bölgeleri önerirsiniz?', 'uygunluk', [['yatırım'], ['getiri'], ['kira getirisi']]),
    q('vatandaslik', 'Vatandaşlık için konut alımında destek veriyor musunuz?', 'uygunluk', [['vatandaşlık'], ['yabancı'], ['citizenship']]),
    q('kiralik', 'Kiralık portföyünüz var mı (villa, daire)?', 'ozellik', [['kiralık'], ['kira']]),
    q('komisyon', 'Komisyon oranı ne, kim öder?', 'fiyat', [['komisyon'], ['hizmet bedeli']]),
    q('projeden', 'Projeden daire alırken nelere dikkat etmeliyim?', 'surec', [['projeden'], ['dikkat'], ['topraktan']]),
    q('yetki-belgesi', 'Taşınmaz ticareti yetki belgeniz var mı?', 'guven', [['yetki belgesi'], ['belge'], ['lisans']]),
    q('tapu', 'Tapu ve ekspertiz sürecinde yardımcı oluyor musunuz?', 'surec', [['tapu'], ['ekspertiz'], ['noter']]),
    q('kredi', 'Konut kredisi danışmanlığı yapıyor musunuz?', 'ozellik', [['kredi'], ['banka'], ['finansman']]),
    q('muteahhit', 'Hangi müteahhitlerle çalışıyorsunuz?', 'guven', [['müteahhit'], ['inşaat firma'], ['proje ortak']]),
    q('ofis', 'Ofisiniz nerede, ziyaret edebilir miyim?', 'konum', [['adres'], ['ofis'], ['harita']]),
    q('yabanci-dil', 'İngilizce, Arapça veya Rusça hizmet var mı?', 'ozellik', [['ingilizce'], ['arapça'], ['rusça']]),
    q('portfoy', 'Güncel ilanlar nerede?', 'ozellik', [['ilan'], ['portföy'], ['satılık']]),
    q('degerleme', 'Evimin değerini ücretsiz hesaplar mısınız?', 'fiyat', [['değerleme'], ['ücretsiz'], ['değer']]),
    q('sure', 'Satış süreci ne kadar sürer?', 'surec', [['süre'], ['kaç gün'], ['süreç']]),
    q('referans', 'Daha önce kaç satış yaptınız, müşteri yorumları?', 'guven', [['referans'], ['yorum'], ['satış']]),
    q('sozlesme', 'Yetki sözleşmesi nasıl işliyor?', 'surec', [['sözleşme'], ['yetki']]),
    q('kira-getiri', 'Kira getirisi yüksek ilçeler hangileri?', 'uygunluk', [['kira getirisi'], ['getiri'], ['ilçe']]),
    q('iletisim', 'WhatsApp veya telefonla ulaşabilir miyim?', 'konum', [['whatsapp'], ['telefon'], ['iletişim']]),
    q('ekip', 'Danışmanlarınız kim?', 'guven', [['danışman'], ['ekip'], ['kadro']]),
    q('kimsiniz', 'Firma ne zamandır bu işte?', 'guven', [['hakkımızda'], ['kuruluş'], ['yıl']]),
  ],
  turizm: [
    q('fiyat', 'Gecelik fiyat ne kadar, sezona göre değişiyor mu?', 'fiyat', [['fiyat'], ['gecelik'], ['sezon']]),
    q('kahvalti', 'Kahvaltı dahil mi?', 'ozellik', [['kahvaltı'], ['dahil']]),
    q('her-sey-dahil', 'Her şey dahil konsepti var mı?', 'ozellik', [['her şey dahil'], ['konsept'], ['ultra']]),
    q('cocuklu', 'Çocuklu aileler için uygun mu, çocuk kulübü var mı?', 'uygunluk', [['çocuk'], ['aile'], ['kulüp']]),
    q('yetiskin', 'Sadece yetişkin otel mi?', 'uygunluk', [['yetişkin'], ['adults only'], ['balayı']]),
    q('konum', 'Otel nerede, merkeze/plaja mesafe?', 'konum', [['konum'], ['mesafe'], ['harita'], ['yürüme']]),
    q('oda', 'Oda tipleri neler (manzara, mağara oda)?', 'ozellik', [['oda'], ['manzara'], ['süit']]),
    q('rezervasyon', 'Nasıl rezervasyon yaparım, iptal koşulları?', 'surec', [['rezervasyon'], ['iptal'], ['booking']]),
    q('transfer', 'Havalimanı transferi var mı?', 'ozellik', [['transfer'], ['havalimanı'], ['ulaşım']]),
    q('balon', 'Balon turu veya aktivite organize ediyor musunuz?', 'ozellik', [['balon'], ['tur'], ['aktivite']]),
    q('ingilizce', 'Do you have English information and rates?', 'ozellik', [['english'], ['ingilizce'], ['rates']]),
    q('evcil', 'Evcil hayvan kabul ediyor musunuz?', 'uygunluk', [['evcil'], ['pet'], ['köpek']]),
    q('giris-cikis', 'Giriş/çıkış saatleri ne?', 'surec', [['giriş'], ['check in'], ['çıkış saati']]),
    q('yorum', 'Misafir yorumları nerede?', 'guven', [['yorum'], ['misafir'], ['değerlendirme']]),
    q('belge', 'Turizm işletme belgeniz var mı?', 'guven', [['belge'], ['turizm işletme'], ['lisans']]),
    q('havuz-spa', 'Havuz, spa veya hamam var mı?', 'ozellik', [['havuz'], ['spa'], ['hamam']]),
    q('otopark', 'Otopark ve Wi-Fi ücretsiz mi?', 'ozellik', [['otopark'], ['wifi'], ['wi fi']]),
    q('odeme', 'Ödeme nasıl, kapora var mı?', 'fiyat', [['ödeme'], ['kapora'], ['kredi kartı']]),
    q('kampanya', 'Erken rezervasyon indirimi var mı?', 'fiyat', [['erken rezervasyon'], ['kampanya'], ['indirim']]),
    q('toplanti', 'Toplantı veya düğün organizasyonu yapıyor musunuz?', 'uygunluk', [['toplantı'], ['düğün'], ['organizasyon']]),
    q('iletisim', 'WhatsApp veya telefonla ulaşabilir miyim?', 'konum', [['whatsapp'], ['telefon'], ['iletişim']]),
    q('kimsiniz', 'Otelin hikâyesi ne, ne zaman açıldı?', 'guven', [['hakkımızda'], ['hikâye'], ['kuruluş']]),
  ],
  'b2b-uretici': [
    q('moq', 'Minimum sipariş miktarı (MOQ) ne kadar?', 'uygunluk', [['minimum sipariş'], ['moq'], ['adet']]),
    q('oem', 'OEM / fason üretim yapıyor musunuz?', 'ozellik', [['oem'], ['fason'], ['özel üretim']]),
    q('kapasite', 'Üretim kapasiteniz ne kadar?', 'ozellik', [['kapasite'], ['aylık üretim'], ['adet']]),
    q('iso', 'ISO 9001 ve CE belgeleriniz var mı?', 'guven', [['iso'], ['ce'], ['belge'], ['sertifika']]),
    q('ihracat', 'Avrupa’ya ihracat deneyiminiz var mı?', 'guven', [['ihracat'], ['export'], ['avrupa']]),
    q('english', 'Do you have an English catalogue and export team?', 'ozellik', [['english'], ['ingilizce'], ['catalogue']]),
    q('fiyat', 'Fiyat teklifi nasıl alırım, birim fiyat?', 'fiyat', [['teklif'], ['fiyat'], ['birim']]),
    q('teslim', 'Teslim süresi ne kadar?', 'surec', [['teslim'], ['termin'], ['süre']]),
    q('numune', 'Numune gönderiyor musunuz?', 'surec', [['numune'], ['örnek']]),
    q('konum', 'Fabrika nerede, ziyaret edebilir miyim?', 'konum', [['fabrika'], ['adres'], ['tesis'], ['bursa']]),
    q('makine', 'Makine parkurunuz ve teknolojiniz ne?', 'ozellik', [['makine'], ['teknoloji'], ['parkur']]),
    q('malzeme', 'Hangi malzemelerle çalışıyorsunuz (metal, plastik, tekstil)?', 'ozellik', [['malzeme'], ['metal'], ['plastik'], ['tekstil']]),
    q('referans', 'Hangi markalara üretim yaptınız?', 'guven', [['referans'], ['marka'], ['müşteri']]),
    q('kalite', 'Kalite kontrol süreciniz nasıl?', 'guven', [['kalite'], ['kontrol'], ['test']]),
    q('odeme', 'Ödeme koşulları ne (akreditif, peşin)?', 'fiyat', [['ödeme'], ['akreditif'], ['vade']]),
    q('lojistik', 'Lojistik ve gümrük işlemlerinde destek veriyor musunuz?', 'surec', [['lojistik'], ['gümrük'], ['nakliye']]),
    q('tasarim', 'Kendi tasarımımı ürettirebilir miyim?', 'ozellik', [['tasarım'], ['özel'], ['ar ge']]),
    q('satis-sonrasi', 'Satış sonrası servis ve yedek parça var mı?', 'ozellik', [['servis'], ['yedek parça'], ['satış sonrası']]),
    q('katalog', 'Ürün kataloğu nerede?', 'ozellik', [['katalog'], ['ürün'], ['pdf']]),
    q('kimsiniz', 'Firma ne zaman kuruldu, kaç çalışan?', 'guven', [['kuruluş'], ['çalışan'], ['hakkımızda']]),
    q('iletisim', 'İhracat ekibine nasıl ulaşırım?', 'konum', [['iletişim'], ['telefon'], ['e posta']]),
    q('fuar', 'Hangi fuarlara katılıyorsunuz?', 'guven', [['fuar'], ['etkinlik']]),
  ],
};

export function questionsFor(slug: string): SectorQuestion[] {
  return (SECTOR_QUESTIONS as Record<string, SectorQuestion[] | undefined>)[slug] ?? [];
}

export function questionCount(slug: string): number {
  return questionsFor(slug).length;
}

/** `/sektor` sayfasında gösterilecek "N soru" değeri (INTEGRATE sectors.ts'ye yazar). */
export const SECTOR_QUESTION_COUNTS: Record<SectorSlug, number> = Object.fromEntries(
  Object.entries(SECTOR_QUESTIONS).map(([k, v]) => [k, v.length]),
) as Record<SectorSlug, number>;
