import type { SectorQuestionBank } from './types';

/** Turizm — müşterinin yapay zekâya sorduğu sorular. */
export const BANK: SectorQuestionBank = {
  slug: 'turizm',
  note:
    'Misafir tek cümlede tarih, kişi sayısı, çocuk yaşı, bütçe ve konsepti birlikte yazar; cümledeki her koşul aslında bir filtredir. İkinci tur sorular neredeyse her zaman koşullara döner: iptal, kapora, çocuk indirimi, transfer, giriş-çıkış saati. Aynı sorular İngilizce, Almanca ve Rusça da sorulduğu için karşılığı yalnız Türkçe alt sayfalarda yazılıysa cevap kurulamaz.',
  questions: [
    // ————————————————— Keşif —————————————————
    {
      q: 'Temmuzun ikinci haftasında iki yetişkin ve 4 yaşında bir çocukla gideceğiz, denize yürüme mesafesinde ama kalabalık olmayan bir yer istiyoruz — nereye bakmamı önerirsin?',
      stage: 'kesif',
      answeredBy: 'Tesis tanıtım sayfası ve konum/ulaşım sayfası',
      signals: ['denize yürüme mesafesi', 'plaja kaç dakika', 'çocuk dostu', 'sakin konum'],
      why: 'Misafirin ilk cümlesindeki mesafe ve konsept koşulu sayfada yazılı değilse tesis kısa listeye hiç girmiyor.',
    },
    {
      q: 'Eylülde 3 gecelik kısa bir kaçamak yapmak istiyoruz, İstanbul’dan arabayla 4 saati geçmesin; hangi bölgeler mantıklı olur?',
      stage: 'kesif',
      answeredBy: 'Konum ve ulaşım sayfası',
      signals: ['arabayla ulaşım', 'karayolu mesafesi', 'kaç saat sürüyor', 'yol tarifi'],
      why: 'Sürüş mesafesi sayıyla yazılmadığında asistan tesisi mesafe kısıtlı sorularda değerlendiremiyor.',
    },
    {
      q: 'Köpeğimizi de yanımızda götürmek istiyoruz, evcil hayvan kabul eden butik bir otel var mı, ek ücret alınıyor mu ve odaya alınıyor mu?',
      stage: 'kesif',
      answeredBy: 'Tesis politikaları sayfası',
      signals: ['evcil hayvan kabul', 'evcil hayvan ücreti', 'kilo sınırı', 'odada konaklama'],
      why: 'Evcil hayvan politikası yazılı olan tesisler bu aramada tek başına ayrışıyor.',
    },
    {
      q: 'Ekim ortasında havuz ve aquapark hâlâ açık oluyor mu, yoksa o tarihte sezon kapanmış mı oluyor?',
      stage: 'kesif',
      answeredBy: 'Olanaklar ve sezon takvimi sayfası',
      signals: ['açılış tarihi', 'sezon boyunca', 'ısıtmalı havuz', 'hizmet takvimi'],
      why: 'Ünitelerin hangi tarihler arasında çalıştığı yazılmazsa sezon dışı sorularda tesis eleniyor.',
    },
    {
      q: 'Tekerlekli sandalye kullanan annemle geleceğiz; odaya, restorana ve plaja engelsiz erişim var mı, asansör her kata çıkıyor mu?',
      stage: 'kesif',
      answeredBy: 'Erişilebilirlik bilgisi ve oda tipi sayfası',
      signals: ['engelli odası', 'engelsiz erişim', 'asansör', 'rampa'],
      why: 'Erişilebilirlik ayrıntısı sayfada geçmediğinde misafir riski almak yerine başka tesise geçiyor.',
    },
    {
      q: 'Uzaktan çalışıyorum ve 10 gün kalacağım; odada çalışma masası olan, internetin düzgün çektiği bir yer önerir misin?',
      stage: 'kesif',
      answeredBy: 'Oda tipi sayfası',
      signals: ['çalışma masası', 'kablosuz internet', 'uzun konaklama', 'oda donanımı'],
      why: 'Uzun konaklama ve çalışma ihtiyacı yeni bir talep kalemi; oda içi donanım yazılıysa doğrudan eşleşme çıkıyor.',
    },
    {
      q: 'Kurban Bayramı köprüsü için 4 gecelik yer hâlâ bulabilir miyim, ne zamana kadar karar vermem gerekiyor?',
      stage: 'kesif',
      answeredBy: 'Bayram ve dönem paketleri sayfası',
      signals: ['bayram dönemi', 'asgari konaklama', 'son rezervasyon tarihi', 'dönem fiyatı'],
      why: 'Dar talep pencerelerinde asgari gece ve son tarih koşulu yazılı değilse teklif zinciri portal tarafında kapanıyor.',
    },

    // ———————————————— Karşılaştırma ————————————————
    {
      q: 'Her şey dahil mi alsak yoksa oda kahvaltı alıp akşamları dışarıda mı yesek — iki kişi bir hafta için hangisi bize daha uygun olur?',
      stage: 'karsilastirma',
      answeredBy: 'Pansiyon kapsamı sayfası',
      signals: ['her şey dahil', 'oda kahvaltı', 'neler dahil', 'kapsam dışı'],
      why: 'Pansiyon tipleri yalnız kısaltmayla geçiyorsa asistan kapsamı okuyamıyor ve tesisi karşılaştırmaya alamıyor.',
    },
    {
      q: 'İki yetişkin iki çocuk için aile suiti mi tutsak yoksa yan yana iki standart oda mı — hangisi daha rahat olur, aradaki fark ne kadar?',
      stage: 'karsilastirma',
      answeredBy: 'Oda tipleri karşılaştırma sayfası',
      signals: ['aile odası', 'azami kapasite', 'yatak düzeni', 'bağlantılı oda'],
      why: 'Oda tipleri tek fiyat tablosunda satır olarak durduğunda ayrı seçenekler olarak kıyaslanamıyor.',
    },
    {
      q: 'Swim-up oda ile normal zemin kat oda arasında gerçekten fark var mı, küçük çocukla swim-up mantıklı olur mu?',
      stage: 'karsilastirma',
      answeredBy: 'Oda tipi sayfası',
      signals: ['swim-up', 'zemin kat', 'özel havuz', 'oda özellikleri'],
      why: 'Özel oda tiplerinin farkı yazıyla anlatılmadığında misafir fotoğraftan karar veremiyor ve soruyu başka kaynağa taşıyor.',
    },
    {
      q: 'Kapadokya’ya ilk kez gideceğiz; mağara oda mı yoksa manzaralı standart oda mı seçmeliyiz, neden bunu önerdin, artılarını eksilerini de yazar mısın?',
      stage: 'karsilastirma',
      answeredBy: 'Oda tipi sayfası ve sık sorulan sorular',
      signals: ['mağara oda', 'manzara', 'oda farkı', 'hangi oda size uygun'],
      why: 'Gerekçeli karşılaştırma isteyen soruda, seçenekleri artı-eksi olarak anlatan sayfa doğrudan kaynak gösteriliyor.',
    },
    {
      q: 'Rezervasyonu doğrudan sizin siteden mi yapsam yoksa uygulamadan mı — doğrudan alınca bir farkı oluyor mu?',
      stage: 'karsilastirma',
      answeredBy: 'Doğrudan rezervasyon avantajları sayfası',
      signals: ['doğrudan rezervasyon', 'siteden rezervasyon', 'oda yükseltme', 'esnek iptal'],
      why: 'Komisyonsuz kanalın farkı yazılı değilse misafir alışkanlığı gereği portala dönüyor.',
    },
    {
      q: 'Şehir merkezindeki bir otelde mi kalsak yoksa sahildeki tesiste mi — ilk kez geliyoruz, ikisinin artısını eksisini yazar mısın?',
      stage: 'karsilastirma',
      answeredBy: 'Konum sayfası ve çevre gezi rehberi',
      signals: ['merkeze mesafe', 'çevrede gezilecek', 'toplu taşıma', 'sahile uzaklık'],
      why: 'Çevre ve ulaşım anlatısı olan sayfa, konum kıyaslayan sorularda cevabın kaynağı oluyor.',
    },

    // ———————————————— Fiyat ve kapsam ————————————————
    {
      q: 'Bütçemiz gecelik 4.000 TL civarı, iki kişi 5 gece kalacağız; bu parayla kahvaltı dahil nereye kadar çıkabiliriz?',
      stage: 'fiyat',
      answeredBy: 'Fiyat ve paketler sayfası',
      signals: ['gecelik fiyat', 'kahvaltı dahil', 'fiyat aralığı', 'dönemlere göre fiyat'],
      why: 'Bütçe bandı verilen sorularda sayfada hiç fiyat aralığı geçmiyorsa tesis listeye alınmıyor.',
    },
    {
      q: 'Sitede yazan fiyat oda başına mı kişi başına mı, konaklama vergisi ve KDV bu tutara dahil mi?',
      stage: 'fiyat',
      answeredBy: 'Fiyat sayfası',
      signals: ['oda başına', 'kişi başı', 'konaklama vergisi', 'vergiler dahil'],
      why: 'Fiyatın neyi kapsadığı belirsiz kaldığında misafir teklifi karşılaştıramıyor ve süreçten çıkıyor.',
    },
    {
      q: 'Konaklama sırasında sonradan ek ücret çıkar mı — otopark, şezlong, spa ve à la carte restoran için ayrıca ödeme alıyor musunuz?',
      stage: 'fiyat',
      answeredBy: 'Ücretli ve ücretsiz hizmetler sayfası',
      signals: ['ücretsiz hizmetler', 'ücretli hizmetler', 'ek ücret', 'à la carte'],
      why: 'Sürpriz maliyet kaygısı satın alma anının en sık sorusu; kalem kalem yazan sayfa güven farkı yaratıyor.',
    },
    {
      q: '6 ve 11 yaşında iki çocuğumuz var; çocuk indirimi kaç yaşına kadar geçerli, ikinci çocuk için ne ödeyeceğiz?',
      stage: 'fiyat',
      answeredBy: 'Çocuk politikası ve fiyat sayfası',
      signals: ['çocuk indirimi', 'yaş aralığı', 'ücretsiz konaklama', 'ek yatak'],
      why: 'Çocuk yaş kademeleri yazılı değilse aile rezervasyonu telefon trafiğine düşüyor, çoğu da geri dönmüyor.',
    },
    {
      q: 'Acaba şimdi mi rezervasyon yapsam yoksa son dakikayı mı beklesem — erken rezervasyonda gerçekten fark oluyor mu?',
      stage: 'fiyat',
      answeredBy: 'Erken rezervasyon kampanya sayfası',
      signals: ['erken rezervasyon', 'indirim oranı', 'son rezervasyon tarihi', 'kampanya koşulları'],
      why: 'Erken rezervasyon koşulu sadece görsele gömülüyse asistan indirim kademesini okuyamıyor.',
    },
    {
      q: 'Havalimanı transferi fiyata dahil mi, değilse gidiş-dönüş kişi başı ne kadar tutuyor ve kaç dakika sürüyor?',
      stage: 'fiyat',
      answeredBy: 'Ulaşım ve transfer sayfası',
      signals: ['havalimanı transferi', 'transfer ücreti', 'kaç kilometre', 'transfer süresi'],
      why: 'Transfer bilgisi dış pazar misafirinin ilk sorusu; mesafe ve ücret yazılıysa cevap doğrudan siteden kuruluyor.',
    },

    // ———————————————— Güven ve yetki ————————————————
    {
      q: 'Şu tesisi duydun mu, misafir yorumları nasıl — temizlik ve servis konusunda şikâyet var mı?',
      stage: 'guven',
      answeredBy: 'Hakkımızda sayfası ve misafir görüşleri bölümü',
      signals: ['misafir yorumları', 'hakkımızda', 'kaç yıldır', 'misafir memnuniyeti'],
      why: 'Tesis kendini anlatmıyorsa cevap yıllar önceki forum yorumlarından toplanıyor.',
    },
    {
      q: 'Fotoğraflar çok iyi görünüyor ama gerçekte de öyle mi; odalar en son ne zaman yenilendi, şu an tadilat var mı?',
      stage: 'guven',
      answeredBy: 'Oda sayfası ve hakkımızda sayfası',
      signals: ['yenilendi', 'tadilat', 'oda donanımı', 'açılış yılı'],
      why: 'Yenileme ve tadilat bilgisi yazılı olduğunda misafirin en büyük tereddüdü sayfada kapanıyor.',
    },
    {
      q: 'Bu tesisin turizm işletme belgesi var mı, kim işletiyor ve kaç yıldır hizmet veriyor?',
      stage: 'guven',
      answeredBy: 'Künye ve kurumsal bilgi sayfası',
      signals: ['işletme belgesi', 'ticaret unvanı', 'vergi dairesi', 'işletmeci firma'],
      why: 'Belge ve unvan bilgisi görünür bir künyede değilse asistan tesisi temkinli anıyor ya da hiç anmıyor.',
    },
    {
      q: 'Kart bilgimi sitenize girmek güvenli mi, kapora isteniyor mu ve ödemeyi tam olarak kime yapmış oluyorum?',
      stage: 'guven',
      answeredBy: 'Ödeme ve güvenlik bilgisi sayfası',
      signals: ['güvenli ödeme', 'kapora', 'ön ödeme', '3d secure'],
      why: 'Ödemenin kime gittiği ve kapora oranı yazılmadığında misafir doğrudan rezervasyondan vazgeçiyor.',
    },
    {
      q: 'Rezervasyondan önce birine ulaşabilir miyim — telefonla ya da WhatsApp’tan soru sorabileceğim bir numara var mı?',
      stage: 'guven',
      answeredBy: 'İletişim sayfası',
      signals: ['iletişim', 'telefon numarası', 'whatsapp', 'rezervasyon hattı'],
      why: 'Telefon ve mesaj kanalı sayfada açıkken asistan tesisi ulaşılabilir kaynak olarak öneriyor.',
    },
    {
      q: 'Yetişkinlere özel yazıyor ama düğün veya grup organizasyonu alıyor musunuz; sessiz bir tatil istiyorum, burası buna uygun olur mu?',
      stage: 'guven',
      answeredBy: 'Konsept sayfası ve sık sorulan sorular',
      signals: ['yetişkinlere özel', 'yaş sınırı', 'grup organizasyonu', 'sessiz konsept'],
      why: 'Konsept vaadinin sınırları yazılı değilse beklenti uyuşmazlığı hem rezervasyonu hem yorumu bozuyor.',
    },

    // ———————————————— Satın alma sonrası ————————————————
    {
      q: 'Vazgeçmem gerekirse param ne olur; kaç gün öncesine kadar ücretsiz iptal edebiliyorum, kapora yanıyor mu?',
      stage: 'sonrasi',
      answeredBy: 'İptal ve iade koşulları sayfası',
      signals: ['ücretsiz iptal', 'iptal koşulları', 'iade süreci', 'kaç gün önce'],
      why: 'İptal koşulu yalnız rezervasyon motorunun son adımındaysa ne misafir ne asistan onu görebiliyor.',
    },
    {
      q: 'Uçuşum değişti, rezervasyon tarihimi bir hafta ileri alabilir miyim, tarih değişikliğinde ek ücret kesiliyor mu?',
      stage: 'sonrasi',
      answeredBy: 'Rezervasyon değişikliği koşulları sayfası',
      signals: ['tarih değişikliği', 'rezervasyon güncelleme', 'değişiklik ücreti', 'esnek tarife'],
      why: 'Tarih değişikliği koşulu yazılı olan tesis, esneklik arayan misafirin kısa listesinde kalıyor.',
    },
    {
      q: 'Uçağım sabah 06:00’da iniyor, erken giriş mümkün mü; dönüşte de geç çıkış yapabilir miyim, ücretli mi?',
      stage: 'sonrasi',
      answeredBy: 'Giriş-çıkış saatleri politikası sayfası',
      signals: ['giriş saati', 'çıkış saati', 'erken giriş', 'geç çıkış'],
      why: 'Giriş-çıkış saatleri ve erken/geç kullanım ücreti, rezervasyon masasının telefonda en çok tekrarladığı bilgi.',
    },
    {
      q: 'Odaya girdiğimde beklediğim gibi çıkmazsa ne yapmalıyım, oda değişikliği ya da şikâyet için kime başvuruyorum?',
      stage: 'sonrasi',
      answeredBy: 'Misafir ilişkileri ve sık sorulan sorular sayfası',
      signals: ['misafir ilişkileri', 'oda değişikliği', 'talep ve şikâyet', 'çözüm süreci'],
      why: 'Sorun çıkarsa ne olacağı yazılıysa misafir riski düşük görüyor ve doğrudan rezervasyona geçiyor.',
    },
    {
      q: 'Konaklamayı şirket adına faturalandırabilir miyim, çıkışta e-fatura düzenliyor musunuz?',
      stage: 'sonrasi',
      answeredBy: 'Sık sorulan sorular ve fatura bilgisi sayfası',
      signals: ['kurumsal fatura', 'e-fatura', 'fatura bilgileri', 'vergi numarası'],
      why: 'İş seyahati talebi bu tek soruda kopuyor; fatura süreci yazılı olan tesis kurumsal misafiri elde tutuyor.',
    },
  ],
};
