import { describe, expect, it, vi } from 'vitest';
import {
  GOOD_LLMS,
  GOOD_PAGE,
  GOOD_ROBOTS,
  GOOD_URL,
  POOR_PAGE,
  POOR_URL,
  WAF_PAGE,
  WAF_URL,
  pageOf,
} from '../fixtures/site-html-core';
import {
  BUDGET_MS,
  budgetDefaultsFor,
  defineSiteTool,
  newBudget,
  verdictLine,
  verdictOf,
} from '@/server/site-scan/core';
import { ScanBudget } from '@/server/site-scan/budget';
import type { PageArtifact } from '@/server/site-scan/fetch-page';
import { quickChecks } from '@/server/site-scan/quick-checks';
import { GUIDE_TOPICS, guideFor } from '@/server/commerce/guides';
import { PUBLIC_SCAN_LIMITS } from '@/server/commerce/public-scan';
import type { Scorer } from '@/server/commerce/scoring';

type Axis = 'identity' | 'technical';
const AXES = [
  { key: 'identity' as const, label: 'Kimlik', weight: 60, description: 'title, description, Organization' },
  { key: 'technical' as const, label: 'Teknik', weight: 40, description: 'https, viewport, lang' },
];

/** Test motoru: quickChecks üzerinden 2 eksen. */
function analyzeMini(page: PageArtifact, s: Scorer<Axis>) {
  const qc = Object.fromEntries(quickChecks(page).map((c) => [c.key, c]));
  const fix = (t: string) => ({ fix: `${t} düzeltin`, topic: 'title' });
  s.check('identity', 40, qc.title!.status, 'Title', { pass: 'var', fail: 'yok', warn: 'uzunluk' }, fix('Title'));
  s.check('identity', 30, qc.description!.status, 'Meta açıklama', { pass: 'var', fail: 'yok' }, fix('Açıklama'));
  s.check(
    'identity',
    30,
    qc.organizationSchema!.status,
    'Organization',
    { pass: 'var', fail: 'yok' },
    {
      fix: 'Organization ekleyin',
      topic: 'organizationSchema',
    },
  );
  s.check('technical', 50, qc.https!.status, 'HTTPS', { pass: 'var', fail: 'yok' }, { fix: 'HTTPS', topic: 'https' });
  s.check(
    'technical',
    30,
    qc.viewport!.status,
    'Viewport',
    { pass: 'var', fail: 'yok' },
    { fix: 'Viewport', topic: 'title' },
  );
  s.check(
    'technical',
    20,
    qc.lang!.status,
    'lang',
    { pass: 'var', fail: 'yok', warn: 'yok' },
    { fix: 'lang', topic: 'charset' },
  );
  s.note('technical', 'Bilgi', 'puanlanmaz', 'warn');
  return { page, extra: { checks: Object.keys(qc).length } };
}

const collectCalls: { url: string; budget: ScanBudget }[] = [];
const tool = defineSiteTool<Axis, PageArtifact, { checks: number }>({
  kind: 'ONPAGE_SEO',
  axes: AXES,
  collect: async (url, budget) => {
    collectCalls.push({ url, budget });
    await budget.fetch(url, 1000); // mock'lanmadı → gerçek fetchArtifact yok; aşağıda vi.mock ile kesilir
    return pageOf(url, url === POOR_URL ? POOR_PAGE : GOOD_PAGE, { robots: GOOD_ROBOTS, llms: GOOD_LLMS });
  },
  analyze: analyzeMini,
});

vi.mock('@/server/safe-fetch', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    safeFetch: async (rawUrl: string) => ({
      status: 200,
      ok: true,
      url: rawUrl,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: '<html></html>',
      truncated: false,
      redirects: [],
    }),
  };
});

describe('defineSiteTool.analyze (saf)', () => {
  it('GOOD > POOR; sonuç şekli handlePublicScan ile uyumlu; verdict ve verdictLine', () => {
    const good = tool.analyze(pageOf(GOOD_URL, GOOD_PAGE, { robots: GOOD_ROBOTS, llms: GOOD_LLMS }), { url: GOOD_URL });
    const poor = tool.analyze(pageOf(POOR_URL, POOR_PAGE), { url: POOR_URL });
    expect(good.score).toBeGreaterThan(poor.score);
    expect(good.kind).toBe('ONPAGE_SEO');
    expect(good.url).toBe(GOOD_URL);
    expect(good.finalUrl).toBe(GOOD_URL);
    expect(good.hostname).toBe('iyi-site.example');
    expect(good.platform.label).toBeTruthy();
    expect(Object.keys(good.breakdown).sort()).toEqual(['identity', 'technical']);
    expect(good.axes.reduce((a, x) => a + x.weight, 0)).toBe(100);
    expect(good.verdict).toEqual({ fail: 0, warn: 0, pass: 6 }); // not (weight 0) sayılmaz
    expect(verdictLine(good)).toBe('0 kritik, 0 uyarı, 6 tamam');
    expect(good.findings).toHaveLength(7);
    expect(good.recommendations).toEqual([]);
    expect(good.extra).toEqual({ checks: 14 });
    expect(good.waf).toBe(false);
    expect(good.legacyCharset).toBe(false);
    expect(good.partial).toBe(false);
    expect(good.stats).toEqual({ requests: 0, bytes: 0, ms: 0 });
    expect(good.fetchedAt).toBe('2026-09-21T00:00:00.000Z');

    expect(poor.verdict.fail).toBeGreaterThanOrEqual(4);
    expect(verdictLine(poor)).toMatch(/^\d+ kritik, \d+ uyarı, \d+ tamam$/);
    expect(poor.recommendations.length).toBeGreaterThan(0);
    expect(poor.recommendations[0]!.title).toBe('Title düzeltin');
    const org = poor.recommendations.find((r) => r.title === 'Organization ekleyin');
    expect(org?.steps?.length).toBeGreaterThan(0); // guideFor(organizationSchema)
  });

  it('WAF sayfası: waf:true, hüküm "taranamadı"', () => {
    const r = tool.analyze(pageOf(WAF_URL, WAF_PAGE, { status: 403, headers: { server: 'cloudflare' } }), {
      url: WAF_URL,
    });
    expect(r.waf).toBe(true);
    expect(verdictLine(r)).toBe('Bot koruması nedeniyle taranamadı');
  });

  it('bütçe istatistiği ve partial (exhausted) sonuca yansır; input taşınır', () => {
    const r = tool.analyze(pageOf(GOOD_URL, GOOD_PAGE), {
      url: GOOD_URL,
      input: { sector: 'klinik' },
      budget: { requests: 3, bytes: 12_000, ms: 800, exhausted: true, reason: 'requests', skipped: 1 },
    });
    expect(r.stats).toEqual({ requests: 3, bytes: 12_000, ms: 800 });
    expect(r.partial).toBe(true);
    expect(r.input).toEqual({ sector: 'klinik' });
    // bütçe tam kullanıldı ama hiçbir istek reddedilmedi → partial değil
    const full = tool.analyze(pageOf(GOOD_URL, GOOD_PAGE), {
      url: GOOD_URL,
      budget: { requests: 3, bytes: 12_000, ms: 800, exhausted: true, reason: 'requests', skipped: 0 },
    });
    expect(full.partial).toBe(false);
  });

  it('ağırlık toplamı 100 değilse tanım hata verir', () => {
    expect(() =>
      defineSiteTool({
        kind: 'ONPAGE_SEO',
        axes: [{ key: 'a', label: 'A', weight: 50, description: '' }],
        collect: async () => null,
        analyze: () => ({}),
      }),
    ).toThrow(/100/);
  });

  it('onlyAxes ile skor yeniden normalize edilir (ör. TLS ölçülemedi)', () => {
    const t = defineSiteTool<Axis, null, undefined>({
      kind: 'SECURITY_HEADERS',
      axes: AXES,
      collect: async () => null,
      analyze: (_a, s) => {
        s.check('identity', 10, true, 'x', { pass: 'p', fail: 'f' });
        s.check('technical', 10, false, 'y', { pass: 'p', fail: 'f' });
        return { onlyAxes: ['identity'], finalUrl: 'https://x.example/', hostname: 'x.example' };
      },
    });
    const r = t.analyze(null, { url: 'https://x.example/' });
    expect(r.score).toBe(100);
    expect(r.breakdown.technical).toBe(0);
  });
});

describe('defineSiteTool.run (bütçe + collect + analyze)', () => {
  it('run bütçe yaratır, collect’e verir, stats.requests sayar; varsayılan bütçe registry’den', async () => {
    collectCalls.length = 0;
    const r = await tool.run(GOOD_URL, {});
    expect(collectCalls).toHaveLength(1);
    expect(collectCalls[0]!.budget).toBeInstanceOf(ScanBudget);
    expect(collectCalls[0]!.budget.maxRequests).toBe(3); // seo-karnesi budgetRequests
    expect(r.stats.requests).toBe(1);
    expect(r.stats.ms).toBeGreaterThanOrEqual(0);
    expect(r.partial).toBe(false);
    expect(r.score).toBeGreaterThan(50);
    expect(tool.budgetDefaults).toEqual({ maxRequests: 3, maxBytes: 5 * 1024 * 1024, ms: 15_000, perHost: 4 });
  });

  it('budgetDefaultsFor / newBudget / BUDGET_MS her kind için tanımlı', () => {
    for (const kind of Object.keys(PUBLIC_SCAN_LIMITS) as (keyof typeof PUBLIC_SCAN_LIMITS)[]) {
      expect(BUDGET_MS[kind]).toBeGreaterThan(0);
      expect(BUDGET_MS[kind]).toBeLessThanOrEqual(25_000);
      const d = budgetDefaultsFor(kind);
      expect(d.maxRequests).toBeGreaterThan(0);
      const b = newBudget(kind);
      expect(b.remainingMs).toBeGreaterThan(d.ms - 100);
    }
    expect(budgetDefaultsFor('BROKEN_LINKS').maxRequests).toBe(120);
  });
});

describe('verdictOf / guides', () => {
  it('verdictOf yalnız puanlı bulguları sayar', () => {
    expect(
      verdictOf([
        { status: 'fail', weight: 10 },
        { status: 'warn', weight: 0 },
        { status: 'pass', weight: 5 },
        { status: 'warn' },
      ]),
    ).toEqual({ fail: 1, warn: 1, pass: 1 });
  });
  it('11 yeni rehber konusu tanımlı ve Türkçe adımlı', () => {
    const topics = [
      'ogImage',
      'socialMeta',
      'securityHeaders',
      'tls',
      'redirectChain',
      'brokenLinks',
      'sitemapHealth',
      'trustSignals',
      'questionCoverage',
      'languageSignals',
      'charset',
    ];
    for (const t of topics) {
      expect(GUIDE_TOPICS).toContain(t);
      const g = guideFor('UNKNOWN', t);
      expect(g?.steps.length, t).toBeGreaterThan(0);
      expect(g?.title, t).toBeTruthy();
    }
    expect(GUIDE_TOPICS.length).toBe(37);
  });
});
