/**
 * handlePublicScan v2 — rapor token'ı + reportUrl, lead upsert (scanCount), yasaklı site dalı (fetch 0 + hits),
 * önbellek isabetinde scanCount++ ve aynı token, hedef site saatlik tavanı 429, sektör/rakip doğrulaması,
 * geo-audit yasaklı site entegrasyonu.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
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
import { POST as geoAudit } from '@/app/api/tools/geo-audit/route';
import { handlePublicScan, SCAN_POLICY, type ScanInput } from '@/server/commerce/public-scan';
import { clearBlocklistCache } from '@/server/blocklist';
import { verifyReportToken } from '@/server/report-token';
import { route } from '@/server/route';
import { siteUrl } from '@/server/env';

const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

type Env = {
  cached: boolean;
  scanId?: string;
  reportToken?: string;
  reportUrl?: string;
  fetchedAt?: string;
  blocked?: boolean;
  redirectUrl?: string;
  score?: number;
};

/** Sektör + rakip girdisi alan sahte araç (COMPARE) — run çağrılarını sayar, ağa çıkmaz. */
const runCalls: { url: string; input: ScanInput }[] = [];
const compareHandler = route('tools.test_compare', async (req) =>
  handlePublicScan(
    req,
    'COMPARE',
    async (url, input) => {
      runCalls.push({ url, input });
      return {
        url,
        score: 55,
        breakdown: { identity: 55 },
        findings: [],
        recommendations: [],
        fetchedAt: new Date().toISOString(),
        partial: true,
        waf: false,
      };
    },
    {
      input: (b) => ({ sector: b.sector as string | undefined, competitorUrl: b.competitorUrl as string | undefined }),
    },
  ),
);

beforeEach(() => {
  fetchCalls.length = 0;
  runCalls.length = 0;
  clearBlocklistCache();
});

describe('handlePublicScan v2 — rapor token, lead, önbellek', () => {
  it('ilk tarama: reportToken doğrulanır, reportUrl /rapor/<token>, Lead scanCount 1; cache-hit aynı token + scanCount 2', async () => {
    const r = await call(aiCrawler, {
      method: 'POST',
      body: { url: 'lead-store.example' },
      headers: { 'x-forwarded-for': '198.51.100.101', 'user-agent': 'Mozilla/5.0 Chrome/128' },
    });
    expect(r.status).toBe(200);
    const j = r.json as unknown as Env;
    expect(j.cached).toBe(false);
    expect(j.scanId).toBeTruthy();
    expect(verifyReportToken(j.reportToken)).toBe(j.scanId);
    expect(j.reportUrl).toBe(`${siteUrl()}/rapor/${j.reportToken}`);
    expect(typeof j.fetchedAt).toBe('string');
    expect(r.text).not.toMatch(/198\.51\.100|visitorHash/);
    await flushAfter();

    const scan = await prisma.publicScan.findUniqueOrThrow({ where: { id: j.scanId } });
    expect(scan.hostname).toBe('lead-store.example');
    expect(scan.visitorHash).toMatch(/^[a-f0-9]{64}$/);
    expect(scan.tenantId).toBeNull();
    expect(scan.expiresAt.getTime() - scan.createdAt.getTime()).toBeGreaterThan(29 * 86_400_000);

    const lead = await prisma.lead.findUniqueOrThrow({ where: { hostname: 'lead-store.example' } });
    expect(lead.scanCount).toBe(1);
    expect(lead.kinds).toEqual(['CRAWLER']);
    expect(lead.lastScore).toBe(scan.score);
    expect(lead.bestScore).toBe(scan.score);
    expect(lead.lastReportToken).toBe(j.reportToken);
    expect(lead.source).toBe('TOOL');
    expect(lead.contactEmail).toBeNull();

    fetchCalls.length = 0;
    const r2 = await call(aiCrawler, {
      method: 'POST',
      body: { url: 'https://lead-store.example/?utm_source=x' },
      headers: { 'x-forwarded-for': '198.51.100.102' },
    });
    const j2 = r2.json as unknown as Env;
    expect(r2.status).toBe(200);
    expect(j2.cached).toBe(true);
    expect(j2.scanId).toBe(j.scanId);
    expect(j2.reportToken).toBe(j.reportToken);
    expect(fetchCalls.length).toBe(0);
    expect(await prisma.publicScan.count({ where: { hostname: 'lead-store.example' } })).toBe(1);
    const lead2 = await prisma.lead.findUniqueOrThrow({ where: { hostname: 'lead-store.example' } });
    expect(lead2.scanCount).toBe(2);
    expect(lead2.activity).toBeNull();

    // 3. tarama (cache) → "Tekrar tarama ×3" aktivitesi
    await call(aiCrawler, {
      method: 'POST',
      body: { url: 'lead-store.example' },
      headers: { 'x-forwarded-for': '198.51.100.103' },
    });
    const lead3 = await prisma.lead.findUniqueOrThrow({ where: { hostname: 'lead-store.example' } });
    expect(lead3.scanCount).toBe(3);
    expect(JSON.stringify(lead3.activity)).toContain('Tekrar tarama ×3');
  });

  it('bestScore azalmaz; kinds birleşimi', async () => {
    await prisma.lead.create({
      data: { hostname: 'lead-store.example', scanCount: 4, bestScore: 99, kinds: ['COMMERCE'] },
    });
    await call(aiCrawler, {
      method: 'POST',
      body: { url: 'lead-store.example' },
      headers: { 'x-forwarded-for': '198.51.100.104' },
    });
    const lead = await prisma.lead.findUniqueOrThrow({ where: { hostname: 'lead-store.example' } });
    expect(lead.scanCount).toBe(5);
    expect(lead.bestScore).toBe(99);
    expect([...lead.kinds].sort()).toEqual(['COMMERCE', 'CRAWLER']);
  });
});

describe('yasaklı site dalı', () => {
  it('ana host listede: 200 {blocked, redirectUrl}; fetch 0; PublicScan/Lead yazılmaz; hits++ (alt alan adı dahil)', async () => {
    const site = await prisma.blockedSite.create({ data: { hostname: 'engelli.example', redirectUrl: YT } });
    const r = await call(aiCrawler, {
      method: 'POST',
      body: { url: 'https://shop.engelli.example/urun' },
      headers: { 'x-forwarded-for': '198.51.100.111' },
    });
    expect(r.status).toBe(200);
    expect(r.json as unknown as Env).toEqual({ blocked: true, redirectUrl: YT });
    expect(fetchCalls.length).toBe(0);
    expect(await prisma.publicScan.count()).toBe(0);
    expect(await prisma.lead.count()).toBe(0);
    // hits++ best-effort (await edilmez) — kısa bekleme
    await new Promise((r) => setTimeout(r, 50));
    expect((await prisma.blockedSite.findUniqueOrThrow({ where: { id: site.id } })).hits).toBe(1);
  });

  it('rakip host listede olsa da tarama yapılmaz', async () => {
    await prisma.blockedSite.create({
      data: { hostname: 'rakip-engelli.example', redirectUrl: 'https://youtu.be/x1' },
    });
    const r = await call(compareHandler, {
      method: 'POST',
      body: { url: 'temiz.example', sector: 'klinik', competitorUrl: 'www.rakip-engelli.example' },
      headers: { 'x-forwarded-for': '198.51.100.112' },
    });
    expect(r.status).toBe(200);
    expect((r.json as unknown as Env).blocked).toBe(true);
    expect(runCalls.length).toBe(0);
    expect(await prisma.publicScan.count()).toBe(0);
  });

  it('geo-audit (hero): yasaklı host 200 {blocked, redirectUrl}, fetch 0, Audit yazılmaz', async () => {
    await prisma.blockedSite.create({ data: { hostname: 'engelli-geo.example', redirectUrl: YT } });
    const r = await call(geoAudit, {
      method: 'POST',
      body: { url: 'engelli-geo.example' },
      headers: { 'x-forwarded-for': '198.51.100.113' },
    });
    expect(r.status).toBe(200);
    expect(r.json as unknown as Env).toEqual({ blocked: true, redirectUrl: YT });
    expect(fetchCalls.length).toBe(0);
    expect(await prisma.audit.count({ where: { kind: 'GEO' } })).toBe(0);
  });
});

describe('girdi doğrulama ve tavanlar', () => {
  it('geçersiz sektör 400; run çağrılmaz', async () => {
    const r = await call(compareHandler, {
      method: 'POST',
      body: { url: 'temiz.example', sector: 'uzay' },
      headers: { 'x-forwarded-for': '198.51.100.121' },
    });
    expect(r.status).toBe(400);
    expect(runCalls.length).toBe(0);
  });

  it('rakip URL SSRF (yerel/özel adres) 400; run/fetch 0', async () => {
    for (const competitorUrl of [
      'http://127.0.0.1/',
      'http://localhost/',
      'http://169.254.169.254/x',
      'http://10.0.0.5/',
    ]) {
      const r = await call(compareHandler, {
        method: 'POST',
        body: { url: 'temiz.example', competitorUrl },
        headers: { 'x-forwarded-for': '198.51.100.122' },
      });
      expect(r.status, competitorUrl).toBe(400);
    }
    expect(runCalls.length).toBe(0);
    expect(fetchCalls.length).toBe(0);
  });

  it('geçerli sektör + rakip: run normalize edilmiş girdiyle çağrılır; sector/meta/partial persist edilir', async () => {
    const r = await call(compareHandler, {
      method: 'POST',
      body: { url: 'temiz.example', sector: 'klinik', competitorUrl: 'Rakip.Example/?fbclid=1' },
      headers: { 'x-forwarded-for': '198.51.100.123' },
    });
    expect(r.status).toBe(200);
    const j = r.json as unknown as Env;
    expect(runCalls).toEqual([
      { url: 'https://temiz.example/', input: { sector: 'klinik', competitorUrl: 'https://rakip.example/' } },
    ]);
    const scan = await prisma.publicScan.findUniqueOrThrow({ where: { id: j.scanId } });
    expect(scan.sector).toBe('klinik');
    expect(scan.partial).toBe(true);
    expect(scan.meta).toEqual({ competitorHostname: 'rakip.example', waf: false, partial: true });
    const lead = await prisma.lead.findUniqueOrThrow({ where: { hostname: 'temiz.example' } });
    expect(lead.sector).toBe('klinik');
    expect(lead.kinds).toEqual(['COMPARE']);

    // Aynı url farklı sektör → farklı urlHash → yeni tarama (cache değil)
    const r2 = await call(compareHandler, {
      method: 'POST',
      body: { url: 'temiz.example', sector: 'saas', competitorUrl: 'rakip.example' },
      headers: { 'x-forwarded-for': '198.51.100.124' },
    });
    expect((r2.json as unknown as Env).cached).toBe(false);
    expect(runCalls.length).toBe(2);
  });

  it("hedef site saatlik tavanı: aynı host farklı IP'lerden 13. istekte 429 (CRAWLER 12/saat)", async () => {
    const limit = SCAN_POLICY.CRAWLER.hostLimitPerHour;
    expect(limit).toBe(12);
    let last = { status: 0, headers: new Headers(), json: {} as Record<string, never> };
    for (let i = 0; i <= limit; i += 1) {
      last = await call(aiCrawler, {
        method: 'POST',
        body: { url: 'cok-taranan.example' },
        headers: { 'x-forwarded-for': `198.51.100.${130 + i}` },
      });
    }
    expect(last.status).toBe(429);
    expect(last.headers.get('retry-after')).toBeTruthy();
    expect((last.json as unknown as { message: string }).message).toMatch(/çok tarandı/);
  });

  it('handlePublicScan doğrudan NextRequest ile: after() tetiklenir ve hata yutulur', async () => {
    const req = new NextRequest('http://localhost:3200/api/tools/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.150' },
      body: JSON.stringify({ url: 'dogrudan.example' }),
    });
    const res = await compareHandler(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    await flushAfter();
    expect(await prisma.publicScan.count({ where: { hostname: 'dogrudan.example' } })).toBe(1);
  });
});
