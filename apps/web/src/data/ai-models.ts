/**
 * Yapay zekâ asistanları atlası — kaynaklı veri modülü.
 *
 * stats.ts ile aynı disiplin: kaynaksız hiçbir yüzde yazılmaz. Her sayının yanında kaynak adı,
 * yıl ve URL bulunur; güven düzeyi ('yüksek' birincil, 'orta' ikincil) ve kapsam ('türkiye' / 'küresel')
 * işaretlenir. Bu dosya stats.ts'e DOKUNMAZ; ayrı ve ek bir kaynaktır.
 *
 * ÜÇ KURAL:
 * 1) Statcounter ile Similarweb rakamları AYNI CÜMLEDE ya da aynı grafikte kullanılmaz.
 *    Statcounter, botlardan sitelere GİDEN yönlendirme trafiğini ölçer; Similarweb, botların kendi
 *    sitelerine GELEN ziyaretleri ölçer. Aynı dönem için taban tabana zıt sonuç vermeleri hata değil,
 *    ölçüm farkıdır. GEO açısından Statcounter, pazar büyüklüğü açısından Similarweb anlamlıdır.
 * 2) Aylık ölçüt ile haftalık ölçüt, kullanıcı sayısı ile lisans (koltuk) sayısı toplanmaz.
 * 3) Türkiye verisi ile küresel veri karıştırılmaz. `kapsam` alanı her kalemde zorunludur;
 *    'küresel' işaretli kalemlerin bir bölümü fiilen ABD örneklemidir, bu `not` alanında yazılıdır.
 *
 * stats.ts DÜZELTME NOTU: `chatgptShare` (%94,49) kaydının ölçüm dönemi Ekim 2025'tir; dosyada
 * `year: 2026` yazıyor — bu, raporun adının (Digital 2026) yılıdır, verinin yılı değil.
 * Aşağıdaki `chatgpt-yonlendirme-payi-tr` kalemi doğru yılla ve Statcounter karşılaştırmasıyla duruyor.
 */

/* ------------------------------------------------------------------ */
/* 1. Asistan profilleri                                               */
/* ------------------------------------------------------------------ */

/**
 * Atlasta yer alan yüzeyler. Yalnız hakkında doğrulanmış veri olanlar listelenir.
 * Grok, DeepSeek ve Meta AI bilerek DIŞARIDA bırakıldı — gerekçeleri VERI_BOSLUKLARI'nda yazılı.
 */
export type ModelKey = 'chatgpt' | 'gemini' | 'google-ai-mode' | 'claude' | 'perplexity' | 'copilot';

export type AiModelProfile = {
  key: ModelKey;
  ad: string;
  saglayici: string;
  /** Asistanın karşımıza çıktığı yüzeyler */
  nerede: string[];
  kimKullaniyor: string;
  gucluYani: string;
  webErisimi: 'var' | 'yok' | 'kısmi';
  kaynakGosterir: boolean;
  /** Yalnız sağlayıcının resmî dokümanından doğrulandıysa dolu; doğrulanamadıysa null */
  botAdi: string | null;
  not?: string;
};

export const AI_MODELS: AiModelProfile[] = [
  {
    key: 'chatgpt',
    ad: 'ChatGPT',
    saglayici: 'OpenAI',
    nerede: ['chatgpt.com', 'ChatGPT mobil uygulaması', 'ChatGPT arama'],
    kimKullaniyor:
      'Mesajların yaklaşık yarısı 18–25 yaş grubundan geliyor; konuşmaların %78’i üç başlıkta toplanıyor: yazma %28,3, pratik rehberlik %28,1, bilgi arama %21,3 (OpenAI–NBER, 2025).',
    gucluYani:
      'Yönlendirme trafiğinin büyük bölümünü tek başına taşıyor: Statcounter ölçümünde Ağustos 2026’da Türkiye payı %77,25, dünya payı %79,4.',
    webErisimi: 'var',
    kaynakGosterir: true,
    botAdi: 'OAI-SearchBot',
    not:
      'OpenAI dört bot belgeliyor: GPTBot (model eğitimi), OAI-SearchBot (ChatGPT arama dizini), ChatGPT-User (kullanıcı isteğiyle sayfa açma), OAI-AdsBot (reklam doğrulaması). Yalnız GPTBot’u engellemek ChatGPT içindeki görünürlüğü KESMEZ; arama dizini OAI-SearchBot ile beslenir. ChatGPT-User kullanıcı tetiklemeli olduğu için OpenAI robots.txt kurallarının “geçerli olmayabileceğini” yazıyor. Kaynak gösterme davranışı gözlemsel olarak biliniyor; OpenAI’nin ilgili yardım sayfası bu araştırmada okunamadı (HTTP 403), resmî ifade alıntılanamadı.',
  },
  {
    key: 'gemini',
    ad: 'Gemini',
    saglayici: 'Google',
    nerede: ['gemini.google.com', 'Gemini mobil uygulaması'],
    kimKullaniyor:
      'Türkiye’de yönlendirme payı Eylül 2025’te %2,28 iken Ağustos 2026’da %18,93’e çıktı; ABD’li B2B alıcılarının %61’i ürün araştırmasında Gemini kullanıyor (Statcounter ve Semrush, 2026).',
    gucluYani:
      '950 milyon aylık aktif kullanıcı; günlük aktif kullanıcı sayısı bir yılda üçe katlandı (Alphabet 2026 2. çeyrek kazanç çağrısı, 22 Temmuz 2026).',
    webErisimi: 'var',
    kaynakGosterir: true,
    botAdi: 'Google-Extended',
    not:
      'Google-Extended bir tarayıcı değil, bir denetim jetonudur: yalnız Gemini uygulamalarının ve Vertex AI’ın eğitim ile temellendirmesini kapsar. Google’ın kendi ifadesiyle “bir sitenin Google Arama’ya dahil olmasını etkilemez ve Google Arama’da sıralama sinyali olarak kullanılmaz”. Sık yapılan hata: Google-Extended’i engellemek AI Overviews’ta görünmeyi kesmez — o yüzey Arama’nın içindedir ve Googlebot ile beslenir.',
  },
  {
    key: 'google-ai-mode',
    ad: 'Google AI Mode ve AI Overviews',
    saglayici: 'Google',
    nerede: ['Google Arama sonuç sayfası'],
    kimKullaniyor:
      'AI Mode açılışından bir yıl sonra 1 milyar aylık kullanıcıyı aştı; sorgu hacmi her çeyrekte ikiye katlandı (Google, Mayıs 2026).',
    gucluYani:
      'Ayrı bir uygulama indirmeyi gerektirmeyen tek yüzey: kullanıcı Gemini uygulamasını hiç açmadan doğrudan arama kutusunda yapay zekâ yanıtıyla karşılaşıyor.',
    webErisimi: 'var',
    kaynakGosterir: true,
    botAdi: 'Googlebot',
    not:
      'Google’a göre AI Overviews ve AI Mode’da destekleyici bağlantı olarak görünmek için ek koşul ya da özel bir optimizasyon gerekmiyor; sayfanın dizine eklenmiş ve snippet’li gösterilmeye uygun olması yeterli. Sınırlama nosnippet, data-nosnippet, max-snippet veya noindex ile yapılır. Bu yüzeyin 1 milyarlık rakamı, Gemini uygulamasının 950 milyonluk rakamıyla TOPLANMAMALI; ikisi ayrı görünürlük yüzeyidir.',
  },
  {
    key: 'claude',
    ad: 'Claude',
    saglayici: 'Anthropic',
    nerede: ['claude.ai', 'Claude mobil uygulaması', 'Claude Code'],
    kimKullaniyor:
      'Claude.ai konuşmalarının %35’i Bilgisayar ve Matematik meslek grubuna ait görevlerden oluşuyor; en yoğun kullanım ABD’de, ardından Hindistan geliyor (Anthropic Economic Index, Şubat 2026).',
    gucluYani:
      'Similarweb ölçümünde payı 12 ayda %1,6’dan %8,9’a yükseldi; son bir yılın en hızlı büyüyen asistanı oldu (Mayıs 2026).',
    webErisimi: 'var',
    kaynakGosterir: true,
    botAdi: 'Claude-SearchBot',
    not:
      'Anthropic üç bot belgeliyor: ClaudeBot (eğitim için içerik toplama), Claude-User (kullanıcı sorusu üzerine siteye erişim), Claude-SearchBot (arama yanıtlarının doğruluğu için içerik çözümleme). Robots.txt rehberlerinde sık geçen “anthropic-ai” ve “Claude-Web” jetonları Anthropic’in resmî destek sayfasında TANIMLI DEĞİL; eski ya da üçüncü taraf listelerden geliyor. Anthropic resmî aylık aktif kullanıcı sayısı açıklamıyor.',
  },
  {
    key: 'perplexity',
    ad: 'Perplexity',
    saglayici: 'Perplexity AI',
    nerede: ['perplexity.ai', 'Perplexity mobil uygulaması'],
    kimKullaniyor:
      'ABD’li B2B alıcılarının %18’i ürün araştırmasında Perplexity kullanıyor; Türkiye’de yönlendirme payı %0,81 ile sınırlı (Semrush ve Statcounter, 2026).',
    gucluYani:
      'Kendi dokümanına göre PerplexityBot siteleri sonuçlarda gösterip bağlantılamak için tarar ve model eğitiminde kullanılmaz; kaynak göstermek ürünün merkezinde.',
    webErisimi: 'var',
    kaynakGosterir: true,
    botAdi: 'PerplexityBot',
    not:
      'İkinci bot Perplexity-User, kullanıcı soru sorduğunda sayfayı açar; Perplexity kendi dokümanında bu getiricinin “isteği kullanıcı başlattığı için genelde robots.txt kurallarını yok saydığını” yazıyor. Her iki bot için IP doğrulama JSON dosyaları yayımlanıyor; WAF kullanan sitelerin izin listesine eklemesi gerekiyor. Şirketin kamuya açık son net rakamı Mayıs 2025’e ait (aylık 780 milyon sorgu); 2026 için doğrulanmış resmî sorgu ya da kullanıcı sayısı bulunamadı.',
  },
  {
    key: 'copilot',
    ad: 'Microsoft Copilot',
    saglayici: 'Microsoft',
    nerede: ['Microsoft Copilot uygulaması', 'Bing yapay zekâ özetleri', 'Microsoft 365'],
    kimKullaniyor:
      'Copilot ailesi 150 milyon aylık aktif kullanıcıyı aştı (Ekim 2025); Microsoft 365 Copilot ücretli koltuk sayısı 30 milyonu geçti (Temmuz 2026). ABD’li B2B alıcılarının %45’i ürün araştırmasında Copilot kullanıyor.',
    gucluYani:
      'Atıfları sağlayıcının kendi aracıyla ölçülebilen tek yüzey: Bing Webmaster Tools’un AI Performance raporu, bir sitenin Copilot’ta, Bing’in yapay zekâ özetlerinde ve seçili iş ortağı entegrasyonlarında ne zaman kaynak gösterildiğini raporluyor.',
    webErisimi: 'var',
    kaynakGosterir: true,
    botAdi: null,
    not:
      'Copilot’a özel, bingbot’tan ayrı bir tarayıcı jetonu resmî Microsoft dokümanında DOĞRULANAMADI; bu yüzden bot adı boş bırakıldı. 150 milyonluk ölçüt 29 Ekim 2025’e aittir ve Microsoft bunu sonraki çeyreklerde yenilemedi. Koltuk sayısı (30 milyon) bir lisans ölçütüdür, kullanıcı sayısıyla karıştırılmamalı. AI Performance raporu atıf hareketini verir, tıklama metriği vaat etmez.',
  },
];

export const MODEL_KEYS = AI_MODELS.map((m) => m.key);

export function modelByKey(key: ModelKey): AiModelProfile | undefined {
  return AI_MODELS.find((m) => m.key === key);
}

/* ------------------------------------------------------------------ */
/* 2. Kaynaklı veri kalemleri                                          */
/* ------------------------------------------------------------------ */

export type SourcedStat = {
  baslik: string;
  /** Görünen değer, Türkçe biçim (ondalık virgül) */
  deger: string;
  /** VERİNİN ölçüm yılı — raporun adındaki yıl değil */
  yil: number;
  kaynakAdi: string;
  kaynakUrl: string;
  guven: 'yüksek' | 'orta';
  kapsam: 'türkiye' | 'küresel';
  /** Sayfada olduğu gibi kullanılacak cümle (kaynak + yıl dahil) */
  cumle: string;
  not?: string;
};

/** Asistanların ölçeği ve kullanım biçimi — ağırlıklı olarak küresel. */
export const KULLANIM_VERILERI: SourcedStat[] = [
  {
    baslik: 'ChatGPT haftalık aktif kullanıcı sayısı',
    deger: '900 milyon haftalık aktif kullanıcı',
    yil: 2026,
    kaynakAdi: 'OpenAI resmî duyurusu',
    kaynakUrl: 'https://openai.com/index/scaling-ai-for-everyone/',
    guven: 'yüksek',
    kapsam: 'küresel',
    cumle: 'ChatGPT’nin haftalık aktif kullanıcı sayısı 900 milyonu aştı (OpenAI, Şubat 2026).',
    not:
      'openai.com sayfaları doğrudan çekilemedi (HTTP 403); rakam en az üç bağımsız aktarımda birebir aynı. Eylül 2026 itibarıyla OpenAI’den daha yeni resmî bir haftalık rakam yayımlanmadı. Dolaşımdaki 800 milyon (Ekim 2025) ve 1 milyar rakamlarıyla karıştırılmamalı.',
  },
  {
    baslik: 'ChatGPT mobil uygulaması aylık aktif kullanıcı',
    deger: '1 milyar aylık aktif kullanıcı',
    yil: 2026,
    kaynakAdi: 'Sensor Tower tahmini, Reuters aktarımı',
    kaynakUrl:
      'https://money.usnews.com/investing/news/articles/2026-06-02/chatgpt-app-hits-1-billion-monthly-active-users-in-record-time-data-shows',
    guven: 'orta',
    kapsam: 'küresel',
    cumle:
      'ChatGPT mobil uygulaması Mayıs 2026’da 1 milyar aylık aktif kullanıcıya ulaştı (Sensor Tower tahmini, Reuters, Haziran 2026).',
    not:
      'Üçüncü taraf tahmini; yalnızca mobil uygulamayı kapsar, web kullanımını içermez. OpenAI doğrulamadı. Bu AYLIK ölçüt, OpenAI’nin 900 milyonluk HAFTALIK rakamıyla karıştırılmamalı.',
  },
  {
    baslik: 'Gemini uygulaması aylık aktif kullanıcı',
    deger: '950 milyon aylık aktif kullanıcı',
    yil: 2026,
    kaynakAdi: 'Alphabet 2026 2. çeyrek kazanç açıklaması (Sundar Pichai)',
    kaynakUrl: 'https://blog.google/company-news/inside-google/message-ceo/alphabet-earnings-q2-2026/',
    guven: 'yüksek',
    kapsam: 'küresel',
    cumle:
      'Gemini uygulamasının aylık aktif kullanıcı sayısı 950 milyona ulaştı; günlük aktif kullanıcı sayısı bir yılda üçe katlandı (Alphabet, 22 Temmuz 2026).',
    not: 'Aynı metinde Google’ın dakikada yaklaşık 22 milyar jeton işlediği belirtiliyor.',
  },
  {
    baslik: 'Gemini büyüme çizgisi',
    deger: '650 milyon → 750 milyon → 950 milyon',
    yil: 2026,
    kaynakAdi: 'Alphabet çeyrek sonuçları (Sundar Pichai), TechCrunch aktarımı',
    kaynakUrl: 'https://techcrunch.com/2026/02/04/googles-gemini-app-has-surpassed-750m-monthly-active-users/',
    guven: 'yüksek',
    kapsam: 'küresel',
    cumle:
      'Gemini uygulaması 2025’in üçüncü çeyreğinde 650 milyon, dördüncü çeyreğinde 750 milyon aylık aktif kullanıcıya ulaşmıştı; 2026’nın ikinci çeyreğinde 950 milyona çıktı (Alphabet).',
    not:
      '750 milyon rakamı 4 Şubat 2026 tarihli çeyrek bültenindeki Pichai alıntısıdır: “The Gemini App has grown to over 750 million monthly active users.”',
  },
  {
    baslik: 'Google Arama içindeki AI Mode kullanıcısı',
    deger: '1 milyar aylık kullanıcı',
    yil: 2026,
    kaynakAdi: 'Google Search Blog — I/O 2026 Arama Güncellemeleri',
    kaynakUrl: 'https://blog.google/products-and-platforms/products/search/search-io-2026/',
    guven: 'yüksek',
    kapsam: 'küresel',
    cumle:
      'Google’ın AI Mode özelliği açılışından bir yıl sonra 1 milyar aylık kullanıcıyı aştı ve sorgu hacmi her çeyrekte ikiye katlandı (Google, Mayıs 2026).',
    not:
      'Bu bir asistan uygulaması değil, arama sonucunun içindeki yapay zekâ modudur; Gemini uygulamasının 950 milyonluk rakamıyla toplanmamalı. GEO açısından ayrı bir görünürlük yüzeyi sayılmalı.',
  },
  {
    baslik: 'Microsoft Copilot ailesi aylık aktif kullanıcı',
    deger: '150 milyon aylık aktif kullanıcı',
    yil: 2025,
    kaynakAdi: 'Microsoft 2026 mali yılı 1. çeyrek kazanç çağrısı (Satya Nadella)',
    kaynakUrl: 'https://www.microsoft.com/en-us/investor/events/fy-2026/earnings-fy-2026-q1',
    guven: 'yüksek',
    kapsam: 'küresel',
    cumle: 'Microsoft’un Copilot ailesi 150 milyon aylık aktif kullanıcıyı aştı (Satya Nadella, 29 Ekim 2025).',
    not:
      'Microsoft bu ölçütü sonraki çeyreklerde yenilemedi; Eylül 2026 itibarıyla daha güncel resmî bir Copilot aylık kullanıcı sayısı yok. Aynı çağrıda ürünler genelinde “900 milyon aylık aktif yapay zekâ özelliği kullanıcısı” da açıklandı; bu çok daha geniş bir tanımdır.',
  },
  {
    baslik: 'Microsoft 365 Copilot ücretli koltuk sayısı',
    deger: '30 milyon ücretli koltuk',
    yil: 2026,
    kaynakAdi: 'Microsoft 2026 mali yılı 4. çeyrek sonuçları',
    kaynakUrl: 'https://www.microsoft.com/en-us/investor/earnings/fy-2026-q4/press-release-webcast',
    guven: 'yüksek',
    kapsam: 'küresel',
    cumle:
      'Microsoft 365 Copilot ücretli koltuk sayısı 30 milyonu aştı (Microsoft 2026 mali yılı 4. çeyrek, 29 Temmuz 2026).',
    not:
      'Kurumsal lisans sayısıdır, kullanım değil. Çizgi: 15 milyon (Ocak 2026) → 20 milyon (Nisan 2026) → 30 milyon (Temmuz 2026). Sayfa doğrudan çekilemedi; rakam birden çok aktarımda aynı.',
  },
  {
    baslik: 'Perplexity aylık sorgu hacmi',
    deger: '780 milyon aylık sorgu',
    yil: 2025,
    kaynakAdi: 'Aravind Srinivas (Perplexity CEO), Bloomberg Tech konferansı',
    kaynakUrl: 'https://www.justthink.ai/blog/perplexitys-780m-monthly-queries-signaling-the-ai-search-revolution',
    guven: 'orta',
    kapsam: 'küresel',
    cumle:
      'Perplexity, Mayıs 2025’te aylık 780 milyon sorgu aldığını açıkladı (Aravind Srinivas, Bloomberg Tech, 5 Haziran 2025).',
    not:
      'Şirketin kamuya açık son net rakamı budur; 2026 için doğrulanmış resmî bir sorgu ya da kullanıcı sayısı bulunamadı. Dolaşımdaki 1,2–1,5 milyar rakamları üçüncü taraf tahminidir, kullanılmamalı. CEO açıklaması olmasına rağmen birincil kayda ulaşılamadığı için “orta” işaretlendi.',
  },
  {
    baslik: 'ChatGPT’nin üretken yapay zekâ web trafiğindeki payı',
    deger: '%52,7',
    yil: 2026,
    kaynakAdi: 'Similarweb Global AI Tracker (PPC Land aktarımı)',
    kaynakUrl: 'https://ppc.land/chatgpt-drops-to-52-7-as-claude-triples-its-ai-traffic-share/',
    guven: 'orta',
    kapsam: 'küresel',
    cumle:
      'Üretken yapay zekâ sitelerine gelen dünya genelindeki web ziyaretlerinin %52,7’si ChatGPT’ye gitti; 12 ay önce bu oran %76,4’tü (Similarweb, Mayıs 2026).',
    not:
      'Ölçülen şey, sohbet botu sitelerine GELEN ziyaretlerdir; botların dışarıya gönderdiği yönlendirme trafiği değildir — bu yüzden Statcounter rakamlarıyla aynı cümlede kullanılamaz. Similarweb’in kendi blogu aynı dönem için “yaklaşık %53” diyor. ChatGPT’nin mutlak ziyaret sayısı düşmedi, sabit kaldı; pay kaybı rakiplerin büyümesinden.',
  },
  {
    baslik: 'Gemini’nin üretken yapay zekâ web trafiğindeki payı',
    deger: '%27,3',
    yil: 2026,
    kaynakAdi: 'Similarweb Global AI Tracker (PPC Land aktarımı)',
    kaynakUrl: 'https://ppc.land/chatgpt-drops-to-52-7-as-claude-triples-its-ai-traffic-share/',
    guven: 'orta',
    kapsam: 'küresel',
    cumle:
      'Gemini’nin üretken yapay zekâ web trafiğindeki payı 12 ayda %8,9’dan %27,3’e çıktı (Similarweb, Mayıs 2026).',
    not: 'Similarweb’in kendi blogu aynı dönem için “yaklaşık %27–28” diyor; iki aktarım tutarlı. Yükseliş Eylül 2025’te hızlanmış.',
  },
  {
    baslik: 'Claude’un üretken yapay zekâ web trafiğindeki payı',
    deger: '%8,9',
    yil: 2026,
    kaynakAdi: 'Similarweb Global AI Tracker (PPC Land aktarımı)',
    kaynakUrl: 'https://ppc.land/chatgpt-drops-to-52-7-as-claude-triples-its-ai-traffic-share/',
    guven: 'orta',
    kapsam: 'küresel',
    cumle:
      'Claude’un payı 12 ayda %1,6’dan %8,9’a yükseldi; son 12 ayın en hızlı büyüyen asistanı oldu (Similarweb, Mayıs 2026).',
    not:
      'Aynı dönemde DeepSeek %5,3’ten %4,0’a, Perplexity %1,8’den %1,3’e geriledi; Grok %2,8’de sabit kaldı, Copilot %1,9’dan %2,0’a çıktı. Claude Şubat 2026’daki %3,4’ten üç ayda üçe katlanmış.',
  },
  {
    baslik: 'Üretken yapay zekâ sitelerinin toplam trafiği',
    deger: '9,5 milyar aylık web ziyareti',
    yil: 2026,
    kaynakAdi: 'Similarweb AI Search blogu',
    kaynakUrl: 'https://aisearch.similarweb.com/blog/gen-ai-stats/',
    guven: 'orta',
    kapsam: 'küresel',
    cumle:
      'Üretken yapay zekâ siteleri Mayıs 2026’da aylık 9,5 milyar web ziyareti aldı; bu bir yıl öncesine göre %70 artış demek (Similarweb).',
    not:
      'Aynı dönemde tekil ziyaretçi %57 artışla 655 milyona, uygulama indirmesi %58 artışla 4,4 milyara çıktı. Pay kavgası sabit bir pastanın değil, büyüyen pastanın üstünde yaşanıyor.',
  },
  {
    baslik: 'Dünya genelinde yapay zekâ sohbet botu yönlendirme payları',
    deger: 'ChatGPT %79,4 · Gemini %10,9 · Perplexity %4,31 · Copilot %2,79 · Claude %2,57 · DeepSeek %0,02',
    yil: 2026,
    kaynakAdi: 'Statcounter Global Stats — AI Chatbot Market Share (Dünya)',
    kaynakUrl: 'https://gs.statcounter.com/ai-chatbot-market-share',
    guven: 'orta',
    kapsam: 'küresel',
    cumle:
      'Statcounter ölçümüne göre Ağustos 2026’da küresel yapay zekâ sohbet botu yönlendirme payları: ChatGPT %79,4, Gemini %10,9, Perplexity %4,31, Copilot %2,79, Claude %2,57, DeepSeek %0,02 (Statcounter, 2026).',
    not:
      'Gemini payı ikinci bir okumada %10,93 görünüyor; fark yuvarlama. Bu oranlar Similarweb’in %52,7 / %27,3 ölçümüyle açıkça çelişir — çelişki gerçek bir ölçüm farkıdır, iki kaynak aynı cümlede kullanılmamalı. Statcounter sayfasında yöntem açıklaması yayımlamadığı için güven “orta” bırakıldı. DeepSeek’in %0,02’si gerçek kullanımı değil, bu ölçüm ağının Çin’deki kapsam boşluğunu yansıtıyor olabilir.',
  },
  {
    baslik: 'Dünyada üretken yapay zekâ kullanan kişi sayısı',
    deger: '2,42 milyar kişi (%29,2)',
    yil: 2026,
    kaynakAdi: 'DataReportal Digital 2026 Mid-Year Global Update Report',
    kaynakUrl: 'https://datareportal.com/reports/digital-2026-mid-year-global-update-report',
    guven: 'orta',
    kapsam: 'küresel',
    cumle:
      'Dünyada 2,42 milyar kişi üretken yapay zekâ araçlarını aktif kullanıyor; bu, dünya nüfusunun %29,2’sine denk geliyor (DataReportal, Nisan 2026).',
    not:
      'Doğrudan ölçüm değil, türetilmiş tahmindir: OpenAI’nin 900 milyonluk haftalık rakamı 1,15 milyar aylık kullanıcıya çevriliyor, üstüne Similarweb ve CNNIC verileri ekleniyor. Rapor yıllık artışı %141 olarak veriyor.',
  },
  {
    baslik: 'Yapay zekânın herhangi bir biçimini kullanan çevrimiçi yetişkinler',
    deger: '%81,2',
    yil: 2025,
    kaynakAdi: 'GWI (DataReportal Digital 2026 Mid-Year raporu üzerinden)',
    kaynakUrl: 'https://datareportal.com/reports/digital-2026-mid-year-global-update-report',
    guven: 'orta',
    kapsam: 'küresel',
    cumle:
      'Çevrimiçi yetişkinlerin %81,2’si son bir ay içinde yapay zekânın en az bir biçimini kullandı (GWI, 2025 4. çeyrek).',
    not:
      '54 ekonomide 240 binden fazla katılımcıya dayanan beyana dayalı anket. “Yapay zekânın herhangi bir biçimi” tanımı geniştir; sohbet botu kullanımıyla birebir aynı değildir. Aynı rapor ChatGPT’yi son bir ayda kullananları %31,2 olarak veriyor.',
  },
  {
    baslik: 'ChatGPT kullanıcılarının yaş profili',
    deger: 'Mesajların yaklaşık yarısı 18–25 yaş',
    yil: 2025,
    kaynakAdi: 'OpenAI & NBER — How People Use ChatGPT (Çalışma Tebliği w34255)',
    kaynakUrl: 'https://www.nber.org/papers/w34255',
    guven: 'yüksek',
    kapsam: 'küresel',
    cumle: 'ChatGPT mesajlarının yaklaşık yarısını 18–25 yaş grubundaki kullanıcılar gönderiyor (OpenAI–NBER, 2025).',
    not:
      '1,1 milyon kimliksizleştirilmiş mesaj, Mayıs 2024 – Haziran 2025 dönemi. Aynı çalışmada iş dışı kullanım payı %53’ten %70’in üzerine çıktı.',
  },
  {
    baslik: 'ChatGPT’ye sorulan soruların türü',
    deger: '%28,3 yazma · %28,1 pratik rehberlik · %21,3 bilgi arama',
    yil: 2025,
    kaynakAdi: 'OpenAI & NBER — How People Use ChatGPT (Çalışma Tebliği w34255)',
    kaynakUrl: 'https://www.nber.org/papers/w34255',
    guven: 'yüksek',
    kapsam: 'küresel',
    cumle:
      'ChatGPT konuşmalarının yaklaşık %78’i üç başlıkta toplanıyor: yazma %28,3, pratik rehberlik %28,1, bilgi arama %21,3 (OpenAI–NBER, 2025).',
    not:
      'Ticari niyetli sorgular ayrı bir kategori olarak raporlanmıyor; marka görünürlüğü açısından en yakın vekil “bilgi arama” ve “pratik rehberlik” başlıklarıdır.',
  },
  {
    baslik: 'Claude’un kullanım profili',
    deger: 'Konuşmaların %35’i yazılım ve matematik görevleri',
    yil: 2026,
    kaynakAdi: 'Anthropic Economic Index — Mart 2026 raporu',
    kaynakUrl: 'https://www.anthropic.com/research/economic-index-march-2026-report',
    guven: 'yüksek',
    kapsam: 'küresel',
    cumle:
      'Claude.ai konuşmalarının %35’i Bilgisayar ve Matematik meslek grubuna ait görevlerden oluşuyor (Anthropic Economic Index, 2026).',
    not:
      'Örneklem 5–12 Şubat 2026. Aynı raporda ders ödevi payı %19’dan %12’ye düştü. En yoğun kullanım ABD’de, ardından Hindistan geliyor; ilk 20 ülke kişi başı kullanımın %48’ini oluşturuyor.',
  },
  {
    baslik: 'Yapay zekâ botlarının tarama amacı',
    deger: 'Taramaların yaklaşık %80’i eğitim amaçlı, kullanıcı eylemi %5’in altında',
    yil: 2025,
    kaynakAdi: 'Cloudflare Blog — A deeper look at AI crawlers',
    kaynakUrl: 'https://blog.cloudflare.com/ai-crawler-traffic-by-purpose-and-industry/',
    guven: 'yüksek',
    kapsam: 'küresel',
    cumle:
      'Cloudflare ağındaki yapay zekâ bot trafiğinin yaklaşık %80’i model eğitimi amaçlı; kullanıcı eylemiyle tetiklenen getirmeler toplamın %5’inin altında kalıyor (Cloudflare, 2025).',
    not:
      'Veri Temmuz – Ağustos 2025 dönemine ait, güncel değil. Kullanıcı eylemi kategorisinin yaklaşık dörtte üçünü OpenAI’nin ChatGPT-User botu oluşturuyor. ClaudeBot ve GPTBot birlikte gözlenen tarama etkinliğinin neredeyse yarısını oluşturuyor.',
  },
  {
    baslik: 'Grok — resmî tarayıcı dokümanının yokluğu',
    deger: 'x.ai/robots.txt’te adlandırılmış xAI bot jetonu yok',
    yil: 2026,
    kaynakAdi: 'x.ai/robots.txt (doğrudan okundu)',
    kaynakUrl: 'https://x.ai/robots.txt',
    guven: 'yüksek',
    kapsam: 'küresel',
    cumle:
      'xAI’nin kendi robots.txt dosyasında adlandırılmış bir Grok ya da xAI bot jetonu bulunmuyor; dosya yalnız “Content-Signal: ai-train=yes, search=yes, ai-input=yes” satırını taşıyor (x.ai, 2026).',
    not:
      'Üçüncü taraf bot dizinlerinde geçen GrokBot/1.0, xAI-Grok/1.0 ve Grok-DeepSearch/1.0 adları sağlayıcının resmî dokümanında doğrulanamadı. Bu adları robots.txt’e yazmak güvenilir bir denetim sağlamaz.',
  },
  {
    baslik: 'DeepSeek — tarayıcı kimliğinin yokluğu',
    deger: 'Yayımlanmış bir tarayıcı user-agent’ı yok',
    yil: 2026,
    kaynakAdi: 'xSeek Docs — DeepSeek user agents (üçüncü taraf bot dizini)',
    kaynakUrl: 'https://www.xseek.io/docs/deepseek-user-agents',
    guven: 'orta',
    kapsam: 'küresel',
    cumle:
      'DeepSeek, diğer büyük sağlayıcıların aksine tarayıcısı için yayımlanmış bir user-agent bildirmiyor; getirmeleri sunucu kayıtlarında sıradan tarayıcı trafiğinden ayırt edilemiyor (üçüncü taraf bot dizinleri, 2026).',
    not:
      'Olumsuz bir iddia olduğu için “orta” güven verildi: üç bağımsız bot dizini resmî dokümanın bulunmadığını söylüyor, ancak sağlayıcının kendi beyanı yok. Uygulamada DeepSeek trafiğini ayrıştırmak ya da engellemek mümkün değil.',
  },
  {
    baslik: 'Haber için yapay zekâ sohbet botu kullanımı — dünya',
    deger: '%10 (35 yaş altında %16)',
    yil: 2026,
    kaynakAdi: 'Reuters Institute Digital News Report 2026 — Yönetici Özeti',
    kaynakUrl: 'https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary',
    guven: 'yüksek',
    kapsam: 'küresel',
    cumle:
      'Dünya genelinde haftalık olarak haber için yapay zekâ sohbet botu kullananların oranı %10, 35 yaş altında ise %16 (Reuters Institute Digital News Report 2026).',
    not: 'Geçen yıl %7’ydi. Türkiye rakamı (%14) aynı araştırmadan gelse de ayrı etiketlenmeli.',
  },
];

/** Türkiye'ye özgü veriler ve Türkçenin dijital ağırlığı. */
export const TURKIYE_VERILERI: SourcedStat[] = [
  {
    baslik: 'Girişimlerde yapay zekâ kullanımı dört yılda üçe katlandı',
    deger: '%7,5',
    yil: 2025,
    kaynakAdi: 'TÜİK, Yapay Zekâ İstatistikleri, 2025 (1 Ekim 2025)',
    kaynakUrl: 'https://veriportali.tuik.gov.tr/tr/press/57945',
    guven: 'yüksek',
    kapsam: 'türkiye',
    cumle:
      'Türkiye’de 10 ve daha fazla çalışanı olan girişimlerin %7,5’i yapay zekâ teknolojilerinden en az birini kullandığını beyan etti; bu oran 2021’de %2,7 idi (TÜİK, 2025).',
    not:
      'Yalnızca 10+ çalışanı olan girişimleri kapsıyor; mikro işletmeler kapsam dışı. Kurum olarak yapay zekâ kullanan işletme oranının düşük olması, o kurumda kararı veren KİŞİNİN yapay zekâ kullanmadığı anlamına gelmez; iki ölçüm karıştırılmamalı.',
  },
  {
    baslik: 'Girişim büyüklüğüne göre yapay zekâ kullanımı',
    deger: '10-49 çalışan %6,6 · 50-249 çalışan %9,6 · 250+ çalışan %24,1',
    yil: 2025,
    kaynakAdi: 'TÜİK, Yapay Zekâ İstatistikleri, 2025',
    kaynakUrl: 'https://veriportali.tuik.gov.tr/tr/press/57945',
    guven: 'yüksek',
    kapsam: 'türkiye',
    cumle:
      'Yapay zekâ kullanımı 10-49 çalışanı olan girişimlerde %6,6, 50-249 çalışanı olanlarda %9,6, 250 ve üzeri çalışanı olanlarda %24,1 (TÜİK, 2025).',
    not: '2021 karşılaştırması: sırasıyla %2,3, %3,6 ve %9,6. Büyük girişimlerdeki artış küçüklerin yaklaşık üç katı.',
  },
  {
    baslik: 'Sektöre göre yapay zekâ kullanımı',
    deger: 'Bilgi ve iletişim %47,1 · Finans ve sigorta %21,1 · Bilgisayar ve iletişim araçları onarımı %15,2',
    yil: 2025,
    kaynakAdi: 'TÜİK, Yapay Zekâ İstatistikleri, 2025',
    kaynakUrl: 'https://veriportali.tuik.gov.tr/tr/press/57945',
    guven: 'yüksek',
    kapsam: 'türkiye',
    cumle:
      'Yapay zekâyı en yaygın kullanan sektör %47,1 ile bilgi ve iletişim; onu %21,1 ile finans ve sigorta, %15,2 ile bilgisayar ve iletişim araçları onarımı izliyor (TÜİK, 2025).',
    not: 'NACE sınıflamasına göre; diğer sektörlerin oranları bülten metninde tek tek verilmiyor, yalnızca ilk üç sıra yazılı.',
  },
  {
    baslik: 'Girişimlerde yapay zekânın en yaygın kullanım amacı',
    deger: '%46,5 pazarlama veya satış',
    yil: 2025,
    kaynakAdi: 'TÜİK, Yapay Zekâ İstatistikleri, 2025',
    kaynakUrl: 'https://veriportali.tuik.gov.tr/tr/press/57945',
    guven: 'yüksek',
    kapsam: 'türkiye',
    cumle:
      'Yapay zekâ kullanan girişimlerin %46,5’i bunu pazarlama veya satış amacıyla yapıyor; bu, tüm kullanım amaçları arasında ilk sırada (TÜİK, 2025).',
    not:
      'Diğer amaçlar: üretim veya hizmet süreçleri %41,1, Ar-Ge veya yenilik %41,0, işletme süreçleri ve yönetim %40,0, muhasebe/finans %33,7, BİT güvenliği %22,6, lojistik %13,6. Birden fazla seçenek işaretlenebildiği için toplam 100 değil.',
  },
  {
    baslik: 'Yapay zekâ kullanmayan girişimlerin önündeki engel',
    deger: '%74,2 uzmanlık eksikliği',
    yil: 2025,
    kaynakAdi: 'TÜİK, Yapay Zekâ İstatistikleri, 2025',
    kaynakUrl: 'https://veriportali.tuik.gov.tr/tr/press/57945',
    guven: 'yüksek',
    kapsam: 'türkiye',
    cumle:
      'Yapay zekâ kullanmayan ama kullanmayı düşünen girişimlerin %74,2’si önündeki engelin girişimde uzmanlık eksikliği olduğunu söylüyor; maliyet %67,4, hukuki belirsizlik %62,4 ile onu izliyor (TÜİK, 2025).',
    not:
      'Yapay zekâ kullanmayan ancak kullanmayı düşünen girişimlerin oranı %9,0 (10-49 çalışanda %8,4, 50-249’da %10,4, 250+’da %18,2). Birden fazla seçenek işaretlenebiliyor.',
  },
  {
    baslik: 'Bireylerde üretken yapay zekâ kullanımının yaş kırılımı',
    deger: '16-24 yaş %39,4 · 25-34 yaş %30,0 · 35-44 yaş %15,5',
    yil: 2025,
    kaynakAdi: 'TÜİK, Yapay Zekâ İstatistikleri, 2025',
    kaynakUrl: 'https://veriportali.tuik.gov.tr/tr/press/57945',
    guven: 'yüksek',
    kapsam: 'türkiye',
    cumle:
      'Üretken yapay zekâ kullanımı 16-24 yaş grubunda %39,4, 25-34 yaşta %30,0, 35-44 yaşta %15,5; en düşük oran 65-74 yaş grubunda (TÜİK, 2025).',
    not:
      'Bülten 65-74 yaş için sayısal değer vermiyor, yalnızca “en düşük” olduğunu belirtiyor. 16-74 yaş geneli %19,2 (stats.ts’teki genAiUsage kalemi). Hedef kitlesi genç olan sektörlerde kullanılabilir; kitlesi yaşlı olan sektörlerde kullanılmamalı.',
  },
  {
    baslik: 'Üretken yapay zekâ kullanımında cinsiyet farkı',
    deger: 'Erkek %19,4 · Kadın %18,8',
    yil: 2025,
    kaynakAdi: 'TÜİK, Yapay Zekâ İstatistikleri, 2025',
    kaynakUrl: 'https://veriportali.tuik.gov.tr/tr/press/57945',
    guven: 'yüksek',
    kapsam: 'türkiye',
    cumle:
      'Türkiye’de üretken yapay zekâ kullanan erkeklerin oranı %19,4, kadınların oranı %18,8; aradaki fark 0,6 puan (TÜİK, 2025).',
    not:
      'ÇELİŞKİ: ikincil özetlerde bu rakamlar %20,4 / %17,9 olarak dolaşıyor; birincil bültende yazan değerler %19,4 ve %18,8’dir. İkincil sayı kullanılmamalı.',
  },
  {
    baslik: 'Eğitim düzeyine göre yapay zekâ kullanımı',
    deger: 'Yükseköğretim %36,1 · Lise %22,8 · İlköğretim-ortaokul %17,2 · İlkokul %2,2',
    yil: 2025,
    kaynakAdi: 'TÜİK, Yapay Zekâ İstatistikleri, 2025',
    kaynakUrl: 'https://veriportali.tuik.gov.tr/tr/press/57945',
    guven: 'yüksek',
    kapsam: 'türkiye',
    cumle:
      'Üretken yapay zekâ kullanımı yükseköğretim mezunlarında %36,1, lise veya mesleki lise mezunlarında %22,8, ilköğretim-ortaokul mezunlarında %17,2, ilkokul mezunlarında %2,2 (TÜİK, 2025).',
    not:
      'Yükseköğretim ile ilkokul arasındaki fark 33,9 puan — kullanımdaki en keskin ayrım cinsiyet değil, eğitim ve yaş. İkincil özetlerin “~%33” yuvarlaması kullanılmamalı.',
  },
  {
    baslik: 'Bireylerde yapay zekâ kullanım amacı',
    deger: 'Özel amaç %79,7 · Mesleki amaç %33,8 · Örgün eğitim %31,4',
    yil: 2025,
    kaynakAdi: 'TÜİK, Yapay Zekâ İstatistikleri, 2025',
    kaynakUrl: 'https://veriportali.tuik.gov.tr/tr/press/57945',
    guven: 'yüksek',
    kapsam: 'türkiye',
    cumle:
      'Yapay zekâ kullanan bireylerin %79,7’si özel amaçlarla, %33,8’i mesleki amaçlarla, %31,4’ü örgün eğitim için kullanıyor (TÜİK, 2025).',
    not:
      'Cinsiyete göre: mesleki amaçlı kullanım erkeklerde %37,7, kadınlarda %29,5; örgün eğitim amaçlı kullanım kadınlarda %36,6, erkeklerde %26,7. Birden fazla amaç işaretlenebiliyor.',
  },
  {
    baslik: 'Yapay zekâ kullanmayanların gerekçesi',
    deger: '%63,3 ihtiyaç duymamak',
    yil: 2025,
    kaynakAdi: 'TÜİK, Yapay Zekâ İstatistikleri, 2025',
    kaynakUrl: 'https://veriportali.tuik.gov.tr/tr/press/57945',
    guven: 'yüksek',
    kapsam: 'türkiye',
    cumle:
      'Üretken yapay zekâ kullanmayanların %63,3’ü ihtiyaç duymadığını, %18,7’si nasıl kullanılacağını bilmediğini, %12,4’ü böyle bir aracın varlığından haberdar olmadığını söylüyor (TÜİK, 2025).',
    not:
      'Gizlilik, güvenlik veya emniyet endişesi yalnızca %5,5 ile dördüncü sırada — Türkiye’de kullanmama nedeni güvenden çok farkındalık ve algılanan ihtiyaç.',
  },
  {
    baslik: 'Türkiye’de yapay zekâ sohbet botu yönlendirme payları',
    deger: 'ChatGPT %77,25 · Gemini %18,93 · Claude %1,80 · Copilot %1,21 · Perplexity %0,81',
    yil: 2026,
    kaynakAdi: 'Statcounter Global Stats — AI Chatbot Market Share (Türkiye)',
    kaynakUrl: 'https://gs.statcounter.com/ai-chatbot-market-share/all/turkey',
    guven: 'orta',
    kapsam: 'türkiye',
    cumle:
      'Türkiye’de yapay zekâ sohbet botlarından web sitelerine gelen yönlendirmelerin %77,25’i ChatGPT, %18,93’ü Gemini kaynaklı; Claude %1,80, Microsoft Copilot %1,21, Perplexity %0,81 (Statcounter, Ağustos 2026).',
    not:
      'Aynı ay için üç ayrı okuma yapıldı: sitenin ekranında %77,25, ham CSV dökümünde %77,06, üçüncü bir okumada %77,17; fark yuvarlama ve aygıt kırılımından kaynaklanıyor. Burada ekran değerleri kullanıldı. Statcounter yöntemini belgelemediği için güven “orta”. Türkiye’de Gemini payı küresel ortalamanın (%10,9) belirgin üstünde, Perplexity payı ise altında (%4,31’e karşı %0,81) — küresel rakamlar Türkiye için kullanılmamalı.',
  },
  {
    baslik: 'Gemini’nin Türkiye’deki yükselişi',
    deger: '%2,28 → %18,93 (Eylül 2025 → Ağustos 2026)',
    yil: 2026,
    kaynakAdi: 'Statcounter Global Stats — AI Chatbot Market Share (Türkiye, aylık seri)',
    kaynakUrl: 'https://gs.statcounter.com/ai-chatbot-market-share/all/turkey',
    guven: 'orta',
    kapsam: 'türkiye',
    cumle:
      'Gemini’nin Türkiye’deki yönlendirme payı Eylül 2025’te %2,28 iken Ağustos 2026’da %18,93’e çıktı; aynı dönemde ChatGPT’nin payı %93,35’ten %77,25’e geriledi (Statcounter).',
    not:
      'İkinci bir okumada aynı seri %2,71 → %19,21 ve ChatGPT %93,15 → %77,06 görünüyor; fark yuvarlama. Nisan 2026’da Gemini zirve yaptı — bu ay için iki okuma var: %24,43 ve %24,34. Bir haber sitesinde geçen Nisan 2026 değerleri (ChatGPT %88,11 / Gemini %7,76) Statcounter’ın kendi verisiyle TUTMUYOR, kullanılmamalı. Türkiye’de tek asistanlı dönem kapandı; tek bir sağlayıcıya göre optimizasyon riskli.',
  },
  {
    baslik: 'Türkiye’de yapay zekâ kaynaklı web yönlendirmelerinde ChatGPT payı',
    deger: '%94,49',
    yil: 2025,
    kaynakAdi: 'Digital 2026 Global Overview (We Are Social + Meltwater), Hürriyet Daily News aktarımı',
    kaynakUrl: 'https://www.hurriyetdailynews.com/turkiye-tops-global-chatgpt-driven-web-traffic-report-finds-217525',
    guven: 'orta',
    kapsam: 'türkiye',
    cumle:
      'Türkiye’de yapay zekâ kaynaklı web yönlendirmelerinin %94,49’u ChatGPT’den geliyordu; dünya ortalaması %80,92 (Digital 2026 raporu, Ekim 2025 verisi).',
    not:
      'ÖLÇÜM DÖNEMİ EKİM 2025’tir, rapor Ocak 2026’da yayımlandı; stats.ts bu kalemi `year: 2026` olarak etiketliyor, düzeltilmeli. Aynı ülke için Statcounter’ın Ağustos 2026 ölçümü %77,25 diyor — yani veri 11 ay eskidi ve bugünkü gibi sunulmamalı. DataReportal’ın Digital 2026: Türkiye sayfası doğrudan kontrol edildi; sayfada yapay zekâya dair hiçbir veri yok, rakam yalnızca küresel raporu aktaran haberlerde geçiyor. Bazı Türkçe haberler bunu “her 100 kişiden 95’i ChatGPT’ye güveniyor” diye aktarıyor; bu yanlış aktarımdır, ölçülen şey güven değil trafik payıdır.',
  },
  {
    baslik: 'Türkiye’de yapay zekâ kullanımındaki artış',
    deger: '%30 artış',
    yil: 2026,
    kaynakAdi: 'Microsoft 2026 Global Yapay Zekâ Yayılım Raporu',
    kaynakUrl:
      'https://news.microsoft.com/source/emea/2026/06/microsoftun-2026-global-yapay-zeka-yayilim-raporunun-sonuclari-aciklandi-turkiye-yapay-zeka-kullanimini-en-hizli-artiran-ulkeler-arasinda/?lang=tr',
    guven: 'orta',
    kapsam: 'türkiye',
    cumle:
      'Türkiye, yapay zekâ kullanımını %30 artışla en hızlı büyüten ülkeler arasında yer aldı (Microsoft 2026 Global Yapay Zekâ Yayılım Raporu, Haziran 2026).',
    not:
      'Rapor Türkiye için mutlak bir kullanım oranı ya da kullanıcı sayısı vermiyor, yalnızca artış hızı veriyor. Aynı sayfada küresel karşılaştırma: çalışan nüfusun %17,8’i yapay zekâ araçlarını aktif kullanıyor (2026 1. çeyrek), 26 ülkede bu oran %30’un üzerinde. Bazı Türkçe aktarımlarda geçen %28,8 doğrulanamadı, kullanılmamalı. Rapor ölçüm yöntemini açıklamıyor.',
  },
  {
    baslik: 'Türkiye’de yapay zekânın günlük hayatı değiştirdiğini söyleyenler',
    deger: '%62',
    yil: 2026,
    kaynakAdi: 'Ipsos AI Monitörü 2026 (Global Advisor, 32 ülke)',
    kaynakUrl: 'https://www.ipsos.com/tr-tr/ai-monitoru-2026',
    guven: 'yüksek',
    kapsam: 'türkiye',
    cumle:
      'Türkiye’de her 10 kişiden 6’sı (%62) yapay zekânın son 3-5 yılda günlük hayatını değiştirdiğini söylüyor; 32 ülke ortalaması bunun 8 puan altında (Ipsos AI Monitörü, 2026).',
    not:
      'Saha: 20 Mart - 3 Nisan 2026, 32 ülkede toplam 23.532 yetişkin. Türkiye örneklemi 500 kişi ve 18-74 yaş; 500 kişilik örneklem ülke içi kırılımlar için dar, hata payı geniştir.',
  },
  {
    baslik: 'Türkiye’de yapay zekâya duyulan heyecan ve iş kaygısı',
    deger: 'Heyecan %74 (2023) → %65 (2026) · İş kaygısı %45',
    yil: 2026,
    kaynakAdi: 'Ipsos AI Monitörü 2026 (Global Advisor, 32 ülke)',
    kaynakUrl: 'https://www.ipsos.com/tr-tr/ai-monitoru-2026',
    guven: 'yüksek',
    kapsam: 'türkiye',
    cumle:
      'Türkiye’de yapay zekânın kendisini heyecanlandırdığını söyleyenlerin oranı 2023’teki %74’ten 2026’da %65’e geriledi; yapay zekânın işinin yerini almasından tedirgin olanların oranı ise %45 ile 32 ülke ortalamasının üzerinde (Ipsos AI Monitörü, 2026).',
    not:
      'Ipsos sayfası ülke ortalamasını yüzde olarak değil “her üç kişiden biri” ifadesiyle veriyor; ortalama bu nedenle sayısallaştırılmadı.',
  },
  {
    baslik: 'Haber için yapay zekâ sohbet botu kullanımı — Türkiye',
    deger: '%14',
    yil: 2026,
    kaynakAdi: 'Reuters Institute Digital News Report 2026 — Türkiye',
    kaynakUrl: 'https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/turkey',
    guven: 'yüksek',
    kapsam: 'türkiye',
    cumle:
      'Türkiye’de haber almak için yapay zekâ sohbet botu kullananların oranı %14’e çıktı; bir yılda 6 puan arttı (Reuters Institute Digital News Report 2026).',
    not:
      'Ülke sayfasında saha tarihleri ve örneklem büyüklüğü belirtilmiyor; rapor genelinde pazar başına yaklaşık 2.000 katılımcı ve 48 pazar kapsamı bildiriliyor. Küresel oran %10; iki rakam aynı araştırmadan gelse de ayrı etiketlenmeli.',
  },
  {
    baslik: 'Türkiye’de arama motoru payları',
    deger: 'Google %81,73 · Yandex %15,75 · Bing %1,56',
    yil: 2026,
    kaynakAdi: 'Statcounter Global Stats — Search Engine Market Share (Türkiye)',
    kaynakUrl: 'https://gs.statcounter.com/search-engine-market-share/all/turkey',
    guven: 'orta',
    kapsam: 'türkiye',
    cumle:
      'Türkiye’de arama motoru trafiğinin %81,73’ü Google’dan, %15,75’i Yandex’ten geliyor; Bing %1,56’da kalıyor (Statcounter, Ağustos 2026).',
    not:
      'Bu seri çok oynak: Eylül 2024’te Google %44,55 / Yandex %48,48 ölçülmüşken Haziran 2026’da Google %87,23 / Yandex %9,28 görünüyor. Ocak-Şubat 2026’daki sıçrama (Yandex %38,84 → %14,25) gerçek davranış değişimi yerine ölçüm değişikliğine işaret edebilir; bu nedenle “orta” güven. Yine de Yandex’in Türkiye’de ihmal edilemez bir kanal olduğu birden çok ayda doğrulanıyor.',
  },
  {
    baslik: 'Türkçenin web derlemindeki ağırlığı',
    deger: 'Türkçe %1,2777 (12. sıra) · İngilizce %41,862',
    yil: 2026,
    kaynakAdi: 'Common Crawl, dil istatistikleri, CC-MAIN-2026-39 derlemi',
    kaynakUrl: 'https://commoncrawl.github.io/cc-crawl-statistics/plots/languages',
    guven: 'yüksek',
    kapsam: 'küresel',
    cumle:
      'Dil modellerinin beslendiği Common Crawl web derleminde Türkçe sayfaların payı %1,28 ile 12. sırada; İngilizce %41,86 ile derlemin yaklaşık yarısını oluşturuyor (Common Crawl, 2026 Eylül derlemi).',
    not:
      'Dil tespiti CLD2 ile yapılıyor; Türkçe pay son üç derlemde %1,3455 → %1,3598 → %1,2777 bandında. Bu, Türkçe içeriğin modellerdeki ağırlığının doğrudan ölçüsü değil, yaygın bir eğitim verisi kaynağındaki payıdır. Kapsam küreseldir, Türkiye verisi değildir.',
  },
  {
    baslik: 'Türkiye, bireysel yapay zekâ kullanımında OECD ortalamasının altında',
    deger: 'OECD ortalaması %36,8 · Türkiye %19,2',
    yil: 2025,
    kaynakAdi: 'ITIF (OECD ICT Access and Usage veritabanına dayanarak), Mart 2026',
    kaynakUrl:
      'https://itif.org/publications/2026/03/02/36-8-percent-individuals-oecd-countries-used-generative-ai-tools-2025/',
    guven: 'orta',
    kapsam: 'küresel',
    cumle:
      'OECD ülkelerinde bireylerin %36,8’i 2025’te üretken yapay zekâ aracı kullandı; TÜİK’in Türkiye için ölçtüğü oran aynı yıl %19,2, yani OECD ortalamasının yaklaşık yarısı.',
    not:
      'OECD’nin kendi duyuru sayfası bot korumasından ötürü okunamadı; rakam OECD veritabanını kaynak gösteren ITIF yayınından alındı. İki oranın soru formu ve referans dönemi tam olarak aynı olmayabilir; doğrudan karşılaştırma ihtiyatla kullanılmalı. Anadolu Ajansı’nın OECD derlemesine dayanan haberi Türkiye için %17,2 veriyor; bu çalışmada TÜİK’in kendi değeri (%19,2) esas alındı.',
  },
  {
    baslik: 'Türkçe büyük dil modeli değerlendirmesi — TurkBench',
    deger: '27 model · en yüksek ortalama %78,6 · matematiksel akıl yürütme %26,6',
    yil: 2026,
    kaynakAdi: 'TurkBench (arXiv:2601.07020) — ODTÜ, Bilkent, Boğaziçi, Hacettepe, Turkcell AI',
    kaynakUrl: 'https://arxiv.org/abs/2601.07020',
    guven: 'orta',
    kapsam: 'türkiye',
    cumle:
      'Türkçe için hazırlanan TurkBench değerlendirmesinde 21 alt görev ve 8.151 örnek üzerinde sınanan 27 açık kaynak modelin en yüksek ortalama başarısı %78,6’da kaldı; matematiksel akıl yürütmede aynı model yalnızca %26,6 aldı (Ocak 2026).',
    not:
      'Değerlendirme yalnızca 0,6B-120B arası açık kaynak modelleri kapsıyor; ChatGPT, Gemini, Claude gibi kapalı modeller test edilmedi, dolayısıyla asistanların Türkçe başarısı için doğrudan gösterge değil. Ön baskı (arXiv), hakem süreci doğrulanmadı.',
  },
  {
    baslik: 'Türkçeye özel modeller çok dilli modellerin gerisinde — Cetvel',
    deger: '33 model · 23 görev · 7 kategori',
    yil: 2026,
    kaynakAdi: 'Cetvel (EACL 2026), KUIS AI / Koç Üniversitesi',
    kaynakUrl: 'https://aclanthology.org/2026.eacl-long.46/',
    guven: 'orta',
    kapsam: 'türkiye',
    cumle:
      'Türkçe için 23 görev ve 7 kategoride 33 açık ağırlıklı modeli sınayan Cetvel değerlendirmesi, Türkçeye özel talimatla ayarlanmış modellerin genellikle çok dilli genel amaçlı modellerin gerisinde kaldığını buldu (EACL 2026).',
    not:
      'Bulgu nitel; makalenin tam metnindeki model bazlı skorlar bu çalışmada tek tek doğrulanmadı. Değerlendirme 70B’ye kadar açık ağırlıklı modellerle sınırlı.',
  },
  {
    baslik: 'Türkiye Yapay Zekâ Eylem Planı (2026-2030)',
    deger: '10 milyar dolar yatırım · 1 GW veri merkezi gücü · 5 milyon kişiye eğitim',
    yil: 2026,
    kaynakAdi: '2026/9 sayılı Cumhurbaşkanlığı Genelgesi, Resmî Gazete (18 Ağustos 2026, Sayı 33344)',
    kaynakUrl: 'https://www.resmigazete.gov.tr/eskiler/2026/08/20260818-8.pdf',
    guven: 'orta',
    kapsam: 'türkiye',
    cumle:
      '18 Ağustos 2026’da Resmî Gazete’de yayımlanan Cumhurbaşkanlığı Genelgesiyle yürürlüğe giren Türkiye Yapay Zekâ Eylem Planı (2026-2030); 10 milyar dolarlık yatırım, 1 GW veri merkezi kurulu gücü, 5 milyon kişiye yapay zekâ eğitimi ile 10 bin uzman ve 100 bin uygulama profesyoneli yetiştirmeyi hedefliyor.',
    not:
      'Genelgenin yayımlandığı birincil kaynaktan doğrulandı; ancak genelge metninde sayısal hedefler yer almıyor, hedefler eylem planı belgesini aktaran basın kaynaklarından alındı. Plan belgesinin kendisine erişilemedi, bu yüzden “orta” güven.',
  },
  {
    baslik: 'Büyük Türk markalarının yapay zekâ görünürlüğü',
    deger: '%95,8',
    yil: 2026,
    kaynakAdi: 'UIM — Türkiye Yapay Zekâ Marka Görünürlüğü Endeksi 2026 (pilot)',
    kaynakUrl:
      'https://www.medyaloji.net/son-haber/uim-2026-yapay-zeka-gorunurluk-arastirmasinin-sonuclarini-acikladi_23685833.html',
    guven: 'orta',
    kapsam: 'türkiye',
    cumle:
      'Brand Finance Türkiye 125 listesinin ilk sekiz markası ChatGPT, Gemini ve Google AI Mode’da test edildiğinde genel görünürlük oranı %95,8 ölçüldü (UIM, 2026).',
    not:
      'Yalnızca 8 marka, 3 asistan, marka başına 5 soru ve toplam 120 yanıtlık pilot çalışma; Türkiye geneli için temsili DEĞİL. Bulunan tek Türkiye kaynaklı GEO ölçümü. Sonuç KOBİ’ye taşınamaz; tersine “tanınırlık görünürlüğü getiriyor, tanınmayan marka için teknik hazırlık daha kritik” argümanını destekler.',
  },
];

/** Sektör bazlı satın alma ve araştırma davranışı. 'küresel' işaretli kalemlerin çoğu ABD örneklemidir. */
export const SEKTOR_VERILERI: SourcedStat[] = [
  {
    baslik: 'B2B yazılım alıcılarının yapay zekâdan öneri alması',
    deger: '%82',
    yil: 2026,
    kaynakAdi: 'G2 2026 Buyer Behavior Report — The Evaluation Maze',
    kaynakUrl: 'https://company.g2.com/news/buyer-behavior-2026',
    guven: 'yüksek',
    kapsam: 'küresel',
    cumle:
      'B2B yazılım alıcılarının %82’si son iki yılda ChatGPT ya da Google AI Mode gibi araçlardan yazılım önerisi aldı (G2, 2026).',
    not:
      '1.000’den fazla B2B yazılım alıcısı ve 50’den fazla satış/pazarlama yöneticisiyle görüşme; 22 Temmuz 2026’da yayımlandı. Ağırlıklı ABD katılımcı, Türkiye kırılımı yok. Aynı raporda alıcıların %61’i satın alma sürecinde yapay zekâ ajanı kullanıyor ya da kullanmayı planlıyor.',
  },
  {
    baslik: 'Yazılım araştırmasına yapay zekâ ile başlama',
    deger: '%51',
    yil: 2026,
    kaynakAdi: 'G2 Buyer Behavior araştırması (Mart 2026 anketi, n=1.076)',
    kaynakUrl:
      'https://www.prnewswire.com/news-releases/new-g2-research-half-of-b2b-software-buyers-now-start-their-research-with-ai-chatbots-302742807.html',
    guven: 'orta',
    kapsam: 'küresel',
    cumle:
      'B2B yazılım alıcılarının %51’i yazılım araştırmasına artık Google yerine daha sık bir yapay zekâ sohbet aracıyla başlıyor (G2, Mart 2026 anketi).',
    not:
      'G2’nin Nisan 2026 basın bülteninden; Temmuz 2026 raporunda bu oran geçmiyor, bu yüzden “orta”. Aynı bültende %71 yazılım araştırmasında yapay zekâ sohbet aracına güvendiğini, %69 yapay zekânın yönlendirmesiyle baştaki planından farklı bir satıcı seçtiğini söylüyor. G2’nin iki ayrı 2026 yayını var; tek rapormuş gibi gösterilmemeli.',
  },
  {
    baslik: 'B2B ürün araştırmasında kullanılan asistanlar',
    deger: 'ChatGPT %71 · Gemini %61 · Copilot %45 · Perplexity %18 · Claude %14',
    yil: 2026,
    kaynakAdi: 'Semrush — How AI Tools Shape the B2B Buying Process',
    kaynakUrl: 'https://www.semrush.com/blog/how-ai-shapes-b2b-buying/',
    guven: 'yüksek',
    kapsam: 'küresel',
    cumle:
      'Ürün araştırmasında B2B alıcıların %71’i ChatGPT, %61’i Google Gemini, %45’i Microsoft Copilot, %18’i Perplexity ve %14’ü Claude kullanıyor (Semrush, 2026).',
    not:
      'Mart–Nisan 2026, 643 katılımcıdan 622 geçerli yanıt, yalnızca ABD’li B2B profesyonelleri. Çoklu seçim olduğu için toplam %100’ü aşıyor. Türkiye için eşdeğer ölçüm bulunamadı.',
  },
  {
    baslik: 'Yapay zekânın B2B satın alma hunisindeki yeri',
    deger: '%72 erken araştırma · %62 karşılaştırma · %48 kısa liste · %45 nihai karar',
    yil: 2026,
    kaynakAdi: 'Semrush — How AI Tools Shape the B2B Buying Process',
    kaynakUrl: 'https://www.semrush.com/blog/how-ai-shapes-b2b-buying/',
    guven: 'yüksek',
    kapsam: 'küresel',
    cumle:
      'B2B alıcıların %72’si erken araştırma, %62’si satıcı karşılaştırma, %48’i kısa liste daraltma ve %45’i nihai karar aşamasında yapay zekâ kullanıyor (Semrush, 2026).',
    not:
      'Yapay zekâ en çok kategoriyi tanımlama aşamasında devrede; nihai kararda payı düşüyor. Sayfalarda “yapay zekâ kararı verir” değil, “yapay zekâ kısa listeyi belirler” çerçevesi veriye uygun olanı. ABD örneklemi.',
  },
  {
    baslik: 'B2B satın alma komitesinin büyüklüğü',
    deger: '13 iç paydaş + 9 dış etkileyici',
    yil: 2026,
    kaynakAdi: 'Forrester — The State of Business Buying, 2026',
    kaynakUrl: 'https://www.forrester.com/press-newsroom/forrester-2026-the-state-of-business-buying/',
    guven: 'yüksek',
    kapsam: 'küresel',
    cumle:
      'Tipik bir B2B satın alma kararında 13 kurum içi paydaş ve 9 kurum dışı etkileyici yer alıyor; tedarik birimi satın alma döngülerinin %53’ünde karar verici konumda (Forrester, 2026).',
    not:
      '21 Ocak 2026 tarihli basın açıklamasından doğrudan okundu. Aynı sayfada 10 milyon dolar ve üzeri yatırımlarda alıcıların %78’inin önce deneme yaptığı belirtiliyor. “Tek karar verici” varsayımını çürütür.',
  },
  {
    baslik: 'Sağlık bilgisi için yapay zekâya başvurma (ABD)',
    deger: '%32',
    yil: 2026,
    kaynakAdi: 'KFF Tracking Poll on Health Information and Trust',
    kaynakUrl:
      'https://www.kff.org/health-information-trust/poll-1-in-3-adults-are-turning-to-ai-chatbots-for-health-information-equaling-the-share-who-use-social-media-for-health/',
    guven: 'yüksek',
    kapsam: 'küresel',
    cumle:
      'ABD’de yetişkinlerin %32’si son bir yılda sağlık bilgisi için yapay zekâ sohbet botuna başvurdu; %29’u fiziksel, %16’sı ruh sağlığı konusunda (KFF, 2026).',
    not:
      '24 Şubat–2 Mart 2026, 1.343 kişilik ulusal temsili örneklem. ABD verisidir, Türkiye için eşdeğer ölçüm bulunamadı — sayfada “ABD verisi” diye etiketlenmeden kullanılmamalı. Fiziksel sağlık için kullananların %42’si sonrasında bir sağlık çalışanına danışmamış; klinik sayfalarında bilgilendirme diliyle kullanılabilir, sağlık tavsiyesi çerçevesinde kullanılamaz.',
  },
  {
    baslik: 'Türkiye sağlık turizmi hacmi',
    deger: '1.398.580 kişi / 3,022 milyar dolar',
    yil: 2025,
    kaynakAdi: 'Hizmet İhracatçıları Birliği (HİB) açıklaması, haber aktarımı',
    kaynakUrl: 'https://tesvikakademi.com/haber/2015-2025-yillari-arasi-saglik-turizmi-verileri/',
    guven: 'orta',
    kapsam: 'türkiye',
    cumle:
      '2025’te Türkiye’yi sağlık hizmeti almak amacıyla 1 milyon 398 bin 580 kişi ziyaret etti; sağlık turizmi geliri 3 milyar 22 milyon dolar oldu (HİB, 2025).',
    not:
      'ÇELİŞKİLİ: aynı yıl için “ilk altı ayda 5 milyar doları aştı” diyen haberler de var; iki rakam bağdaşmıyor. TÜİK ya da Sağlık Bakanlığı bülteninde doğrulanamadı. Yalnız “yabancı hasta hacmi büyük, çok dilli içerik gerekiyor” argümanını desteklemek için kullanılmalı; kesin rakam vurgusu yapılmamalı.',
  },
  {
    baslik: 'Avukat araştırmasında ChatGPT kullanımı (ABD)',
    deger: '%41,9',
    yil: 2026,
    kaynakAdi: 'iLawyerMarketing tüketici anketi (Ağustos 2026, n=1.110)',
    kaynakUrl: 'https://www.ilawyermarketing.com/what-online-sources-do-people-use-to-research-and-find-attorneys-in-2026/',
    guven: 'orta',
    kapsam: 'küresel',
    cumle:
      'ABD’de tüketicilerin %41,9’u hangi avukatı tutacağını araştırmak için ChatGPT’ye başvuracağını söylüyor; bu oran 2023’te %9, 2025’te %28,1’di (iLawyerMarketing, 2026).',
    not:
      '1.110 ABD’li tüketici. Anketi yapan kurum hukuk bürolarına yapay zekâ görünürlüğü hizmeti satıyor; çıkar ilişkisi nedeniyle “orta”. Kritik ayrıntı: ChatGPT ile avukat araştıranların %94’ü Google’ı da kullanıyor — kanallar birbirinin yerine değil, arka arkaya çalışıyor.',
  },
  {
    baslik: 'Yerel işletme bulmak için yapay zekâ kullanımı (ABD)',
    deger: '%45',
    yil: 2026,
    kaynakAdi: 'BrightLocal Local Consumer Review Survey 2026',
    kaynakUrl: 'https://www.brightlocal.com/research/local-consumer-review-survey/',
    guven: 'orta',
    kapsam: 'küresel',
    cumle:
      'Tüketicilerin %45’i son bir yılda yerel bir işletme bulmak için yapay zekâ kullandı; bir yıl önce bu oran %6’ydı (BrightLocal, 2026).',
    not:
      '1.002 ABD’li yetişkin, SurveyMonkey paneli. ABD’ye aittir, Türkiye’ye taşınamaz. Aynı ankette %63 yapay zekâ önerisine güvendiğini, %88 yine de başka kaynaktan doğruladığını söylüyor — “yapay zekâda görün, sonra sitende doğrulanabilir ol” argümanını destekler.',
  },
  {
    baslik: 'Türkiye e-ticaret hacmi',
    deger: '4,57 trilyon TL / 5,94 milyar işlem',
    yil: 2025,
    kaynakAdi: 'T.C. Ticaret Bakanlığı — Türkiye’de E-Ticaretin Görünümü Raporu 2025',
    kaynakUrl:
      "https://ticaret.gov.tr/data/6a02f2c7269de183c0b98bc4/T%C3%BCrkiye'de%20E-Ticaretin%20G%C3%B6r%C3%BCn%C3%BCm%C3%BC%20Raporu%202025.pdf",
    guven: 'orta',
    kapsam: 'türkiye',
    cumle:
      'Türkiye’de e-ticaret hacmi 2025’te %52,2 artışla 4,57 trilyon TL’ye, işlem sayısı 5,94 milyar adede ulaştı; e-ticaretin genel ticaret içindeki payı %19,3 oldu (Ticaret Bakanlığı, 2025).',
    not:
      'Rapor Mayıs 2026’da yayımlandı. Bakanlık PDF’i doğrudan okunamadı; rakamlar dört bağımsız aktarımda birebir aynı olduğu için “orta”. Hacim verisidir; alıcı DAVRANIŞI hakkında bir şey söylemez.',
  },
  {
    baslik: 'Türkiye’de e-ticaretin en aktif yaş grubu',
    deger: '25–34 yaş',
    yil: 2025,
    kaynakAdi: 'T.C. Ticaret Bakanlığı — Türkiye’de E-Ticaretin Görünümü Raporu 2025',
    kaynakUrl:
      "https://ticaret.gov.tr/data/6a02f2c7269de183c0b98bc4/T%C3%BCrkiye'de%20E-Ticaretin%20G%C3%B6r%C3%BCn%C3%BCm%C3%BC%20Raporu%202025.pdf",
    guven: 'orta',
    kapsam: 'türkiye',
    cumle: 'Türkiye’de e-ticarette en aktif kitle 25–34 yaş aralığı (Ticaret Bakanlığı, 2025).',
    not:
      'Aktarımda “25–36” ve “25–34” aralıkları birlikte geçiyor, bakanlık PDF’inde tam tanım doğrulanamadı; “yarısından fazlası” iddiası yazılmamalı. Bu yaş bandı, TÜİK’in yapay zekâ kullanımında %30,0 çıkan 25-34 bandıyla örtüşüyor.',
  },
  {
    baslik: 'Eğitim kurumu seçiminde yapay zekâ kullanma niyeti',
    deger: '%54',
    yil: 2026,
    kaynakAdi: 'IDP Education — Emerging Futures (n=7.922)',
    kaynakUrl:
      'https://studytravel.network/magazine/news/0/31727/idp-student-survey-shows-more-study-options-considered-ai-tools-in-use',
    guven: 'orta',
    kapsam: 'küresel',
    cumle:
      'Yurt dışında okumayı planlayan öğrencilerin %54’ü hangi kuruma gideceğine karar verirken yapay zekâ kullanmayı planlıyor; oran bir yılda 20 puan arttı (IDP Emerging Futures, 2026).',
    not:
      '7.922 aday ve başvuru yapmış uluslararası öğrenci; Çinli öğrencilerde %63. IDP’nin kendi raporu okunamadı, aktarım üzerinden alındı. Bu bir NİYET ölçümüdür, gerçekleşen davranış değildir; ayrıca uluslararası öğrenciyi kapsıyor, Türkiye’deki kurs adayını değil.',
  },
  {
    baslik: 'Konut alıcılarının medyan yaşı (ABD)',
    deger: '59 yaş',
    yil: 2025,
    kaynakAdi: 'NAR — 2025 Profile of Home Buyers and Sellers',
    kaynakUrl: 'https://www.nar.realtor/sites/default/files/2025-11/2025-profile-of-home-buyers-and-sellers-highlights-11-04-2025.pdf',
    guven: 'yüksek',
    kapsam: 'küresel',
    cumle:
      'ABD’de konut alıcılarının medyan yaşı 59; ilk kez ev alanlarda 40, tekrar alanlarda 62 (NAR, 2025).',
    not:
      'Temmuz 2024–Haziran 2025 arasında alım yapan 6.103 kişi, %95 güven düzeyinde ±%1,25. ABD verisidir. Sektör eşleşmesi açısından kritik: gayrimenkulde kitle yaşlı, dolayısıyla 16-24 yaşta yoğunlaşan yapay zekâ kullanım oranı bu sektöre taşınamaz.',
  },
  {
    baslik: 'Konut alımında aracı kullanımı (ABD)',
    deger: '%88',
    yil: 2025,
    kaynakAdi: 'NAR — 2025 Profile of Home Buyers and Sellers',
    kaynakUrl: 'https://www.nar.realtor/sites/default/files/2025-11/2025-profile-of-home-buyers-and-sellers-highlights-11-04-2025.pdf',
    guven: 'yüksek',
    kapsam: 'küresel',
    cumle:
      'Konut alıcılarının %88’i alımını bir emlak danışmanı ya da broker aracılığıyla yaptı; alıcılar en çok doğru evi bulma (%50) ve satış koşullarını müzakere (%13) konusunda destek aradı (NAR, 2025).',
    not:
      'ABD verisidir. Gayrimenkulde keşif çevrimiçi başlasa da işlem insan aracıyla kapanıyor; bu, “yapay zekâ ofisi bulur, insan kapatır” çerçevesini destekler.',
  },
  {
    baslik: 'Seyahat planlamada üretken yapay zekâ kullanımı (ABD)',
    deger: '%25',
    yil: 2026,
    kaynakAdi: 'Deloitte 2026 Summer Travel Survey',
    kaynakUrl: 'https://www.deloitte.com/us/en/insights/industry/transportation/2026-summer-travel-trends-survey.html',
    guven: 'orta',
    kapsam: 'küresel',
    cumle:
      'Seyahat planlarken üretken yapay zekâ kullananların oranı bir yılda %15’ten %25’e çıktı; milenyum kuşağında %36, yüksek gelirli milenyumlarda %43 (Deloitte, 2026).',
    not:
      'Nisan 2026, 4.003 ABD’li katılımcı; yaz seyahati planlayan 1.808 kişilik alt örneklem. Deloitte’un kendi sayfası okunamadı, örneklem ayrıntısı ikincil aktarımdan geldi. Türkiye’ye gelen misafir için eşdeğer ölçüm bulunamadı.',
  },
  {
    baslik: 'Rezervasyonu yapay zekâya bırakma isteği (ABD)',
    deger: '%2',
    yil: 2025,
    kaynakAdi: 'Skift U.S. Traveler Trends (Haziran 2025, n=1.002)',
    kaynakUrl: 'https://www.hotelspeak.com/2026/09/ai-in-hospitality-2026-discovery-accuracy-booking/',
    guven: 'orta',
    kapsam: 'küresel',
    cumle:
      'Gezginlerin yalnızca %2’si rezervasyonu tamamen yapay zekâya bırakmayı tercih ediyor; %46’sı yapay zekânın önerisiyle rezervasyonu kendisi yapmak istiyor (Skift, 2025).',
    not:
      '1.002 kişilik ABD örneklemi, veri Haziran 2025. Aynı ankette %39 yapay zekâdan eski ya da yanlış bilgi aldığını söylüyor. Planlama ile rezervasyon arasında belirgin bir güven boşluğu var.',
  },
  {
    baslik: 'Türkiye’ye gelen yabancı ziyaretçi ve kaynak ülkeler',
    deger: '52.775.261 yabancı ziyaretçi',
    yil: 2025,
    kaynakAdi: 'Kültür ve Turizm Bakanlığı açıklaması, haber aktarımı',
    kaynakUrl:
      'https://www.turizmgazetesi.com/haber/bakan-ersoy-acikladi-2025-te-gelir-65-2-milyar-dolara-ziyaretci-sayisi-64-milyona-ulasti/91368',
    guven: 'orta',
    kapsam: 'türkiye',
    cumle:
      '2025’te Türkiye’ye 52 milyon 775 bin yabancı ziyaretçi geldi; en çok ziyaretçi gönderen ülkeler Rusya (6,9 milyon), Almanya (6,7 milyon), İngiltere (4,3 milyon), İran (3,1 milyon) ve Bulgaristan (2,8 milyon) oldu (Kültür ve Turizm Bakanlığı, 2025).',
    not:
      'Bakan açıklaması, haber aktarımı üzerinden; bakanlığın kendi bülteninde doğrulanamadı. Yurt dışında yaşayan 11,2 milyon TC vatandaşı ziyaretiyle toplam yaklaşık 64 milyon. Çok dilli içerik argümanı için doğrudan dayanak: öncelikli diller Rusça, Almanca, İngilizce ve Farsça.',
  },
];

export const TUM_VERILER: SourcedStat[] = [...KULLANIM_VERILERI, ...TURKIYE_VERILERI, ...SEKTOR_VERILERI];

/* ------------------------------------------------------------------ */
/* 3. Veri boşlukları — sayfada gösterilecek dürüstlük bölümü          */
/* ------------------------------------------------------------------ */

/**
 * Araştırmada DOĞRULANAMAYAN başlıklar. Bunlar sayfada "bilmediğimiz şeyler" olarak gösterilir.
 * Bir maddenin buradan çıkıp veri kalemine geçmesi için birincil kaynak gerekir.
 */
export const VERI_BOSLUKLARI: string[] = [
  'Meta AI kullanıcı sayısı. Meta’nın 29 Temmuz 2026 tarihli çeyrek bülteni doğrudan kontrol edildi: Meta AI için hiçbir kullanıcı sayısı içermiyor. Tek birincil kaynak Zuckerberg’in Mayıs 2025’teki “1 milyardan fazla aylık aktif kullanıcı” ifadesi. Dolaşımdaki 1,2 milyar ve 640 milyon rakamları üçüncü taraf tahmini; hiçbiri doğrulanamadı, bu yüzden Meta AI atlasa alınmadı.',
  'Claude’un aylık aktif kullanıcı sayısı. Anthropic resmî rakam açıklamıyor. Dolaşan 245 milyon yalnızca istatistik bloglarında geçiyor; buna karşılık DataReportal Şubat 2026 için Claude’a 37,2 milyon tekil aylık web ziyaretçisi veriyor. İki rakam arasındaki uçurum açıklanamadı. Doğrulanabilen tek Anthropic açıklaması Claude Code’a ait: Mayıs 2026’da 2 milyon haftalık aktif kullanıcı.',
  'Grok’un kullanıcı sayısı ve bot adları. Dolaşan 117 milyon aylık aktif (Mart 2026) rakamı xAI’den doğrulanmadı ve X platformu içi kullanımı da kapsıyor olabilir. Resmî bir bot jetonu da yok. Bu nedenle Grok bir profil olarak atlasa alınmadı.',
  'DeepSeek’in kullanıcı tabanı. Çin’de 143 milyon aylık aktif (Ağustos 2025) ve dünyada yaklaşık 139 milyon (Nisan 2026) rakamları yalnız toplayıcı bloglarda; şirket beyanı yok. Elde doğrulanabilen tek veri DataReportal’ın Şubat 2026 için verdiği 53,3 milyon mobil uygulama aylık aktifi. Çin ekosistemi ayrı değerlendirilmeli.',
  'Türkiye’ye özgü, asistan bazlı resmî kullanım oranı. OpenAI, Google ya da Anthropic’in Türkiye’ye özel kullanıcı sayısı veya pazar payı açıklaması yok; uygulama indirme bazlı Türkiye verisi de açık kaynakta doğrulanabilir biçimde bulunamadı. Türkiye’de asistan kullanımı için elde yalnızca Statcounter’ın yönlendirme bazlı ölçümü var.',
  'Türkçe sorgu davranışı. “Türkiye’de insanlar yapay zekâya nasıl soru soruyor” — sorgu uzunluğu, Türkçe mi İngilizce mi sorulduğu, hangi kalıplarla sorulduğu — konusunda ölçüme dayalı hiçbir birincil kaynak bulunamadı. Bu, ürünün kendi ölçümüyle doldurabileceği gerçek bir boşluk.',
  'Statcounter ile Similarweb arasındaki çelişki. Statcounter’a göre Ağustos 2026’da dünyada ChatGPT %79,4 / Gemini %10,9; Similarweb’e göre Mayıs 2026’da %52,7 / %27,3. Bu bir hata değil ölçüm farkı: Statcounter botlardan sitelere GİDEN yönlendirmeyi, Similarweb botların sitelerine GELEN ziyareti ölçüyor. Hangi ölçütün “gerçek pay” olduğu sorusunun doğrulanmış bir cevabı yok.',
  'Statcounter’ın yapay zekâ sohbet botu ölçütünün yöntemi. Ölçüt sayfası ve aylık CSV dökümü canlı olmasına rağmen yöntem açıklaması yayımlanmamış; SSS yalnızca tarayıcı ve arama motoru yönlendirmelerini anlatıyor. Bu nedenle tüm Statcounter verileri “orta” güvende bırakıldı.',
  'Yapay zekâ tarayıcılarının görünmezliği. Statcounter, Comet, Dia ve ChatGPT Atlas gibi yapay zekâ tarayıcılarını Chrome olarak sayıyor; bu yüzeydeki kullanım hiçbir ölçümde ayrı görünmüyor.',
  'ChatGPT haftalık aktif kullanıcı sayısındaki karışıklık. Üç ayrı şey birbirine karışıyor: OpenAI’nin son resmî HAFTALIK rakamı 900 milyon (Şubat 2026); CFO’nun 31 Temmuz 2026’daki “1 milyardan fazla aktif kullanıcı” ifadesi tüm OpenAI modellerini kapsıyor; Sensor Tower’ın 1 milyarı yalnızca mobil uygulamanın AYLIK aktifi. Digital 2026 ise Ekim 2025 için 800 milyon diyor.',
  'Microsoft Copilot’un güncel kullanıcı sayısı. 150 milyonluk ölçüt 29 Ekim 2025’e ait ve sonraki üç çeyrekte yenilenmedi; Copilot için “güncel” bir kullanıcı sayısı vermek mümkün değil. Dolaşan 420 milyon rakamı yalnız toplayıcı bloglarda görüldü, doğrulanamadı.',
  'Copilot’a özel bot jetonu. Microsoft’un, Google-Extended benzeri, arama dizinlemesinden ayrı bir yapay zekâ jetonu sunmadığı yönündeki yaygın iddia yalnız ikincil kaynaklarda görüldü; NOCACHE ve NOARCHIVE meta etiketlerinin tam söz dizimi de doğrulanamadı.',
  'ChatGPT’nin kaynak gösterme davranışına dair resmî ifade. OpenAI’nin ChatGPT arama yardım sayfası bu araştırmada HTTP 403 döndürdü; ChatGPT’nin yanıtlarda bağlantı verdiği gözlemsel olarak biliniyor ama sağlayıcının kendi ifadesi alıntılanamadı.',
  '“B2B alıcıların %94’ü son satın almasında yapay zekâ kullandı” iddiası. Çok sayıda ikincil kaynak bunu Forrester 2026 araştırmasına dayandırıyor; Forrester’ın kendi basın odası sayfasında bu cümle YOK, oradaki %94 bambaşka bir şeyi ölçüyor. Bu cümle hiçbir sayfada kullanılmamalı.',
  'Türkiye sağlık turizmi rakamları. 2025 tam yıl için “1.398.580 kişi / 3,022 milyar dolar” ile “ilk altı ayda 5 milyar doları aştı” aktarımları bağdaşmıyor; hiçbiri TÜİK ya da Sağlık Bakanlığı bülteninde doğrulanamadı.',
  'Öğrencilerin yapay zekâ kullanım oranı. Beş farklı rakam dolaşıyor (Stanford AI Index “beşte dört”, Digital Education Council %88, Instructure %90, Chegg %80, Gallup haftalık %57). Ölçüm tanımları farklı olduğu için tek bir rakam seçilemedi; hiçbiri veri kalemine alınmadı.',
  'E-ticaret altyapısı seçen işletme sahibinin araştırma davranışı. Türkiye’de bu alıcı tipine dair hiçbir doğrulanmış veri bulunamadı; eldeki hacim ve tüketici yaşı verileri son tüketiciye ait, altyapı alıcısına değil.',
  'Ajans arayan müşterinin kanal ve asistan tercihi. Türkiye için doğrulanmış veri yok. Conductor 2026 State of AEO/GEO’ya atfedilen “%94 CMO GEO yatırımını artıracak” ve “%92 pazarlamacı planlıyor, %40,6 uyguluyor” rakamları yalnız GEO aracı satan şirketlerin blog derlemelerinde görüldü; birincil rapora ulaşılamadı.',
  'Türk ihracatçıyı arayan yabancı satın almacının davranışı. “%73 alıcı tedarikçi sitesine bakıyor”, “%68 sektör sitelerinde arıyor”, “%72 yerel tedarik tercih ediyor” rakamlarının yayın tarihi ve örneklemi yok, birincil rapora ulaşılamadı. Bu alanda yalnız küresel B2B verileri kullanılabilir ve küresel olduğu açıkça yazılmalı.',
  'Türk hastanın, müvekkil adayının, konut alıcısının ve misafirin yapay zekâ ile araştırma yapma oranı. Dört sektör için de Türkiye verisi bulunamadı; kullanılan davranış verileri (KFF, iLawyerMarketing, BrightLocal, NAR, Deloitte, Skift) ABD kaynaklıdır ve “ABD verisi” etiketi olmadan kullanılamaz.',
  'TÜSİAD’a atfedilen “çevrimiçi alışveriş yapanların %70’i chatbot ile etkileşime giriyor, %65’i kişiselleştirilmiş öneriyi faydalı buluyor” verisi. Araştırmanın adı, tarihi ve örneklemi haberde yok; doğrulanamadı.',
  '“Yapay zekâ asistanlarından perakende sitelerine trafik yıllık %393 arttı, dönüşüm %42 daha yüksek” verisi. Ölçüm şirketi, dönem ve ülke kapsamı bulunamadı; Türkiye’ye mi küresele mi ait olduğu belirsiz.',
  'Türkçenin tokenizasyon verimliliği. Türkçenin İngilizceye göre kelime başına kaç kat fazla token ürettiği yönündeki değerler yalnız arama özetinden geldi; işaret edilen makale açıldığında ilgili tablolar bulunamadı. Somut bir “kaç kat” iddiası yazılmamalı.',
  'TÜİK’in 2026 yapay zekâ verisi. Bu dosyadaki bireysel ve girişim yapay zekâ rakamlarının tamamı 2025 dönemine aittir. TÜİK Yapay Zekâ İstatistikleri 2026 bülteni Ekim 2026’da bekleniyor; çıktığında bu kalemler ve stats.ts’teki genAiUsage birlikte güncellenmeli. TÜİK’in 10 Eylül 2026 tarihli Girişimlerde BT ve 5 Ağustos 2026 tarihli Hanehalkı BT bültenlerinin ikisinde de yapay zekâ başlığı yok.',
];
