/**
 * Ürün Sayfası Testi — tek bir ürün sayfasının AI motorları için "cevaplanabilirliğini" ölçer.
 *
 * Eksenler ve ağırlıklar (docs/COMMERCE_SCORING.md):
 *   schema 30 · content 25 · media 10 · structure 15 · indexability 10 · answerFit 10
 *
 * Crawl-only: sayfa HTML'i + robots.txt. JS render yok. Özgünlük "boilerplate oranı" ve
 * "tekrarlanan cümle oranı" sezgileriyle yaklaşık ölçülür (site geneliyle karşılaştırma yapılmaz).
 */
import { detectPlatform, PLATFORM_LABELS, type PlatformDetection } from './platform-detect';
import { guideFor } from './guides';
import {
  boilerplateRatio,
  canonicalOf,
  checkProductSchema,
  duplicateSentenceRatio,
  extractJsonLd,
  findNested,
  headings,
  hostnameOf,
  htmlToText,
  imageAltStats,
  listItemCount,
  mainContent,
  metaContent,
  metaRobots,
  nodesOfType,
  originOf,
  parseRobots,
  questionHeadingCount,
  resolveBotAccess,
  sameHost,
  str,
  tableRowCount,
  titleOf,
  tokenOverlap,
  wordCount,
  type ProductSchemaCheck,
} from './html-analysis';
import {
  assertWeights,
  fetchArtifact,
  recommendationsFrom,
  Scorer,
  type Artifact,
  type AxisSpec,
  type CommerceFinding,
  type Recommendation,
} from './scoring';

export type ProductPageAxis = 'schema' | 'content' | 'media' | 'structure' | 'indexability' | 'answerFit';

export const PRODUCT_PAGE_AXES: AxisSpec<ProductPageAxis>[] = assertWeights([
  {
    key: 'schema',
    label: 'Ürün şeması',
    weight: 30,
    description: 'Product JSON-LD zorunlu alanları, Offer, marka, kimlik, değerlendirme',
  },
  {
    key: 'content',
    label: 'İçerik',
    weight: 25,
    description: 'Açıklama uzunluğu, özgünlük sezgisi, H1/title uyumu, meta açıklama',
  },
  { key: 'media', label: 'Görseller', weight: 10, description: 'Ürün görselleri ve alt metin kapsamı' },
  { key: 'structure', label: 'Yapı', weight: 15, description: 'Breadcrumb, SSS, özellik tablosu, yorum/puan' },
  {
    key: 'indexability',
    label: 'İndekslenebilirlik',
    weight: 10,
    description: 'Durum kodu, noindex, canonical, robots.txt bot erişimi',
  },
  {
    key: 'answerFit',
    label: 'AI cevap uyumu',
    weight: 10,
    description: 'Madde listesi, tablo, soru başlıkları, kısa cümleler, açık fiyat',
  },
]);

const ANSWER_ENGINES = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot'];

export type ProductPageArtifacts = {
  url: string;
  page: Artifact;
  robots: Artifact | null;
  fetchedAt: string;
};

export type ProductPageAuditResult = {
  kind: 'PRODUCT_PAGE';
  url: string;
  finalUrl: string;
  hostname: string;
  platform: PlatformDetection & { label: string };
  score: number;
  breakdown: Record<ProductPageAxis, number>;
  axes: AxisSpec<ProductPageAxis>[];
  findings: CommerceFinding[];
  recommendations: Recommendation[];
  fetchedAt: string;
  partial: boolean;
  product: {
    name: string | null;
    price: string | null;
    currency: string | null;
    availability: string | null;
    brand: string | null;
    schemaFields: Omit<ProductSchemaCheck, 'node'>;
  };
  stats: {
    status: number;
    latencyMs: number;
    descriptionWords: number;
    boilerplateRatio: number;
    duplicateRatio: number;
    images: number;
    imagesWithAlt: number;
    listItems: number;
    tableRows: number;
    questionHeadings: number;
    avgSentenceWords: number;
  };
};

export function analyzeProductPage(a: ProductPageArtifacts): ProductPageAuditResult {
  const s = new Scorer<ProductPageAxis>(PRODUCT_PAGE_AXES);
  const page = a.page;
  const html = page.text;
  const finalUrl = page.url || a.url;
  const reachable = page.ok && html.length > 0;
  const platform = detectPlatform(html, page.headers, finalUrl);
  const nodes = reachable ? extractJsonLd(html) : [];
  const pc = checkProductSchema(nodes);
  const main = reachable ? mainContent(html) : '';
  const mainText = htmlToText(main);
  const fullText = reachable ? htmlToText(html) : '';

  if (!reachable) {
    s.note(
      'indexability',
      'Sayfa çekilemedi',
      page.error === 'unsafe'
        ? 'URL erişime kapalı bir adrese çözümlendi.'
        : page.error === 'timeout'
          ? 'Sunucu zaman aşımına uğradı.'
          : page.status
            ? `HTTP ${page.status} döndü.`
            : 'Ağ hatası veya HTML olmayan içerik.',
      'fail',
      page.status ? `HTTP ${page.status}` : undefined,
    );
  }

  // ── schema ──
  s.check(
    'schema',
    25,
    pc.present,
    'Product JSON-LD',
    { pass: 'Product şeması bulundu.', fail: 'Product şeması yok — AI ürünü yapısal olarak okuyamaz.' },
    { fix: 'Product JSON-LD ekleyin.', topic: 'productSchema' },
  );
  if (pc.present) {
    s.check(
      'schema',
      5,
      pc.name,
      'name',
      { pass: 'Ürün adı şemada.', fail: 'name eksik.' },
      { fix: 'name alanını doldurun.', topic: 'productSchema' },
    );
    s.check(
      'schema',
      10,
      pc.description,
      'description',
      { pass: 'Açıklama şemada.', fail: 'description eksik veya 20 karakterden kısa.' },
      { fix: 'description alanına özgün ürün açıklaması yazın.', topic: 'productSchema' },
    );
    s.check(
      'schema',
      10,
      pc.image,
      'image',
      { pass: 'Görsel şemada.', fail: 'image eksik.' },
      { fix: "image alanına ürün görseli URL'si ekleyin.", topic: 'productSchema' },
    );
    s.check(
      'schema',
      20,
      pc.price && pc.priceCurrency ? 'pass' : pc.price ? 'warn' : 'fail',
      'offers.price + priceCurrency',
      { pass: 'Fiyat ve para birimi şemada.', warn: 'Fiyat var, priceCurrency eksik.', fail: 'offers.price yok.' },
      { fix: 'offers{price, priceCurrency} ekleyin.', topic: 'pricing' },
    );
    s.check(
      'schema',
      10,
      pc.availability,
      'offers.availability',
      { pass: 'Stok durumu şemada.', fail: 'availability eksik.' },
      { fix: 'offers.availability ekleyin.', topic: 'availability' },
    );
    s.check(
      'schema',
      5,
      pc.offerUrl,
      'offers.url',
      { pass: "Teklif URL'si şemada.", fail: 'offers.url eksik.' },
      { fix: 'offers.url ekleyin.', topic: 'productSchema' },
    );
    s.check(
      'schema',
      5,
      pc.brand,
      'brand',
      { pass: 'Marka şemada.', fail: 'brand eksik.' },
      { fix: 'brand{name} ekleyin.', topic: 'productSchema' },
    );
    s.check(
      'schema',
      5,
      pc.sku,
      'sku',
      { pass: 'SKU şemada.', fail: 'sku eksik.' },
      { fix: 'sku ekleyin.', topic: 'identifiers' },
    );
    s.check(
      'schema',
      5,
      pc.gtin,
      'gtin / mpn',
      { pass: 'GTIN/MPN şemada.', fail: 'gtin/mpn eksik.' },
      { fix: 'gtin13/gtin/mpn ekleyin.', topic: 'identifiers' },
    );
    s.check(
      'schema',
      5,
      pc.aggregateRating || pc.review ? 'pass' : 'warn',
      'aggregateRating / review',
      {
        pass: 'Değerlendirme verisi şemada.',
        warn: 'Değerlendirme yok (yorum topluyorsanız ekleyin).',
        fail: 'Değerlendirme yok.',
      },
      { fix: 'Gerçek yorum verisiyle aggregateRating ekleyin.', topic: 'reviews' },
    );
  }

  // ── content ──
  const schemaDesc = pc.node ? str(pc.node.description) : '';
  const metaDesc = reachable ? (metaContent(html, 'description') ?? '') : '';
  const descSource = schemaDesc.length >= 40 ? schemaDesc : mainText;
  const descWords = wordCount(htmlToText(descSource));
  const bp = reachable ? boilerplateRatio(html) : 0;
  const dup = reachable ? duplicateSentenceRatio(fullText) : 0;
  const title = reachable ? (titleOf(html) ?? '') : '';
  const h1 = reachable ? headings(html, 1) : [];
  const overlap = h1[0] && title ? tokenOverlap(h1[0], title) : 0;
  if (reachable) {
    s.check(
      'content',
      30,
      descWords >= 120 ? 'pass' : descWords >= 50 ? 'warn' : 'fail',
      'Açıklama uzunluğu',
      {
        pass: `Ürün açıklaması ~${descWords} kelime.`,
        warn: `Ürün açıklaması ~${descWords} kelime; 120+ hedefleyin.`,
        fail: `Ürün açıklaması ~${descWords} kelime — AI için yetersiz.`,
      },
      { fix: 'Açıklamayı kullanım, malzeme/ölçü ve hedef kitle bilgisiyle genişletin.', topic: 'description' },
    );
    s.check(
      'content',
      20,
      bp <= 0.45 ? 'pass' : bp <= 0.65 ? 'warn' : 'fail',
      'Özgün içerik payı (boilerplate oranı)',
      {
        pass: `Metnin %${Math.round(bp * 100)}'i menü/altbilgi gibi tekrarlayan bloklarda.`,
        warn: `Metnin %${Math.round(bp * 100)}'i tekrarlayan bloklarda; ürüne özgü içerik az.`,
        fail: `Metnin %${Math.round(bp * 100)}'i tekrarlayan bloklarda — sayfaya özgü içerik çok az.`,
      },
      { fix: 'Ürüne özgü açıklama, özellik ve SSS içeriği ekleyin.', topic: 'description' },
    );
    s.check(
      'content',
      10,
      dup <= 0.1 ? 'pass' : dup <= 0.25 ? 'warn' : 'fail',
      'Tekrarlanan cümleler',
      {
        pass: 'Cümle tekrarı düşük.',
        warn: `Cümlelerin %${Math.round(dup * 100)}'i tekrar ediyor.`,
        fail: `Cümlelerin %${Math.round(dup * 100)}'i tekrar ediyor.`,
      },
      { fix: 'Kopyala-yapıştır blokları tekilleştirin.', topic: 'description' },
    );
    s.check(
      'content',
      15,
      h1.length === 1 ? 'pass' : h1.length > 1 ? 'warn' : 'fail',
      'Tek H1',
      { pass: 'Tam olarak bir H1 var.', warn: `${h1.length} H1 var.`, fail: 'H1 yok.' },
      { fix: 'Ürün adını tek H1 yapın.', evidence: h1[0]?.slice(0, 80), topic: 'h1' },
    );
    s.check(
      'content',
      15,
      overlap >= 0.3 ? 'pass' : overlap >= 0.15 ? 'warn' : 'fail',
      'H1 ↔ title uyumu',
      {
        pass: `Başlık ve H1 uyumlu (örtüşme %${Math.round(overlap * 100)}).`,
        warn: `Başlık ve H1 kısmen uyumlu (%${Math.round(overlap * 100)}).`,
        fail: 'Başlık ve H1 birbirinden kopuk (veya biri yok).',
      },
      { fix: 'Title ve H1 aynı ürün adını taşısın.', evidence: title.slice(0, 80) || undefined, topic: 'title' },
    );
    s.check(
      'content',
      10,
      metaDesc.length >= 50 && metaDesc.length <= 170 ? 'pass' : metaDesc.length > 0 ? 'warn' : 'fail',
      'Meta açıklama',
      {
        pass: `Meta açıklama ${metaDesc.length} karakter.`,
        warn: `Meta açıklama ${metaDesc.length} karakter; 50-160 önerilir.`,
        fail: 'Meta açıklama yok.',
      },
      { fix: 'Ürünü özetleyen meta açıklama yazın.', topic: 'metaDescription' },
    );
  }

  // ── media ──
  const imgs = reachable ? imageAltStats(main || html) : { total: 0, withAlt: 0 };
  const altRatio = imgs.total ? imgs.withAlt / imgs.total : 0;
  if (reachable) {
    s.check(
      'media',
      20,
      imgs.total > 0,
      'Ürün görseli (HTML)',
      { pass: `${imgs.total} görsel bulundu.`, fail: "HTML'de görsel bulunamadı (JS ile mi yükleniyor?)." },
      { fix: "Ana ürün görselini <img> olarak HTML'de sunun.", topic: 'jsRendering' },
    );
    s.check(
      'media',
      50,
      altRatio >= 0.7 ? 'pass' : altRatio >= 0.4 ? 'warn' : 'fail',
      'Görsel alt metni kapsamı',
      {
        pass: `Görsellerin %${Math.round(altRatio * 100)}'inde alt metin var.`,
        warn: `Görsellerin %${Math.round(altRatio * 100)}'inde alt metin var.`,
        fail: `Görsellerin yalnızca %${Math.round(altRatio * 100)}'inde alt metin var.`,
      },
      {
        fix: 'Ürün görsellerine açıklayıcı alt metin yazın.',
        evidence: `${imgs.withAlt}/${imgs.total}`,
        topic: 'imageAlt',
      },
    );
    s.check(
      'media',
      30,
      pc.image,
      'Şemada görsel',
      { pass: 'Product.image dolu.', fail: 'Product.image yok.' },
      { fix: 'Product şemasına image ekleyin.', topic: 'productSchema' },
    );
  }

  // ── structure ──
  const breadcrumb =
    findNested(nodes, 'BreadcrumbList').length > 0 ||
    /<(nav|ol|ul|div)[^>]*(aria-label=["']breadcrumb|class=["'][^"']*breadcrumb)/i.test(html);
  const qh = reachable ? questionHeadingCount(html) : 0;
  const faq = nodesOfType(nodes, 'FAQPage').length > 0 || qh >= 2;
  const rows = reachable ? tableRowCount(main || html) : 0;
  const specHeading = /<h[2-4][^>]*>[^<]*(özellik|specification|teknik|spec)[^<]*<\/h[2-4]>/i.test(html);
  const specTable = rows >= 3 || specHeading;
  const reviews = pc.aggregateRating || pc.review || /(\d+)\s*(yorum|değerlendirme|reviews?)/i.test(fullText);
  if (reachable) {
    s.check(
      'structure',
      30,
      breadcrumb,
      'Breadcrumb',
      { pass: 'Gezinti yolu mevcut.', fail: 'Breadcrumb yok; ürünün kategori bağlamı belirsiz.' },
      { fix: 'Breadcrumb + BreadcrumbList şeması ekleyin.', topic: 'breadcrumb' },
    );
    s.check(
      'structure',
      20,
      faq,
      'SSS bölümü',
      { pass: 'FAQPage şeması veya soru başlıkları var.', fail: 'SSS yok.' },
      { fix: 'Ürünle ilgili 4-6 soruluk SSS ekleyin.', topic: 'faq' },
    );
    s.check(
      'structure',
      30,
      specTable,
      'Özellik tablosu',
      { pass: `Özellik tablosu/tanım listesi var (${rows} satır).`, fail: 'Özellik tablosu bulunamadı.' },
      { fix: 'Özellik → değer tablosu ekleyin.', topic: 'specTable' },
    );
    s.check(
      'structure',
      20,
      reviews ? 'pass' : 'warn',
      'Yorum / puan',
      { pass: 'Yorum veya puan bilgisi var.', warn: 'Yorum/puan görünmüyor.', fail: 'Yorum/puan yok.' },
      { fix: 'Gerçek müşteri yorumlarını gösterin.', topic: 'reviews' },
    );
  }

  // ── indexability ──
  const robots = a.robots?.ok ? parseRobots(a.robots.text) : null;
  const path = (() => {
    try {
      const u = new URL(finalUrl);
      return u.pathname + u.search;
    } catch {
      return '/';
    }
  })();
  s.check(
    'indexability',
    25,
    page.status === 200 ? 'pass' : page.status >= 200 && page.status < 400 ? 'warn' : 'fail',
    'HTTP durum kodu',
    {
      pass: 'HTTP 200.',
      warn: `HTTP ${page.status}.`,
      fail: page.status ? `HTTP ${page.status}.` : 'Yanıt alınamadı.',
    },
    { fix: 'Ürün sayfası 200 döndürmeli.', evidence: `HTTP ${page.status}` },
  );
  if (reachable) {
    const robotsMeta = metaRobots(html) ?? '';
    const xRobots = page.headers.get('x-robots-tag') ?? '';
    const noindex = /noindex/i.test(robotsMeta) || /noindex/i.test(xRobots);
    s.check(
      'indexability',
      30,
      !noindex,
      'noindex',
      { pass: 'Sayfa indekslenebilir.', fail: 'Sayfa noindex ile işaretli!' },
      { fix: 'noindex işaretini kaldırın.', evidence: noindex ? robotsMeta || xRobots : undefined, topic: 'noindex' },
    );
    const canonical = canonicalOf(html);
    const canonicalSelf = canonical ? sameHost(canonical, finalUrl) : false;
    s.check(
      'indexability',
      20,
      canonical ? (canonicalSelf ? 'pass' : 'warn') : 'fail',
      'Canonical',
      { pass: 'Canonical mevcut.', warn: 'Canonical başka bir alan adına işaret ediyor.', fail: 'Canonical yok.' },
      { fix: 'Kendine işaret eden canonical ekleyin.', evidence: canonical ?? undefined, topic: 'canonical' },
    );
  }
  if (robots) {
    const g = resolveBotAccess(robots, 'Googlebot', path);
    s.check(
      'indexability',
      10,
      g.allowed,
      'robots.txt — Googlebot',
      { pass: 'Googlebot bu yola erişebilir.', fail: `Googlebot engelli (${g.rule ?? 'kural'}).` },
      { fix: "robots.txt'te ürün yolunu Googlebot için açın.", evidence: g.rule ?? undefined, topic: 'robots' },
    );
    const blocked = ANSWER_ENGINES.filter((b) => !resolveBotAccess(robots, b, path).allowed);
    s.check(
      'indexability',
      15,
      blocked.length === 0 ? 'pass' : blocked.length <= 2 ? 'warn' : 'fail',
      'robots.txt — AI botları',
      {
        pass: 'GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot ve PerplexityBot bu yola erişebilir.',
        warn: `Engelli AI botları: ${blocked.join(', ')}.`,
        fail: `Engelli AI botları: ${blocked.join(', ')}.`,
      },
      { fix: 'AI botlarına ürün yolları için izin verin.', evidence: blocked.join(', ') || undefined, topic: 'robots' },
    );
  } else {
    s.note(
      'indexability',
      'robots.txt',
      a.robots ? 'robots.txt bulunamadı (varsayılan: tüm botlar izinli).' : 'robots.txt kontrol edilemedi.',
      'warn',
    );
  }

  // ── answerFit ──
  const li = reachable ? listItemCount(main || html) : 0;
  const sentences = fullText.split(/(?<=[.!?…])\s+/).filter((x) => x.trim().length > 0);
  const avgSentence = sentences.length ? wordCount(fullText) / sentences.length : 0;
  const priceInText = /(\d[\d.,]*\s*(₺|TL|TRY|\$|€|USD|EUR)|(₺|\$|€)\s*\d[\d.,]*)/i.test(fullText);
  if (reachable) {
    s.check(
      'answerFit',
      30,
      li >= 3,
      'Madde listesi',
      {
        pass: `${li} liste öğesi — AI özellikleri madde madde alıntılayabilir.`,
        fail: 'Ana içerikte madde listesi yok.',
      },
      { fix: 'Öne çıkan özellikleri 3-8 maddelik liste yapın.', topic: 'description' },
    );
    s.check(
      'answerFit',
      20,
      specTable,
      'Özellik tablosu',
      { pass: 'Tablo/tanım listesi var.', fail: 'Tablo yok.' },
      { fix: 'Özellik tablosu ekleyin.', topic: 'specTable' },
    );
    s.check(
      'answerFit',
      20,
      faq,
      'Soru başlıkları / SSS',
      { pass: 'Soru biçiminde başlıklar var.', fail: 'Soru biçiminde başlık yok.' },
      { fix: '"Bu ürün ... için uygun mu?" gibi soru başlıkları ekleyin.', topic: 'faq' },
    );
    s.check(
      'answerFit',
      15,
      avgSentence <= 22 ? 'pass' : avgSentence <= 30 ? 'warn' : 'fail',
      'Cümle uzunluğu',
      {
        pass: `Ortalama ${Math.round(avgSentence)} kelime/cümle.`,
        warn: `Ortalama ${Math.round(avgSentence)} kelime/cümle; kısaltın.`,
        fail: `Ortalama ${Math.round(avgSentence)} kelime/cümle — çok uzun.`,
      },
      { fix: 'Cümleleri 20 kelimenin altında tutun.', topic: 'description' },
    );
    s.check(
      'answerFit',
      15,
      priceInText || pc.price,
      'Açık fiyat',
      { pass: 'Fiyat metinde/şemada okunabilir.', fail: 'Fiyat HTML metninde görünmüyor (JS ile mi geliyor?).' },
      { fix: "Fiyatı HTML'de ve şemada sunun.", topic: 'pricing' },
    );
  }

  const findings = s.findings;
  const recommendations = recommendationsFrom(findings, PRODUCT_PAGE_AXES, (topic) => {
    const g = guideFor(platform.platform, topic);
    return g ? { steps: g.steps, difficulty: g.difficulty } : null;
  });
  const offers = pc.node?.offers;
  const offer = (Array.isArray(offers) ? offers[0] : offers) as Record<string, unknown> | undefined;
  const { node: _node, ...schemaFields } = pc;

  return {
    kind: 'PRODUCT_PAGE',
    url: a.url,
    finalUrl,
    hostname: hostnameOf(finalUrl) || hostnameOf(a.url),
    platform: { ...platform, label: PLATFORM_LABELS[platform.platform] },
    score: s.total(),
    breakdown: s.breakdown(),
    axes: PRODUCT_PAGE_AXES,
    findings,
    recommendations,
    fetchedAt: a.fetchedAt,
    partial: false,
    product: {
      name: pc.node ? str(pc.node.name) || null : (h1[0] ?? null),
      price: offer ? str(offer.price) || str(offer.lowPrice) || null : null,
      currency: offer ? str(offer.priceCurrency) || null : null,
      availability: offer ? str(offer.availability).replace(/^https?:\/\/schema\.org\//, '') || null : null,
      brand: pc.node ? str(pc.node.brand) || null : null,
      schemaFields,
    },
    stats: {
      status: page.status,
      latencyMs: page.latencyMs,
      descriptionWords: descWords,
      boilerplateRatio: Math.round(bp * 1000) / 1000,
      duplicateRatio: Math.round(dup * 1000) / 1000,
      images: imgs.total,
      imagesWithAlt: imgs.withAlt,
      listItems: li,
      tableRows: rows,
      questionHeadings: qh,
      avgSentenceWords: Math.round(avgSentence * 10) / 10,
    },
  };
}

export async function runProductPageAudit(url: string): Promise<ProductPageAuditResult> {
  const fetchedAt = new Date().toISOString();
  const origin = originOf(url);
  const [page, robots] = await Promise.all([
    fetchArtifact(url, 12_000),
    origin ? fetchArtifact(`${origin}/robots.txt`, 6_000) : Promise.resolve(null),
  ]);
  return analyzeProductPage({ url, page, robots, fetchedAt });
}
