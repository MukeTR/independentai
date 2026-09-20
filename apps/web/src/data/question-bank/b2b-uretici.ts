import type { SectorQuestionBank } from './types';

/** B2B üretici — müşterinin yapay zekâya sorduğu sorular. */
export const BANK: SectorQuestionBank = {
  slug: 'b2b-uretici',

  note:
    'Satın almacı üretici ararken marka adı yazmaz, iş tarifi yazar: işlenecek malzeme, üretim yöntemi, aylık adet, termin ve hedef pazar tek cümlenin içine sıkışır. ' +
    'Sorular hızla şartname diline kayar; tolerans, malzeme kalitesi, yüzey işlem, en az sipariş adedi, kalıp bedeli ve belge kapsamı gibi tek başına eleme yapan başlıklar aynı soruda sorulur. ' +
    'Cevabı kuran sayfalar ürün ailesi sayfaları, kapasite ve künye satırları, belge tablosu ile ticaret koşullarıdır; bu bilgi katalog PDF’inde veya teknik çizim görselinde kaldığında soru cevapsız sayılır.',

  questions: [
    // ————— Keşif —————
    {
      q: 'Paslanmaz çelikten endüstriyel mutfak ekipmanı üreten, ihracat tecrübesi de olan bir fabrika arıyorum — nereden başlamalıyım, hangi tip üreticilere bakmam gerekiyor?',
      stage: 'kesif',
      answeredBy: 'ana sayfa + ürün ailesi sayfaları (ne ürettiğinizi adıyla yazan bölüm)',
      signals: ['paslanmaz çelik', 'endüstriyel mutfak', 'üretim tesisi', 'ihracat'],
      why: 'Alıcı ilk turda ürün ailesinin adını arıyor; sayfada “kaliteli üretim” yazıp ürün adı geçmeyen tesis listeye hiç girmiyor.',
    },
    {
      q: 'Durumum şu: kendi markamla çelik kapı satmak istiyorum ama fabrikam yok, üretimi dışarıya yaptıracağım — bana nasıl bir üretici lazım, ne aramalıyım?',
      stage: 'kesif',
      answeredBy: 'hizmet kapsamı sayfası (fason / özel etiket üretim yapıyor muyuz)',
      signals: ['fason üretim', 'özel etiket', 'kendi markanız', 'oem'],
      why: 'Fason, OEM ve özel etiket tek cümleyle ayrılmadığında size uymayan talep geliyor, uyan talep başkasına gidiyor.',
    },
    {
      q: 'Yeni bir ürün fikrim var, plastik enjeksiyonla üretilecek küçük bir parça; bu işi yapan atölyeleri nasıl bulurum, ilk aşamada kalıp ve numune için kime sormalıyım?',
      stage: 'kesif',
      answeredBy: 'üretim yöntemi sayfası + numune ve kalıp süreci bölümü',
      signals: ['plastik enjeksiyon', 'kalıp', 'numune', 'prototip'],
      why: 'Üretim yöntemi sayfada yazılı değilse, o yöntemi fiilen yapabildiğiniz hâlde kapsam dışında sayılıyorsunuz.',
    },
    {
      q: 'Bursa ve çevresinde, organize sanayi bölgesinde CNC talaşlı imalat yapan bir firma var mı? Parçaları kendim götürüp teslim alabileceğim yakınlıkta olsun.',
      stage: 'kesif',
      answeredBy: 'iletişim sayfası + kurumsal künye (açık adres, il, organize sanayi bölgesi)',
      signals: ['organize sanayi', 'cnc', 'talaşlı imalat', 'açık adres'],
      why: 'Konum kısıtı olan sorularda yalnız iletişim formu bulunan, açık adresi yazmayan tesis cevapta hiç anılmıyor.',
    },
    {
      q: 'Elimde teknik resim var: 316 paslanmaz, ±0,1 mm tolerans ve eloksallı yüzey isteniyor — bu şartname benim bulduğum atölyeye uygun mu, bunu kim yapabilir?',
      stage: 'kesif',
      answeredBy: 'ürün ailesi sayfası (malzeme, tolerans, yüzey işlem tablosu)',
      signals: ['tolerans', 'malzeme kalitesi', 'yüzey işlem', 'teknik resim'],
      why: 'Eşleşme şartnamenin diliyle kuruluyor; sayfada tolerans ve malzeme satırı yoksa teknik soru hiç size gelmiyor.',
    },
    {
      q: 'Zincir markete özel etiketli ürün vermeyi düşünüyoruz; aylık 20 bin adet civarı bir hacim için hangi üreticilerle görüşmeliyim, üretici tarafında neye bakayım?',
      stage: 'kesif',
      answeredBy: 'kapasite sayfası + özel etiket üretim sayfası',
      signals: ['aylık kapasite', 'vardiya', 'özel etiket', 'hat sayısı'],
      why: 'Hacim sorusunun karşılığı kapasite raporundaki satırlar; siteye taşınmadığında alıcı hacmi tahmin edemeyip eliyor.',
    },

    // ————— Karşılaştırma —————
    {
      q: 'Sac parçayı lazer kesimle mi yaptırmalıyım yoksa kalıp mı açtırmalıyım? Aylık 3.000 adet için hangisi mantıklı, neden bunu önerdiğini de yazar mısın?',
      stage: 'karsilastirma',
      answeredBy: 'üretim yöntemleri sayfası + sıkça sorulan sorular',
      signals: ['lazer kesim', 'kalıp', 'adet', 'birim maliyet'],
      why: 'Yöntem seçimini gerekçesiyle anlatan tek bir sayfa, alıcının kısa listesini doğrudan belirliyor.',
    },
    {
      q: 'Fason üretim mi, OEM mi, ODM mi — aralarındaki fark tam olarak ne ve benim durumumda hangisini istemem gerekiyor?',
      stage: 'karsilastirma',
      answeredBy: 'çalışma biçimi sayfası (fason / OEM / ODM ayrımı)',
      signals: ['fason', 'oem', 'odm', 'tasarım desteği'],
      why: 'Bu üç iş biçimi sayfada ayrılmadığında alıcı hangisine uyduğunuzu anlamıyor ve daha net yazan üreticiye geçiyor.',
    },
    {
      q: 'Yurt içinde mi ürettirsem yoksa Uzak Doğu’dan mı ithal etsem? Teslim süresi, nakliye ve revizyon kolaylığı açısından karşılaştırır mısın?',
      stage: 'karsilastirma',
      answeredBy: 'teslim süresi ve lojistik bölümü + hakkımızda',
      signals: ['teslim süresi', 'termin', 'nakliye', 'revizyon'],
      why: 'Yakınlık ve termin avantajınız sayfada yazılı değilse, kıyas yalnız fiyat üzerinden kuruluyor.',
    },
    {
      q: 'İki üreticiden teklif aldım; biri 304 paslanmaz, diğeri 316 paslanmaz öneriyor — deniz kenarındaki bir tesiste kullanılacak, hangisi uygun olur, artı ve eksilerini de yaz?',
      stage: 'karsilastirma',
      answeredBy: 'ürün ailesi sayfası (malzeme seçenekleri ve kullanım ortamı)',
      signals: ['paslanmaz', 'korozyon', 'malzeme seçeneği', 'kullanım ortamı'],
      why: 'Malzeme seçeneklerini ortamıyla birlikte açıklayan sayfa, teknik kıyasın içinde adı anılan taraf oluyor.',
    },
    {
      q: 'Küçük bir atölyeyle mi yoksa büyük bir fabrikayla mı çalışmak bana daha uygun? 500 adetlik partiler vereceğim, esneklik ve termin açısından farkı nedir?',
      stage: 'karsilastirma',
      answeredBy: 'kapasite sayfası + en az sipariş adedi bilgisi',
      signals: ['en az sipariş adedi', 'moq', 'parti', 'esneklik'],
      why: 'Küçük hacimli alıcı, kendi adedinin kabul edilip edilmediğini yazmayan üreticiyi baştan listeden çıkarıyor.',
    },
    {
      q: 'Dış cephede duracak alüminyum parçalar için eloksal mı elektrostatik toz boya mı tercih edilmeli, hangisi daha uzun ömürlü oluyor?',
      stage: 'karsilastirma',
      answeredBy: 'yüzey işlem sayfası',
      signals: ['eloksal', 'toz boya', 'yüzey işlem', 'dış ortam'],
      why: 'Yüzey işlem seçeneklerini adlarıyla sayan sayfa, alıcının şartnameyi sizinle konuşmasına kapı açıyor.',
    },

    // ————— Fiyat ve kapsam —————
    {
      q: 'En az kaç adetten üretim yapılıyor ve adet arttıkça birim fiyat nasıl değişiyor? 1.000 ile 10.000 adet arasında aradaki fark ne kadar olur?',
      stage: 'fiyat',
      answeredBy: 'satın alma koşulları sayfası (en az sipariş adedi ve adet kademeleri)',
      signals: ['en az sipariş adedi', 'moq', 'birim fiyat', 'adet kademesi'],
      why: 'İlk turda en çok sorulan satır bu; sayfada hiç geçmediğinde cevabı kuran taraf sizi tanımayan bir listeden tahmin ediyor.',
    },
    {
      q: 'Ortalama ne kadar tutar ve sonradan ek ücret çıkar mı? Kalıp bedeli, ambalaj ve nakliye teklife dahil mi, ayrı mı faturalanıyor?',
      stage: 'fiyat',
      answeredBy: 'teklif süreci / satın alma koşulları sayfası',
      signals: ['kalıp bedeli', 'ambalaj', 'nakliye', 'teklife dahil'],
      why: 'Gizli maliyet endişesi cevaplanmadığında alıcı teklif talebini hiç göndermiyor, yalnız sessizce vazgeçiyor.',
    },
    {
      q: 'Bütçem 250 bin TL; bu parayla kalıbı yaptırıp ilk numuneleri de alabilir miyim, yoksa yalnız kalıba mı yeter?',
      stage: 'fiyat',
      answeredBy: 'kalıp ve numune politikası bölümü',
      signals: ['kalıp bedeli', 'numune ücreti', 'aparat', 'ilk sipariş'],
      why: 'Bütçe cümlesiyle gelen alıcı, kalıp ve numune bedelini hiç anmayan sayfada karşılık bulamıyor.',
    },
    {
      q: 'Ödemeyi peşin mi yapmam gerekiyor, vadeli çalışan üreticiler var mı? İlk siparişte genelde ne kadar peşinat isteniyor?',
      stage: 'fiyat',
      answeredBy: 'ödeme ve teslim koşulları sayfası',
      signals: ['ödeme şekli', 'peşinat', 'vade', 'teslim şekli'],
      why: 'Ödeme biçimi ilk temastan önce eleme yapıyor; yazılmadığında alıcı riski yüksek sayıp sıradakine geçiyor.',
    },
    {
      q: 'Hammadde fiyatları oynuyor; siparişi şimdi mi vermeliyim yoksa birkaç ay bekleyeyim mi? Verilen teklifler genelde kaç gün geçerli oluyor?',
      stage: 'fiyat',
      answeredBy: 'teklif süreci sayfası (teklif geçerlilik süresi) + sıkça sorulan sorular',
      signals: ['teklif geçerlilik', 'fiyat farkı', 'hammadde', 'sipariş onayı'],
      why: 'Zamanlama sorusuna cevap veren tek satır teklif geçerlilik süresi; bu satır alıcıyı bugün harekete geçiriyor.',
    },
    {
      q: 'Bunun daha uygun maliyetli bir alternatifi var mı? Malzemeyi ya da et kalınlığını değiştirsem fiyat ne kadar düşer, dayanımdan ne kaybederim?',
      stage: 'fiyat',
      answeredBy: 'ürün ailesi sayfası (malzeme ve ölçü seçenekleri) + teknik destek bölümü',
      signals: ['malzeme alternatifi', 'ölçü aralığı', 'dayanım', 'revizyon'],
      why: 'Alternatif öneren üretici, maliyet baskısındaki alıcının sorusunda tek başına anılan taraf oluyor.',
    },

    // ————— Güven ve yetki —————
    {
      q: 'Şu firmayı duydun mu, güvenilir mi? İnternette adını gördüm ama kaç yıldır çalıştıklarına ve referanslarına dair bir bilgi bulamadım.',
      stage: 'guven',
      answeredBy: 'hakkımızda / kurumsal künye + referanslar bölümü',
      signals: ['kuruluş yılı', 'ticaret sicil', 'referans', 'çalıştığımız sektörler'],
      why: 'Unvan, kuruluş yılı ve referans metin olarak yazılmadığında firma dışarıdan doğrulanamaz görünüyor.',
    },
    {
      q: 'Bu firma gerçekten üretici mi yoksa aracı mı? Kendi tesisi var mı, kapasitesini ve makine parkını nereden doğrulayabilirim?',
      stage: 'guven',
      answeredBy: 'tesis ve kapasite sayfası (kapalı alan, hat sayısı, tezgâh parkı)',
      signals: ['kapalı alan', 'kapasite raporu', 'tezgâh parkı', 'tesis adresi'],
      why: 'Üretici ile aracıyı ayıran somut satırlar yoksa alıcı riski almamak için görüşmeyi hiç açmıyor.',
    },
    {
      q: 'Üreticinin kalite yönetim belgesi olduğu söyleniyor; belgenin kapsamını ve hangi tesis için verildiğini nasıl kontrol ederim?',
      stage: 'guven',
      answeredBy: 'kalite ve belgeler sayfası (belge adı, kapsam, veren kurum, geçerlilik)',
      signals: ['belge kapsamı', 'veren kurum', 'geçerlilik tarihi', 'kalite yönetim'],
      why: 'Belge yalnız taranmış görsel olarak durduğunda okunacak metin yok demektir; belgeniz var ama dışarıdan yok sayılıyor.',
    },
    {
      q: 'Avrupa’ya makine göndereceğiz; üreticinin CE teknik dosyası ve uygunluk beyanı hazır mı, hangi ürün grubunu kapsadığını nereden görürüm?',
      stage: 'guven',
      answeredBy: 'belgeler sayfası (CE kapsamı, teknik dosya, uygunluk beyanı)',
      signals: ['ce işareti', 'teknik dosya', 'uygunluk beyanı', 'ürün grubu'],
      why: 'CE ürün grubu bazlıdır; kapsam yazılmadığında ihracat sorusunda karşılığınız oluşmuyor.',
    },
    {
      q: 'Zincir müşterimiz tedarikçi denetimi istiyor; bu fabrikanın sosyal uygunluk denetimi yapılmış mı, denetimin tarihini ve kapsamını nereden okuyabilirim?',
      stage: 'guven',
      answeredBy: 'denetim ve uyum bölümü',
      signals: ['tedarikçi denetimi', 'sosyal uygunluk', 'denetim tarihi', 'kapsam'],
      why: 'Denetim bilgisini yazmak, her yeni alıcının aynı soruyu sormasını gereksiz kılıyor.',
    },
    {
      q: 'Üreticiyle sözleşme imzalamadan önce nelere dikkat etmeliyim, hangi maddeleri mutlaka yazdırmam gerekir?',
      stage: 'guven',
      answeredBy: 'sıkça sorulan sorular + çalışma koşulları sayfası',
      signals: ['sözleşme', 'gizlilik', 'kabul kriteri', 'teslim şekli'],
      why: 'Sözleşme başlıklarını önceden açıklayan üretici, ilk görüşmeye şüpheyle değil hazırlıkla gelen alıcıyla buluşuyor.',
    },

    // ————— Satın alma sonrası —————
    {
      q: 'Numune onaylandıktan sonra seri üretim ne kadar sürüyor? Sevkiyat öncesi kontrol raporu paylaşılıyor mu?',
      stage: 'sonrasi',
      answeredBy: 'üretim süreci sayfası (numune onayı, üretim süresi, kalite kontrol)',
      signals: ['numune onayı', 'teslim süresi', 'kalite kontrol', 'sevkiyat öncesi kontrol'],
      why: 'Süreç adımları yazılı olduğunda alıcı teklif beklerken takvimini kurabiliyor ve süreci sizinle sürdürüyor.',
    },
    {
      q: 'Sevkiyatın pazartesiye kadar çıkması gerekiyor; bu termine yetişebilecek bir üretici var mı, gecikme olursa nasıl haber veriliyor?',
      stage: 'sonrasi',
      answeredBy: 'teslim süresi ve sipariş takibi bölümü',
      signals: ['termin', 'teslim süresi', 'sevkiyat', 'sipariş takibi'],
      why: 'Acele siparişte cevap veren taraf, termin ve bilgilendirme biçimini sayfada yazan üretici oluyor.',
    },
    {
      q: 'Gelen partide ölçü dışı parçalar çıkarsa ne oluyor? İade ve yeniden üretim süreci nasıl işliyor, masrafı kim karşılıyor?',
      stage: 'sonrasi',
      answeredBy: 'kalite ve iade koşulları sayfası',
      signals: ['kabul kriteri', 'iade', 'yeniden üretim', 'kusurlu ürün'],
      why: 'Hata hâlinde ne olacağını önceden yazan üretici, ilk siparişin önündeki en büyük tereddüdü kaldırıyor.',
    },
    {
      q: 'Bedelini ödediğim kalıp kime ait oluyor? İleride üreticiyi değiştirirsem kalıbı alıp başka bir atölyeye götürebilir miyim?',
      stage: 'sonrasi',
      answeredBy: 'kalıp ve aparat politikası bölümü',
      signals: ['kalıp mülkiyeti', 'aparat', 'devir', 'sözleşme'],
      why: 'Kalıp mülkiyeti yazılmadığında alıcı kendini bağlanmış hissediyor ve süreci hiç başlatmıyor.',
    },
    {
      q: 'Makineyi aldıktan sonra yedek parça ve teknik servis nasıl sağlanıyor, kaç yıl destek veriliyor?',
      stage: 'sonrasi',
      answeredBy: 'satış sonrası destek sayfası',
      signals: ['yedek parça', 'teknik servis', 'bakım', 'destek süresi'],
      why: 'Satış sonrası destek, uzun ömürlü ürünlerde fiyattan önce gelen karşılaştırma başlığı hâline geliyor.',
    },
    {
      q: 'İlk siparişten sonra tekrar sipariş verirsem ölçü ve renk aynı tutuyor mu? Parti takibi ve izlenebilirlik nasıl yapılıyor?',
      stage: 'sonrasi',
      answeredBy: 'kalite kontrol ve izlenebilirlik bölümü',
      signals: ['izlenebilirlik', 'parti numarası', 'renk farkı', 'tekrar sipariş'],
      why: 'Sürekli tedarik arayan alıcı, partiler arası tutarlılığı anlatan sayfayı uzun soluklu iş için ayırıyor.',
    },
  ],
};
