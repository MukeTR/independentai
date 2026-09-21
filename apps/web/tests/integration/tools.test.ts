import { describe, expect, it } from 'vitest';
import { call, createTenant, loginAs, addMember, prisma } from './helpers';
import { POST as geoAudit } from '@/app/api/tools/geo-audit/route';
import { POST as rankCheck } from '@/app/api/tools/rank-check/route';
import { POST as keywordFinder } from '@/app/api/tools/keyword-finder/route';
import { GET as health } from '@/app/api/health/route';

describe('araçlar — SSRF ve rate limit', () => {
  it('geo-audit özel/yerel adresleri 400 ile reddeder (fetch yapmadan)', async () => {
    for (const url of [
      'http://127.0.0.1/',
      'http://localhost:3200/',
      'http://169.254.169.254/latest',
      'http://10.0.0.5/',
      'http://[::1]/',
      'http://user:pw@example.com/',
      'http://example.com:8080/',
    ]) {
      const r = await call(geoAudit, { method: 'POST', body: { url } });
      expect(r.status, url).toBe(400);
    }
  });

  it('public rank-check IP başına 8/saat; 9. istek 429 + Retry-After', async () => {
    let last: { status: number; headers: Headers } = { status: 0, headers: new Headers() };
    for (let i = 0; i < 9; i++) {
      last = await call(rankCheck, {
        method: 'POST',
        body: { brand: 'KarPanel', prompt: 'En iyi POS?', provider: 'OPENAI' },
        headers: { 'x-forwarded-for': '198.51.100.42' },
      });
    }
    expect(last.status).toBe(429);
    expect(last.headers.get('retry-after')).toBeTruthy();
  });

  it('rank-check mock modda isMocked=true ve groundingMode döner; geçersiz provider 400', async () => {
    const r = await call(rankCheck, {
      method: 'POST',
      body: { brand: 'KarPanel', prompt: 'En iyi POS?', provider: 'GOOGLE' },
      headers: { 'x-forwarded-for': '198.51.100.43' },
    });
    expect(r.status).toBe(200);
    expect(r.json.isMocked).toBe(true);
    expect(r.json.groundingMode).toBe('none');
    expect(
      (
        await call(rankCheck, {
          method: 'POST',
          body: { brand: 'K', prompt: 'x?', provider: 'BING' },
          headers: { 'x-forwarded-for': '198.51.100.44' },
        })
      ).status,
    ).toBe(400);
  });

  it('oturumlu araçlar: VIEWER kullanabilir (yazma değil), süresi dolmuş tenant 403', async () => {
    const { tenant } = await createTenant();
    const viewer = await addMember(tenant.id, 'VIEWER');
    await loginAs(viewer);
    const r = await call(keywordFinder, { method: 'POST', body: { topic: 'restoran POS' } });
    expect(r.status).toBe(200);
    expect(Array.isArray(r.json.ideas)).toBe(true);
    const expired = await createTenant({ trialDaysLeft: -40 });
    await loginAs(expired.user);
    expect((await call(keywordFinder, { method: 'POST', body: { topic: 'restoran POS' } })).status).toBe(403);
  });

  it('health ucu sır sızdırmaz', async () => {
    const r = await call(health);
    expect(r.status).toBe(200);
    expect(r.json.db).toBe('ok');
    expect(JSON.stringify(r.json)).not.toMatch(/postgres|secret|sk-/i);
    void prisma;
  });
});
