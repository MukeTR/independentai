/**
 * Kayıt sonrası ilk site taraması — onboarding after() → Audit(CRAWLER, tenantId) (PublicScan yok),
 * Tenant.industry seçimi, yasaklı/geçersiz site atlanır, 20 s bütçe (enjekte edilen yavaş motor), hata yutulur,
 * test ortamı bayrağı kapalıyken ağ yok.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, createTenant, flushAfter, loginAs, prisma } from './helpers';
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
      return body(GOOD_HOME);
    },
  };
});

import { POST as onboarding } from '@/app/api/onboarding/route';
import { getFirstScan, runFirstSiteScan } from '@/server/first-scan';
import { clearBlocklistCache } from '@/server/blocklist';

beforeAll(() => {
  process.env.IAI_FIRST_SCAN_IN_TEST = '1';
});
afterAll(() => {
  delete process.env.IAI_FIRST_SCAN_IN_TEST;
});
beforeEach(() => {
  fetchCalls.length = 0;
  clearBlocklistCache();
});

describe('onboarding → ilk tarama', () => {
  it("flushAfter() → Audit CRAWLER tenantId'li; PublicScan yazılmaz; industry set; kart verisi 3 öneri", async () => {
    const { user, tenant } = await createTenant({ onboarded: false });
    await loginAs(user);
    const r = await call(onboarding, {
      method: 'POST',
      body: {
        brand: { name: 'İlk Tarama', website: 'https://ilk-tarama.example' },
        competitors: ['Rakip'],
        prompts: ['En iyi ilk tarama aracı hangisi?'],
        industry: 'klinik',
      },
    });
    expect(r.status).toBe(201);
    expect(r.json.firstScan).toBe(true);
    expect(await prisma.audit.count({ where: { tenantId: tenant.id, kind: 'CRAWLER' } })).toBe(0);
    await flushAfter();
    const audit = await prisma.audit.findFirstOrThrow({ where: { tenantId: tenant.id, kind: 'CRAWLER' } });
    expect(audit.url).toMatch(/^https:\/\/ilk-tarama\.example/);
    expect(audit.overallScore).toBeGreaterThan(0);
    expect(await prisma.publicScan.count()).toBe(0);
    expect(fetchCalls.some((u) => u.startsWith('https://ilk-tarama.example'))).toBe(true);
    expect((await prisma.tenant.findUniqueOrThrow({ where: { id: tenant.id } })).industry).toBe('klinik');

    const card = await getFirstScan(tenant.id);
    expect(card?.hostname).toBe('ilk-tarama.example');
    expect(card?.score).toBe(audit.overallScore);
    expect(card?.recommendations.length).toBeLessThanOrEqual(3);
    expect(card!.verdict.fail + card!.verdict.warn + card!.verdict.pass).toBeGreaterThan(0);
  });

  it('geçersiz sektör yok sayılır; web sitesi yoksa tarama yok; onboarding yine 201', async () => {
    const { user, tenant } = await createTenant({ onboarded: false });
    await loginAs(user);
    const r = await call(onboarding, {
      method: 'POST',
      body: { brand: { name: 'Sitesiz' }, competitors: [], prompts: ['Bir soru daha var'], industry: 'uzay' },
    });
    expect(r.status).toBe(201);
    expect(r.json.firstScan).toBe(false);
    await flushAfter();
    expect(await prisma.audit.count({ where: { tenantId: tenant.id, kind: 'CRAWLER' } })).toBe(0);
    expect((await prisma.tenant.findUniqueOrThrow({ where: { id: tenant.id } })).industry).toBeNull();
    expect(await getFirstScan(tenant.id)).toBeNull();
  });
});

describe('runFirstSiteScan sınırları', () => {
  it('yasaklı site taranmaz; SSRF/geçersiz URL atlanır; hata yutulur', async () => {
    const { tenant } = await createTenant();
    await prisma.blockedSite.create({ data: { hostname: 'engelli.example', redirectUrl: 'https://youtu.be/x' } });
    expect(await runFirstSiteScan(tenant.id, 'https://shop.engelli.example')).toEqual({ ok: false, reason: 'blocked' });
    expect(await runFirstSiteScan(tenant.id, 'http://127.0.0.1/')).toEqual({ ok: false, reason: 'invalid_url' });
    expect(await runFirstSiteScan(tenant.id, 'yok')).toEqual({ ok: false, reason: 'invalid_url' });
    expect(await runFirstSiteScan(tenant.id, null)).toEqual({ ok: false, reason: 'no_website' });
    expect(fetchCalls.length).toBe(0);
    const boom = await runFirstSiteScan(tenant.id, 'patlayan.example', {
      run: async () => {
        throw new Error('motor patladı');
      },
    });
    expect(boom).toEqual({ ok: false, reason: 'failed' });
    expect(await prisma.audit.count({ where: { tenantId: tenant.id } })).toBe(0);
  });

  it('bütçe dolunca vazgeçer (Audit yok)', async () => {
    const { tenant } = await createTenant();
    const slow = await runFirstSiteScan(tenant.id, 'yavas.example', {
      budgetMs: 30,
      run: () => new Promise((resolve) => setTimeout(resolve, 200)) as never,
    });
    expect(slow).toEqual({ ok: false, reason: 'timeout' });
    expect(await prisma.audit.count({ where: { tenantId: tenant.id } })).toBe(0);
  });

  it('test ortamı bayrağı kapalıyken ağa çıkmaz', async () => {
    const { tenant } = await createTenant();
    delete process.env.IAI_FIRST_SCAN_IN_TEST;
    try {
      expect(await runFirstSiteScan(tenant.id, 'https://gercek.example')).toEqual({ ok: false, reason: 'test_env' });
      expect(fetchCalls.length).toBe(0);
    } finally {
      process.env.IAI_FIRST_SCAN_IN_TEST = '1';
    }
  });
});
