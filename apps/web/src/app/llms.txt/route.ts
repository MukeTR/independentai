/**
 * llms.txt — AI crawler'lar için GEO standardı (https://llmstxt.org/). Spec §7.5.
 *
 * Markdown/plain-text döner; araç listesi `TOOL_REGISTRY` (yalnız `enabled`), sektör listesi `SECTORS`'tan türetilir.
 * Rota force-static: fiyat/deneme süresi build anında OFFER varsayılanından yazılır (DB'ye gidilmez; admin override'ı
 * /pricing'de görünür). Kurallar: "6 ay" yok; "Independent AI" yalnız "eski adıyla"; sonuç sözü/kaynaksız yüzde yok.
 */
import { OFFER, formatTry } from '@independentai/shared';
import { SECTORS } from '@/data/sectors';
import { STATS } from '@/data/stats';
import { enabledTools, TOOL_GROUP_LABELS, toolPath, type ToolGroup } from '@/lib/tool-registry';
import { SITE_URL, sectorPath } from '@/lib/seo';

export const dynamic = 'force-static';

const GROUP_ORDER: ToolGroup[] = ['site-sagligi', 'paylasim-dil', 'ai-gorunurluk', 'e-ticaret'];

function toolLines(): string {
  const tools = enabledTools();
  return GROUP_ORDER.filter((g) => tools.some((t) => t.group === g))
    .map((g) => {
      const items = tools
        .filter((t) => t.group === g)
        .map(
          (t) =>
            `- [${t.title}](${SITE_URL}${toolPath(t.slug)}): ${t.description}${t.badge ? ` (${t.badge})` : ''}`,
        )
        .join('\n');
      return `### ${TOOL_GROUP_LABELS[g]}\n\n${items}`;
    })
    .join('\n\n');
}

function sectorLines(): string {
  return SECTORS.map(
    (s) =>
      `- [${s.name}](${SITE_URL}${sectorPath(s.slug)}): ${s.showcaseQuestions.length} örnek satın alma sorusu, ${s.checks.length} sektör kontrolü, sektör ön-seçili kapsama testi${s.regulated ? ' (bilgilendirme ve görünürlük ölçümü dili)' : ''}`,
  ).join('\n');
}

export function buildLlmsTxt(): string {
  const offer = OFFER;
  const fair = offer.fairUse;
  return `# Yanıt

> Müşteriniz satın almadan önce yapay zekâya soruyor: sizi mi öneriyor, rakibinizi mi? Yanıt ölçer, nedenini gösterir, takip eder — siz düzeltin ya da Yanıt Agency düzeltsin.

Yanıt (alan adı: independentai.space; eski adıyla Independent AI) Türkiye merkezli bir yapay zekâ görünürlük platformudur. Üç katmanı vardır: ücretsiz site araçları ve sektör sayfaları (hesap, e-posta veya kart yok; yapay zekâ servisine veri gönderilmez), Yanıt SaaS (${formatTry(offer.saasMonthlyTry)}/ay, ${offer.trialDays} gün deneme, kart yok) ve Yanıt Agency (${formatTry(offer.agencyFromMonthlyTry)}/ay'dan başlayan sprint, teklifle). Araçlar deterministik tarayıcılardır: sitenizin yapay zekâ asistanlarına hazırlığını ölçer, asistanın gerçek davranışını değil; gerçek görünürlük takibi panelde günlük ölçümle yapılır.

## Önemli sayfalar

- [Ana sayfa](${SITE_URL}/): Alan adınızı girin, ücretsiz raporu alın
- [Nasıl çalışır](${SITE_URL}/how-it-works): Analiz → Düzelt → Ölç; deterministik tarama, tarih damgalı sorular
- [Özellikler](${SITE_URL}/features): Ölç, anla, düzelt; ücretsiz araçlar ve raporlama
- [Fiyatlandırma](${SITE_URL}/pricing): Ücretsiz · Yanıt ${formatTry(offer.saasMonthlyTry)}/ay · Yanıt Agency ${formatTry(offer.agencyFromMonthlyTry)}/ay'dan
- [Yanıt Agency](${SITE_URL}/yanit-agency): Analizi biz yaptık, uygulamayı da biz yapalım (beta, teklifle)
- [Ajans ortaklığı](${SITE_URL}/solutions/agencies): Müşteri portföyü, roller, paylaşım linkleri, ücretsiz ön analiz
- [Demo](${SITE_URL}/demo): Satış görüşmesinin 60 saniyelik akışı
- [Ücretsiz araçlar](${SITE_URL}/arac): Tüm site araçları tek sayfada
- [Sektörler](${SITE_URL}/sektor): ${SECTORS.length} sektör için satın alma soruları ve test
- [Blog](${SITE_URL}/blog) · [GEO 101](${SITE_URL}/resources/geo-101) · [Sözlük](${SITE_URL}/resources/glossary) · [Dokümantasyon](${SITE_URL}/docs) · [Sürüm notları](${SITE_URL}/changelog)
- [Public API](${SITE_URL}/docs/api): GET /api/v1/visibility — salt-okunur görünürlük verisi, Bearer token
- [Hakkımızda](${SITE_URL}/about) · [İletişim](${SITE_URL}/contact)

## Ücretsiz araçlar (hesap gerekmez)

Her araç herkese açık siteyi tarar, 0–100 hazırlık skoru ile bulgu / neden / nasıl düzelir listesi üretir ve kalıcı rapor bağlantısı verir. Skorun altında kontrol sayısı, tarih ve "deterministik tarayıcı · hazırlık ölçer, AI davranışını değil" notu bulunur.

${toolLines()}

## Sektörler

${sectorLines()}

## Ölçüm yöntemi

- Skor hesabı ve eksen ağırlıkları: ${SITE_URL}/docs#skorlar
- Araçlar JavaScript çalıştırmaz; içerik yalnız JS ile geliyorsa uyarı verilir, hata değil.
- Panel ölçümü: izlenen sorular her sabah ChatGPT, Claude ve Gemini'de sorulur; sıra, ton ve rakip karşılaştırması tarih damgalıdır. Tek bir cevap hüküm değildir; cevaplar oturumdan oturuma değişebilir.
- İstatistikler yalnız kaynaklı: ${STATS.internetUsage.sentence} ${STATS.genAiUsage.sentence}

## Sınırlamalar

- Sonuç sözü verilmez: yapay zekâ cevapları değişkendir; Yanıt ölçer, gösterir ve takip eder.
- Kişisel veri yapay zekâ servislerine gönderilmez; yalnız marka adı ve herkese açık site içeriği işlenir.
- Sayfa hızı (PageSpeed/CrUX) ölçülmez.
- Ücretsiz araçlar hazırlık ölçer; asistanın sizi önerip önermediğini yalnız panel ölçümü gösterir.
- Bot koruması (WAF) arkasındaki siteler taranamayabilir; sonuç "taranamadı" olarak işaretlenir.

## YanitBot

- Kullanıcı aracısı: YanitBot (${SITE_URL}/bot). Yalnız kullanıcı tarafından girilen herkese açık adresleri, tarama başına sınırlı istekle çeker; robots.txt ile engellenebilir.

## Teklif

- **Ücretsiz**: Site araçları, sektör sayfaları ve kalıcı rapor; kayıt, e-posta veya kart istenmez.
- **Yanıt**: ${formatTry(offer.saasMonthlyTry)}/ay. ${offer.trialDays} gün ücretsiz deneme, kart gerekmez; deneme sonunda otomatik ücretlendirme yapılmaz. Adil kullanım: ${fair.prompts} soru, ${fair.competitors} rakip, ${fair.members} ekip üyesi, ${fair.apiTokens} API token, günde ${fair.manualRunsPerDay} manuel çalıştırma.
- **Yanıt Agency**: ${formatTry(offer.agencyFromMonthlyTry)}/ay'dan başlayan aylık sprint; kapsam ve fiyat teklifle netleşir. İletişim: ${SITE_URL}/contact#sales
`;
}

export async function GET() {
  return new Response(buildLlmsTxt(), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
