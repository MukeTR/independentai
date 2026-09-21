import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GOOD_LLMS,
  GOOD_PAGE,
  GOOD_ROBOTS,
  GOOD_SITEMAP,
  GOOD_URL,
  LEGACY_PAGE,
  LEGACY_URL,
  POOR_PAGE,
  POOR_URL,
  WAF_PAGE,
  WAF_URL,
  artifact,
  pageOf,
} from '../fixtures/site-html-core';

const net = vi.hoisted(() => ({
  calls: [] as { url: string; headers: Record<string, string> }[],
  routes: {} as Record<string, { text: string; type?: string; status?: number }>,
}));

vi.mock('@/server/safe-fetch', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    safeFetch: async (rawUrl: string, init: { headers?: Record<string, string> } = {}) => {
      net.calls.push({ url: rawUrl, headers: init.headers ?? {} });
      const u = new URL(rawUrl);
      const r = net.routes[u.pathname] ?? { text: '<html><body>yok</body></html>', status: 404 };
      const status = r.status ?? 200;
      return {
        status,
        ok: status < 400,
        url: rawUrl,
        headers: new Headers({ 'content-type': r.type ?? 'text/html; charset=utf-8' }),
        text: r.text,
        truncated: false,
        redirects: [],
      };
    },
  };
});

import { ScanBudget } from '@/server/site-scan/budget';
import { extractJsonLd, headings, htmlToText, metaRobots, titleOf } from '@/server/commerce/html-analysis';
import {
  LINK_TEXT_MAX,
  PARSE_LIMIT,
  SCAN_UA,
  collectPageArtifact,
  collectPageLinks,
  detectCharset,
  detectWaf,
  headResource,
  parseMetaTags,
  parsePage,
} from '@/server/site-scan/fetch-page';

beforeEach(() => {
  net.calls.length = 0;
  net.routes = {};
});

describe('parsePage — GOOD', () => {
  const p = pageOf(GOOD_URL, GOOD_PAGE, { robots: GOOD_ROBOTS, llms: GOOD_LLMS, sitemap: GOOD_SITEMAP });
  it('temel alanlar', () => {
    expect(p.reachable).toBe(true);
    expect(p.hostname).toBe('iyi-site.example');
    expect(p.origin).toBe('https://iyi-site.example');
    expect(p.path).toBe('/');
    expect(p.title).toMatch(/^İyi Site/);
    expect(p.metaTags['description']).toMatch(/ISO 9001/);
    expect(p.canonical).toBe('https://iyi-site.example/');
    expect(p.lang).toBe('tr');
    expect(p.viewport).toBe(true);
    expect(p.charset).toBe('utf-8');
    expect(p.legacyCharset).toBe(false);
    expect(p.waf).toBe(false);
    expect(p.sizeBytes).toBeGreaterThan(1000);
    expect(p.fetchedAt).toBe('2026-09-21T00:00:00.000Z');
  });
  it('og/twitter/jsonLd/headings', () => {
    expect(p.og['image']).toBe('https://iyi-site.example/img/og.jpg');
    expect(p.og['locale']).toBe('tr_TR');
    expect(p.twitter['card']).toBe('summary_large_image');
    expect(p.jsonLd.map((n) => n['@type'])).toEqual(['Organization', 'WebSite']);
    expect(p.headings.h1).toEqual(['Endüstriyel mutfak ekipmanı üreticisi']);
    expect(p.headings.h2).toHaveLength(2);
    expect(p.headings.h3).toHaveLength(1);
  });
  it('linkler: mailto/tel atlanır, iç/dış ayrımı ve rel', () => {
    const internal = p.links.filter((l) => l.internal).map((l) => new URL(l.url).pathname);
    expect(internal).toEqual(expect.arrayContaining(['/', '/urunler', '/hakkimizda', '/iletisim', '/kvkk']));
    const ext = p.links.find((l) => !l.internal);
    expect(ext?.url).toBe('https://www.linkedin.com/company/iyi-site');
    expect(ext?.rel).toBe('nofollow noopener');
    expect(p.links.some((l) => /^(mailto|tel):/.test(l.url))).toBe(false);
  });
  it('robots/llms/sitemap artefaktları taşınır', () => {
    expect(p.robots?.ok).toBe(true);
    expect(p.llms?.text).toMatch(/İyi Site/);
    expect(p.sitemap?.text).toMatch(/urlset/);
  });
});

describe('parsePage — POOR / WAF / LEGACY', () => {
  it('POOR: title yok, göreli og:image, 2 H1, lang yok, http', () => {
    const p = pageOf(POOR_URL, POOR_PAGE);
    expect(p.title).toBeNull();
    expect(p.og['image']).toBe('/img/og.png');
    expect(p.headings.h1).toHaveLength(2);
    expect(p.lang).toBeNull();
    expect(p.viewport).toBe(false);
    expect(p.finalUrl).toMatch(/^http:/);
  });
  it('WAF: 403 + challenge gövdesi ⇒ waf:true, reachable:false', () => {
    const p = pageOf(WAF_URL, WAF_PAGE, { status: 403, headers: { server: 'cloudflare' } });
    expect(p.waf).toBe(true);
    expect(p.reachable).toBe(false);
  });
  it('WAF: 200 normal sayfa waf değil; 403 imzasız da waf değil', () => {
    expect(pageOf(GOOD_URL, GOOD_PAGE).waf).toBe(false);
    expect(pageOf(GOOD_URL, '<html><body>Yasak</body></html>', { status: 403 }).waf).toBe(false);
    expect(detectWaf(503, new Headers({ 'cf-ray': 'abc' }), '')).toBe(true);
    expect(detectWaf(200, new Headers({ 'cf-mitigated': 'challenge' }), '')).toBe(true);
  });
  it('LEGACY: meta http-equiv windows-1254 ⇒ legacyCharset:true; gövde yeniden çözümlenmez', () => {
    const p = pageOf(LEGACY_URL, LEGACY_PAGE, { headers: { 'content-type': 'text/html' } });
    expect(p.charset).toBe('windows-1254');
    expect(p.legacyCharset).toBe(true);
    expect(p.title).toMatch(/Eski Site/);
  });
});

describe('detectCharset / parseMetaTags', () => {
  it.each([
    ['text/html; charset=UTF-8', '', 'utf-8', false],
    ['text/html; charset=ISO-8859-9', '', 'iso-8859-9', true],
    ['text/html', '<meta charset="windows-1254">', 'windows-1254', true],
    ['text/html', '<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-9">', 'iso-8859-9', true],
    ['text/html', '<meta charset=utf-8>', 'utf-8', false],
    [null, '<html></html>', null, false],
  ])('%s + %s → %s legacy=%s', (ct, html, charset, legacy) => {
    expect(detectCharset(ct, html)).toEqual({ charset, legacy });
  });
  it('öznitelik sırası bağımsız; ilk değer kazanır; entity çözülür', () => {
    const m = parseMetaTags(
      '<meta content="A &amp; B" property="og:title"><meta property="og:title" content="ikinci"><meta name="Description" content="x">',
    );
    expect(m['og:title']).toBe('A & B');
    expect(m['description']).toBe('x');
  });
  it('collectPageLinks fragment/javascript atlar ve tekilleştirir', () => {
    const links = collectPageLinks(
      '<a href="#top">x</a><a href="javascript:void(0)">y</a><a href="/a">A</a><a href="/a#f">A2</a><a href="https://dis.example/">D</a>',
      'https://iyi-site.example/',
    );
    expect(links.map((l) => l.url)).toEqual(['https://iyi-site.example/a', 'https://dis.example/']);
  });
});

describe('collectPageLinks — kapanmamış / iç içe anchor', () => {
  it('kapanışı olmayan ve iç içe anchor’lar da href verir; metin </a>’ya kadar ve en çok 120 karakter', () => {
    const links = collectPageLinks(
      '<a href="/bir">Bir<a href="/iki">İki</a> <a href="/uc">' + 'u'.repeat(300) + '</a><a href="/dort">Dört',
      'https://iyi-site.example/',
    );
    expect(links.map((l) => new URL(l.url).pathname)).toEqual(['/bir', '/iki', '/uc', '/dort']);
    expect(links[0]?.text).toBe('Bir İki');
    expect(links[1]?.text).toBe('İki');
    expect(links[2]?.text).toHaveLength(120);
    expect(links[3]?.text).toBe('Dört');
  });
  it('öznitelik listesi 2 000 karakteri aşan etiket atlanır; PARSE_LIMIT sonrası okunmaz', () => {
    const big = `<a href="/x" data-x="${'x'.repeat(2100)}">X</a><a href="/y">Y</a>`;
    expect(collectPageLinks(big, 'https://a.example/').map((l) => new URL(l.url).pathname)).toEqual(['/y']);
    const late = ' '.repeat(PARSE_LIMIT) + '<a href="/gec">geç</a>';
    expect(collectPageLinks(late, 'https://a.example/')).toEqual([]);
    expect(LINK_TEXT_MAX).toBe(2000);
  });
});

describe('düşmanca HTML — süre sınırı (karesel regex yok; Brifing §D.4)', () => {
  const MB = 1024 * 1024;
  const rep = (s: string, bytes: number) => s.repeat(Math.ceil(bytes / s.length));
  const U = 'https://kotu.example/';
  const cases: [string, string][] = [
    ['2 MB kapanmamış <a href>', rep('<a href="/x">', 2 * MB)],
    ['2 MB > içermeyen <a href', rep('<a href="/x" ', 2 * MB)],
    ['2 MB > içermeyen <meta', rep('<meta ', 2 * MB)],
    ['2 MB > içermeyen <link', rep('<link rel="canonical" ', 2 * MB)],
    ['2 MB kapanmamış <h1>', rep('<h1>', 2 * MB)],
    ['2 MB kapanmamış <title>', rep('<title>', 2 * MB)],
    ['2 MB kapanmamış ld+json', rep('<script type="application/ld+json">', 2 * MB)],
    ['2 MB kapanmamış <script>', rep('<script>', 2 * MB)],
    ['2 MB kapanmamış yorum', rep('<!--', 2 * MB)],
    ['2 MB yalnız <', rep('<', 2 * MB)],
    ['2 MB > içermeyen <html', rep('<html ', 2 * MB)],
    ['2 MB > içermeyen <h1', rep('<h1 ', 2 * MB)],
    ['2 MB > içermeyen <h2 ', rep('<h2 ', 2 * MB)],
    ['2 MB > içermeyen <img', rep('<img ', 2 * MB)],
    ['2 MB > içermeyen ld+json script', rep('<script type="application/ld+json" ', 2 * MB)],
    ['2 MB > içermeyen <title', rep('<title ', 2 * MB)],
    ['2 MB karışık kapanmamış', rep('<a href="/x"><meta name="x" content="y"><h1><script>', 2 * MB)],
  ];
  it.each(cases)('%s → parsePage < 1 500 ms', (_label, html) => {
    const t = performance.now();
    const p = parsePage(U, artifact(U, html));
    expect(performance.now() - t).toBeLessThan(1500);
    expect(p.reachable).toBe(true);
  });
  it('tek tek ayrıştırıcılar 2 MB düşmanca girdide < 500 ms (eski: 15–55 s)', () => {
    const anchors = rep('<a href="/x">', 2 * MB);
    const metas = rep('<meta ', 2 * MB);
    const h1s = rep('<h1>', 2 * MB);
    const checks: [string, () => unknown][] = [
      ['collectPageLinks', () => collectPageLinks(anchors, U)],
      ['collectPageLinks no >', () => collectPageLinks(rep('<a href="/x" ', 2 * MB), U)],
      ['parseMetaTags', () => parseMetaTags(metas)],
      ['metaRobots', () => metaRobots(metas)],
      ['headings', () => headings(h1s, 1)],
      ['titleOf', () => titleOf(rep('<title>', 2 * MB))],
      ['extractJsonLd', () => extractJsonLd(rep('<script type="application/ld+json">', 2 * MB))],
      ['htmlToText', () => htmlToText(rep('<script>', 2 * MB))],
    ];
    for (const [label, fn] of checks) {
      const t = performance.now();
      fn();
      expect(performance.now() - t, label).toBeLessThan(500);
    }
  });
});

describe('collectPageArtifact (mock ağ)', () => {
  it('YanitBot UA + Accept-Language tr-TR ile sayfa/robots/llms/sitemap paralel çekilir; bütçe sayar', async () => {
    net.routes = {
      '/': { text: GOOD_PAGE },
      '/robots.txt': { text: GOOD_ROBOTS, type: 'text/plain' },
      '/llms.txt': { text: GOOD_LLMS, type: 'text/plain' },
      '/sitemap.xml': { text: GOOD_SITEMAP, type: 'application/xml' },
    };
    const b = new ScanBudget({ maxRequests: 10, maxBytes: 1_000_000, deadlineAt: Date.now() + 5000 });
    const p = await collectPageArtifact(GOOD_URL, b, { robots: true, llms: true, sitemap: true });
    expect(p.reachable).toBe(true);
    expect(p.robots?.ok).toBe(true);
    expect(p.llms?.ok).toBe(true);
    expect(p.sitemap?.ok).toBe(true);
    expect(net.calls.length).toBe(4);
    for (const c of net.calls) {
      expect(c.headers['User-Agent']).toBe(SCAN_UA);
      expect(c.headers['Accept-Language']).toMatch(/^tr-TR/);
    }
    expect(SCAN_UA).toMatch(/^YanitBot\/1\.0 \(\+https?:\/\/.+\/bot\)$/);
    expect(b.stats().requests).toBe(4);
  });

  it('yalnız sayfa istenirse tek istek; robots’ta bildirilen farklı sitemap denenir', async () => {
    net.routes = {
      '/': { text: GOOD_PAGE },
      '/robots.txt': {
        text: 'User-agent: *\nAllow: /\nSitemap: https://iyi-site.example/sm/ana.xml\n',
        type: 'text/plain',
      },
      '/sm/ana.xml': { text: GOOD_SITEMAP, type: 'application/xml' },
    };
    const b = new ScanBudget({ maxRequests: 10, maxBytes: 1_000_000, deadlineAt: Date.now() + 5000 });
    const only = await collectPageArtifact(GOOD_URL, b);
    expect(net.calls.length).toBe(1);
    expect(only.robots).toBeNull();
    net.calls.length = 0;
    const p = await collectPageArtifact(GOOD_URL, b, { robots: true, sitemap: true });
    expect(net.calls.map((c) => new URL(c.url).pathname).sort()).toEqual([
      '/',
      '/robots.txt',
      '/sitemap.xml',
      '/sm/ana.xml',
    ]);
    expect(p.sitemap?.ok).toBe(true);
    expect(p.sitemap?.url).toContain('/sm/ana.xml');
  });

  it('bütçe doluysa sayfa artefaktı error budget ile döner (reachable false)', async () => {
    const b = new ScanBudget({ maxRequests: 1, maxBytes: 1_000_000, deadlineAt: Date.now() - 1 });
    const p = await collectPageArtifact(GOOD_URL, b);
    expect(p.page.error).toBe('budget');
    expect(p.reachable).toBe(false);
    expect(net.calls.length).toBe(0);
  });

  it('headResource bütçesiz de çalışır (geçici tek istek)', async () => {
    net.routes = { '/og.jpg': { text: '', type: 'image/jpeg' } };
    const h = await headResource('https://iyi-site.example/og.jpg', 1000);
    expect(h.status).toBe(200);
    expect(h.contentType).toBe('image/jpeg');
  });

  it('artifact() fixture yardımcısı error taşır', () => {
    expect(artifact('https://x.example/', '', { status: 0, error: 'timeout' }).error).toBe('timeout');
    expect(
      parsePage('https://x.example/', artifact('https://x.example/', '', { status: 0, error: 'timeout' })).reachable,
    ).toBe(false);
  });
});
