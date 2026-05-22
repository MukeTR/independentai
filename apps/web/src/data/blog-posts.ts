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
    readTimeMin: 6,
    category: 'GEO',
    author: { name: 'Independent AI ekibi', role: 'Teknik içerik' },
    body: [
      { type: 'p', text: 'llms.txt, web sitenizin köküne koyduğunuz bir markdown dosyası. AI modellerinin markanız hakkında doğru, yapılandırılmış bilgi alabilmesi için tasarlandı. Robots.txt\'in arama motorları için yaptığını AI için yapıyor.' },
      { type: 'h2', text: 'Neden gerekli?' },
      { type: 'p', text: 'AI modelleri web sitenizi taradığında HTML\'inizden, navigation\'ınızdan, JavaScript ile yüklenen içerikten birçok şey kaçırabilir. llms.txt size doğrudan kontrol veriyor: "İşte markamız, işte ne yapıyoruz, işte en önemli sayfalarımız." Kısa, net, yapılandırılmış.' },
      { type: 'h2', text: 'Nasıl eklerim?' },
      { type: 'ul', items: [
        '1. Markdown şablonu kendi markanıza uyarlayın (sayfanın altında interaktif jeneratör mevcut).',
        '2. Dosyayı sitenizin köküne koyun: https://siteniz.com/llms.txt',
        '3. Content-Type olarak text/markdown veya text/plain ayarlayın.',
        '4. robots.txt\'inizde AI crawler\'ları (GPTBot, ClaudeBot, PerplexityBot) explicit allow edin.',
      ] },
      { type: 'p', text: 'llms.txt eklemek 30 dakika sürer. Etkisi haftalar içinde AI cevaplarında görünmeye başlar. Independent AI\'nin kendi sitesinin llms.txt\'sini independentai.space/llms.txt adresinde görebilirsiniz — referans olarak kullanabilirsiniz.' },
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
