/**
 * E-ticaret lead magnet uçları — safeFetch mock'lu: 3 tarama aracı (200 + Audit/PublicScan kaydı, 10 dk önbellek,
 * SSRF reddi, IP limiti) ve ürün açıklama yazıcı (sağlayıcı yoksa 503, sahte çıktı yok).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { hasLLM } from '@independentai/ai';
import { call, createTenant, loginAs, prisma } from './helpers';
import { GOOD_HOME, GOOD_PRODUCT, GOOD_ROBOTS, GOOD_SITEMAP, GOOD_LLMS } from '../fixtures/commerce-html';

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
      if (u.pathname === '/products.json')
        return body(
          JSON.stringify({ products: [{ handle: 'kahve-makinesi', title: 'Kahve Makinesi' }] }),
          'application/json',
        );
      if (u.pathname.startsWith('/products/') || u.pathname.startsWith('/urun/')) return body(GOOD_PRODUCT);
      if (u.pathname === '/' || u.pathname === '') return body(GOOD_HOME);
      return body('<html><body>Bulunamadı</body></html>', 'text/html', 404);
    },
  };
});

import { POST as ecommerceVisibility } from '@/app/api/tools/ecommerce-visibility/route';
import { POST as productPage } from '@/app/api/tools/product-page/route';
import { POST as aiCrawler } from '@/app/api/tools/ai-crawler/route';
import { POST as productWriter } from '@/app/api/tools/product-writer/route';

beforeEach(() => {
  fetchCalls.length = 0;
});

describe('e-ticaret araçları — tarama', () => {
  it('mağaza testi 200: skor, alt skorlar, bulgular; Audit (tenantId null) + PublicScan yazılır; 2. istek önbellekten', async () => {
    const r = await call(ecommerceVisibility, {
      method: 'POST',
      body: { url: 'good-store.example' },
      headers: { 'x-forwarded-for': '198.51.100.71' },
    });
    expect(r.status).toBe(200);
    const j = r.json as unknown as {
      url: string;
      score: number;
      breakdown: Record<string, number>;
      findings: unknown[];
      cached: boolean;
      scanId?: string;
    };
    expect(j.url).toBe('https://good-store.example/');
    expect(j.score).toBeGreaterThanOrEqual(0);
    expect(j.score).toBeLessThanOrEqual(100);
    expect(Object.keys(j.breakdown).sort()).toEqual([
      'aiCrawlability',
      'brandSignals',
      'catalogStructure',
      'contentQuality',
      'productSchema',
      'technical',
    ]);
    expect(Array.isArray(j.findings) && j.findings.length > 0).toBe(true);
    expect(j.cached).toBe(false);
    expect(fetchCalls.some((u) => u.includes('good-store.example'))).toBe(true);

    const audit = await prisma.audit.findFirstOrThrow({ where: { kind: 'COMMERCE' }, orderBy: { createdAt: 'desc' } });
    expect(audit.tenantId).toBeNull();
    expect(audit.overallScore).toBe(j.score);
    const scans = await prisma.publicScan.count({ where: { kind: 'COMMERCE', hostname: 'good-store.example' } });
    expect(scans).toBe(1);

    fetchCalls.length = 0;
    const r2 = await call(ecommerceVisibility, {
      method: 'POST',
      body: { url: 'https://good-store.example/?utm_source=x' },
      headers: { 'x-forwarded-for': '198.51.100.72' },
    });
    expect(r2.status).toBe(200);
    expect((r2.json as unknown as { cached: boolean; scanId?: string }).cached).toBe(true);
    expect((r2.json as unknown as { scanId?: string }).scanId).toBe(j.scanId);
    expect(fetchCalls.length).toBe(0);
    expect(await prisma.publicScan.count({ where: { kind: 'COMMERCE', hostname: 'good-store.example' } })).toBe(1);
  });

  it('ürün sayfası ve AI crawler testleri 200 ve kendi türünde kayıt üretir', async () => {
    const p = await call(productPage, {
      method: 'POST',
      body: { url: 'https://good-store.example/products/kahve-makinesi' },
      headers: { 'x-forwarded-for': '198.51.100.73' },
    });
    expect(p.status).toBe(200);
    expect(Object.keys((p.json as unknown as { breakdown: Record<string, number> }).breakdown).sort()).toEqual([
      'answerFit',
      'content',
      'indexability',
      'media',
      'schema',
      'structure',
    ]);
    const c = await call(aiCrawler, {
      method: 'POST',
      body: { url: 'https://good-store.example' },
      headers: { 'x-forwarded-for': '198.51.100.74' },
    });
    expect(c.status).toBe(200);
    const cj = c.json as unknown as { breakdown: Record<string, number>; botMatrix?: unknown[] };
    expect(Object.keys(cj.breakdown).sort()).toEqual([
      'access',
      'discoverability',
      'indexability',
      'performance',
      'renderability',
    ]);
    expect(await prisma.audit.count({ where: { kind: 'PRODUCT_PAGE' } })).toBe(1);
    expect(await prisma.audit.count({ where: { kind: 'CRAWLER' } })).toBe(1);
  });

  it('SSRF: özel/yerel adresler 400 ve hiç fetch yapılmaz; geçersiz gövde 400', async () => {
    for (const url of [
      'http://127.0.0.1/',
      'http://localhost/',
      'http://169.254.169.254/latest',
      'http://10.0.0.5/shop',
      'http://[::1]/',
    ]) {
      const r = await call(aiCrawler, {
        method: 'POST',
        body: { url },
        headers: { 'x-forwarded-for': '198.51.100.75' },
      });
      expect(r.status, url).toBe(400);
    }
    expect(fetchCalls.length).toBe(0);
    expect(
      (await call(aiCrawler, { method: 'POST', body: { url: 'x' }, headers: { 'x-forwarded-for': '198.51.100.75' } }))
        .status,
    ).toBe(400);
  });

  it('public limit: IP başına 10/saat; 11. istek 429 + Retry-After', async () => {
    let last = { status: 0, headers: new Headers() };
    for (let i = 0; i < 11; i++) {
      last = await call(aiCrawler, {
        method: 'POST',
        body: { url: `https://limit-${i}.example` },
        headers: { 'x-forwarded-for': '198.51.100.76' },
      });
    }
    expect(last.status).toBe(429);
    expect(last.headers.get('retry-after')).toBeTruthy();
  });

  it('oturumlu kullanıcı: Audit.tenantId dolu', async () => {
    const { tenant, user } = await createTenant();
    await loginAs(user);
    const r = await call(ecommerceVisibility, { method: 'POST', body: { url: 'https://tenant-store.example' } });
    expect(r.status).toBe(200);
    const audit = await prisma.audit.findFirstOrThrow({ where: { kind: 'COMMERCE', tenantId: tenant.id } });
    expect(audit.url).toBe('https://tenant-store.example/');
  });
});

describe('ürün açıklama yazıcı', () => {
  it('geçersiz giriş 400; sağlayıcı yoksa 503 (sahte çıktı yok), varsa şemaya uygun 200', async () => {
    const bad = await call(productWriter, {
      method: 'POST',
      body: { title: '' },
      headers: { 'x-forwarded-for': '198.51.100.77' },
    });
    expect(bad.status).toBe(400);
    const r = await call(productWriter, {
      method: 'POST',
      body: {
        title: 'Paslanmaz Çelik Kahve Makinesi',
        features: ['15 bar basınç', '1.5 L su haznesi'],
        language: 'tr',
      },
      headers: { 'x-forwarded-for': '198.51.100.78' },
    });
    if (!hasLLM()) {
      expect(r.status).toBe(503);
      expect((r.json as unknown as { code: string }).code).toBe('provider_unavailable');
    } else {
      expect(r.status).toBe(200);
      const j = r.json as unknown as Record<string, unknown>;
      expect(typeof j.description === 'string' || typeof j.longDescription === 'string').toBe(true);
    }
  });
});
