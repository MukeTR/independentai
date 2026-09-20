/**
 * /rapor — resolveReport + GET /api/rapor/[token]: kayıtlı sonuçtan (ağ 0), bilinmeyen/bozuk 404, süresi dolmuş 410,
 * JSON'da gizli alan yok, cache-hit aynı reportUrl, yasaklı host → blocked, views++ best-effort, IP limiti 61. istek 429.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { call, flushAfter, prisma } from './helpers';
import { GOOD_HOME, GOOD_ROBOTS, GOOD_SITEMAP, GOOD_LLMS } from '../fixtures/commerce-html';

const fetchCalls: string[] = [];

vi.mock('@/server/safe-fetch', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    safeFetch: async (rawUrl: string) => {
      fetchCalls.push(rawUrl);
      const u = new URL(rawUrl);
      const body = (text: string, type = 'text/html; charset=utf-8', status = 200) => ({
        status,
        ok: status < 400,
        url: rawUrl,
        headers: new Headers({ 'content-type': type }),
        text,
        truncated: false,
        redirects: [],
      });
      if (u.pathname === '/robots.txt') return body(GOOD_ROBOTS, 'text/plain');
      if (u.pathname === '/sitemap.xml') return body(GOOD_SITEMAP, 'application/xml');
      if (u.pathname === '/llms.txt') return body(GOOD_LLMS, 'text/plain');
      if (u.pathname === '/' || u.pathname === '') return body(GOOD_HOME);
      return body('<html><body>Bulunamadı</body></html>', 'text/html', 404);
    },
  };
});

import { POST as aiCrawler } from '@/app/api/tools/ai-crawler/route';
import { GET as reportGet } from '@/app/api/rapor/[token]/route';
import { clearBlocklistCache } from '@/server/blocklist';
import { recordReportView, resolveReport } from '@/server/public-report';
import { signReportToken } from '@/server/report-token';
import { siteUrl } from '@/server/env';

const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

type Env = { cached: boolean; scanId: string; reportToken: string; reportUrl: string; score: number };

let ipSeq = 40;
const nextIp = () => `198.51.100.${(ipSeq += 1)}`;

async function scan(host: string, ip = nextIp()): Promise<Env> {
  const r = await call(aiCrawler, {
    method: 'POST',
    body: { url: host },
    headers: { 'x-forwarded-for': ip, 'user-agent': 'Mozilla/5.0 Chrome/128' },
  });
  expect(r.status).toBe(200);
  await flushAfter();
  return r.json as unknown as Env;
}

function get(token: string, ip = nextIp()) {
  return call(reportGet, { params: { token }, headers: { 'x-forwarded-for': ip } });
}

beforeEach(() => {
  fetchCalls.length = 0;
  clearBlocklistCache();
});

describe('GET /api/rapor/[token]', () => {
  it('kayıtlı sonuçtan döner; ağ çağrısı yok; gizli alan yok; no-store + noindex', async () => {
    const env = await scan('rapor-test.example');
    fetchCalls.length = 0;

    const r = await get(env.reportToken);
    expect(r.status).toBe(200);
    expect(fetchCalls).toHaveLength(0);
    const j = r.json as unknown as {
      token: string;
      reportUrl: string;
      hostname: string;
      kind: string;
      score: number;
      tool: { slug: string; path: string };
      verdict: string;
      daysLeft: number;
      rescanPath: string;
      result: { findings: unknown[]; axes: unknown[] };
    };
    expect(j.token).toBe(env.reportToken);
    expect(j.reportUrl).toBe(env.reportUrl);
    expect(j.hostname).toBe('rapor-test.example');
    expect(j.kind).toBe('CRAWLER');
    expect(j.score).toBe(env.score);
    expect(j.tool.slug).toBe('ai-crawler-testi');
    expect(j.tool.path).toBe('/arac/ai-crawler-testi');
    expect(j.verdict).toMatch(/^\d+ kritik, \d+ uyarı, \d+ tamam$/);
    expect(j.daysLeft).toBeGreaterThanOrEqual(29);
    expect(j.rescanPath).toBe('/arac/ai-crawler-testi?url=rapor-test.example');
    expect(Array.isArray(j.result.findings)).toBe(true);
    expect(Array.isArray(j.result.axes)).toBe(true);
    expect(r.text).not.toMatch(/visitorHash|tenantId|urlHash|scanId|198\.51\.100|203\.0\.113|passwordHash|secret|sk-/);
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('x-robots-tag')).toMatch(/noindex/);
  });

  it('bilinmeyen / kurcalanmış / boş token → 404', async () => {
    const env = await scan('rapor-404.example');
    const unknown = signReportToken('cm9zzzzzzzzzzzzzzzzzzzzzz');
    expect((await get(unknown)).status).toBe(404);
    expect((await get(env.reportToken.slice(0, -3) + 'abc')).status).toBe(404);
    expect((await get('not-a-token')).status).toBe(404);
    expect((await get('')).status).toBe(404);
  });

  it('süresi dolmuş → 410 + rescanPath; sayfa çözümü gone', async () => {
    const env = await scan('rapor-gone.example');
    await prisma.publicScan.update({ where: { id: env.scanId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const r = await get(env.reportToken);
    expect(r.status).toBe(410);
    const j = r.json as unknown as { message: string; details: { rescanPath: string } };
    expect(j.message).toMatch(/süresi doldu/);
    expect(j.details.rescanPath).toBe('/arac/ai-crawler-testi?url=rapor-gone.example');
    const resolved = await resolveReport(env.reportToken);
    expect(resolved.status).toBe('gone');
  });

  it('cache-hit: ikinci tarama aynı reportUrl/token; rapor tek scanId’ye bağlı', async () => {
    const a = await scan('rapor-cache.example');
    const b = await scan('rapor-cache.example');
    expect(b.cached).toBe(true);
    expect(b.reportUrl).toBe(a.reportUrl);
    expect(b.reportToken).toBe(a.reportToken);
    expect(a.reportUrl).toBe(`${siteUrl()}/rapor/${a.reportToken}`);
    const r = await get(a.reportToken);
    expect(r.status).toBe(200);
    expect(await prisma.publicScan.count({ where: { hostname: 'rapor-cache.example' } })).toBe(1);
  });

  it('hostname sonradan yasaklanırsa → 200 {blocked, redirectUrl}; sayfa çözümü blocked; hits++', async () => {
    const env = await scan('rapor-yasak.example');
    const row = await prisma.blockedSite.create({ data: { hostname: 'rapor-yasak.example', redirectUrl: YT } });
    clearBlocklistCache();
    const r = await get(env.reportToken);
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ blocked: true, redirectUrl: YT });
    const resolved = await resolveReport(env.reportToken);
    expect(resolved.status).toBe('blocked');
    if (resolved.status === 'blocked') expect(resolved.redirectUrl).toBe(YT);
    const after = await prisma.blockedSite.findUniqueOrThrow({ where: { id: row.id } });
    expect(after.hits).toBeGreaterThanOrEqual(1);
  });

  it('resolveReport ok + recordReportView → views++ (JSON ucu views artırmaz)', async () => {
    const env = await scan('rapor-views.example');
    await get(env.reportToken);
    await get(env.reportToken);
    let row = await prisma.publicScan.findUniqueOrThrow({ where: { id: env.scanId } });
    expect(row.views).toBe(0);

    const resolved = await resolveReport(env.reportToken);
    expect(resolved.status).toBe('ok');
    if (resolved.status !== 'ok') return;
    expect(resolved.report.hostname).toBe('rapor-views.example');
    expect(resolved.report.toolTitle).toBe('AI crawler testi');
    expect(resolved.report.score).toBe(env.score);
    expect(JSON.stringify(resolved.report)).not.toMatch(/visitorHash|tenantId|urlHash/);
    await recordReportView(resolved.report.scanId);
    await recordReportView(resolved.report.scanId);
    row = await prisma.publicScan.findUniqueOrThrow({ where: { id: env.scanId } });
    expect(row.views).toBe(2);
    // Var olmayan id sessizce geçer
    await expect(recordReportView('cm0yok')).resolves.toBeUndefined();
  });

  it('IP başına 60/saat: 61. istek 429', async () => {
    const env = await scan('rapor-limit.example');
    const ip = nextIp();
    for (let i = 0; i < 60; i += 1) {
      const r = await get(env.reportToken, ip);
      expect(r.status).toBe(200);
    }
    const last = await get(env.reportToken, ip);
    expect(last.status).toBe(429);
    expect(Number(last.headers.get('retry-after'))).toBeGreaterThan(0);
  });
});
