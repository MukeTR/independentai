/**
 * E-ticaret AI Görünürlük Testi (Faz D/E) — bir mağazanın AI motorlarına (ChatGPT, Claude,
 * Perplexity, Gemini) ne kadar "okunur" olduğunu crawl-only (kimlik yok) ölçer.
 *
 * Eksenler ve ağırlıklar (docs/COMMERCE_SCORING.md ile birebir):
 *   catalogStructure 20 · productSchema 25 · contentQuality 15 · aiCrawlability 20 ·
 *   brandSignals 10 · technical 10
 *
 * Akış: ana sayfa → (paralel) robots.txt, sitemap.xml, llms.txt, Shopify ise /products.json,
 * ilk ürün bağlantısı → ürün sayfası örneği. Zaman bütçesi ≤ 25 sn (aşama bütçeleri + allSettled).
 * Sınırlama: JS render yok; tek ürün sayfası örneklenir; sonuç bir fotoğraftır.
 */
import { prisma } from '../prisma';
import { detectPlatform, PLATFORM_LABELS, type PlatformDetection } from './platform-detect';
import { guideFor } from './guides';
import {
  AI_BOTS,
  canonicalOf,
  checkProductSchema,
  classifyLinks,
  collectLinks,
  extractJsonLd,
  findNested,
  hasViewport,
  headings,
  hreflangCount,
  htmlToText,
  hostnameOf,
  jsDependencyHint,
  metaContent,
  metaRobots,
  nodesOfType,
  originOf,
  parseRobots,
  questionHeadingCount,
  resolveBotAccess,
  sameHost,
  str,
  textRatio,
  titleOf,
  wordCount,
} from './html-analysis';
import {
  assertWeights,
  fetchArtifact,
  ms,
  recommendationsFrom,
  Scorer,
  type Artifact,
  type AxisSpec,
  type CommerceFinding,
  type FindingStatus,
  type Recommendation,
} from './scoring';

export type CommerceAxis =
  'catalogStructure' | 'productSchema' | 'contentQuality' | 'aiCrawlability' | 'brandSignals' | 'technical';

export const COMMERCE_AXES: AxisSpec<CommerceAxis>[] = assertWeights([
  {
    key: 'catalogStructure',
    label: 'Katalog yapısı',
    weight: 20,
    description: 'Ürün/koleksiyon bağlantıları, sitemap, breadcrumb, herkese açık ürün akışı',
  },
  {
    key: 'productSchema',
    label: 'Ürün şeması',
    weight: 25,
    description: 'Örnek ürün sayfasında Product JSON-LD ve zorunlu alanlar',
  },
  {
    key: 'contentQuality',
    label: 'İçerik kalitesi',
    weight: 15,
    description: 'Başlık, meta açıklama, H1, metin yoğunluğu, soru-cevap',
  },
  {
    key: 'aiCrawlability',
    label: 'AI taranabilirliği',
    weight: 20,
    description: 'robots.txt AI bot kuralları, llms.txt, JS bağımlılığı, noindex',
  },
  {
    key: 'brandSignals',
    label: 'Marka sinyalleri',
    weight: 10,
    description: 'Organization/WebSite şeması, logo, sosyal profiller, iletişim',
  },
  {
    key: 'technical',
    label: 'Teknik',
    weight: 10,
    description: 'HTTPS, durum kodu, yanıt süresi, canonical, viewport, hreflang',
  },
]);

export const COMMERCE_TIME_BUDGET_MS = 25_000;
/** 10 AI botu (arama referans botları hariç) */
const AI_ONLY = AI_BOTS.filter((b) => b.kind === 'ai');
/** Cevap motorları: anlık alıntı için en kritik dört bot */
const ANSWER_ENGINES = ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot'];

export type CommerceArtifacts = {
  /** İstenen (normalize) URL */
  url: string;
  home: Artifact;
  robots: Artifact | null;
  sitemap: Artifact | null;
  llms: Artifact | null;
  /** Shopify /products.json (yalnızca Shopify tespitinde) */
  productsJson: Artifact | null;
  productPage: Artifact | null;
  sampledProductUrl: string | null;
  fetchedAt: string;
  /** Zaman bütçesi nedeniyle bazı adımlar atlandı */
  partial: boolean;
};

export type CommerceAuditResult = {
  kind: 'COMMERCE';
  url: string;
  finalUrl: string;
  hostname: string;
  platform: PlatformDetection & { label: string };
  score: number;
  breakdown: Record<CommerceAxis, number>;
  axes: AxisSpec<CommerceAxis>[];
  findings: CommerceFinding[];
  sampledProductUrl?: string;
  recommendations: Recommendation[];
  fetchedAt: string;
  partial: boolean;
  stats: {
    status: number;
    latencyMs: number;
    productLinks: number;
    collectionLinks: number;
    wordCount: number;
    textRatio: number;
    aiBotsAllowed: number;
    aiBotsTotal: number;
    sampledProducts: number;
  };
};

// ───────────── Saf analiz ─────────────

export function analyzeCommerce(a: CommerceArtifacts): CommerceAuditResult {
  const s = new Scorer<CommerceAxis>(COMMERCE_AXES);
  const home = a.home;
  const html = home.text;
  const finalUrl = home.url || a.url;
  const platform = detectPlatform(html, home.headers, finalUrl);
  const platformOut = { ...platform, label: PLATFORM_LABELS[platform.platform] };

  // Ana sayfa erişilemedi: erişim bulgusu + eldeki diğer kaynaklarla sınırlı değerlendirme
  const reachable = home.ok && html.length > 0;
  if (!reachable) {
    s.note(
      'technical',
      'Ana sayfa çekilemedi',
      home.error === 'unsafe'
        ? 'URL erişime kapalı bir adrese çözümlendi.'
        : home.error === 'timeout'
          ? 'Sunucu zaman aşımına uğradı.'
          : home.status
            ? `HTTP ${home.status} döndü.`
            : 'Ağ hatası: sunucuya ulaşılamadı veya içerik türü HTML değil.',
      'fail',
      home.status ? `HTTP ${home.status}` : undefined,
    );
  }

  const text = reachable ? htmlToText(html) : '';
  const words = wordCount(text);
  const links = reachable ? collectLinks(html, finalUrl) : [];
  const { products, collections } = classifyLinks(links);
  const nodes = reachable ? extractJsonLd(html) : [];
  const productNodes = a.productPage?.ok ? extractJsonLd(a.productPage.text) : [];

  // ── catalogStructure ──
  s.check(
    'catalogStructure',
    30,
    products.length >= 8 ? 'pass' : products.length >= 3 ? 'warn' : 'fail',
    'Ana sayfadan ürün bağlantıları',
    {
      pass: `${products.length} ürün bağlantısı bulundu; AI crawler ürünleri ana sayfadan keşfedebilir.`,
      warn: `Yalnızca ${products.length} ürün bağlantısı bulundu; öne çıkan ürünlere doğrudan bağlantı verin.`,
      fail: "Ana sayfa HTML'inde ürün bağlantısı bulunamadı (menü JS ile mi yükleniyor?).",
    },
    {
      fix: 'Öne çıkan ürünlere HTML <a href> bağlantıları ekleyin.',
      evidence: `${products.length} ürün / ${links.length} toplam bağlantı`,
      topic: 'catalogStructure',
    },
  );
  s.check(
    'catalogStructure',
    20,
    collections.length >= 3 ? 'pass' : collections.length >= 1 ? 'warn' : 'fail',
    'Kategori / koleksiyon bağlantıları',
    {
      pass: `${collections.length} kategori bağlantısı bulundu.`,
      warn: `${collections.length} kategori bağlantısı bulundu; ana kategorilerin tümünü menüde HTML olarak sunun.`,
      fail: 'Kategori bağlantısı bulunamadı; AI motorları ürün gruplarınızı anlayamaz.',
    },
    {
      fix: 'Ana kategorileri HTML menüde bağlayın.',
      evidence: `${collections.length} kategori bağlantısı`,
      topic: 'catalogStructure',
    },
  );
  const sitemapOk = !!a.sitemap?.ok && /<(urlset|sitemapindex)\b/i.test(a.sitemap.text);
  const sitemapUrlCount = sitemapOk ? (a.sitemap!.text.match(/<loc>/gi) || []).length : 0;
  s.check(
    'catalogStructure',
    25,
    sitemapOk ? 'pass' : a.sitemap && a.sitemap.status === 200 ? 'warn' : 'fail',
    'XML site haritası',
    {
      pass: `Site haritası erişilebilir (${sitemapUrlCount} <loc> girdisi${a.sitemap && a.sitemap.truncated ? ', kısmi okundu' : ''}).`,
      warn: 'Site haritası yanıt verdi ama geçerli XML (urlset/sitemapindex) görünmüyor.',
      fail: 'Site haritası bulunamadı (/sitemap.xml veya robots.txt Sitemap satırı).',
    },
    { fix: "Ürün ve kategori URL'lerini içeren sitemap.xml yayınlayın.", evidence: a.sitemap?.url, topic: 'sitemap' },
  );
  const breadcrumb =
    findNested(productNodes, 'BreadcrumbList').length > 0 || findNested(nodes, 'BreadcrumbList').length > 0;
  s.check(
    'catalogStructure',
    10,
    breadcrumb,
    'BreadcrumbList şeması',
    {
      pass: 'Gezinti yolu şeması bulundu; AI kategori hiyerarşinizi anlar.',
      fail: 'Örneklenen sayfalarda BreadcrumbList şeması yok.',
    },
    { fix: 'Ürün sayfalarına breadcrumb + BreadcrumbList JSON-LD ekleyin.', topic: 'breadcrumb' },
  );
  let sampledProducts = 0;
  if (platform.platform === 'SHOPIFY') {
    const pj = a.productsJson;
    let ok = false;
    if (pj?.ok) {
      try {
        const parsed = JSON.parse(pj.text) as { products?: unknown[] };
        sampledProducts = Array.isArray(parsed.products) ? parsed.products.length : 0;
        ok = sampledProducts > 0;
      } catch {
        ok = false;
      }
    }
    s.check(
      'catalogStructure',
      15,
      ok,
      'Herkese açık ürün akışı (/products.json)',
      {
        pass: `Shopify ürün akışı erişilebilir (${sampledProducts} ürün örneklendi).`,
        fail: 'Shopify /products.json erişilemez (şifre korumalı mağaza veya engellenmiş).',
      },
      {
        fix: 'Mağazanın herkese açık olduğundan emin olun.',
        evidence: pj ? `HTTP ${pj.status}` : undefined,
        topic: 'productsJson',
      },
    );
  }

  // ── productSchema ──
  if (a.productPage?.ok) {
    const pc = checkProductSchema(productNodes);
    s.check(
      'productSchema',
      25,
      pc.present,
      'Product JSON-LD',
      {
        pass: 'Örnek ürün sayfasında Product şeması var.',
        fail: 'Örnek ürün sayfasında Product şeması bulunamadı — AI ürünü yapısal olarak okuyamaz.',
      },
      {
        fix: 'Ürün şablonuna Product JSON-LD ekleyin.',
        evidence: a.sampledProductUrl ?? undefined,
        topic: 'productSchema',
      },
    );
    if (pc.present) {
      const core = [pc.name, pc.description, pc.image].filter(Boolean).length;
      s.check(
        'productSchema',
        15,
        core === 3 ? 'pass' : core === 2 ? 'warn' : 'fail',
        'Ad, açıklama, görsel alanları',
        {
          pass: 'name, description ve image alanları dolu.',
          warn: 'name/description/image alanlarından biri eksik veya çok kısa.',
          fail: 'name/description/image alanlarının çoğu eksik.',
        },
        {
          fix: 'Product şemasında name, description (≥20 karakter) ve image alanlarını doldurun.',
          topic: 'productSchema',
        },
      );
      s.check(
        'productSchema',
        20,
        pc.price && pc.priceCurrency ? 'pass' : pc.price ? 'warn' : 'fail',
        'Fiyat ve para birimi (offers)',
        {
          pass: 'offers.price ve priceCurrency mevcut.',
          warn: 'Fiyat var ama priceCurrency (ISO 4217) eksik.',
          fail: 'offers.price bulunamadı.',
        },
        { fix: 'offers{price, priceCurrency} alanlarını ekleyin.', topic: 'pricing' },
      );
      s.check(
        'productSchema',
        10,
        pc.availability,
        'Stok durumu (offers.availability)',
        {
          pass: 'availability standart schema.org değeriyle belirtilmiş.',
          fail: 'offers.availability eksik; AI stok durumunu bilemez.',
        },
        { fix: 'offers.availability alanını InStock/OutOfStock ile doldurun.', topic: 'availability' },
      );
      s.check(
        'productSchema',
        10,
        pc.brand,
        'Marka (brand)',
        { pass: 'brand alanı dolu.', fail: 'brand alanı yok; marka ilişkilendirmesi zayıf.' },
        { fix: 'brand{name} alanını ekleyin.', topic: 'productSchema' },
      );
      s.check(
        'productSchema',
        10,
        pc.gtin ? 'pass' : pc.sku ? 'warn' : 'fail',
        'Ürün kimliği (gtin / sku)',
        {
          pass: 'GTIN/MPN mevcut; ürün diğer mağazalardaki eşiyle eşleştirilebilir.',
          warn: 'Yalnızca SKU var; GTIN/EAN ekleyin.',
          fail: 'sku/gtin yok.',
        },
        { fix: 'sku ve gtin alanlarını doldurun.', topic: 'identifiers' },
      );
      s.check(
        'productSchema',
        5,
        pc.aggregateRating ? 'pass' : 'warn',
        'Değerlendirme (aggregateRating)',
        {
          pass: 'aggregateRating mevcut.',
          warn: 'aggregateRating yok (yorum toplanıyorsa şemaya ekleyin).',
          fail: 'aggregateRating yok.',
        },
        { fix: 'Gerçek yorum verisiyle aggregateRating ekleyin.', topic: 'reviews' },
      );
      s.check(
        'productSchema',
        5,
        pc.offerUrl,
        "Teklif URL'si (offers.url)",
        { pass: 'offers.url mevcut.', fail: 'offers.url eksik.' },
        { fix: "offers.url alanına ürün URL'sini yazın.", topic: 'productSchema' },
      );
    }
  } else {
    const productOnHome = findNested(nodes, 'Product').length > 0;
    s.check(
      'productSchema',
      100,
      productOnHome ? 'warn' : 'fail',
      'Ürün sayfası örneklenemedi',
      {
        pass: '',
        warn: 'Ürün sayfası çekilemedi; ana sayfada Product şeması görüldü (kısmi puan).',
        fail: a.sampledProductUrl
          ? `Ürün sayfası çekilemedi (${a.productPage?.status ? `HTTP ${a.productPage.status}` : (a.productPage?.error ?? 'hata')}).`
          : 'Ana sayfadan ürün bağlantısı bulunamadığı için ürün şeması değerlendirilemedi.',
      },
      {
        fix: 'Ürün sayfalarını HTML bağlantılarla erişilebilir kılın ve Product JSON-LD ekleyin.',
        evidence: a.sampledProductUrl ?? undefined,
        topic: 'productSchema',
      },
    );
  }

  // ── contentQuality ──
  if (reachable) {
    const title = titleOf(html) ?? '';
    s.check(
      'contentQuality',
      15,
      title.length >= 10 && title.length <= 70 ? 'pass' : title.length > 0 ? 'warn' : 'fail',
      'Sayfa başlığı (title)',
      {
        pass: `Başlık uygun uzunlukta (${title.length} karakter).`,
        warn: `Başlık ${title.length} karakter; 10-70 arası önerilir.`,
        fail: 'Başlık etiketi yok.',
      },
      { fix: 'Açıklayıcı 30-60 karakterlik başlık yazın.', evidence: title.slice(0, 80) || undefined, topic: 'title' },
    );
    const desc = metaContent(html, 'description') ?? '';
    s.check(
      'contentQuality',
      20,
      desc.length >= 50 && desc.length <= 170 ? 'pass' : desc.length > 0 ? 'warn' : 'fail',
      'Meta açıklama',
      {
        pass: `Meta açıklama uygun (${desc.length} karakter).`,
        warn: `Meta açıklama ${desc.length} karakter; 50-160 arası önerilir.`,
        fail: 'Meta açıklama yok.',
      },
      { fix: 'Mağazanın ne sattığını özetleyen meta açıklama ekleyin.', topic: 'metaDescription' },
    );
    const h1 = headings(html, 1);
    s.check(
      'contentQuality',
      15,
      h1.length === 1 ? 'pass' : h1.length > 1 ? 'warn' : 'fail',
      'Tek H1',
      { pass: 'Sayfada tam olarak bir H1 var.', warn: `${h1.length} H1 var; tek H1 kullanın.`, fail: 'H1 yok.' },
      { fix: 'Tek ve anlamlı bir H1 kullanın.', evidence: h1[0]?.slice(0, 80), topic: 'h1' },
    );
    s.check(
      'contentQuality',
      20,
      words >= 150 ? 'pass' : words >= 60 ? 'warn' : 'fail',
      'Görünür metin miktarı',
      {
        pass: `${words} kelime görünür metin.`,
        warn: `${words} kelime; mağazanızı ve kategorilerinizi anlatan metin ekleyin.`,
        fail: `${words} kelime — AI için neredeyse boş sayfa.`,
      },
      {
        fix: 'Ana sayfaya kim olduğunuzu ve ne sattığınızı anlatan kısa metin bölümleri ekleyin.',
        topic: 'description',
      },
    );
    const faq = nodesOfType(nodes, 'FAQPage').length > 0 || questionHeadingCount(html) >= 2;
    s.check(
      'contentQuality',
      15,
      faq,
      'Soru-cevap içeriği',
      {
        pass: 'FAQ şeması veya soru başlıkları var.',
        fail: 'Soru-cevap içeriği yok; AI motorları doğrudan cevap verebilecek blok bulamaz.',
      },
      { fix: 'Kargo, iade, garanti gibi sorular için SSS bölümü + FAQPage şeması ekleyin.', topic: 'faq' },
    );
    const ratio = textRatio(html);
    s.check(
      'contentQuality',
      15,
      ratio >= 0.1 ? 'pass' : ratio >= 0.04 ? 'warn' : 'fail',
      'Metin / HTML oranı',
      {
        pass: `Metin oranı %${Math.round(ratio * 100)}.`,
        warn: `Metin oranı %${Math.round(ratio * 100)}; HTML şişkin veya içerik JS ile geliyor.`,
        fail: `Metin oranı %${Math.round(ratio * 100)} — içerik büyük olasılıkla JS ile render ediliyor.`,
      },
      { fix: 'Kritik içeriği sunucu tarafında HTML olarak sunun.', topic: 'jsRendering' },
    );
  }

  // ── aiCrawlability ──
  const robots = a.robots?.ok ? parseRobots(a.robots.text) : null;
  s.check(
    'aiCrawlability',
    15,
    robots ? 'pass' : a.robots && a.robots.status === 404 ? 'warn' : 'fail',
    'robots.txt',
    {
      pass: `robots.txt erişilebilir (${robots?.groups.length ?? 0} kural grubu, ${robots?.sitemaps.length ?? 0} sitemap satırı).`,
      warn: 'robots.txt yok (varsayılan: her şey izinli, ama sitemap bildirimi de yok).',
      fail: 'robots.txt çekilemedi.',
    },
    { fix: 'Sitemap satırı içeren bir robots.txt yayınlayın.', topic: 'robots' },
  );
  const access = AI_ONLY.map((b) => ({
    bot: b.name,
    ...(robots
      ? resolveBotAccess(robots, b.name, '/')
      : { allowed: true, explicit: false, rule: null, matchedAgent: null }),
  }));
  const allowed = access.filter((x) => x.allowed);
  const blocked = access.filter((x) => !x.allowed).map((x) => x.bot);
  s.check(
    'aiCrawlability',
    40,
    blocked.length === 0 ? 'pass' : allowed.length >= 7 ? 'warn' : 'fail',
    'AI crawler erişimi',
    {
      pass: `${AI_ONLY.length} AI botunun tümü ana sayfaya erişebilir.`,
      warn: `${blocked.length} AI botu engellenmiş: ${blocked.join(', ')}.`,
      fail: `${blocked.length}/${AI_ONLY.length} AI botu engellenmiş: ${blocked.join(', ')}.`,
    },
    {
      fix: "Görünmek istediğiniz AI botlarına robots.txt'te izin verin.",
      evidence: blocked.length ? blocked.join(', ') : undefined,
      topic: 'robots',
    },
  );
  const answerBlocked = access.filter((x) => ANSWER_ENGINES.includes(x.bot) && !x.allowed).map((x) => x.bot);
  s.check(
    'aiCrawlability',
    15,
    answerBlocked.length === 0,
    'Cevap motorları (arama/alıntı botları)',
    {
      pass: 'OAI-SearchBot, ChatGPT-User, PerplexityBot ve ClaudeBot erişebilir.',
      fail: `Alıntı yapan botlar engelli: ${answerBlocked.join(', ')} — ürünleriniz AI cevaplarında kaynak gösterilemez.`,
    },
    {
      fix: 'En azından OAI-SearchBot, ChatGPT-User, PerplexityBot ve ClaudeBot için Allow: / ekleyin.',
      topic: 'robots',
    },
  );
  s.check(
    'aiCrawlability',
    10,
    !!a.llms?.ok && a.llms.text.trim().length > 20 && !/<html/i.test(a.llms.text.slice(0, 500)),
    'llms.txt',
    { pass: 'llms.txt bulundu.', fail: 'llms.txt yok — AI modellerine mağazanızı doğrudan anlatan dosya.' },
    { fix: 'Kök dizine llms.txt ekleyin.', topic: 'llmsTxt' },
  );
  if (reachable) {
    const noindex = /noindex/i.test(metaRobots(html) ?? '') || /noindex/i.test(home.headers.get('x-robots-tag') ?? '');
    s.check(
      'aiCrawlability',
      10,
      !noindex,
      'noindex işareti',
      { pass: 'Ana sayfa indekslenebilir.', fail: 'Ana sayfa noindex ile işaretli!' },
      { fix: 'noindex işaretini kaldırın.', topic: 'noindex' },
    );
    const jsHint = jsDependencyHint(html);
    s.check(
      'aiCrawlability',
      10,
      !jsHint,
      'JS bağımlılığı',
      {
        pass: 'İçerik ilk HTML yanıtında mevcut.',
        fail: 'Sayfa içeriği büyük olasılıkla yalnızca JS ile render ediliyor; çoğu AI crawler JS çalıştırmaz.',
      },
      { fix: 'Sunucu tarafı render (SSR) veya statik HTML kullanın.', topic: 'jsRendering' },
    );
  }

  // ── brandSignals ──
  if (reachable) {
    const org =
      nodesOfType(nodes, 'Organization')[0] ??
      nodesOfType(nodes, 'OnlineStore')[0] ??
      nodesOfType(nodes, 'Store')[0] ??
      null;
    s.check(
      'brandSignals',
      35,
      org ? (str(org.logo) ? 'pass' : 'warn') : 'fail',
      'Organization şeması',
      {
        pass: 'Organization JSON-LD (logo dahil) mevcut.',
        warn: 'Organization şeması var ama logo alanı yok.',
        fail: 'Organization şeması yok; AI markanızı bir varlık olarak tanımlayamaz.',
      },
      { fix: 'Organization JSON-LD ekleyin (name, url, logo, sameAs).', topic: 'organizationSchema' },
    );
    const sameAs = org && Array.isArray(org.sameAs) ? (org.sameAs as unknown[]).length : org && str(org.sameAs) ? 1 : 0;
    s.check(
      'brandSignals',
      15,
      sameAs >= 1,
      'Sosyal profiller (sameAs)',
      { pass: `${sameAs} sameAs bağlantısı.`, fail: 'sameAs yok; marka doğrulaması zayıf.' },
      { fix: 'sameAs dizisine resmi sosyal medya profillerini ekleyin.', topic: 'organizationSchema' },
    );
    s.check(
      'brandSignals',
      15,
      nodesOfType(nodes, 'WebSite').length > 0,
      'WebSite şeması',
      { pass: 'WebSite şeması var.', fail: 'WebSite şeması yok.' },
      { fix: 'WebSite JSON-LD ekleyin.', topic: 'organizationSchema' },
    );
    const og = metaContent(html, 'og:site_name') ?? metaContent(html, 'og:title');
    s.check(
      'brandSignals',
      10,
      !!og,
      'Open Graph marka bilgisi',
      { pass: `og:site_name/og:title: ${og?.slice(0, 60)}`, fail: 'og:site_name / og:title yok.' },
      { fix: 'og:site_name ve og:title meta etiketleri ekleyin.', topic: 'organizationSchema' },
    );
    const aboutLink = links.some((l) =>
      /\/(about|hakkimizda|hakkımızda|kurumsal|biz-kimiz|iletisim|iletişim|contact)\b/i.test(l),
    );
    s.check(
      'brandSignals',
      15,
      aboutLink,
      'Hakkımızda / İletişim sayfası bağlantısı',
      { pass: 'Hakkımızda veya iletişim sayfasına bağlantı var.', fail: 'Hakkımızda/İletişim bağlantısı bulunamadı.' },
      { fix: 'Ana sayfadan Hakkımızda ve İletişim sayfalarına bağlantı verin.', topic: 'organizationSchema' },
    );
    const contact = !!org && (!!org.contactPoint || str(org.telephone) !== '' || str(org.email) !== '');
    s.check(
      'brandSignals',
      10,
      contact,
      'İletişim bilgisi (şemada)',
      { pass: 'contactPoint/telephone/email şemada mevcut.', fail: 'Şemada iletişim bilgisi yok.' },
      { fix: 'Organization şemasına contactPoint ekleyin.', topic: 'organizationSchema' },
    );
  }

  // ── technical ──
  s.check(
    'technical',
    20,
    finalUrl.startsWith('https://'),
    'HTTPS',
    { pass: 'Güvenli bağlantı.', fail: 'Sayfa HTTPS üzerinden sunulmuyor.' },
    { fix: "SSL sertifikası kurun ve HTTP'yi yönlendirin.", topic: 'https' },
  );
  s.check(
    'technical',
    20,
    home.status === 200 ? 'pass' : home.status >= 200 && home.status < 400 ? 'warn' : 'fail',
    'HTTP durum kodu',
    {
      pass: 'HTTP 200.',
      warn: `HTTP ${home.status}.`,
      fail: home.status ? `HTTP ${home.status}.` : 'Yanıt alınamadı.',
    },
    { fix: 'Ana sayfa 200 döndürmeli.', evidence: `HTTP ${home.status}` },
  );
  s.check(
    'technical',
    20,
    home.latencyMs < 1500 ? 'pass' : home.latencyMs < 3000 ? 'warn' : 'fail',
    'Yanıt süresi',
    {
      pass: `Ana sayfa ${ms(home.latencyMs)} içinde yüklendi.`,
      warn: `Ana sayfa ${ms(home.latencyMs)}; 1,5 sn altı hedefleyin.`,
      fail: `Ana sayfa ${ms(home.latencyMs)} — crawler bütçesini tüketir.`,
    },
    { fix: 'Önbellek/CDN ile yanıt süresini düşürün.', evidence: ms(home.latencyMs), topic: 'performance' },
  );
  if (reachable) {
    const canonical = canonicalOf(html);
    s.check(
      'technical',
      15,
      canonical ? (sameHost(canonical, finalUrl) ? 'pass' : 'warn') : 'fail',
      'Canonical etiketi',
      {
        pass: 'Canonical etiketi mevcut.',
        warn: 'Canonical başka bir alan adına işaret ediyor.',
        fail: 'Canonical etiketi yok.',
      },
      { fix: 'Kendine işaret eden canonical ekleyin.', evidence: canonical ?? undefined, topic: 'canonical' },
    );
    s.check(
      'technical',
      10,
      hasViewport(html),
      'Viewport (mobil)',
      { pass: 'Viewport meta etiketi var.', fail: 'Viewport meta etiketi yok.' },
      { fix: '<meta name="viewport" content="width=device-width, initial-scale=1"> ekleyin.' },
    );
    const hl = hreflangCount(html);
    s.check(
      'technical',
      15,
      hl > 0 ? 'pass' : 'warn',
      'hreflang',
      {
        pass: `${hl} hreflang alternatifi.`,
        warn: 'hreflang yok (tek dilli mağazada sorun değil).',
        fail: 'hreflang yok.',
      },
      { fix: 'Çok dilli/pazarlı ise hreflang ekleyin.', topic: 'hreflang' },
    );
  }

  const findings = s.findings;
  const recommendations = recommendationsFrom(findings, COMMERCE_AXES, (topic) => {
    const g = guideFor(platform.platform, topic);
    return g ? { steps: g.steps, difficulty: g.difficulty } : null;
  });

  return {
    kind: 'COMMERCE',
    url: a.url,
    finalUrl,
    hostname: hostnameOf(finalUrl) || hostnameOf(a.url),
    platform: platformOut,
    score: s.total(),
    breakdown: s.breakdown(),
    axes: COMMERCE_AXES,
    findings,
    ...(a.sampledProductUrl ? { sampledProductUrl: a.sampledProductUrl } : {}),
    recommendations,
    fetchedAt: a.fetchedAt,
    partial: a.partial,
    stats: {
      status: home.status,
      latencyMs: home.latencyMs,
      productLinks: products.length,
      collectionLinks: collections.length,
      wordCount: words,
      textRatio: Math.round(textRatio(html) * 1000) / 1000,
      aiBotsAllowed: allowed.length,
      aiBotsTotal: AI_ONLY.length,
      sampledProducts,
    },
  };
}

// ───────────── Çekim orkestrasyonu ─────────────

/** Ana sayfadan veya Shopify ürün akışından örnek ürün URL'si seçer (deterministik: ilk aday). */
export function pickProductUrl(homeHtml: string, baseUrl: string, productsJsonText?: string | null): string | null {
  const { products } = classifyLinks(collectLinks(homeHtml, baseUrl));
  if (products[0]) return products[0];
  if (productsJsonText) {
    try {
      const parsed = JSON.parse(productsJsonText) as { products?: { handle?: string }[] };
      const handle = parsed.products?.find((p) => p.handle)?.handle;
      if (handle) return `${originOf(baseUrl)}/products/${encodeURIComponent(handle)}`;
    } catch {
      /* geçersiz JSON */
    }
  }
  return null;
}

export async function collectCommerceArtifacts(url: string): Promise<CommerceArtifacts> {
  const started = Date.now();
  const fetchedAt = new Date().toISOString();
  const home = await fetchArtifact(url, 10_000);
  const base = home.url || url;
  const origin = originOf(base);
  const platform = detectPlatform(home.text, home.headers, base);
  let sampledProductUrl = pickProductUrl(home.text, base);
  let partial = false;

  // Aşama 2: paralel yan kaynaklar (toplam ≤ ~9 sn)
  const [robots, sitemap, llms, productsJson, productPage] = await Promise.all([
    origin ? fetchArtifact(`${origin}/robots.txt`, 6_000) : Promise.resolve(null),
    origin ? fetchArtifact(`${origin}/sitemap.xml`, 6_000) : Promise.resolve(null),
    origin ? fetchArtifact(`${origin}/llms.txt`, 5_000) : Promise.resolve(null),
    origin && platform.platform === 'SHOPIFY'
      ? fetchArtifact(`${origin}/products.json?limit=5`, 8_000)
      : Promise.resolve(null),
    sampledProductUrl ? fetchArtifact(sampledProductUrl, 9_000) : Promise.resolve(null),
  ]);

  let finalSitemap = sitemap;
  let finalProductPage = productPage;

  // Aşama 3 (bütçe kaldıysa): robots'ta bildirilen sitemap ve/veya products.json'dan ürün sayfası
  const elapsed = Date.now() - started;
  if (elapsed < 17_000) {
    const tasks: Promise<void>[] = [];
    if (robots?.ok && !(sitemap?.ok && /<(urlset|sitemapindex)\b/i.test(sitemap.text))) {
      const declared = parseRobots(robots.text).sitemaps.find((sm) => sameHost(sm, base));
      if (declared && declared !== `${origin}/sitemap.xml`) {
        tasks.push(
          fetchArtifact(declared, 6_000).then((r) => {
            if (r.ok) finalSitemap = r;
          }),
        );
      }
    }
    if (!sampledProductUrl && productsJson?.ok) {
      const fromJson = pickProductUrl('', base, productsJson.text);
      if (fromJson) {
        sampledProductUrl = fromJson;
        tasks.push(
          fetchArtifact(fromJson, 6_000).then((r) => {
            finalProductPage = r;
          }),
        );
      }
    }
    if (tasks.length) await Promise.allSettled(tasks);
  } else {
    partial = true;
  }

  return {
    url,
    home,
    robots,
    sitemap: finalSitemap,
    llms,
    productsJson,
    productPage: finalProductPage,
    sampledProductUrl,
    fetchedAt,
    partial,
  };
}

export async function runCommerceAudit(url: string): Promise<CommerceAuditResult> {
  const artifacts = await collectCommerceArtifacts(url);
  return analyzeCommerce(artifacts);
}

// ───────────── Bağlı katalog üzerinden veri kalitesi ─────────────

export type CatalogProductLike = {
  title: string;
  description: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  identifiers: unknown;
  categories: string[];
  productType: string | null;
  vendor: string | null;
  priceMin: number | string | null | { toString(): string };
  currency: string | null;
  availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';
  url: string | null;
  status?: string | null;
};

export type CatalogReadinessAxis = 'catalogStructure' | 'productSchema' | 'contentQuality' | 'brandSignals';

/** Katalog hazırlığında ölçülebilen eksenler (aiCrawlability/technical katalogdan ölçülemez). */
export const CATALOG_AXES: AxisSpec<CatalogReadinessAxis>[] = COMMERCE_AXES.filter(
  (a): a is AxisSpec<CatalogReadinessAxis> =>
    a.key === 'catalogStructure' || a.key === 'productSchema' || a.key === 'contentQuality' || a.key === 'brandSignals',
);

export type CatalogReadinessResult = {
  kind: 'CATALOG';
  productCount: number;
  sampleSize: number;
  score: number;
  breakdown: Record<CatalogReadinessAxis, number>;
  axes: AxisSpec<CatalogReadinessAxis>[];
  findings: CommerceFinding[];
  recommendations: Recommendation[];
  coverage: Record<string, number>;
  connections: { id: string; provider: string; storeDomain: string; lastSyncAt: string | null }[];
  computedAt: string;
};

function pct(n: number, d: number): number {
  return d === 0 ? 0 : n / d;
}
function pctLabel(r: number): string {
  return `%${Math.round(r * 100)}`;
}

/** Katalog ürünlerinden veri kalitesi skoru — saf, deterministik (testlenebilir). */
export function scoreCatalogProducts(
  products: CatalogProductLike[],
  platform: PlatformDetection['platform'] = 'UNKNOWN',
  connections: CatalogReadinessResult['connections'] = [],
): CatalogReadinessResult {
  const s = new Scorer<CatalogReadinessAxis>(CATALOG_AXES);
  const n = products.length;
  const computedAt = new Date().toISOString();
  if (n === 0) {
    s.note('catalogStructure', 'Katalog boş', 'Bağlı mağazadan henüz ürün senkronlanmadı.', 'fail');
    return {
      kind: 'CATALOG',
      productCount: 0,
      sampleSize: 0,
      score: 0,
      breakdown: s.breakdown(),
      axes: CATALOG_AXES,
      findings: s.findings,
      recommendations: [],
      coverage: {},
      connections,
      computedAt,
    };
  }
  const has = (f: (p: CatalogProductLike) => boolean) => pct(products.filter(f).length, n);
  const descWords = (p: CatalogProductLike) => wordCount(htmlToText(p.description ?? ''));
  const ids = (p: CatalogProductLike) =>
    p.identifiers && typeof p.identifiers === 'object' ? (p.identifiers as Record<string, unknown>) : {};

  const coverage = {
    category: has((p) => p.categories.length > 0 || !!p.productType),
    url: has((p) => !!p.url),
    price: has((p) => p.priceMin != null && Number(p.priceMin) > 0),
    currency: has((p) => !!p.currency),
    availabilityKnown: has((p) => p.availability !== 'UNKNOWN'),
    identifiers: has((p) => !!(str(ids(p).gtin) || str(ids(p).barcode) || str(ids(p).mpn))),
    sku: has((p) => !!str(ids(p).sku)),
    descriptionLong: has((p) => descWords(p) >= 80),
    descriptionAny: has((p) => descWords(p) >= 20),
    image: has((p) => !!p.imageUrl),
    imageAlt: has((p) => !!p.imageAlt && p.imageAlt.trim().length >= 3),
    seoTitle: has((p) => !!p.seoTitle),
    seoDescription: has((p) => !!p.seoDescription && p.seoDescription.length >= 50),
    vendor: has((p) => !!p.vendor),
  };
  const tri = (r: number, good: number, mid: number): FindingStatus =>
    r >= good ? 'pass' : r >= mid ? 'warn' : 'fail';

  s.check(
    'catalogStructure',
    50,
    tri(coverage.category, 0.9, 0.6),
    'Kategori / ürün tipi ataması',
    {
      pass: `Ürünlerin ${pctLabel(coverage.category)}'ünde kategori veya ürün tipi var.`,
      fail: `Ürünlerin yalnızca ${pctLabel(coverage.category)}'ünde kategori/ürün tipi var.`,
    },
    { fix: 'Her ürüne kategori ve ürün tipi atayın.', topic: 'catalogStructure' },
  );
  s.check(
    'catalogStructure',
    50,
    tri(coverage.url, 0.95, 0.7),
    "Ürün URL'si",
    {
      pass: `Ürünlerin ${pctLabel(coverage.url)}'ünün herkese açık URL'si var.`,
      fail: `Ürünlerin ${pctLabel(coverage.url)}'ünün URL'si bilinmiyor (taslak/yayında değil?).`,
    },
    { fix: 'Ürünleri yayınlayın; URL üretilmeyen taslakları gözden geçirin.', topic: 'catalogStructure' },
  );

  s.check(
    'productSchema',
    25,
    tri(coverage.price, 0.95, 0.8),
    'Fiyat',
    { pass: `${pctLabel(coverage.price)} üründe fiyat var.`, fail: `${pctLabel(coverage.price)} üründe fiyat var.` },
    { fix: 'Fiyatı boş ürünleri düzeltin.', topic: 'pricing' },
  );
  s.check(
    'productSchema',
    15,
    tri(coverage.currency, 0.95, 0.8),
    'Para birimi',
    {
      pass: `${pctLabel(coverage.currency)} üründe para birimi var.`,
      fail: `${pctLabel(coverage.currency)} üründe para birimi var.`,
    },
    { fix: 'Mağaza para birimini doğrulayın.', topic: 'pricing' },
  );
  s.check(
    'productSchema',
    20,
    tri(coverage.availabilityKnown, 0.9, 0.6),
    'Stok durumu bilinen ürünler',
    {
      pass: `${pctLabel(coverage.availabilityKnown)} üründe stok durumu biliniyor.`,
      fail: `${pctLabel(1 - coverage.availabilityKnown)} üründe stok durumu bilinmiyor.`,
    },
    { fix: 'Stok takibini açın; bilinmeyen stok durumu AI cevaplarında belirsizlik yaratır.', topic: 'availability' },
  );
  s.check(
    'productSchema',
    25,
    tri(coverage.identifiers, 0.7, 0.3),
    'GTIN / barkod',
    {
      pass: `${pctLabel(coverage.identifiers)} üründe GTIN/barkod var.`,
      fail: `${pctLabel(coverage.identifiers)} üründe GTIN/barkod var.`,
    },
    { fix: 'Barkod/GTIN alanlarını doldurun.', topic: 'identifiers' },
  );
  s.check(
    'productSchema',
    15,
    tri(coverage.sku, 0.9, 0.5),
    'SKU',
    { pass: `${pctLabel(coverage.sku)} üründe SKU var.`, fail: `${pctLabel(coverage.sku)} üründe SKU var.` },
    { fix: 'SKU alanlarını doldurun.', topic: 'identifiers' },
  );

  s.check(
    'contentQuality',
    30,
    tri(coverage.descriptionLong, 0.7, 0.4),
    'Açıklama uzunluğu (≥80 kelime)',
    {
      pass: `${pctLabel(coverage.descriptionLong)} üründe 80+ kelime açıklama.`,
      fail: `Yalnızca ${pctLabel(coverage.descriptionLong)} üründe 80+ kelime açıklama; ${pctLabel(1 - coverage.descriptionAny)} üründe açıklama neredeyse yok.`,
    },
    { fix: 'Kısa/boş açıklamaları özgün metinle genişletin.', topic: 'description' },
  );
  s.check(
    'contentQuality',
    15,
    tri(coverage.image, 0.98, 0.9),
    'Ürün görseli',
    {
      pass: `${pctLabel(coverage.image)} üründe görsel var.`,
      fail: `${pctLabel(1 - coverage.image)} üründe görsel yok.`,
    },
    { fix: 'Görselsiz ürünlere görsel ekleyin.', topic: 'imageAlt' },
  );
  s.check(
    'contentQuality',
    20,
    tri(coverage.imageAlt, 0.7, 0.3),
    'Görsel alt metni',
    {
      pass: `${pctLabel(coverage.imageAlt)} üründe alt metin var.`,
      fail: `${pctLabel(coverage.imageAlt)} üründe alt metin var.`,
    },
    { fix: 'Ana görsellere açıklayıcı alt metin yazın.', topic: 'imageAlt' },
  );
  s.check(
    'contentQuality',
    15,
    tri(coverage.seoTitle, 0.7, 0.3),
    'SEO başlığı',
    {
      pass: `${pctLabel(coverage.seoTitle)} üründe SEO başlığı var.`,
      fail: `${pctLabel(coverage.seoTitle)} üründe SEO başlığı var.`,
    },
    { fix: 'Ürün SEO başlıklarını doldurun.', topic: 'title' },
  );
  s.check(
    'contentQuality',
    20,
    tri(coverage.seoDescription, 0.7, 0.3),
    'SEO açıklaması (≥50 karakter)',
    {
      pass: `${pctLabel(coverage.seoDescription)} üründe SEO açıklaması var.`,
      fail: `${pctLabel(coverage.seoDescription)} üründe SEO açıklaması var.`,
    },
    { fix: 'Ürün SEO açıklamalarını doldurun.', topic: 'metaDescription' },
  );

  s.check(
    'brandSignals',
    100,
    tri(coverage.vendor, 0.9, 0.5),
    'Marka / tedarikçi bilgisi',
    {
      pass: `${pctLabel(coverage.vendor)} üründe marka/vendor var.`,
      fail: `${pctLabel(coverage.vendor)} üründe marka/vendor var.`,
    },
    { fix: 'Her ürüne marka (vendor) atayın.', topic: 'productSchema' },
  );

  const findings = s.findings;
  const recommendations = recommendationsFrom(findings, CATALOG_AXES, (topic) => {
    const g = guideFor(platform, topic);
    return g ? { steps: g.steps, difficulty: g.difficulty } : null;
  });
  return {
    kind: 'CATALOG',
    productCount: n,
    sampleSize: n,
    score: s.total(),
    breakdown: s.breakdown(),
    axes: CATALOG_AXES,
    findings,
    recommendations,
    coverage: Object.fromEntries(Object.entries(coverage).map(([k, v]) => [k, Math.round(v * 1000) / 1000])),
    connections,
    computedAt: computedAt,
  };
}

const CATALOG_SAMPLE = 2000;

/** Tenant'ın bağlı kataloğu (deletedAt null) üzerinden veri kalitesi skoru. */
export async function runCommerceAuditFromCatalog(tenantId: string): Promise<CatalogReadinessResult> {
  const [conns, products, total] = await Promise.all([
    prisma.storeConnection.findMany({
      where: { tenantId, status: { not: 'DISCONNECTED' } },
      select: { id: true, provider: true, storeDomain: true, lastSyncAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.catalogProduct.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { syncedAt: 'desc' },
      take: CATALOG_SAMPLE,
      select: {
        title: true,
        description: true,
        imageUrl: true,
        imageAlt: true,
        seoTitle: true,
        seoDescription: true,
        identifiers: true,
        categories: true,
        productType: true,
        vendor: true,
        priceMin: true,
        currency: true,
        availability: true,
        url: true,
        status: true,
      },
    }),
    prisma.catalogProduct.count({ where: { tenantId, deletedAt: null } }),
  ]);
  const platform = (conns[0]?.provider ?? 'UNKNOWN') as PlatformDetection['platform'];
  const result = scoreCatalogProducts(
    products.map((p) => ({ ...p, priceMin: p.priceMin == null ? null : Number(p.priceMin) })),
    platform,
    conns.map((c) => ({
      id: c.id,
      provider: c.provider,
      storeDomain: c.storeDomain,
      lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
    })),
  );
  return { ...result, productCount: total, sampleSize: products.length };
}
