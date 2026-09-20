/**
 * llms.txt — AI crawler'lar için GEO standardı (https://llmstxt.org/).
 *
 * Markdown/plain-text döner; yalnızca var olan rotalara link verilir. Rota force-static olduğundan fiyat ve deneme
 * süresi build anında OFFER varsayılanından yazılır (build sırasında DB'ye gidilmez; admin override'ı /pricing'de görünür).
 */
import { OFFER, formatTry } from '@independentai/shared';

export const dynamic = 'force-static';

const SITE = 'https://independentai.space';

export async function GET() {
  const offer = OFFER;
  const fair = offer.fairUse;
  const body = `# Yanıt

> Müşterileriniz satın almadan önce yapay zekâya soruyor. Yanıt, ChatGPT, Claude ve Gemini'nin o sorularda sizi mi rakibinizi mi önerdiğini ölçer, neden görünmediğinizi bulur ve yapılacakları verir. Siz yapın veya Yanıt Agency yapsın.

Yanıt (alan adı: independentai.space; eski adı Independent AI) Türkiye merkezli bir AI görünürlük (GEO) platformudur. Üç katmanı vardır:

1. **Ücretsiz şok raporu ve araçlar** — hesap gerekmez. Alan adınızı girin; 0-100 AI görünürlük skoru, bulgular ve düzeltme önerileri anında gelir.
2. **Yanıt (SaaS)** — ${formatTry(offer.saasMonthlyTry)}/ay, aylık abonelik, istediğiniz zaman iptal. ${offer.trialDays} gün ücretsiz deneme, kart gerekmez. Her gün ChatGPT, Claude ve Gemini'de otomatik ölçüm; rakip karşılaştırması; neden analizi ve yapılacaklar listesi.
3. **Yanıt Agency** — ${formatTry(offer.agencyFromMonthlyTry)}/ay'dan başlayan aylık sprint, teklifle. Yanıt'ın çıkardığı işleri ekibimiz uygular; ilerleme aynı panelden izlenir.

## Önemli sayfalar

- [Ana sayfa](${SITE}/): Alan adınızı girin, ücretsiz şok raporunu alın
- [Fiyatlandırma](${SITE}/pricing): Ücretsiz · Yanıt ${formatTry(offer.saasMonthlyTry)}/ay · Yanıt Agency ${formatTry(offer.agencyFromMonthlyTry)}/ay'dan
- [Özellikler](${SITE}/features): Ölçüm, analiz, uyarılar, ekip, API
- [Nasıl çalışır](${SITE}/how-it-works): Veri toplama hattı ve ölçüm metodolojisi
- [Kullanım senaryoları](${SITE}/use-cases): SaaS, e-ticaret, ajans, kurumsal
- [E-ticaret çözümü](${SITE}/solutions/ecommerce): Shopify, ikas, Ticimax mağaza bağlantısı (beta)
- [Ajanslar](${SITE}/solutions/agencies): Çok müşterili portföy, roller, paylaşım linkleri, ücretsiz ön analiz
- [Public API](${SITE}/docs/api): GET /api/v1/visibility — salt-okunur görünürlük verisi, Bearer token, 60 istek/dk
- [Dokümantasyon](${SITE}/docs): Kurulum ve kullanım rehberleri
- [Sürüm notları](${SITE}/changelog): Yeni özellikler ve yol haritası
- [Blog](${SITE}/blog): GEO ve AI marka stratejisi yazıları
- [GEO 101 rehberi](${SITE}/resources/geo-101): AI çağında marka görünürlüğü başucu kitabı
- [AI pazarlama sözlüğü](${SITE}/resources/glossary)
- [Hakkımızda](${SITE}/about) · [İletişim](${SITE}/contact)

## Ücretsiz araçlar (hesap gerekmez)

- [E-ticaret AI görünürlük testi](${SITE}/arac/e-ticaret-ai-gorunurluk-testi): Mağazanın AI motorlarına hazırlığı, 6 eksen
- [Ürün sayfası testi](${SITE}/arac/urun-sayfasi-testi): Product JSON-LD, içerik, görsel, yapı, cevap uyumu
- [AI crawler testi](${SITE}/arac/ai-crawler-testi): robots.txt bot matrisi, indekslenebilirlik, llms.txt
- [Ürün açıklama yazıcı](${SITE}/arac/urun-aciklama-yazici): AI destekli açıklama + SSS + meta + JSON-LD (beta)
- [ChatGPT rank checker](${SITE}/arac/chatgpt-rank-checker) · [Claude rank checker](${SITE}/arac/claude-rank-checker) · [Gemini rank checker](${SITE}/arac/gemini-rank-checker): Markanız o modelde anılıyor mu, kaçıncı sırada?

## Hakkında

- **Marka**: Yanıt (Yanıt Agency: uygulama hizmeti)
- **Kuruluş**: 2026, Türkiye
- **Alan adı**: independentai.space
- **Hedef pazar**: Türkiye merkezli SaaS, e-ticaret, ajans, kurumsal markalar
- **İzlenen AI modelleri**: OpenAI ChatGPT, Anthropic Claude, Google Gemini — Perplexity ve Grok planlanıyor (henüz yok)
- **Ölçüm sıklığı**: Her gece otomatik + anında "şimdi çalıştır"
- **Uyarılar**: E-posta + Slack düşüş uyarıları, haftalık özet rapor
- **Paylaşım**: Giriş gerektirmeyen imzalı rapor linkleri ("Yanıt ile hazırlandı" imzalı; beyaz etiket yok)
- **Ekip**: Owner / Admin / Viewer rolleri; ajanslar için müşteri çalışma alanları
- **Beta**: LLM destekli sentiment, atıf kaynakları, mağaza bağlantıları (Shopify/ikas/Ticimax), AI Discovery Sensor
- **Planlanan (henüz yok)**: Webhooks, aylık PDF rapor, çoklu marka, Perplexity/Grok, kart ile online ödeme

## Teklif

- **Ücretsiz**: Şok raporu ve tüm araçlar; kayıt, e-posta veya kart istenmez.
- **Yanıt**: ${formatTry(offer.saasMonthlyTry)}/ay. ${offer.trialDays} gün ücretsiz deneme, kart gerekmez; deneme sonunda otomatik ücretlendirme yapılmaz. Adil kullanım: ${fair.prompts} soru, ${fair.competitors} rakip, ${fair.members} ekip üyesi, ${fair.apiTokens} API token, günde ${fair.manualRunsPerDay} manuel çalıştırma. Süre sonunda hesap salt-okunur moda geçer; veriler silinmez.
- **Yanıt Agency**: ${formatTry(offer.agencyFromMonthlyTry)}/ay'dan başlayan aylık sprint; kapsam ve fiyat teklifle netleşir. İletişim: ${SITE}/contact#sales

## Önemli kavramlar

- **GEO (Generative Engine Optimization)**: Geleneksel SEO'nun AI çağındaki karşılığı; LLM cevaplarında görünür olma çalışması.
- **AI görünürlüğü**: Markanın yapay zekâ cevaplarında ne sıklıkla, hangi sırada ve hangi tonla geçtiğinin ölçümü.
- **Share of Voice**: Markanın, kategorideki rakiplerle birlikte toplam bahis içindeki payı.
- **Görünürlük skoru**: Markanın izlenen tüm sorgularda yüzde kaçında geçtiği.
- **Şok raporu**: Alan adı için anında üretilen, hesap gerektirmeyen AI hazırlık ve görünürlük raporu.
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
