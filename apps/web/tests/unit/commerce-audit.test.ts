import { describe, expect, it } from 'vitest';
import {
  boilerplateRatio,
  checkProductSchema,
  classifyLinks,
  collectLinks,
  duplicateSentenceRatio,
  extractJsonLd,
  parseRobots,
  resolveBotAccess,
  tokenOverlap,
} from '@/server/commerce/html-analysis';
import {
  analyzeCommerce,
  COMMERCE_AXES,
  pickProductUrl,
  scoreCatalogProducts,
  type CommerceArtifacts,
} from '@/server/commerce/commerce-audit';
import { analyzeProductPage, PRODUCT_PAGE_AXES } from '@/server/commerce/product-page-audit';
import { analyzeCrawler, buildBotMatrix, CRAWLER_AXES } from '@/server/commerce/crawler-audit';
import type { Artifact } from '@/server/commerce/scoring';
import { buildRobotsSnippet } from '@/lib/robots-snippet';
import {
  GOOD_HOME,
  GOOD_LLMS,
  GOOD_PRODUCT,
  GOOD_ROBOTS,
  GOOD_SITEMAP,
  OPEN_ROBOTS,
  POOR_HOME,
  POOR_PRODUCT,
} from '../fixtures/commerce-html';

const FETCHED_AT = '2026-09-06T10:00:00.000Z';

function art(text: string, url: string, opts: Partial<Artifact> = {}): Artifact {
  return {
    ok: true,
    status: 200,
    text,
    url,
    headers: new Headers(),
    latencyMs: 320,
    truncated: false,
    redirects: [],
    ...opts,
  };
}
function missing(url: string): Artifact {
  return {
    ok: false,
    status: 404,
    text: '',
    url,
    headers: new Headers(),
    latencyMs: 80,
    truncated: false,
    redirects: [],
  };
}

const HOME = 'https://good-store.example/';
const PRODUCT = 'https://good-store.example/products/organik-pamuk-battaniye';

function goodArtifacts(overrides: Partial<CommerceArtifacts> = {}): CommerceArtifacts {
  return {
    url: HOME,
    home: art(GOOD_HOME, HOME),
    robots: art(GOOD_ROBOTS, `${HOME}robots.txt`),
    sitemap: art(GOOD_SITEMAP, `${HOME}sitemap.xml`),
    llms: art(GOOD_LLMS, `${HOME}llms.txt`),
    productsJson: art(
      JSON.stringify({ products: [{ handle: 'organik-pamuk-battaniye' }, { handle: 'zibin' }] }),
      `${HOME}products.json?limit=5`,
    ),
    productPage: art(GOOD_PRODUCT, PRODUCT),
    sampledProductUrl: PRODUCT,
    fetchedAt: FETCHED_AT,
    partial: false,
    ...overrides,
  };
}

function poorArtifacts(): CommerceArtifacts {
  const url = 'https://poor.example/';
  return {
    url,
    home: art(POOR_HOME, url, { latencyMs: 3400 }),
    robots: missing(`${url}robots.txt`),
    sitemap: missing(`${url}sitemap.xml`),
    llms: missing(`${url}llms.txt`),
    productsJson: null,
    productPage: null,
    sampledProductUrl: null,
    fetchedAt: FETCHED_AT,
    partial: false,
  };
}

describe('html-analysis — JSON-LD', () => {
  it('@graph, dizi ve bozuk blokları tolere eder', () => {
    const nodes = extractJsonLd(GOOD_HOME);
    expect(nodes.some((n) => n['@type'] === 'Organization')).toBe(true);
    expect(nodes.some((n) => n['@type'] === 'WebSite')).toBe(true);
    expect(nodes.some((n) => n['@type'] === 'FAQPage')).toBe(true);
    const broken = extractJsonLd(
      '<script type="application/ld+json">{oops</script><script type="application/ld+json">[{"@type":"Thing"}]</script>',
    );
    expect(broken).toHaveLength(1);
    expect(broken[0]?.['@type']).toBe('Thing');
  });

  it('Product şema alanlarını doğru işaretler', () => {
    const good = checkProductSchema(extractJsonLd(GOOD_PRODUCT));
    expect(good.present).toBe(true);
    expect(good).toMatchObject({
      name: true,
      description: true,
      image: true,
      brand: true,
      sku: true,
      gtin: true,
      price: true,
      priceCurrency: true,
      availability: true,
      offerUrl: true,
      aggregateRating: true,
    });
    const poor = checkProductSchema(extractJsonLd(POOR_PRODUCT));
    expect(poor.present).toBe(false);
    expect(poor.price).toBe(false);
  });
});

describe('html-analysis — robots.txt çözümleme (RFC 9309)', () => {
  const robots = parseRobots(GOOD_ROBOTS);

  it('grupları ve sitemap satırlarını ayrıştırır', () => {
    expect(robots.groups).toHaveLength(3);
    expect(robots.sitemaps).toEqual(['https://good-store.example/sitemap.xml']);
  });

  it('bot adına yazılmış grup * grubunu ezer', () => {
    const gpt = resolveBotAccess(robots, 'GPTBot', '/');
    expect(gpt).toMatchObject({ allowed: false, explicit: true, rule: 'Disallow: /' });
    const claude = resolveBotAccess(robots, 'ClaudeBot', '/');
    expect(claude).toMatchObject({ allowed: true, explicit: false, matchedAgent: '*' });
    expect(resolveBotAccess(robots, 'ClaudeBot', '/admin/x').allowed).toBe(false);
    expect(resolveBotAccess(robots, 'Google-Extended', '/products/a').allowed).toBe(false);
  });

  it('en uzun yol kazanır, eşitlikte Allow; joker ve $ desteklenir; boş Disallow kural değildir', () => {
    const r = parseRobots(`User-agent: *\nDisallow: /a\nAllow: /a/b\nDisallow: /a/b\nDisallow: /*.pdf$\nDisallow:\n`);
    expect(resolveBotAccess(r, 'GPTBot', '/a/x').allowed).toBe(false);
    expect(resolveBotAccess(r, 'GPTBot', '/a/b/c').allowed).toBe(true); // eşit uzunlukta Allow kazanır
    expect(resolveBotAccess(r, 'GPTBot', '/docs/file.pdf').allowed).toBe(false);
    expect(resolveBotAccess(r, 'GPTBot', '/docs/file.pdf?x=1').allowed).toBe(true);
    expect(resolveBotAccess(r, 'GPTBot', '/').allowed).toBe(true);
  });

  it('robots.txt yoksa herkes izinli; bot-agent token eşleşmesi büyük/küçük harf duyarsız', () => {
    const none = parseRobots('');
    expect(resolveBotAccess(none, 'PerplexityBot').matchedAgent).toBeNull();
    expect(resolveBotAccess(none, 'PerplexityBot').allowed).toBe(true);
    const lower = parseRobots('user-agent: perplexitybot\ndisallow: /\n');
    expect(resolveBotAccess(lower, 'PerplexityBot').allowed).toBe(false);
  });

  it('bot matrisi 12 satır üretir ve snippet yalnızca seçilen botları içerir', () => {
    const m = buildBotMatrix(GOOD_ROBOTS);
    expect(m).toHaveLength(12);
    expect(m.find((x) => x.bot === 'GPTBot')?.allowed).toBe(false);
    expect(m.find((x) => x.bot === 'Googlebot')?.allowed).toBe(true);
    const snippet = buildRobotsSnippet(['GPTBot', 'NotABot', 'ClaudeBot'], 'https://good-store.example/sitemap.xml');
    expect(snippet).toContain('User-agent: GPTBot\nAllow: /');
    expect(snippet).toContain('User-agent: ClaudeBot');
    expect(snippet).not.toContain('NotABot');
    expect(snippet).not.toMatch(/Disallow|Crawl-delay/);
    expect(buildRobotsSnippet([])).toBe('');
  });
});

describe('html-analysis — içerik sezgileri', () => {
  it('boilerplate ve tekrar oranları kötü sayfada daha yüksek', () => {
    expect(boilerplateRatio(POOR_PRODUCT)).toBeGreaterThan(boilerplateRatio(GOOD_PRODUCT));
    expect(boilerplateRatio(GOOD_PRODUCT)).toBeLessThan(0.45);
    const text =
      'Bu cümle yeterince uzun ve tekrar ediyor tamam mı. '.repeat(4) +
      'Farklı bir cümle burada yeterince uzun olsun. ';
    expect(duplicateSentenceRatio(text)).toBeGreaterThan(0.4);
    expect(duplicateSentenceRatio('Kısa.')).toBe(0);
  });

  it('bağlantı sınıflandırma ve başlık örtüşmesi', () => {
    const links = collectLinks(GOOD_HOME, HOME);
    const { products, collections } = classifyLinks(links);
    expect(products).toHaveLength(10);
    expect(collections).toHaveLength(4);
    expect(links.every((l) => l.startsWith('https://good-store.example/'))).toBe(true);
    expect(
      tokenOverlap('Organik Pamuk Bebek Battaniyesi', 'Organik Pamuk Bebek Battaniyesi — Good Store'),
    ).toBeGreaterThan(0.5);
    expect(tokenOverlap('Ürün', 'Tamamen alakasız başlık')).toBe(0);
  });

  it("pickProductUrl ana sayfa linkini, yoksa products.json handle'ını seçer", () => {
    expect(pickProductUrl(GOOD_HOME, HOME)).toBe('https://good-store.example/products/urun-1');
    expect(pickProductUrl('<html></html>', HOME, JSON.stringify({ products: [{ handle: 'abc' }] }))).toBe(
      'https://good-store.example/products/abc',
    );
    expect(pickProductUrl('<html></html>', HOME, '{bad')).toBeNull();
  });
});

describe('commerce-audit — mağaza skoru', () => {
  it('eksen ağırlıkları 100 eder ve sonuçla birlikte döner', () => {
    expect(COMMERCE_AXES.reduce((s, a) => s + a.weight, 0)).toBe(100);
    expect(PRODUCT_PAGE_AXES.reduce((s, a) => s + a.weight, 0)).toBe(100);
    expect(CRAWLER_AXES.reduce((s, a) => s + a.weight, 0)).toBe(100);
    expect(analyzeCommerce(goodArtifacts()).axes).toEqual(COMMERCE_AXES);
  });

  it('deterministik: aynı girdi aynı çıktı', () => {
    const a = analyzeCommerce(goodArtifacts());
    const b = analyzeCommerce(goodArtifacts());
    expect(a).toEqual(b);
  });

  it('iyi mağaza yüksek, JS-bağımlı şemasız mağaza düşük puan alır', () => {
    const good = analyzeCommerce(goodArtifacts());
    const poor = analyzeCommerce(poorArtifacts());
    expect(good.score).toBeGreaterThanOrEqual(75);
    expect(poor.score).toBeLessThan(35);
    expect(good.platform.platform).toBe('SHOPIFY');
    expect(good.platform.connectorAvailable).toBe(true);
    expect(good.sampledProductUrl).toBe(PRODUCT);
    expect(good.stats.productLinks).toBe(10);
    expect(good.stats.sampledProducts).toBe(2);
    expect(good.breakdown.productSchema).toBeGreaterThanOrEqual(90);
    expect(poor.breakdown.productSchema).toBe(0);
    expect(poor.findings.some((f) => f.title === 'noindex işareti' && f.status === 'fail')).toBe(true);
    expect(poor.findings.some((f) => f.title === 'JS bağımlılığı' && f.status === 'fail')).toBe(true);
    expect(poor.platform.platform).toBe('UNKNOWN');
  });

  it('AI bot engelleri bulguya kanıt olarak yazılır; açık robots ile skor yükselir', () => {
    const blocked = analyzeCommerce(goodArtifacts());
    const f = blocked.findings.find((x) => x.title === 'AI crawler erişimi');
    expect(f?.status).toBe('warn');
    expect(f?.evidence).toContain('GPTBot');
    expect(f?.evidence).toContain('Google-Extended');
    expect(blocked.stats.aiBotsAllowed).toBe(8);
    const open = analyzeCommerce(goodArtifacts({ robots: art(OPEN_ROBOTS, `${HOME}robots.txt`) }));
    expect(open.breakdown.aiCrawlability).toBeGreaterThan(blocked.breakdown.aiCrawlability);
    expect(open.stats.aiBotsAllowed).toBe(10);
  });

  it('ürün sayfası çekilemezse eksen düşer ve öneri üretilir', () => {
    const r = analyzeCommerce(goodArtifacts({ productPage: missing(PRODUCT) }));
    expect(r.breakdown.productSchema).toBe(0);
    expect(r.findings.find((f) => f.title === 'Ürün sayfası örneklenemedi')?.detail).toContain('HTTP 404');
    expect(r.recommendations.length).toBeGreaterThan(0);
    expect(r.recommendations[0]?.steps?.length ?? 0).toBeGreaterThan(0); // Shopify rehberi
  });

  it('ana sayfa çekilemezse çökmez, düşük skor ve erişim notu döner', () => {
    const r = analyzeCommerce(poorArtifacts());
    const dead = analyzeCommerce({
      ...poorArtifacts(),
      home: { ...missing('https://dead.example/'), status: 0, error: 'network' },
    });
    expect(dead.score).toBeLessThan(r.score + 20);
    expect(dead.findings.some((f) => f.title === 'Ana sayfa çekilemedi')).toBe(true);
  });
});

describe('product-page-audit', () => {
  it('iyi ürün sayfası yüksek, kötü düşük; deterministik', () => {
    const good = analyzeProductPage({
      url: PRODUCT,
      page: art(GOOD_PRODUCT, PRODUCT),
      robots: art(OPEN_ROBOTS, `${HOME}robots.txt`),
      fetchedAt: FETCHED_AT,
    });
    const poorUrl = 'https://poor.example/p/1';
    const poor = analyzeProductPage({
      url: poorUrl,
      page: art(POOR_PRODUCT, poorUrl),
      robots: null,
      fetchedAt: FETCHED_AT,
    });
    expect(good.score).toBeGreaterThanOrEqual(80);
    expect(poor.score).toBeLessThan(35);
    expect(good.product).toMatchObject({
      name: 'Organik Pamuk Bebek Battaniyesi',
      price: '899.90',
      currency: 'TRY',
      availability: 'InStock',
      brand: 'Good Store',
    });
    expect(good.stats.imagesWithAlt).toBe(2);
    expect(good.stats.tableRows).toBeGreaterThanOrEqual(3);
    expect(poor.findings.find((f) => f.title === 'Tek H1')?.status).toBe('warn');
    expect(poor.findings.find((f) => f.title === 'Özgün içerik payı (boilerplate oranı)')?.status).not.toBe('pass');
    expect(
      analyzeProductPage({ url: PRODUCT, page: art(GOOD_PRODUCT, PRODUCT), robots: null, fetchedAt: FETCHED_AT }),
    ).toEqual(
      analyzeProductPage({ url: PRODUCT, page: art(GOOD_PRODUCT, PRODUCT), robots: null, fetchedAt: FETCHED_AT }),
    );
  });

  it('robots.txt ürün yolunu engelliyorsa indekslenebilirlik düşer', () => {
    const blocked = parseRobots(`User-agent: *\nDisallow: /products/\n`);
    void blocked;
    const r = analyzeProductPage({
      url: PRODUCT,
      page: art(GOOD_PRODUCT, PRODUCT),
      robots: art(`User-agent: *\nDisallow: /products/\n`, `${HOME}robots.txt`),
      fetchedAt: FETCHED_AT,
    });
    expect(r.findings.find((f) => f.title === 'robots.txt — Googlebot')?.status).toBe('fail');
    expect(r.findings.find((f) => f.title === 'robots.txt — AI botları')?.status).toBe('fail');
  });
});

describe('crawler-audit', () => {
  it('matris, yönlendirme zinciri ve başlıklar sonuçta yer alır', () => {
    const page = art(GOOD_HOME, HOME, {
      redirects: [{ from: 'https://www.good-store.example/', to: HOME, status: 301 }],
    });
    page.headers.set('x-robots-tag', 'all');
    const r = analyzeCrawler({
      url: 'https://www.good-store.example/',
      page,
      robots: art(GOOD_ROBOTS, `${HOME}robots.txt`),
      sitemap: art(GOOD_SITEMAP, `${HOME}sitemap.xml`),
      llms: art(GOOD_LLMS, `${HOME}llms.txt`),
      httpVariant: art('', 'https://good-store.example/', {
        redirects: [{ from: 'http://good-store.example/', to: HOME, status: 301 }],
      }),
      fetchedAt: FETCHED_AT,
    });
    expect(r.matrix).toHaveLength(12);
    expect(r.matrix.find((m) => m.bot === 'GPTBot')?.allowed).toBe(false);
    expect(r.matrix.find((m) => m.bot === 'OAI-SearchBot')?.allowed).toBe(true);
    expect(r.robotsFound).toBe(true);
    expect(r.declaredSitemaps).toEqual(['https://good-store.example/sitemap.xml']);
    expect(r.redirects).toHaveLength(1);
    expect(r.findings.find((f) => f.title === 'Yönlendirme zinciri')?.status).toBe('warn');
    expect(r.findings.find((f) => f.title === 'HTTP → HTTPS yönlendirmesi')?.status).toBe('pass');
    expect(r.headers.xRobotsTag).toBe('all');
    expect(r.score).toBeGreaterThanOrEqual(70);
  });

  it('robots yokken herkes izinli ama keşfedilebilirlik düşer; noindex hata', () => {
    const url = 'https://poor.example/';
    const r = analyzeCrawler({
      url,
      page: art(POOR_HOME, url, { latencyMs: 2800 }),
      robots: missing(`${url}robots.txt`),
      sitemap: missing(`${url}sitemap.xml`),
      llms: missing(`${url}llms.txt`),
      httpVariant: null,
      fetchedAt: FETCHED_AT,
    });
    expect(r.robotsFound).toBe(false);
    expect(r.matrix.every((m) => m.allowed)).toBe(true);
    expect(r.breakdown.access).toBe(100);
    expect(r.breakdown.discoverability).toBeLessThan(30);
    expect(r.findings.find((f) => f.title === 'Meta robots')?.status).toBe('fail');
    expect(r.findings.find((f) => f.title === 'JS-only içerik uyarısı')?.status).toBe('fail');
  });
});

describe('scoreCatalogProducts — bağlı katalog veri kalitesi', () => {
  const full = Array.from({ length: 20 }, (_, i) => ({
    title: `Ürün ${i}`,
    description: 'Bu ürün için yeterince uzun bir açıklama metni. '.repeat(12),
    imageUrl: 'https://x/img.jpg',
    imageAlt: 'Ürün görseli açıklaması',
    seoTitle: 'SEO başlık',
    seoDescription: 'Yeterince uzun bir SEO açıklaması metni burada yer alıyor, elli karakteri geçiyor.',
    identifiers: { sku: `SKU-${i}`, gtin: '8690000000012' },
    categories: ['Bebek'],
    productType: 'Battaniye',
    vendor: 'Good Store',
    priceMin: 100 + i,
    currency: 'TRY',
    availability: 'IN_STOCK' as const,
    url: `https://x/products/${i}`,
  }));

  it('boş katalog 0 puan + not; dolu katalog yüksek puan', () => {
    const empty = scoreCatalogProducts([]);
    expect(empty.score).toBe(0);
    expect(empty.productCount).toBe(0);
    expect(empty.findings[0]?.title).toBe('Katalog boş');
    const good = scoreCatalogProducts(full, 'SHOPIFY');
    expect(good.score).toBeGreaterThanOrEqual(95);
    expect(Object.keys(good.breakdown).sort()).toEqual([
      'brandSignals',
      'catalogStructure',
      'contentQuality',
      'productSchema',
    ]);
    expect(good.coverage.identifiers).toBe(1);
  });

  it('eksik alanlar kapsama oranına göre bulgu üretir', () => {
    const weak = full.map((p, i) => ({
      ...p,
      identifiers: null,
      imageAlt: null,
      availability: i % 2 ? ('UNKNOWN' as const) : ('IN_STOCK' as const),
      description: 'kısa',
    }));
    const r = scoreCatalogProducts(weak, 'IKAS');
    expect(r.score).toBeLessThan(70);
    expect(r.findings.find((f) => f.title === 'GTIN / barkod')?.status).toBe('fail');
    expect(r.findings.find((f) => f.title === 'Stok durumu bilinen ürünler')?.status).toBe('fail');
    expect(r.findings.find((f) => f.title === 'Açıklama uzunluğu (≥80 kelime)')?.status).toBe('fail');
    expect(r.recommendations.some((x) => x.steps?.some((s) => /ikas/i.test(s)))).toBe(true);
  });
});
