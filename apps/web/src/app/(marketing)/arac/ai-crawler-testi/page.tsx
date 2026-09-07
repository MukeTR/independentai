import { Suspense } from 'react';
import { buildMetadata } from '@/lib/seo';
import { CommerceToolPage } from '@/components/marketing/commerce-tool-page';
import { CrawlerTool } from '@/components/marketing/crawler-tool';
import { CRAWLER_AXES } from '@/server/commerce/crawler-audit';

const PATH = '/arac/ai-crawler-testi';

export const metadata = buildMetadata({
  title: 'AI Crawler Testi — GPTBot, ClaudeBot, PerplexityBot sitenize erişebiliyor mu?',
  description:
    'robots.txt kurallarınızı 12 bot için çözümleyin: GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended, CCBot, Bytespider, Applebot-Extended, Googlebot, Bingbot. noindex, canonical, sitemap, llms.txt ve yönlendirme kontrolü. Ücretsiz.',
  path: PATH,
});

const FAQ = [
  {
    question: 'robots.txt kuralları nasıl çözümleniyor?',
    answer:
      'RFC 9309’a göre: her bot için adına yazılmış en spesifik User-agent grubu seçilir, yoksa “*” grubu kullanılır. Allow/Disallow’da en uzun yol eşleşmesi kazanır; eşitlikte Allow kazanır. Joker (*) ve satır sonu ($) desteklenir.',
  },
  {
    question: 'GPTBot ile OAI-SearchBot arasındaki fark ne?',
    answer:
      'GPTBot OpenAI’ın model eğitimi için tarama yapar; OAI-SearchBot ChatGPT’nin arama sonuçlarında sitenizi göstermek için tarar; ChatGPT-User ise bir kullanıcı sohbet sırasında bağlantı istediğinde sayfayı anlık okur. Eğitimi kapatıp arama/alıntıyı açık bırakmak mümkündür.',
  },
  {
    question: 'Google-Extended’ı engellersem Google sıralamam düşer mi?',
    answer:
      'Hayır. Google-Extended yalnızca Gemini eğitimi ve grounding için kullanılan bir kontrol tokenıdır; Googlebot’tan bağımsızdır ve arama sıralamasını etkilemez. Matriste bu yüzden Googlebot ayrı bir referans satırı olarak gösterilir.',
  },
  {
    question: 'Üretilen robots.txt snippet’i güvenli mi?',
    answer:
      'Snippet yalnızca sizin işaretlediğiniz botlar için standart “User-agent” + “Allow: /” satırları ve isteğe bağlı Sitemap satırı içerir. Gizleme, yönlendirme veya bot yanıltma içermez; mevcut dosyanızın sonuna eklemeniz yeterlidir.',
  },
  {
    question: 'Yönlendirme zinciri neden önemli?',
    answer:
      'Her ek yönlendirme crawler bütçesini tüketir ve bazı botlar 2-3 adımdan sonra vazgeçer. www/non-www ve http/https geçişlerini tek bir 301 ile birleştirmeniz önerilir.',
  },
];

export default function Page() {
  return (
    <CommerceToolPage
      path={PATH}
      eyebrow="Crawler"
      title={
        <>
          AI botları sitenize <span className="text-brand">girebiliyor mu?</span>
        </>
      }
      intro="Bir sayfa adresi girin. robots.txt dosyanızı 10 AI botu ve 2 arama botu için kural kural çözümleyelim; noindex, canonical, sitemap, llms.txt, yönlendirme zinciri ve JS bağımlılığını kontrol edip yalnızca seçtiğiniz botlar için robots.txt satırları üretelim."
      tool={
        <Suspense fallback={<div className="card p-6 text-[13px] text-ink-faint">Araç yükleniyor…</div>}>
          <CrawlerTool />
        </Suspense>
      }
      axes={CRAWLER_AXES}
      scoringNotes={[
        'Bot erişimi ekseni üç kontrolden oluşur: 10 AI botunun tümü (ağırlık 50), dört cevap motoru botu — OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot — (30) ve arama botları Googlebot/Bingbot (20).',
        'HTTP→HTTPS kontrolü yalnızca https:// adres girildiğinde yapılır; http:// sürümü yanıt vermezse uyarı, yönlenmezse hata sayılır.',
        'robots.txt yoksa tüm botlar izinli varsayılır (standart davranış) ancak keşfedilebilirlik ekseninde sitemap bildirimi eksik olur.',
      ]}
      limitations={[
        'Yalnızca girilen sayfanın yolu için kurallar çözülür; sitenin tamamı için kural farklılıkları görülmez.',
        'Botların gerçekten ziyaret ettiği sunucu loglarından doğrulanamaz; test yalnızca izin durumunu gösterir.',
        'WAF/CDN düzeyinde (Cloudflare bot yönetimi gibi) yapılan engellemeler robots.txt’te görünmez ve bu testle tespit edilemez.',
        'JavaScript render edilmez; “JS-only içerik” uyarısı sezgiseldir (SPA kökü + çok az metin).',
      ]}
      faq={FAQ}
    />
  );
}
