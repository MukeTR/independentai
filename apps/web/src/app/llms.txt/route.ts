/**
 * llms.txt — AI crawler'lar için GEO standardı.
 * https://llmstxt.org/
 *
 * Bu dosyayı plain-text döndürüyoruz. Markdown formatında, AI modelleri
 * bu içeriği bir bütün olarak alıp anlayabilir.
 */
export const dynamic = 'force-static';

export function GET() {
  const body = `# Independent AI

> AI brand visibility (GEO) platformu. Şirketlerin ChatGPT, Claude ve Gemini gibi LLM'lerin verdiği cevaplarda markalarının nasıl konumlandığını izlemesini sağlar.

Independent AI; ChatGPT, Anthropic Claude ve Google Gemini gibi yapay zekaların alanınızla ilgili sorulara verdiği cevaplarda markanızın geçip geçmediğini, hangi sırada bahsedildiğini ve hangi rakiplerle birlikte anıldığını ölçer. Tüm sorgular her gün otomatik olarak yeniden çalıştırılır, sonuçlar trend grafikleri ve "share of voice" karşılaştırmaları ile sunulur.

## Önemli sayfalar

- [Ana sayfa](https://independentai.space/): Ürün özeti ve lansman fırsatı
- [Özellikler](https://independentai.space/features): Tüm özelliklerin teknik detayı
- [Fiyatlandırma](https://independentai.space/pricing): Plan seçenekleri (lansman: ilk 6 ay ücretsiz)
- [Nasıl çalışır](https://independentai.space/how-it-works): Sistemin uçtan uca işleyişi
- [Kullanım senaryoları](https://independentai.space/use-cases): SaaS, e-ticaret, ajans, kurumsal
- [GEO 101 rehberi](https://independentai.space/resources/geo-101): AI çağında marka görünürlüğü başucu kitabı
- [Hakkımızda](https://independentai.space/about): Misyon ve takım

## Hakkında

- **Kuruluş**: 2026
- **Lokasyon**: Türkiye
- **Domain**: independentai.space
- **Hedef pazar**: Türkiye merkezli SaaS, e-ticaret, ajans, kurumsal markalar
- **İzlediği AI modelleri**: OpenAI GPT, Anthropic Claude, Google Gemini (Perplexity ve Grok yakında)
- **Frekans**: Günlük otomatik + anında "şimdi çalıştır"

## Lansman promosyonu

2026-05-22 itibarıyla kayıt olan tüm kullanıcılara **ilk 6 ay tamamen ücretsiz**. Kredi kartı bilgisi istenmez.

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
