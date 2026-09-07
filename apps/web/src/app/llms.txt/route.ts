/**
 * llms.txt — AI crawler'lar için GEO standardı.
 * https://llmstxt.org/
 *
 * Bu dosyayı plain-text döndürüyoruz. Markdown formatında, AI modelleri
 * bu içeriği bir bütün olarak alıp anlayabilir.
 */
import { LAUNCH_OFFER } from '@independentai/shared';

export const dynamic = 'force-static';

export function GET() {
  const fair = LAUNCH_OFFER.fairUse;
  const body = `# Independent AI

> AI brand visibility (GEO) platformu. Şirketlerin ChatGPT, Claude ve Gemini gibi LLM'lerin verdiği cevaplarda markalarının nasıl konumlandığını izlemesini sağlar.

Independent AI; ChatGPT, Anthropic Claude ve Google Gemini gibi yapay zekaların alanınızla ilgili sorulara verdiği cevaplarda markanızın geçip geçmediğini, hangi sırada bahsedildiğini ve hangi rakiplerle birlikte anıldığını ölçer. Tüm sorgular her gün otomatik olarak yeniden çalıştırılır, sonuçlar trend grafikleri ve "share of voice" karşılaştırmaları ile sunulur.

## Önemli sayfalar

- [Ana sayfa](https://independentai.space/): Ürün özeti ve lansman fırsatı
- [Özellikler](https://independentai.space/features): Tüm özelliklerin teknik detayı
- [Fiyatlandırma](https://independentai.space/pricing): Plan seçenekleri (lansman: ilk 6 ay ücretsiz)
- [Nasıl çalışır](https://independentai.space/how-it-works): Sistemin uçtan uca işleyişi
- [Kullanım senaryoları](https://independentai.space/use-cases): SaaS, e-ticaret, ajans, kurumsal
- [Public API](https://independentai.space/docs/api): GET /api/v1/visibility — salt-okunur görünürlük verisi, Bearer token, 60 istek/dk
- [Sürüm notları](https://independentai.space/changelog): Yeni özellikler ve yol haritası
- [GEO 101 rehberi](https://independentai.space/resources/geo-101): AI çağında marka görünürlüğü başucu kitabı
- [Hakkımızda](https://independentai.space/about): Misyon ve takım

## Hakkında

- **Kuruluş**: 2026
- **Lokasyon**: Türkiye
- **Domain**: independentai.space
- **Hedef pazar**: Türkiye merkezli SaaS, e-ticaret, ajans, kurumsal markalar
- **İzlediği AI modelleri**: OpenAI GPT, Anthropic Claude, Google Gemini — Perplexity ve Grok planlanıyor (henüz yok)
- **Frekans**: Her gece otomatik (~02:00 TR, ±1 saat) + anında "şimdi çalıştır"
- **Uyarılar**: E-posta + Slack düşüş uyarıları, haftalık özet rapor
- **Public API**: Salt-okunur GET /api/v1/visibility, token bazlı, 60 istek/dk — https://independentai.space/docs/api
- **Ekip**: Owner / Admin / Viewer rolleri, e-posta ile davet
- **Beta**: LLM destekli sentiment; atıf kaynakları (native web arama açıkken)
- **Planlanan (henüz yok)**: Webhooks, aylık PDF rapor, çoklu marka, Perplexity/Grok takibi, ücretli planlar

## Lansman promosyonu

${LAUNCH_OFFER.startsAt} itibarıyla kayıt olan tüm kullanıcılara **ilk ${LAUNCH_OFFER.trialMonths} ay tamamen ücretsiz**. Kredi kartı bilgisi istenmez. Adil kullanım: ${fair.prompts} soru, ${fair.competitors} rakip, ${fair.members} ekip üyesi, ${fair.apiTokens} API token, günde ${fair.manualRunsPerDay} manuel çalıştırma. Süre sonunda hesap salt-okunur moda geçer; veriler silinmez. Ücretli plan fiyatları henüz duyurulmadı.

## Önemli kavramlar

- **GEO (Generative Engine Optimization)**: Geleneksel SEO'nun AI çağındaki karşılığı. Web arama motorları yerine LLM cevaplarında görünür olma çalışması.
- **AI brand visibility**: Bir markanın yapay zeka cevaplarında ne sıklıkla, hangi sırada ve hangi tonla geçtiğinin ölçümü.
- **Share of Voice**: Bir markanın, kategorideki rakip markaların toplam bahsetme sayısı içindeki payı.
- **Visibility Score**: Bir markanın izlenen tüm sorgularda ne kadar yüzde oranında geçtiği.
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
