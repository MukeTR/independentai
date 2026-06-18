import { BATCH_1 } from './blog-posts-batch-1';
import { BATCH_2 } from './blog-posts-batch-2';
import { BATCH_3 } from './blog-posts-batch-3';
import { BATCH_4 } from './blog-posts-batch-4';

export type BlogCategory = 'GEO' | 'AI' | 'Pazarlama' | 'Ürün' | 'Teknik' | 'Strateji' | 'Sektör';

export type BlogBody =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'code'; text: string };

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  readTimeMin: number;
  category: BlogCategory;
  author: { name: string; role: string };
  body: BlogBody[];
};

const ORIGINAL_POSTS: BlogPost[] = [
  {
    slug: 'geo-nedir-seo-nasil-degisti',
    title: 'GEO nedir, SEO\'dan ne farkı var?',
    excerpt:
      'Generative Engine Optimization — AI çağında markaların online görünürlüğünü ölçen ve şekillendiren disiplin. Geleneksel SEO ile farkları, ortak noktaları ve bilmen gerekenler.',
    publishedAt: '2026-05-15',
    readTimeMin: 7,
    category: 'GEO',
    author: { name: 'Independent AI ekibi', role: 'Editöryal' },
    body: [
      { type: 'p', text: 'Son 25 yılda SEO (Search Engine Optimization) markaların web\'de bulunabilmesinin tek yoluydu. Google\'da sıralama, backlink, içerik kalitesi, teknik optimizasyon — hepsi tek bir amaca hizmet ediyordu: kullanıcı bir arama yaptığında ilk sayfada olmak.' },
      { type: 'p', text: 'Ama kullanıcı davranışı değişti. 2025 itibarıyla milyonlarca insan artık "en iyi muhasebe yazılımı" sorusunu Google\'a değil, ChatGPT\'ye veya Claude\'a soruyor. Cevap olarak link listesi değil, "şunları öneririm" formatında 2-3 marka adı geliyor.' },
      { type: 'h2', text: 'GEO ne demek?' },
      { type: 'p', text: 'GEO (Generative Engine Optimization), markanın yapay zeka cevaplarında ne sıklıkla, hangi sırada ve hangi tonla geçtiğini ölçme ve optimize etme disiplinidir. SEO\'nun yerini almaz — yanına eklenir.' },
      { type: 'h2', text: 'SEO ile GEO arasındaki temel farklar' },
      { type: 'ul', items: [
        'Sıralama vs öneri: SEO\'da 10. sırada olmak bile bir tıklama getirebilir. GEO\'da AI\'nın önerdiği 3 markadan biri değilseniz, görünmüyorsunuz.',
        'Link vs metin: SEO link tıklatmaya yönelik. GEO\'da kullanıcı zaten cevabı alıyor; sizi listenin başında görmesi önemli.',
        'Anahtar kelime vs niyet: AI cevapları niyete göre üretiliyor. "İstanbul\'da dijital ajans" sorusuna AI, anahtar kelime eşleştirmesi değil, anlamsal cevap üretir.',
        'Ölçüm: SEO için Google Search Console var. GEO için… yakın zamana kadar yoktu. Independent AI bu boşluğu dolduruyor.',
      ] },
      { type: 'h2', text: 'GEO için ne yapmalı?' },
      { type: 'p', text: '1. Ölçün. Kategori sorularınızı izlemeden hiçbir şey yapamazsınız. Hangi sorularda geçiyorsunuz, hangilerinde rakipleriniz önde — bu görünürlük olmadan strateji olmaz.' },
      { type: 'p', text: '2. İçerik üretin. AI cevapları, AI\'nın eğitildiği veri ve gerçek zamanlı web aramasının karışımı. Markanız hakkında web\'de zengin, doğru içerik varsa AI cevaplarında geçme olasılığınız artar.' },
      { type: 'p', text: '3. llms.txt ekleyin. Web sitenizin köküne llms.txt dosyası koyarak AI crawler\'larına markanız hakkında yapılandırılmış bilgi verin. Bu standart 2025\'te ortaya çıktı, hızla yayılıyor.' },
      { type: 'quote', text: '"Ölçemediğinizi yönetemezsiniz." — Peter Drucker (50 yıl önce, hâlâ geçerli).' },
      { type: 'p', text: 'GEO yolculuğu yeni başlıyor. Erken hareket eden markalar 2 yıl içinde bu mecradaki konumlarını sağlamlaştıracak. Geri kalanlar arayı kapatmaya çalışacak.' },
    ],
  },
  {
    slug: 'chatgpt-claude-gemini-marka-cevaplari-farkli-mi',
    title: 'ChatGPT, Claude ve Gemini aynı soruya farklı markalar mı öneriyor?',
    excerpt: 'Üç modeli aynı 50 soruyla test ettik. Cevap: evet, ciddi farklar var — ve bu farklılıkların stratejik etkileri var.',
    publishedAt: '2026-05-10',
    readTimeMin: 9,
    category: 'AI',
    author: { name: 'Independent AI ekibi', role: 'Araştırma' },
    body: [
      { type: 'p', text: 'Bir markayı izleyen birçok müşterimiz şunu fark etti: ChatGPT cevabında 1. sıradalar, Gemini cevabında hiç geçmiyorlar. Neden? Üç model aynı sorunun cevabını üretirken farklı veri kaynaklarından, farklı algoritmik tercihlerle yola çıkıyor.' },
      { type: 'h2', text: 'Test metodolojisi' },
      { type: 'p', text: '50 farklı kategoriye ait soruyu (örn: "en iyi proje yönetim aracı", "İstanbul\'da iyi steakhouse") 3 modelde paralel sorduk. Her cevapta hangi markaların geçtiğini, kaçıncı sırada bahsedildiğini kaydettik.' },
      { type: 'h2', text: 'Bulgular' },
      { type: 'h3', text: '1. ChatGPT en geniş repertuar' },
      { type: 'p', text: 'OpenAI\'nin modeli ortalama 4-5 marka öneriyor, küçük ve niş markaları da listeye sıkça katıyor. Geniş eğitim verisi avantajı.' },
      { type: 'h3', text: '2. Claude daha temkinli' },
      { type: 'p', text: 'Anthropic\'in modeli genelde 2-3 büyük marka önerip "daha fazla seçenek için araştırmanı tavsiye ederim" diyor. Sertifika sahibi büyük markalar avantajlı.' },
      { type: 'h3', text: '3. Gemini real-time bilgi ağırlıklı' },
      { type: 'p', text: 'Google\'ın modeli, arama sonuçlarına çok benzer cevaplar veriyor. SEO sıralamanız yüksekse Gemini\'de görünme olasılığınız da yüksek.' },
      { type: 'h2', text: 'Strateji önerileri' },
      { type: 'ul', items: [
        'Tek modelle ölçüm yapmayın. ChatGPT\'de 1.sırada olmak, gerçekte yarı bir görünürlük demek.',
        'Modele göre içerik stratejisi farklılaştırın. Niş markalar ChatGPT\'de güçlü içerik üretmeli. Kurumsal markalar Claude için yetkili kaynaklarda yer almalı. SEO çalışması Gemini için doğrudan etki sağlar.',
        'Her ay tüm modellerde aynı soruları rerun edin. Trendleri haftalık değil, aylık ölçeklerde okuyun.',
      ] },
    ],
  },
  {
    slug: 'llms-txt-rehberi-2026',
    title: 'llms.txt: AI crawler\'lara markanızı doğrudan anlatın',
    excerpt: 'llms.txt standardı 2025\'te ortaya çıktı, 2026\'da Türkiye\'de hızla yayılıyor. Robots.txt\'in AI versiyonu. Adım adım nasıl ekleneceğini anlattık.',
    publishedAt: '2026-05-05',
    readTimeMin: 11,
    category: 'GEO',
    author: { name: 'Independent AI ekibi', role: 'Teknik içerik' },
    body: [
      { type: 'p', text: 'llms.txt, web sitenizin köküne koyduğunuz bir markdown dosyasıdır ve tek bir işi vardır: yapay zeka modellerine markanızı kendi sözlerinizle, yapılandırılmış biçimde anlatmak. Robots.txt arama motoru botlarına "nereyi tarayabilirsin" der; llms.txt ise AI\'a "işte kim olduğum, ne yaptığım ve neye öncelik vermen gerektiği" der. İkisi birbirinin yerine geçmez, yan yana çalışır.' },
      { type: 'p', text: 'Bu yazı bir kurulum kılavuzu değil — dosyayı sitenize ekleme adımlarını, content-type ayarını ve doğrulamayı "llms.txt nedir, nasıl kurulur?" rehberimizde adım adım anlattık. Burada amacımız bir kademe daha derine inmek: standardın altında yatan mantığı, dosyanın her bölümünün ne işe yaradığını, gerçek bir örneğin tam halini ve çoğu markanın gözden kaçırdığı strateji ile hataları. Yani llms.txt\'i "nasıl koyarım" değil, "neden böyle ve en iyi nasıl yazılır" açısından ele alıyoruz.' },
      { type: 'h2', text: 'Standart neyi çözüyor? Asıl mantık' },
      { type: 'p', text: 'llms.txt fikrinin çıkış noktası teknik bir sınırlamadır. Bir AI modeli sitenizi anlamaya çalışırken HTML\'i, navigasyonu, JavaScript ile gelen içeriği ve onlarca sayfayı parçalayıp özet çıkarmak zorunda. Bu süreç hem maliyetli hem kayıplıdır: marka konumlandırmanız, en önemli sayfalarınızın hiyerarşisi ve sizi rakiplerinizden ayıran tek cümle çoğu zaman gürültüde kaybolur. Model elinde kalan dağınık sinyallerden bir izlenim üretir — ve bu izlenim sizin kontrolünüzde değildir.' },
      { type: 'p', text: 'llms.txt bu denklemi tersine çevirir. Modelin çıkarım yaparak ulaşmaya çalıştığı sonucu, ona hazır ve net biçimde sunarsınız. Bunu bir markanın "yetkili özeti" gibi düşünün: dağınık kaynaklardan derlenmiş bir tahmin yerine, sizin onayladığınız tek bir referans metin. Standart kasıtlı olarak markdown üzerine kuruludur, çünkü markdown hem insan hem makine tarafından net okunur; başlıklar, listeler ve linkler modele yapısal ipuçları verir.' },
      { type: 'p', text: 'Burada bir nüansı netleştirmek önemli: llms.txt bir sıralama hilesi değildir ve dosyayı koymak tek başına sizi AI cevaplarında bir gecede üst sıraya taşımaz. Yaptığı şey, var olan otoritenizi ve içeriğinizi modelin doğru anlamasını kolaylaştırmaktır. Yani zayıf bir markanın boşluğunu kapatmaz; güçlü bir markanın yanlış anlaşılmasını önler. Bu ayrımı baştan kabul etmek, dosyaya doğru beklentiyle yaklaşmanızı sağlar.' },
      { type: 'h2', text: 'Dosyanın anatomisi: her bölüm ne işe yarar' },
      { type: 'p', text: 'llmstxt.org standardı esnek ama net bir iskelet önerir. Sözdizimi tamamen standart markdown — özel bir format öğrenmenize gerek yok. Bölümleri tek tek anlamı üzerinden okumak, dosyayı dolgu yerine işlevsel yazmanızı sağlar:' },
      { type: 'ul', items: [
        'H1 başlık (marka adı): Dosyanın ilk satırı tek bir H1 olmalı ve markanızın tam, tutarlı adını taşımalı. Model için bu, dosyanın hangi varlığa ait olduğunu sabitleyen çapadır — sosyal medyada, sitenizde ve dizinlerde kullandığınız adla birebir aynı olsun.',
        'Blockquote tagline (>): Başlığın hemen altındaki tek cümlelik özet, modelin sizi tek bir cümlede nasıl tanımlayacağını belirler. Burası pazarlama sloganı değil, kategori + değer önermesi yeridir: "KOBİ\'ler için ön muhasebe yazılımı" gibi spesifik; "geleceği şekillendiren çözümler" gibi boş değil.',
        'Giriş paragrafları: Tagline\'dan sonra 1-2 kısa paragraf bağlam verir — ne yaptığınız, kime hizmet ettiğiniz, sizi farklı kılan somut nokta. İddialı sıfatlardan kaçının; modeller abartılı pazarlama dilini güvenilmez sinyal olarak filtreler.',
        '## başlıklı bölümler (linkler): Standardın kalbi burası. "## Önemli sayfalar", "## Dokümantasyon", "## Hakkında" gibi başlıklar altında, her satırda bir link ve onun yanında kısa bir açıklama verilir. Açıklama kritik: linkin nereye gittiğini değil, neden önemli olduğunu söyler.',
        'Opsiyonel ## Optional bölümü: Standart, ikincil önemdeki linkleri ayrı bir bölümde işaretlemenize izin verir. Bağlam penceresi kısıtlı olduğunda modelin önce neyi okuyacağını bilmesini sağlar — yani önceliklendirmeyi siz yaparsınız, model tahmin etmez.',
      ] },
      { type: 'p', text: 'Buradaki temel ilke şu: her satır bir karar olmalı. Sitenizdeki her URL\'i listelemek dosyayı zayıflatır; modele neyin önemli olduğunu gösteremezsiniz. İyi bir llms.txt, sitemap.xml\'in kopyası değil, onun editöryal süzgeçten geçmiş halidir. Beş güçlü satır, elli zayıf satırdan daha çok iş görür.' },
      { type: 'h2', text: 'Gerçek bir örnek: tam llms.txt' },
      { type: 'p', text: 'Aşağıda kurgusal ama gerçekçi bir SaaS markası için yazılmış tam bir llms.txt örneği var. Dikkat edin: her bölüm bir işlev taşıyor, her link bir açıklamayla geliyor ve ikincil sayfalar ayrı bir bölüme alınarak önceliklendirme yapılmış.' },
      { type: 'code', text: '# Defterim\n\n> Türkiye\'deki KOBİ\'ler ve serbest çalışanlar için bulut tabanlı ön muhasebe ve e-fatura yazılımı.\n\nDefterim, küçük işletmelerin fatura kesme, gider takibi ve KDV beyannamesi hazırlığını tek panelde toplayan bir muhasebe yazılımıdır. Muhasebeci olmayan kullanıcılar için tasarlanmıştır; teknik terim yerine net Türkçe kullanır ve GİB e-fatura/e-arşiv ile tam entegredir.\n\n## Önemli sayfalar\n\n- [Ürün özellikleri](https://defterim.com/ozellikler): Fatura, gider, raporlama ve e-fatura modüllerinin tam listesi.\n- [Fiyatlandırma](https://defterim.com/fiyatlar): Üç plan, aylık/yıllık seçenekler ve serbest çalışan paketi.\n- [Kimler için](https://defterim.com/kimler-icin): Hedef kullanıcılar — KOBİ, e-ticaret satıcısı, serbest meslek erbabı.\n- [E-fatura entegrasyonu](https://defterim.com/e-fatura): GİB entegrasyonunun nasıl çalıştığı ve geçiş adımları.\n\n## Dokümantasyon\n\n- [Yardım merkezi](https://defterim.com/yardim): Adım adım kullanım kılavuzları ve SSS.\n- [API dokümanı](https://defterim.com/api): Geliştiriciler için REST API referansı.\n\n## Hakkında\n\n- Kuruluş: 2019, İstanbul\n- Odak: KOBİ ve serbest çalışan ön muhasebesi\n- Diller: Türkçe, İngilizce\n- İletişim: destek@defterim.com\n\n## Optional\n\n- [Blog](https://defterim.com/blog): Muhasebe ve işletme yönetimi üzerine içerikler.\n- [Kariyer](https://defterim.com/kariyer): Açık pozisyonlar.' },
      { type: 'p', text: 'Bu örnekte model dosyayı okuduğunda saniyeler içinde şunu öğrenir: Defterim bir kurumsal ERP değil, KOBİ odaklı bir ön muhasebe yazılımıdır; e-fatura entegrasyonu bir farklılaştırıcıdır; ve blog ile kariyer sayfaları ürünü anlamak için ikincil önemdedir. Aynı çıkarımı model sitenizi tek tek tarayarak da yapabilir — ama o zaman tahmine, siz ise kontrole dayanırsınız.' },
      { type: 'p', text: 'Etkisini somutlaştırmak için karşı senaryoyu düşünün. Diyelim bir kullanıcı modele "e-faturaya geçmek isteyen küçük işletme için Türkçe muhasebe programı öner" diye soruyor. llms.txt yoksa model, dağınık sayfalardan "muhasebe yazılımı" izlenimini toplar ve Defterim\'i belki kurumsal ERP\'lerle aynı torbaya atar, belki hiç anmaz. Dosya varsa kategori ("KOBİ ön muhasebesi"), farklılaştırıcı ("GİB e-fatura entegrasyonu") ve hedef kitle ("muhasebeci olmayan kullanıcı") modelin önünde net durur; tam o soruda Defterim\'i doğru bağlamda önermesi çok daha olasıdır. llms.txt\'in işi sıralamayı zorlamak değil, bu eşleşmeyi kolaylaştırmaktır.' },
      { type: 'h2', text: 'Gelişmiş ipuçları' },
      { type: 'p', text: 'Dosyanın temelini kurduktan sonra onu "iyi"den "güçlü"ye taşıyan birkaç ileri pratik var. Çoğu marka bunları atlar:' },
      { type: 'ul', items: [
        'Kategori cümlesini netleştirin: Modelin sizi yanlış kategoride önermesinin en sık nedeni belirsiz bir tagline\'dır. Tek cümlenizde rakiplerinizin de kendini tanımlayacağı kelimeleri değil, sizi spesifik olarak ayıran kategoriyi kullanın.',
        'llms-full.txt\'i değerlendirin: Standart, ana sayfaların tam metin içeriğini barındıran ayrı bir llms-full.txt önerir. Dokümantasyonu yoğun ürünler için bu, modele linklerin arkasındaki içeriği de hazır sunar — ama gereksiz uzunluk faydadan çok gürültü yaratır, sadece gerçekten gerekiyorsa ekleyin.',
        'Açıklamaları niyet odaklı yazın: Her linkin yanındaki açıklama "bu sayfa nedir" değil, "kullanıcı hangi soruyu sorduğunda bu sayfa cevaptır" mantığıyla yazılırsa modelin doğru bağlamda sizi anması kolaylaşır.',
        'Tutarlılığı denetleyin: llms.txt\'teki marka adı, kategori ve iddialar sitenizin geri kalanı, schema.org işaretlemeniz ve sosyal profillerinizle çelişmesin. Çelişen sinyaller modelin güvenini düşürür.',
        'Dosyayı canlı tutun: Yeni ürün, yeni hedef kitle ya da yeni önemli sayfa eklediğinizde llms.txt\'i güncelleyin. Eski bir dosya, ürününüzün altı ay önceki halini anlatmaya devam eder.',
      ] },
      { type: 'quote', text: 'İyi bir llms.txt, sitenizin haritası değil; en iyi editörünüzün üç dakikada vereceği marka brifingidir.' },
      { type: 'h2', text: 'Sık yapılan hatalar' },
      { type: 'p', text: 'Referans bir dosya yazarken kaçınılması gereken kalıplar şaşırtıcı derecede tekrar eder. En yaygın dördü:' },
      { type: 'ul', items: [
        'Sitemap\'i kopyalamak: Yüzlerce URL\'i hiyerarşisiz biçimde listelemek dosyanın tüm değerini yok eder — model neyin önemli olduğunu yine bilemez. llms.txt seçim yapmakla ilgilidir.',
        'Pazarlama dilini doldurmak: "Sektör lideri", "devrim niteliğinde", "benzersiz çözüm" gibi doğrulanamaz ifadeler modeller tarafından elenir ve metnin geri kalanına olan güveni de zedeler. Somut, kanıtlanabilir tanım kullanın.',
        'Açıklamasız linkler: Yalnızca URL listelemek, modele linkin neden orada olduğunu söylemez. Her satıra kısa ve niyet odaklı bir açıklama eklemek, dosyanın değerini katlar.',
        'Koyup unutmak: Dosyayı bir kez yazıp yıllarca dokunmamak, eski bilgiyi sürekli tekrar eden bir referansa dönüşür. Üründe değişen her büyük şey dosyaya yansımalı.',
      ] },
      { type: 'h2', text: 'Dosya bittikten sonra: etkiyi ölçmek' },
      { type: 'p', text: 'llms.txt\'i yazıp yayınlamak işin yarısı; diğer yarısı işe yarayıp yaramadığını görmek. Asıl soru "bot dosyayı okudu mu" değil, "markam AI cevaplarında daha doğru ve daha sık geçiyor mu" sorusudur. Çünkü dosyanın amacı trafik değil, modelin sizi nasıl tanımladığını düzeltmek. Bu yüzden ölçümü bot loglarıyla değil, çıktıyla — yani gerçek AI cevaplarıyla — yapmak gerekir.' },
      { type: 'p', text: 'Pratikte yöntem şu: kategorinizdeki birkaç tipik kullanıcı sorusunu belirleyin, bu soruları belli aralıklarla ChatGPT, Claude ve Gemini\'de sorun ve cevaplarda markanızın geçip geçmediğini, hangi sırada ve hangi tonla geçtiğini bir zaman serisi olarak kaydedin. llms.txt\'i güncellediğinizde bu seri size dürüst bir geri bildirim verir: dosyadaki kategori cümlesini netleştirmek modelin sizi doğru bağlamda anmasına yaradı mı, yaramadı mı. Bunu elle yapmak mümkün ama zahmetlidir; Independent AI tam olarak bu döngüyü otomatikleştirir ve görünürlüğünüzü, sıranızı ve tonunuzu izlenebilir bir grafikte tutar. Referans olarak kendi dosyamızı independentai.space/llms.txt adresinde inceleyebilir, kendi taslağınızı oluştururken örnek alabilirsiniz.' },
      { type: 'p', text: 'Özetle: llms.txt teknik bir dosyadan çok bir editöryal karardır. Birkaç saatte yazılır, ama iyi yazıldığında markanızın AI tarafından nasıl anlaşıldığı üzerinde uzun süreli bir etki bırakır. Onu sitenizin değil, markanızın yetkili özeti olarak görün — ve canlı bir belge gibi besleyin.' },
    ],
  },
  {
    slug: 'tr-pazarinda-geo-2026',
    title: 'Türkiye pazarında GEO 2026: ilk hareket avantajı kimde?',
    excerpt: 'TR pazarında AI brand monitoring oyununa giren ilk markalar 2 yıl içinde ciddi avantaj sağlayacak. Neden ve nasıl?',
    publishedAt: '2026-04-28',
    readTimeMin: 8,
    category: 'Pazarlama',
    author: { name: 'Independent AI ekibi', role: 'Editöryal' },
    body: [
      { type: 'p', text: 'Türkiye SaaS, e-ticaret ve hizmet pazarlarında bir gerçek: müşterileriniz AI\'yı SEO\'dan çok daha hızlı benimsiyor. 2026 Q1 itibarıyla TR\'de ChatGPT aktif kullanıcı sayısı 8 milyona yaklaştı.' },
      { type: 'h2', text: 'TR pazarında neden GEO öncelikli?' },
      { type: 'ul', items: [
        'GPT modelleri Türkçe içerikte İngilizceye göre daha az hata yapıyor; markaları daha net öneriyor.',
        'Yerel rekabet boşluğu: Profound, Otterly gibi global GEO oyuncular Türkçeye optimize değil.',
        'Türk kullanıcılar yabancı kullanıcılara göre AI önerisine daha çok güveniyor (Statista 2026).',
      ] },
      { type: 'h2', text: 'Ne yapmalı?' },
      { type: 'p', text: '1. Ölçün. Markanız bugün AI cevaplarında nerede? Independent AI 6 ay ücretsiz.' },
      { type: 'p', text: '2. İçerik stratejinizi GEO-uyumlu hale getirin. AI modellerinin markanızı doğru anlayacağı, yetkili, yapılandırılmış içerik üretin.' },
      { type: 'p', text: '3. llms.txt ekleyin.' },
      { type: 'p', text: '4. Her ay ölçün ve iterate edin. SEO\'da 3 ayda etki görürdüyseniz, GEO\'da etkiyi 6 ayda görmeyi planlayın.' },
    ],
  },
];

export const POSTS: BlogPost[] = [
  ...ORIGINAL_POSTS,
  ...BATCH_1,
  ...BATCH_2,
  ...BATCH_3,
  ...BATCH_4,
].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export function getPostBySlug(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

/**
 * İlgili yazılar — eski `slice(0, 3)` her yazıda HEP aynı 3 yazıyı linkliyordu,
 * bu yüzden 72 yazı iç-link grafiğinde orphan kalıyordu. Bunun yerine:
 *  1) aynı kategoriden yazılarla topik alaka,
 *  2) "ring" komşularıyla (idx+1, idx+2, ...) — her yazı FARKLI bir ileri küme
 *     linklediği için 84 yazı tam bağlı bir grafik oluşturur ve crawl equity tüm
 *     korpusa yayılır.
 * Build-time'da (SSG) hesaplanır, statik HTML'e gömülür.
 */
export function getRelatedPosts(slug: string, count = 6): BlogPost[] {
  const idx = POSTS.findIndex((p) => p.slug === slug);
  if (idx === -1) return POSTS.slice(0, count);

  const self = POSTS[idx]!;
  const n = POSTS.length;
  const seen = new Set<string>([slug]);
  const result: BlogPost[] = [];

  // 1) Aynı kategoriden — listenin yaklaşık yarısı kadar topik alaka
  const sameCategoryTarget = Math.ceil(count / 2);
  for (const p of POSTS) {
    if (result.length >= sameCategoryTarget) break;
    if (!seen.has(p.slug) && p.category === self.category) {
      result.push(p);
      seen.add(p.slug);
    }
  }

  // 2) Ring komşuları — her yazı farklı bir ileri küme linkler => tam bağlı grafik
  for (let step = 1; step <= n && result.length < count; step++) {
    const p = POSTS[(idx + step) % n]!;
    if (!seen.has(p.slug)) {
      result.push(p);
      seen.add(p.slug);
    }
  }

  return result.slice(0, count);
}

/** Yazının gövde kelime sayısı — BlogPosting JSON-LD wordCount için. */
export function getWordCount(post: BlogPost): number {
  return post.body.reduce((acc, b) => {
    if (b.type === 'ul') {
      return acc + (b.items?.join(' ').split(/\s+/).filter(Boolean).length ?? 0);
    }
    if ('text' in b && b.text) {
      return acc + b.text.split(/\s+/).filter(Boolean).length;
    }
    return acc;
  }, 0);
}

/** Kategoriye göre gruplanmış yazılar — arşiv sayfası için (publishedAt desc korunur). */
export function getPostsByCategory(): { category: BlogCategory; posts: BlogPost[] }[] {
  const preferredOrder: BlogCategory[] = ['GEO', 'AI', 'Strateji', 'Teknik', 'Pazarlama', 'Ürün', 'Sektör'];
  // Tercih sırasına ek olarak, listede olmayan herhangi bir kategoriyi de dahil et
  // (yeni kategori eklenince arşivden yazıların sessizce düşmesini engeller).
  const seen = new Set<BlogCategory>(preferredOrder);
  const extra = [...new Set(POSTS.map((p) => p.category))].filter((c) => !seen.has(c));
  return [...preferredOrder, ...extra]
    .map((category) => ({ category, posts: POSTS.filter((p) => p.category === category) }))
    .filter((g) => g.posts.length > 0);
}
