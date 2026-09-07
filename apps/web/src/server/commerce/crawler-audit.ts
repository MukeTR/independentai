/**
 * AI Crawler Testi — bir sayfanın AI botları ve arama motorları tarafından erişilebilirliğini,
 * indekslenebilirliğini ve keşfedilebilirliğini ölçer; bot-bazlı robots.txt matrisi üretir.
 *
 * Eksenler ve ağırlıklar (docs/COMMERCE_SCORING.md):
 *   access 30 · indexability 25 · discoverability 20 · performance 15 · renderability 10
 *
 * robots.txt çözümlemesi RFC 9309'a göre: bot için en spesifik user-agent grubu; Allow/Disallow'da
 * en uzun yol eşleşmesi (eşitlikte Allow). Snippet üretimi istemcide, yalnızca kullanıcının
 * seçtiği botlar için standart Allow satırlarıyla yapılır (lib/robots-snippet.ts).
 */
import { detectPlatform, PLATFORM_LABELS, type PlatformDetection } from './platform-detect';
import { guideFor } from './guides';
import {
  AI_BOTS,
  canonicalOf,
  hreflangCount,
  hostnameOf,
  jsDependencyHint,
  metaRobots,
  originOf,
  parseRobots,
  resolveBotAccess,
  sameHost,
  textRatio,
  htmlToText,
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
  type Recommendation,
} from './scoring';

export type CrawlerAxis = 'access' | 'indexability' | 'discoverability' | 'performance' | 'renderability';

export const CRAWLER_AXES: AxisSpec<CrawlerAxis>[] = assertWeights([
  {
    key: 'access',
    label: 'Bot erişimi',
    weight: 30,
    description: 'robots.txt matrisi: AI botları, cevap motorları, arama botları',
  },
  {
    key: 'indexability',
    label: 'İndekslenebilirlik',
    weight: 25,
    description: 'Durum kodu, meta robots / X-Robots-Tag, canonical',
  },
  {
    key: 'discoverability',
    label: 'Keşfedilebilirlik',
    weight: 20,
    description: 'robots.txt, sitemap bildirimi ve erişimi, llms.txt',
  },
  {
    key: 'performance',
    label: 'Performans',
    weight: 15,
    description: 'Yanıt süresi, HTML boyutu, yönlendirme zinciri, HTTP→HTTPS',
  },
  {
    key: 'renderability',
    label: 'Render edilebilirlik',
    weight: 10,
    description: 'Metin/HTML oranı, JS bağımlılığı, hreflang',
  },
]);

const ANSWER_ENGINES = ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot'];

export type BotMatrixRow = {
  bot: string;
  owner: string;
  purpose: string;
  kind: 'ai' | 'search';
  allowed: boolean;
  /** Bot adına yazılmış özel grup var */
  explicit: boolean;
  rule: string | null;
  matchedAgent: string | null;
};

export type CrawlerArtifacts = {
  url: string;
  page: Artifact;
  robots: Artifact | null;
  sitemap: Artifact | null;
  llms: Artifact | null;
  /** http:// sürümü (yalnızca istenen URL https ise) — HTTP→HTTPS yönlendirmesi kontrolü */
  httpVariant: Artifact | null;
  fetchedAt: string;
};

export type CrawlerAuditResult = {
  kind: 'CRAWLER';
  url: string;
  finalUrl: string;
  hostname: string;
  platform: PlatformDetection & { label: string };
  score: number;
  breakdown: Record<CrawlerAxis, number>;
  axes: AxisSpec<CrawlerAxis>[];
  findings: CommerceFinding[];
  recommendations: Recommendation[];
  matrix: BotMatrixRow[];
  robotsFound: boolean;
  /** robots.txt'te Sitemap: satırları */
  declaredSitemaps: string[];
  redirects: { from: string; to: string; status: number }[];
  headers: { xRobotsTag: string | null; contentType: string | null; cacheControl: string | null };
  fetchedAt: string;
  partial: boolean;
  stats: {
    status: number;
    latencyMs: number;
    htmlBytes: number;
    textRatio: number;
    wordCount: number;
    hreflang: number;
    aiBotsAllowed: number;
    aiBotsTotal: number;
  };
};

export function buildBotMatrix(robotsText: string | null, path = '/'): BotMatrixRow[] {
  const robots = robotsText != null ? parseRobots(robotsText) : null;
  return AI_BOTS.map((b) => {
    const r = robots
      ? resolveBotAccess(robots, b.name, path)
      : { allowed: true, explicit: false, rule: null, matchedAgent: null };
    return { bot: b.name, owner: b.owner, purpose: b.purpose, kind: b.kind, ...r };
  });
}

export function analyzeCrawler(a: CrawlerArtifacts): CrawlerAuditResult {
  const s = new Scorer<CrawlerAxis>(CRAWLER_AXES);
  const page = a.page;
  const html = page.text;
  const finalUrl = page.url || a.url;
  const reachable = page.ok && html.length > 0;
  const platform = detectPlatform(html, page.headers, finalUrl);
  const path = (() => {
    try {
      const u = new URL(finalUrl);
      return u.pathname + u.search;
    } catch {
      return '/';
    }
  })();

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

  // ── access ──
  const robotsFound = !!a.robots?.ok && !/<html/i.test(a.robots.text.slice(0, 300));
  const robots = robotsFound ? parseRobots(a.robots!.text) : null;
  const matrix = buildBotMatrix(robotsFound ? a.robots!.text : null, path);
  const ai = matrix.filter((m) => m.kind === 'ai');
  const aiBlocked = ai.filter((m) => !m.allowed).map((m) => m.bot);
  s.check(
    'access',
    50,
    aiBlocked.length === 0 ? 'pass' : ai.length - aiBlocked.length >= 7 ? 'warn' : 'fail',
    'AI botları erişimi',
    {
      pass: `${ai.length} AI botunun tümü bu yola erişebilir.`,
      warn: `Engelli AI botları: ${aiBlocked.join(', ')}.`,
      fail: `${aiBlocked.length}/${ai.length} AI botu engelli: ${aiBlocked.join(', ')}.`,
    },
    {
      fix: "İstediğiniz AI botlarına robots.txt'te izin verin.",
      evidence: aiBlocked.join(', ') || undefined,
      topic: 'robots',
    },
  );
  const answerBlocked = matrix.filter((m) => ANSWER_ENGINES.includes(m.bot) && !m.allowed).map((m) => m.bot);
  s.check(
    'access',
    30,
    answerBlocked.length === 0,
    'Cevap motorları (alıntı botları)',
    {
      pass: 'OAI-SearchBot, ChatGPT-User, PerplexityBot ve ClaudeBot erişebilir.',
      fail: `Alıntı botları engelli: ${answerBlocked.join(', ')} — sayfanız AI cevaplarında kaynak gösterilemez.`,
    },
    {
      fix: 'En azından cevap motoru botlarına Allow: / verin.',
      evidence: answerBlocked.join(', ') || undefined,
      topic: 'robots',
    },
  );
  const searchBlocked = matrix.filter((m) => m.kind === 'search' && !m.allowed).map((m) => m.bot);
  s.check(
    'access',
    20,
    searchBlocked.length === 0,
    'Arama botları (Googlebot, Bingbot)',
    { pass: 'Googlebot ve Bingbot erişebilir.', fail: `Engelli arama botları: ${searchBlocked.join(', ')}.` },
    {
      fix: 'Arama botlarını engelleyen kuralları kaldırın.',
      evidence: searchBlocked.join(', ') || undefined,
      topic: 'robots',
    },
  );

  // ── indexability ──
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
    { fix: 'Sayfa 200 döndürmeli.', evidence: `HTTP ${page.status}` },
  );
  const xRobots = page.headers.get('x-robots-tag');
  if (reachable) {
    const robotsMeta = metaRobots(html) ?? '';
    s.check(
      'indexability',
      25,
      !/noindex/i.test(robotsMeta),
      'Meta robots',
      {
        pass: robotsMeta ? `meta robots: ${robotsMeta}` : 'noindex yok.',
        fail: `meta robots noindex içeriyor (${robotsMeta}).`,
      },
      { fix: 'noindex değerini kaldırın.', topic: 'noindex' },
    );
    s.check(
      'indexability',
      15,
      !/noindex/i.test(xRobots ?? ''),
      'X-Robots-Tag başlığı',
      {
        pass: xRobots ? `X-Robots-Tag: ${xRobots}` : 'X-Robots-Tag yok (sorun değil).',
        fail: `X-Robots-Tag noindex içeriyor (${xRobots}).`,
      },
      { fix: "Sunucu başlığındaki noindex'i kaldırın.", topic: 'noindex' },
    );
    const canonical = canonicalOf(html);
    let canonicalSelf = false;
    if (canonical) {
      try {
        const c = new URL(canonical, finalUrl);
        const f = new URL(finalUrl);
        canonicalSelf =
          c.hostname.replace(/^www\./, '') === f.hostname.replace(/^www\./, '') &&
          c.pathname.replace(/\/$/, '') === f.pathname.replace(/\/$/, '');
      } catch {
        canonicalSelf = false;
      }
    }
    s.check(
      'indexability',
      20,
      canonical ? (sameHost(canonical, finalUrl) ? 'pass' : 'warn') : 'fail',
      'Canonical',
      { pass: 'Canonical mevcut.', warn: 'Canonical başka bir alan adına işaret ediyor.', fail: 'Canonical yok.' },
      { fix: 'Kendine işaret eden canonical ekleyin.', evidence: canonical ?? undefined, topic: 'canonical' },
    );
    if (canonical) {
      s.check(
        'indexability',
        15,
        canonicalSelf ? 'pass' : 'warn',
        'Canonical bu sayfayı gösteriyor',
        {
          pass: 'Canonical kendine işaret ediyor.',
          warn: 'Canonical farklı bir sayfaya işaret ediyor — bu sayfa indekslenmeyecek olabilir (kasıtlıysa sorun değil).',
          fail: '',
        },
        { fix: 'Bu sayfanın kanonik sürüm olduğundan emin olun.', evidence: canonical, topic: 'canonical' },
      );
    }
  }

  // ── discoverability ──
  const declaredSitemaps = robots?.sitemaps ?? [];
  s.check(
    'discoverability',
    25,
    robotsFound ? 'pass' : a.robots && a.robots.status === 404 ? 'warn' : 'fail',
    'robots.txt',
    {
      pass: `robots.txt erişilebilir (${robots?.groups.length ?? 0} grup).`,
      warn: 'robots.txt yok (varsayılan izinli; sitemap bildirimi de yok).',
      fail: 'robots.txt çekilemedi.',
    },
    { fix: 'Sitemap satırı içeren robots.txt yayınlayın.', topic: 'robots' },
  );
  s.check(
    'discoverability',
    20,
    declaredSitemaps.length > 0,
    "robots.txt'te Sitemap satırı",
    { pass: `${declaredSitemaps.length} sitemap bildirilmiş.`, fail: "robots.txt'te Sitemap: satırı yok." },
    { fix: "robots.txt'e Sitemap: satırı ekleyin.", evidence: declaredSitemaps[0], topic: 'sitemap' },
  );
  const sitemapOk = !!a.sitemap?.ok && /<(urlset|sitemapindex)\b/i.test(a.sitemap.text);
  s.check(
    'discoverability',
    30,
    sitemapOk ? 'pass' : a.sitemap?.status === 200 ? 'warn' : 'fail',
    'Sitemap erişimi',
    {
      pass: `Sitemap erişilebilir (${(a.sitemap!.text.match(/<loc>/gi) || []).length} <loc>).`,
      warn: 'Sitemap yanıt verdi ama geçerli XML değil.',
      fail: 'Sitemap bulunamadı.',
    },
    { fix: 'sitemap.xml yayınlayın.', evidence: a.sitemap?.url, topic: 'sitemap' },
  );
  s.check(
    'discoverability',
    25,
    !!a.llms?.ok && a.llms.text.trim().length > 20 && !/<html/i.test(a.llms.text.slice(0, 500)),
    'llms.txt',
    { pass: 'llms.txt bulundu.', fail: 'llms.txt yok.' },
    { fix: 'Kök dizine llms.txt ekleyin.', topic: 'llmsTxt' },
  );

  // ── performance ──
  s.check(
    'performance',
    40,
    page.latencyMs < 1000 ? 'pass' : page.latencyMs < 2500 ? 'warn' : 'fail',
    'Yanıt süresi',
    {
      pass: `${ms(page.latencyMs)}.`,
      warn: `${ms(page.latencyMs)}; 1 sn altı hedefleyin.`,
      fail: `${ms(page.latencyMs)} — çok yavaş.`,
    },
    { fix: 'CDN/önbellek ile yanıt süresini düşürün.', evidence: ms(page.latencyMs), topic: 'performance' },
  );
  const bytes = Buffer.byteLength(html, 'utf8');
  if (reachable) {
    s.check(
      'performance',
      25,
      bytes < 500_000 ? 'pass' : bytes < 1_500_000 ? 'warn' : 'fail',
      'HTML boyutu',
      {
        pass: `${Math.round(bytes / 1024)} KB.`,
        warn: `${Math.round(bytes / 1024)} KB; 500 KB altı hedefleyin.`,
        fail: `${Math.round(bytes / 1024)} KB — çok büyük${page.truncated ? " (2 MB'ta kesildi)" : ''}.`,
      },
      { fix: 'Satır içi betik/stil ve gereksiz işaretlemeyi azaltın.', topic: 'performance' },
    );
  }
  const hops = page.redirects.length;
  s.check(
    'performance',
    20,
    hops === 0 ? 'pass' : hops === 1 ? 'warn' : 'fail',
    'Yönlendirme zinciri',
    {
      pass: 'Yönlendirme yok.',
      warn: `1 yönlendirme: ${page.redirects[0]?.status} → ${page.redirects[0]?.to}`,
      fail: `${hops} yönlendirme adımı — zinciri tek 301'e indirin.`,
    },
    {
      fix: 'Yönlendirme zincirini kısaltın.',
      evidence: page.redirects.map((r) => `${r.status} ${r.from} → ${r.to}`).join(' | ') || undefined,
      topic: 'redirects',
    },
  );
  if (a.httpVariant) {
    const toHttps =
      a.httpVariant.redirects.some((r) => r.to.startsWith('https://')) || a.httpVariant.url.startsWith('https://');
    s.check(
      'performance',
      15,
      toHttps ? 'pass' : a.httpVariant.error ? 'warn' : 'fail',
      'HTTP → HTTPS yönlendirmesi',
      {
        pass: 'http:// istekleri https:// sürüme yönleniyor.',
        warn: 'http:// sürümü yanıt vermedi (port kapalı olabilir; sorun değil).',
        fail: "http:// sürümü HTTPS'e yönlenmiyor — çift içerik riski.",
      },
      { fix: "HTTP'yi 301 ile HTTPS'e yönlendirin.", topic: 'https' },
    );
  }

  // ── renderability ──
  const ratio = reachable ? textRatio(html) : 0;
  const words = reachable ? wordCount(htmlToText(html)) : 0;
  const hl = reachable ? hreflangCount(html) : 0;
  if (reachable) {
    s.check(
      'renderability',
      40,
      ratio >= 0.1 ? 'pass' : ratio >= 0.04 ? 'warn' : 'fail',
      'Metin / HTML oranı',
      {
        pass: `%${Math.round(ratio * 100)} (${words} kelime).`,
        warn: `%${Math.round(ratio * 100)} (${words} kelime); HTML şişkin veya içerik JS ile geliyor.`,
        fail: `%${Math.round(ratio * 100)} (${words} kelime) — içerik büyük olasılıkla JS ile render ediliyor.`,
      },
      { fix: "Kritik içeriği HTML'de sunun.", topic: 'jsRendering' },
    );
    s.check(
      'renderability',
      35,
      !jsDependencyHint(html),
      'JS-only içerik uyarısı',
      {
        pass: 'İçerik ilk HTML yanıtında mevcut.',
        fail: 'Sayfa SPA kökü/JS uyarısı taşıyor ve çok az görünür metin içeriyor; çoğu AI crawler JS çalıştırmaz.',
      },
      { fix: 'SSR/SSG kullanın.', topic: 'jsRendering' },
    );
    s.check(
      'renderability',
      25,
      hl > 0 ? 'pass' : 'warn',
      'hreflang',
      { pass: `${hl} hreflang alternatifi.`, warn: 'hreflang yok (tek dilli sitede gerekmez).', fail: 'hreflang yok.' },
      { fix: 'Çok dilli ise hreflang ekleyin.', topic: 'hreflang' },
    );
  }

  const findings = s.findings;
  const recommendations = recommendationsFrom(findings, CRAWLER_AXES, (topic) => {
    const g = guideFor(platform.platform, topic);
    return g ? { steps: g.steps, difficulty: g.difficulty } : null;
  });

  return {
    kind: 'CRAWLER',
    url: a.url,
    finalUrl,
    hostname: hostnameOf(finalUrl) || hostnameOf(a.url),
    platform: { ...platform, label: PLATFORM_LABELS[platform.platform] },
    score: s.total(),
    breakdown: s.breakdown(),
    axes: CRAWLER_AXES,
    findings,
    recommendations,
    matrix,
    robotsFound,
    declaredSitemaps,
    redirects: page.redirects,
    headers: {
      xRobotsTag: xRobots,
      contentType: page.headers.get('content-type'),
      cacheControl: page.headers.get('cache-control'),
    },
    fetchedAt: a.fetchedAt,
    partial: false,
    stats: {
      status: page.status,
      latencyMs: page.latencyMs,
      htmlBytes: bytes,
      textRatio: Math.round(ratio * 1000) / 1000,
      wordCount: words,
      hreflang: hl,
      aiBotsAllowed: ai.length - aiBlocked.length,
      aiBotsTotal: ai.length,
    },
  };
}

export async function collectCrawlerArtifacts(url: string): Promise<CrawlerArtifacts> {
  const fetchedAt = new Date().toISOString();
  const origin = originOf(url);
  const isHttps = url.startsWith('https://');
  const [page, robots, llms, sitemap, httpVariant] = await Promise.all([
    fetchArtifact(url, 12_000),
    origin ? fetchArtifact(`${origin}/robots.txt`, 6_000) : Promise.resolve(null),
    origin ? fetchArtifact(`${origin}/llms.txt`, 5_000) : Promise.resolve(null),
    origin ? fetchArtifact(`${origin}/sitemap.xml`, 6_000) : Promise.resolve(null),
    isHttps && origin ? fetchArtifact(url.replace(/^https:/, 'http:'), 6_000) : Promise.resolve(null),
  ]);
  let finalSitemap = sitemap;
  // robots'ta bildirilen farklı bir sitemap varsa ve /sitemap.xml yoksa onu dene (kısa bütçe)
  if (robots?.ok && !(sitemap?.ok && /<(urlset|sitemapindex)\b/i.test(sitemap.text))) {
    const declared = parseRobots(robots.text).sitemaps.find((sm) => sameHost(sm, url));
    if (declared && declared !== `${origin}/sitemap.xml`) {
      const r = await fetchArtifact(declared, 5_000);
      if (r.ok) finalSitemap = r;
    }
  }
  return { url, page, robots, sitemap: finalSitemap, llms, httpVariant, fetchedAt };
}

export async function runCrawlerAudit(url: string): Promise<CrawlerAuditResult> {
  return analyzeCrawler(await collectCrawlerArtifacts(url));
}
