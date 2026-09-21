/**
 * PREP-B çekirdeği uçtan uca: defineSiteTool (2 eksenli mini motor, collectPageArtifact + quickChecks) →
 * handlePublicScan (test-only route; kalıcı route eklenmez) → 200 zarf (verdict/stats/reportUrl), 2. istek cache,
 * yasaklı site 200 {blocked} + fetch 0, UA/Accept-Language başlıkları, WAF hükmü, SSRF 400.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { call, prisma } from './helpers';
import {
  GOOD_LLMS,
  GOOD_PAGE,
  GOOD_ROBOTS,
  GOOD_SITEMAP,
  GOOD_URL,
  POOR_PAGE,
  WAF_PAGE,
} from '../fixtures/site-html-core';

const net = vi.hoisted(() => ({ calls: [] as { url: string; method: string; headers: Record<string, string> }[] }));

vi.mock('@/server/safe-fetch', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    safeFetch: async (rawUrl: string, init: { method?: string; headers?: Record<string, string> } = {}) => {
      net.calls.push({ url: rawUrl, method: init.method ?? 'GET', headers: init.headers ?? {} });
      const u = new URL(rawUrl);
      const body = (
        text: string,
        type = 'text/html; charset=utf-8',
        status = 200,
        headers: Record<string, string> = {},
      ) => ({
        status,
        ok: status < 400,
        url: rawUrl,
        headers: new Headers({ 'content-type': type, ...headers }),
        text,
        truncated: false,
        redirects: [],
      });
      if (u.hostname === 'korumali.example') return body(WAF_PAGE, 'text/html', 403, { server: 'cloudflare' });
      if (u.hostname === 'zayif.example') return body(POOR_PAGE);
      if (u.pathname === '/robots.txt') return body(GOOD_ROBOTS, 'text/plain');
      if (u.pathname === '/sitemap.xml') return body(GOOD_SITEMAP, 'application/xml');
      if (u.pathname === '/llms.txt') return body(GOOD_LLMS, 'text/plain');
      if (u.pathname === '/img/og.jpg') return body('', 'image/jpeg', 200, { 'content-length': '120000' });
      if (u.pathname === '/' || u.pathname === '') return body(GOOD_PAGE);
      return body('<html><body>Bulunamadı</body></html>', 'text/html', 404);
    },
  };
});

import { handlePublicScan } from '@/server/commerce/public-scan';
import { defineSiteTool, verdictLine } from '@/server/site-scan/core';
import { collectPageArtifact, headResource, SCAN_UA, type PageArtifact } from '@/server/site-scan/fetch-page';
import { quickChecks } from '@/server/site-scan/quick-checks';
import type { HeadResult } from '@/server/site-scan/budget';
import { clearBlocklistCache } from '@/server/blocklist';
import { verifyReportToken } from '@/server/report-token';
import { route } from '@/server/route';
import { siteUrl } from '@/server/env';

type Axis = 'identity' | 'shareability';
type Artifacts = { page: PageArtifact; ogHead: HeadResult | null };

/** Test-only mini araç (ONPAGE_SEO türünü ödünç alır; gerçek seo-karnesi W1'de). */
const miniTool = defineSiteTool<Axis, Artifacts, { checks: { key: string; status: string }[] }>({
  kind: 'ONPAGE_SEO',
  budget: { maxRequests: 4 }, // registry varsayılanı 3 (seo-karnesi); mini araç 4 istek yapar
  axes: [
    { key: 'identity', label: 'Kimlik', weight: 50, description: 'title, description, Organization' },
    { key: 'shareability', label: 'Paylaşılabilirlik', weight: 50, description: 'og:image, H1' },
  ],
  collect: async (url, budget) => {
    const page = await collectPageArtifact(url, budget, { robots: true, llms: true });
    const og = page.og['image'];
    const ogHead = og && /^https?:\/\//.test(og) ? await headResource(og, 4000, budget) : null;
    return { page, ogHead };
  },
  analyze: ({ page, ogHead }, s) => {
    const qc = quickChecks(page, { ogHead });
    const st = (k: string) => qc.find((c) => c.key === k)!.status;
    s.check(
      'identity',
      40,
      st('title'),
      'Title',
      { pass: 'var', fail: 'yok', warn: 'uzunluk' },
      { fix: 'Title yazın', topic: 'title' },
    );
    s.check(
      'identity',
      30,
      st('description'),
      'Açıklama',
      { pass: 'var', fail: 'yok' },
      { fix: 'Açıklama yazın', topic: 'metaDescription' },
    );
    s.check(
      'identity',
      30,
      st('organizationSchema'),
      'Organization',
      { pass: 'var', fail: 'yok' },
      { fix: 'Şema ekleyin', topic: 'organizationSchema' },
    );
    s.check(
      'shareability',
      60,
      st('ogImageAbsolute'),
      'og:image',
      { pass: 'var', fail: 'yok', warn: 'http' },
      { fix: 'og:image düzeltin', topic: 'ogImage' },
    );
    s.check(
      'shareability',
      40,
      st('h1'),
      'H1',
      { pass: 'tek', fail: 'yok', warn: 'çoklu' },
      { fix: 'Tek H1', topic: 'h1' },
    );
    return { page, extra: { checks: qc.map((c) => ({ key: c.key, status: c.status })) } };
  },
});

const handler = route('tools.test_mini', async (req) => handlePublicScan(req, miniTool.kind, miniTool.run));

type Env = {
  cached: boolean;
  scanId?: string;
  reportToken?: string;
  reportUrl?: string;
  score?: number;
  verdict?: { fail: number; warn: number; pass: number };
  stats?: { requests: number; bytes: number; ms: number };
  waf?: boolean;
  partial?: boolean;
  hostname?: string;
  extra?: { checks: { key: string; status: string }[] };
  blocked?: boolean;
  redirectUrl?: string;
  findings?: unknown[];
};

beforeEach(() => {
  net.calls.length = 0;
  clearBlocklistCache();
});

describe('site-scan çekirdeği + handlePublicScan', () => {
  it('200: verdict/stats/extra zarfta; reportToken doğrulanır; YanitBot UA ve tr-TR her istekte; Lead yazılır', async () => {
    const r = await call(handler, {
      method: 'POST',
      body: { url: 'iyi-site.example' },
      headers: { 'x-forwarded-for': '198.51.100.201' },
    });
    expect(r.status).toBe(200);
    const j = r.json as unknown as Env;
    expect(j.cached).toBe(false);
    expect(j.hostname).toBe('iyi-site.example');
    expect(j.score).toBeGreaterThanOrEqual(90);
    expect(j.verdict).toEqual({ fail: 0, warn: 0, pass: 5 });
    expect(verdictLine(j as never)).toBe('0 kritik, 0 uyarı, 5 tamam');
    expect(j.stats?.requests).toBe(4); // sayfa + robots + llms + og HEAD
    expect(j.stats?.bytes).toBeGreaterThan(1000);
    expect(j.extra?.checks).toHaveLength(14);
    expect(j.waf).toBe(false);
    expect(j.partial).toBe(false);
    expect(verifyReportToken(j.reportToken)).toBe(j.scanId);
    expect(j.reportUrl).toBe(`${siteUrl()}/rapor/${j.reportToken}`);

    expect(net.calls).toHaveLength(4);
    for (const c of net.calls) {
      expect(c.headers['User-Agent']).toBe(SCAN_UA);
      expect(c.headers['Accept-Language']).toMatch(/^tr-TR/);
    }
    expect(net.calls.find((c) => c.url.endsWith('/img/og.jpg'))?.method).toBe('HEAD');

    const scan = await prisma.publicScan.findUniqueOrThrow({ where: { id: j.scanId! } });
    expect(scan.kind).toBe('ONPAGE_SEO');
    expect(scan.partial).toBe(false);
    expect(scan.meta).toEqual({ waf: false, partial: false });
    const lead = await prisma.lead.findUniqueOrThrow({ where: { hostname: 'iyi-site.example' } });
    expect(lead.scanCount).toBe(1);
    expect(lead.kinds).toEqual(['ONPAGE_SEO']);
  });

  it('2. istek 24 saat önbellekten: cached:true, aynı token, fetch 0, scanCount 2', async () => {
    await call(handler, { method: 'POST', body: { url: GOOD_URL }, headers: { 'x-forwarded-for': '198.51.100.202' } });
    const first = (await prisma.publicScan.findFirstOrThrow({ where: { hostname: 'iyi-site.example' } })).id;
    net.calls.length = 0;
    const r = await call(handler, {
      method: 'POST',
      body: { url: 'https://iyi-site.example/?utm_source=x' },
      headers: { 'x-forwarded-for': '198.51.100.203' },
    });
    const j = r.json as unknown as Env;
    expect(j.cached).toBe(true);
    expect(j.scanId).toBe(first);
    expect(j.verdict).toEqual({ fail: 0, warn: 0, pass: 5 });
    expect(net.calls).toHaveLength(0);
    expect((await prisma.lead.findUniqueOrThrow({ where: { hostname: 'iyi-site.example' } })).scanCount).toBe(2);
  });

  it('zayıf sayfa: kritik bulgular ve öneriler; GOOD > POOR', async () => {
    const r = await call(handler, {
      method: 'POST',
      body: { url: 'zayif.example' },
      headers: { 'x-forwarded-for': '198.51.100.204' },
    });
    const j = r.json as unknown as Env;
    expect(r.status).toBe(200);
    expect(j.score).toBeLessThan(40);
    expect(j.verdict!.fail).toBeGreaterThanOrEqual(3);
    expect(verdictLine(j as never)).toMatch(/kritik/);
  });

  it('WAF (403 + cloudflare): 200 döner, waf:true, hüküm "taranamadı", meta.waf persist', async () => {
    const r = await call(handler, {
      method: 'POST',
      body: { url: 'korumali.example' },
      headers: { 'x-forwarded-for': '198.51.100.205' },
    });
    const j = r.json as unknown as Env;
    expect(r.status).toBe(200);
    expect(j.waf).toBe(true);
    expect(verdictLine(j as never)).toBe('Bot koruması nedeniyle taranamadı');
    const scan = await prisma.publicScan.findFirstOrThrow({ where: { hostname: 'korumali.example' } });
    expect(scan.meta).toMatchObject({ waf: true });
  });

  it('yasaklı site: 200 {blocked, redirectUrl}; fetch 0; PublicScan/Lead yok', async () => {
    await prisma.blockedSite.create({
      data: { hostname: 'engelli.example', redirectUrl: 'https://www.youtube.com/watch?v=x' },
    });
    const r = await call(handler, {
      method: 'POST',
      body: { url: 'https://shop.engelli.example/' },
      headers: { 'x-forwarded-for': '198.51.100.206' },
    });
    expect(r.status).toBe(200);
    expect(r.json as unknown as Env).toEqual({ blocked: true, redirectUrl: 'https://www.youtube.com/watch?v=x' });
    expect(net.calls).toHaveLength(0);
    expect(await prisma.publicScan.count()).toBe(0);
    expect(await prisma.lead.count()).toBe(0);
  });

  it('bütçe dolunca reddedilen istek partial:true yapar; tam kullanılan bütçe partial değildir', async () => {
    const tight = defineSiteTool<Axis, Artifacts, undefined>({
      kind: 'ONPAGE_SEO',
      budget: { maxRequests: 2 },
      axes: miniTool.axes,
      collect: miniTool.collect,
      analyze: ({ page }, s) => {
        s.check('identity', 100, !!page.title, 'Title', { pass: 'var', fail: 'yok' });
        s.check('shareability', 100, !!page.og['image'], 'og', { pass: 'var', fail: 'yok' });
        return { page };
      },
    });
    const r = await tight.run(GOOD_URL, {});
    expect(r.stats.requests).toBe(2);
    expect(r.partial).toBe(true);
    const exact = await miniTool.run(GOOD_URL, {});
    expect(exact.stats.requests).toBe(4);
    expect(exact.partial).toBe(false);
  });

  it('SSRF: özel adresler 400, fetch 0', async () => {
    for (const url of [
      'http://127.0.0.1/',
      'http://localhost/',
      'http://169.254.169.254/',
      'http://10.0.0.5/',
      'http://[::1]/',
    ]) {
      const r = await call(handler, {
        method: 'POST',
        body: { url },
        headers: { 'x-forwarded-for': '198.51.100.207' },
      });
      expect(r.status, url).toBe(400);
    }
    expect(net.calls).toHaveLength(0);
  });

  it('yanıtta ham IP / visitorHash / sır yok', async () => {
    const r = await call(handler, {
      method: 'POST',
      body: { url: 'iyi-site.example' },
      headers: { 'x-forwarded-for': '198.51.100.208' },
    });
    expect(r.text).not.toMatch(/198\.51\.100|visitorHash|postgres|secret|sk-/i);
    expect((r.json as unknown as Env).findings?.length).toBe(5);
  });
});
