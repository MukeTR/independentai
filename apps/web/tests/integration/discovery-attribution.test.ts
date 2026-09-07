/**
 * Prompt attribution entegrasyon testleri (koordinatör çalıştırır; ajan çalıştırmaz).
 *
 * Kapsam:
 *  - `POST /api/collect/v1/report` → 202 + USER_REPORTED kaydı (PII temizlenmiş)
 *  - kayıtlı olmayan origin → 403, kayıt yazılmaz
 *  - IP hız sınırı → 429
 *  - cross-tenant izolasyon (okuma ve çalıştırma)
 *  - INFERRED: eşiğin altında kayıt üretilmez, eşiği geçince idempotent tek kayıt
 */
import { describe, expect, it } from 'vitest';
import { call, createTenant, loginAs, prisma, uniq } from './helpers';
import { hashKey } from '@/server/discovery/sites';
import { POST as report } from '@/app/api/collect/v1/report/route';
import { GET as listAttribution, POST as runAttribution } from '@/app/api/discovery/attribution/route';

async function makeSite(tenantId: string, domain: string) {
  const publicKey = `iais_${uniq('key')}abcdefgh`;
  const site = await prisma.trackedSite.create({
    data: {
      tenantId,
      domain,
      normalizedOrigin: `https://${domain}`,
      allowedOrigins: [`https://${domain}`, `https://www.${domain}`],
      publicKeyHash: hashKey(publicKey),
      publicKeyPrefix: `${publicKey.slice(0, 11)}…`,
      status: 'ACTIVE',
      siteKind: 'service',
      verifiedAt: new Date(),
    },
  });
  return { site, publicKey };
}

function reportCall(body: Record<string, unknown>, opts: { origin?: string | null; ip?: string } = {}) {
  const headers: Record<string, string> = { 'x-forwarded-for': opts.ip ?? '198.51.100.7' };
  if (opts.origin !== null) headers.origin = opts.origin ?? 'https://ornek-a.com';
  return call(report, { method: 'POST', url: '/api/collect/v1/report', body, headers });
}

describe('POST /api/collect/v1/report (ziyaretçi bildirimi)', () => {
  it('202 döner ve USER_REPORTED kaydı yazar; PII temizlenir, niyet normalize edilir', async () => {
    const { tenant } = await createTenant();
    const { site, publicKey } = await makeSite(tenant.id, 'ornek-a.com');

    const res = await reportCall({
      k: publicKey,
      sid: 'sid-abcdefgh-1',
      provider: 'ChatGPT',
      intent: 'Karşılaştırma',
      text: 'ChatGPT bana burayı önerdi, mail adresim ali@ornek.com',
    });
    expect(res.status).toBe(202);

    const row = await prisma.promptAttribution.findFirstOrThrow({ where: { trackedSiteId: site.id } });
    expect(row.source).toBe('USER_REPORTED');
    expect(row.confidence).toBe(100);
    expect(row.intent).toBe('comparison');
    expect(row.provider).toBe('openai');
    expect(row.reportedText).toContain('[email]');
    expect(row.reportedText).not.toContain('ali@ornek.com');
    // Oturum yoksa kayıt yine yazılır, yalnızca oturuma bağlanmaz.
    expect(row.sessionId).toBeNull();
  });

  it('oturum eşleşirse kayıt oturuma bağlanır', async () => {
    const { tenant } = await createTenant();
    const { site, publicKey } = await makeSite(tenant.id, 'ornek-a.com');
    const session = await prisma.aiAcquisitionSession.create({
      data: {
        tenantId: tenant.id,
        trackedSiteId: site.id,
        sessionKey: 'sid-abcdefgh-2',
        sourceClass: 'AI_REFERRAL',
        provider: 'anthropic',
        referrerHost: 'claude.ai',
        landingPath: '/hizmetler',
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });

    const res = await reportCall({ k: publicKey, sid: 'sid-abcdefgh-2', intent: 'pricing' });
    expect(res.status).toBe(202);
    expect(Boolean(res.json.sessionMatched)).toBe(true);

    const row = await prisma.promptAttribution.findFirstOrThrow({ where: { trackedSiteId: site.id } });
    expect(row.sessionId).toBe(session.id);
    // Sağlayıcı bildirilmediyse oturumun kaynağı kullanılır.
    expect(row.provider).toBe('anthropic');
    expect(row.reportedText).toBeNull();
  });

  it('kayıtlı olmayan origin 403 döner ve hiçbir kayıt yazılmaz', async () => {
    const { tenant } = await createTenant();
    const { publicKey } = await makeSite(tenant.id, 'ornek-a.com');

    const res = await reportCall({ k: publicKey, sid: 'sid-abcdefgh-3' }, { origin: 'https://kotu-site.com' });
    expect(res.status).toBe(403);
    expect(String(res.json.code)).toBe('origin_not_allowed');
    expect(await prisma.promptAttribution.count()).toBe(0);

    // Origin başlığı hiç yoksa da reddedilir.
    const noOrigin = await reportCall({ k: publicKey, sid: 'sid-abcdefgh-4' }, { origin: null });
    expect(noOrigin.status).toBe(403);
    expect(await prisma.promptAttribution.count()).toBe(0);
  });

  it('geçersiz anahtar 401, geçersiz oturum anahtarı 400', async () => {
    const { tenant } = await createTenant();
    const { publicKey } = await makeSite(tenant.id, 'ornek-a.com');

    expect((await reportCall({ k: 'iais_yok', sid: 'sid-abcdefgh-5' })).status).toBe(401);
    expect((await reportCall({ k: publicKey, sid: 'kisa' })).status).toBe(400);
  });

  it('2 KB üzeri gövde 413 ile reddedilir', async () => {
    const { tenant } = await createTenant();
    const { publicKey } = await makeSite(tenant.id, 'ornek-a.com');
    const res = await reportCall({ k: publicKey, sid: 'sid-abcdefgh-6', text: 'a'.repeat(3000) });
    expect(res.status).toBe(413);
    expect(await prisma.promptAttribution.count()).toBe(0);
  });

  it('aynı IP saatte 5 bildirimden fazlasını gönderemez (429)', async () => {
    const { tenant } = await createTenant();
    const { publicKey } = await makeSite(tenant.id, 'ornek-a.com');

    for (let i = 0; i < 5; i += 1) {
      const ok = await reportCall({ k: publicKey, sid: `sid-limit-${i}0000` }, { ip: '203.0.113.44' });
      expect(ok.status).toBe(202);
    }
    const blocked = await reportCall({ k: publicKey, sid: 'sid-limit-9-0000' }, { ip: '203.0.113.44' });
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
    expect(await prisma.promptAttribution.count()).toBe(5);
  });
});

describe('INFERRED tahmin (eşik ve idempotentlik)', () => {
  /** Eşiği geçmek için: atıf eşleşmesi (+45) + sağlayıcı görünürlüğü (+10) = 55. */
  async function seedPrompt(tenantId: string, opts: { withCitation: boolean; domain: string }) {
    const prompt = await prisma.prompt.create({
      data: { tenantId, text: 'Bulut yedekleme çözümü', category: 'discovery', isActive: true },
    });
    const run = await prisma.modelRun.create({
      data: {
        promptId: prompt.id,
        provider: 'OPENAI',
        modelName: 'gpt-test',
        responseText: 'cevap',
        status: 'SUCCESS',
        runDate: new Date(),
      },
    });
    await prisma.brandMention.create({
      data: { modelRunId: run.id, mentionName: 'Markam', isOwnBrand: true, position: 1, snippet: 'Markam iyi' },
    });
    if (opts.withCitation) {
      await prisma.citation.create({
        data: {
          modelRunId: run.id,
          tenantId,
          url: `https://${opts.domain}/urunler/yedekleme`,
          domain: opts.domain,
          runDate: new Date(),
        },
      });
    }
    return prompt;
  }

  async function seedSession(tenantId: string, trackedSiteId: string, key = 'sid-inferred-1') {
    return prisma.aiAcquisitionSession.create({
      data: {
        tenantId,
        trackedSiteId,
        sessionKey: key,
        sourceClass: 'AI_REFERRAL',
        provider: 'openai',
        referrerHost: 'chatgpt.com',
        landingPath: '/urunler/yedekleme',
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
  }

  it('eşiğin altındaki oturum için KAYIT ÜRETİLMEZ', async () => {
    const { tenant, user } = await createTenant();
    const { site } = await makeSite(tenant.id, 'ornek-a.com');
    await seedPrompt(tenant.id, { withCitation: false, domain: 'ornek-a.com' });
    await seedSession(tenant.id, site.id);
    await loginAs(user);

    const res = await call(runAttribution, { method: 'POST', url: `/api/discovery/attribution?siteId=${site.id}` });
    expect(res.status).toBe(200);
    expect(Number(res.json.created)).toBe(0);
    expect(Number(res.json.belowThreshold)).toBe(1);
    expect(await prisma.promptAttribution.count({ where: { source: 'INFERRED' } })).toBe(0);
  });

  it('atıf + sağlayıcı görünürlüğü eşiği geçer; tekrar çalıştırma tek kayıt bırakır', async () => {
    const { tenant, user } = await createTenant();
    const { site } = await makeSite(tenant.id, 'ornek-a.com');
    await seedPrompt(tenant.id, { withCitation: true, domain: 'ornek-a.com' });
    await seedSession(tenant.id, site.id);
    await loginAs(user);

    const first = await call(runAttribution, { method: 'POST', url: `/api/discovery/attribution?siteId=${site.id}` });
    expect(first.status).toBe(200);
    expect(Number(first.json.created)).toBe(1);

    const row = await prisma.promptAttribution.findFirstOrThrow({ where: { source: 'INFERRED' } });
    // Atıf (45) + sağlayıcı görünürlüğü (10) eşiği geçirir; metin örtüşmesi varsa puan artabilir.
    // Tavan 95: 100 yalnızca ziyaretçinin kendi bildirimine ayrılmıştır.
    expect(row.confidence).toBeGreaterThanOrEqual(55);
    expect(row.confidence).toBeLessThanOrEqual(95);
    expect(row.promptId).not.toBeNull();
    expect(JSON.stringify(row.evidence)).toContain('citationPathMatch');

    const second = await call(runAttribution, { method: 'POST', url: `/api/discovery/attribution?siteId=${site.id}` });
    expect(Number(second.json.created)).toBe(0);
    expect(Number(second.json.updated)).toBe(1);
    expect(await prisma.promptAttribution.count({ where: { source: 'INFERRED' } })).toBe(1);
  });

  it('VIEWER tahmin çalıştıramaz; siteId zorunludur', async () => {
    const { tenant, user } = await createTenant();
    const { site } = await makeSite(tenant.id, 'ornek-a.com');
    await loginAs(user);
    expect((await call(runAttribution, { method: 'POST', url: '/api/discovery/attribution' })).status).toBe(400);

    const viewer = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `${uniq('v')}@test.local`,
        role: 'VIEWER',
        emailVerifiedAt: new Date(),
        passwordHash: 'x',
      },
    });
    await loginAs(viewer);
    const res = await call(runAttribution, { method: 'POST', url: `/api/discovery/attribution?siteId=${site.id}` });
    expect(res.status).toBe(403);
  });
});

describe('cross-tenant izolasyon', () => {
  it("başka tenant'ın attribution kayıtları listelenemez, sitesi çalıştırılamaz", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const siteA = await makeSite(a.tenant.id, 'ornek-a.com');
    await makeSite(b.tenant.id, 'ornek-b.com');

    await reportCall(
      { k: siteA.publicKey, sid: 'sid-abcdefgh-7', intent: 'pricing' },
      { origin: 'https://ornek-a.com' },
    );
    expect(await prisma.promptAttribution.count({ where: { tenantId: a.tenant.id } })).toBe(1);

    // B tenant'ı A'nın kayıtlarını görmez
    await loginAs(b.user);
    const list = await call(listAttribution, { url: '/api/discovery/attribution?days=30' });
    expect(list.status).toBe(200);
    const groups = list.json.groups as unknown as { source: string; total: number }[];
    expect(groups.find((g) => g.source === 'USER_REPORTED')?.total).toBe(0);

    // B tenant'ı A'nın site id'siyle ne okuyabilir ne çalıştırabilir
    expect((await call(listAttribution, { url: `/api/discovery/attribution?siteId=${siteA.site.id}` })).status).toBe(
      404,
    );
    expect(
      (await call(runAttribution, { method: 'POST', url: `/api/discovery/attribution?siteId=${siteA.site.id}` }))
        .status,
    ).toBe(404);

    // A tenant'ı kendi kaydını görür
    await loginAs(a.user);
    const own = await call(listAttribution, { url: '/api/discovery/attribution?days=30' });
    const ownGroups = own.json.groups as unknown as { source: string; total: number }[];
    expect(ownGroups.find((g) => g.source === 'USER_REPORTED')?.total).toBe(1);
    expect(ownGroups.map((g) => g.source)).toEqual(['USER_REPORTED', 'INFERRED', 'SYNTHETIC']);
  });

  it('bir sitenin public key’i başka tenant’ın sitesine yazamaz', async () => {
    const a = await createTenant();
    const b = await createTenant();
    const siteA = await makeSite(a.tenant.id, 'ornek-a.com');
    await makeSite(b.tenant.id, 'ornek-b.com');

    // A'nın anahtarı B'nin origin'iyle gönderilirse origin allowlist'e takılır.
    const res = await reportCall({ k: siteA.publicKey, sid: 'sid-abcdefgh-8' }, { origin: 'https://ornek-b.com' });
    expect(res.status).toBe(403);
    expect(await prisma.promptAttribution.count()).toBe(0);
  });

  it('oturumu olmayan istek 401 (yönetim ucu herkese açık değil)', async () => {
    expect((await call(listAttribution, { url: '/api/discovery/attribution' })).status).toBe(401);
    expect((await call(runAttribution, { method: 'POST', url: '/api/discovery/attribution?siteId=x' })).status).toBe(
      401,
    );
  });
});
