import { Suspense } from 'react';
import { buildMetadata } from '@/lib/seo';
import { CommerceToolPage } from '@/components/marketing/commerce-tool-page';
import { CommerceVisibilityTool } from '@/components/marketing/commerce-visibility-tool';
import { COMMERCE_AXES } from '@/server/commerce/commerce-audit';

const PATH = '/arac/e-ticaret-ai-gorunurluk-testi';

export const metadata = buildMetadata({
  title: 'E-ticaret AI Görünürlük Testi — Mağazanız ChatGPT ve Perplexity için hazır mı?',
  description:
    'Mağaza adresinizi girin; ürün şeması, katalog yapısı, AI crawler izinleri, marka sinyalleri ve teknik hazırlığı 0-100 puanlayalım. Ücretsiz, kayıt ve e-posta gerekmez.',
  path: PATH,
});

const FAQ = [
  {
    question: 'Bu test mağazama giriş yapıyor mu veya veri çekiyor mu?',
    answer:
      'Hayır. Yalnızca herkese açık sayfalar (ana sayfa, robots.txt, sitemap.xml, llms.txt, bir örnek ürün sayfası ve Shopify mağazalarında /products.json) bir tarayıcının gördüğü gibi okunur. Kimlik bilgisi istenmez; sipariş veya müşteri verisine erişilmez.',
  },
  {
    question: 'Skor neye göre hesaplanıyor?',
    answer:
      'Altı eksen, belgelenmiş ağırlıklarla: katalog yapısı %20, ürün şeması %25, içerik kalitesi %15, AI taranabilirliği %20, marka sinyalleri %10, teknik %10. Her kontrol geçti/uyarı/başarısız olarak puanlanır; LLM kullanılmaz, sonuç deterministiktir.',
  },
  {
    question: 'Neden yalnızca bir ürün sayfası örnekleniyor?',
    answer:
      'Zaman bütçesi 25 saniyedir ve her tarama gerçek HTTP istekleri yapar. Ana sayfadan bulunan ilk ürün bağlantısı örneklenir; farklı bir ürünü test etmek için Ürün Sayfası Testi aracını kullanabilirsiniz.',
  },
  {
    question: 'JavaScript ile yüklenen içerik görülüyor mu?',
    answer:
      'Görülmez. Çoğu AI crawler da JavaScript çalıştırmaz; bu yüzden düşük metin/HTML oranı bir uyarı olarak raporlanır. Kritik içeriği sunucu tarafında HTML olarak sunmanız önerilir.',
  },
  {
    question: 'Sonuçlar saklanıyor mu?',
    answer:
      'Ham URL saklanmaz; URL’nin sha256 özeti, alan adı, skor ve sonuç 30 gün boyunca tutulur. Aynı adres 10 dakika içinde tekrar taranırsa önbellekten döner. E-posta duvarı yoktur.',
  },
  {
    question: 'Platformumu yanlış tespit etti, sorun mu?',
    answer:
      'Platform tespiti yalnızca HTML/başlık sinyallerine dayanır ve puanı etkilemez; yalnızca önerilerdeki panel yollarını platforma göre seçer. Emin olunmayan durumda “Tespit edilemedi” yazılır.',
  },
];

export default function Page() {
  return (
    <CommerceToolPage
      path={PATH}
      eyebrow="E-ticaret"
      title={
        <>
          Mağazanız <span className="text-brand">AI motorları</span> için hazır mı?
        </>
      }
      intro="Mağaza adresinizi girin. Ürün şemanızı, katalog yapınızı, AI crawler izinlerinizi ve marka sinyallerinizi 25 saniyede tarayıp ChatGPT, Claude, Perplexity ve Gemini'nin sizi ne kadar okuyabildiğini 0-100 puanlayalım."
      tool={
        <Suspense fallback={<div className="card p-6 text-[13px] text-ink-faint">Araç yükleniyor…</div>}>
          <CommerceVisibilityTool />
        </Suspense>
      }
      axes={COMMERCE_AXES}
      scoringNotes={[
        'Ürün şeması ekseni ana sayfadan bulunan ilk ürün bağlantısı üzerinden ölçülür; ürün bağlantısı bulunamazsa bu eksen düşük puan alır ve nedeni açıkça yazılır.',
        'AI taranabilirliği 10 AI botunun (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, anthropic-ai, PerplexityBot, Google-Extended, CCBot, Bytespider, Applebot-Extended) robots.txt kurallarını RFC 9309 mantığıyla çözer.',
        'Shopify mağazalarında /products.json erişimi katalog yapısı eksenine ek bir kontrol olarak girer; diğer platformlarda bu kontrol yoktur ve eksen buna göre normalize edilir.',
      ]}
      limitations={[
        'Crawl-only: JavaScript render edilmez; yalnızca istemci tarafında oluşan içerik görülmez.',
        'Tek ürün sayfası örneklenir; kataloğun tümü taranmaz. Bağlı mağazalarda panel içindeki “Katalog hazırlığı” tüm ürünleri değerlendirir.',
        'Zaman bütçesi 25 saniyedir; yavaş sunucularda bazı adımlar atlanır ve sonuç “kısmi” olarak işaretlenir.',
        'Skor AI cevaplarında gerçekten anılıp anılmadığınızı ölçmez; buna hazırlığı ölçer. Anılma takibi için Independent AI panelini kullanın.',
      ]}
      faq={FAQ}
    />
  );
}
