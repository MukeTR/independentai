/**
 * Discovery yönetim API'si — site yaşam döngüsü, anahtar sızıntısı, RBAC, plan sınırı,
 * tenant izolasyonu, hedef CRUD + şablon, özet ve oturum sayfalaması.
 *
 * Ağ çağrısı yapılmaz: meta etiketi doğrulaması (POST /verify) dışarı istek attığı için burada
 * yalnızca token/snippet üreten GET ucu test edilir.
 */
import { describe, expect, it } from 'vitest';
import { addMember, call, createTenant, loginAs, prisma, uniq } from './helpers';
import { pathMatches } from '@/server/discovery/goals';
import { GET as listSites, POST as createSite } from '@/app/api/discovery/sites/route';
import { PATCH as patchSite, DELETE as deleteSite } from '@/app/api/discovery/sites/[id]/route';
import { POST as rotateKey } from '@/app/api/discovery/sites/[id]/keys/route';
import { GET as verifyInfo } from '@/app/api/discovery/sites/[id]/verify/route';
import { GET as listGoals, POST as createGoal } from '@/app/api/discovery/sites/[id]/goals/route';
import { PATCH as patchGoal, DELETE as deleteGoal } from '@/app/api/discovery/sites/[id]/goals/[goalId]/route';
import { POST as applyTemplate } from '@/app/api/discovery/sites/[id]/goals/template/route';
import { GET as getOverview } from '@/app/api/discovery/overview/route';
import { GET as getSessions } from '@/app/api/discovery/sessions/route';

type SiteRow = {
  id: string;
  domain: string;
  status: string;
  siteKind: string | null;
  retentionDays: number;
  publicKeyPrefix: string;
  hasIngestSecret: boolean;
  allowedOrigins: string[];
  health: { browser: string; server: string; verified: boolean; hints: string[] };
};

async function addSite(domain = `${uniq('site')}.example.com`, body: Record<string, unknown> = {}) {
  const r = await call(createSite, { method: 'POST', url: '/api/discovery/sites', body: { domain, ...body } });
  expect(r.status).toBe(201);
  return { res: r, site: r.json.site as unknown as SiteRow, publicKey: r.json.publicKey as unknown as string };
}

async function seedSession(
  tenantId: string,
  trackedSiteId: string,
  opts: { minutesAgo: number; landingPath?: string; provider?: string; converted?: boolean } = { minutesAgo: 1 },
) {
  const at = new Date(Date.now() - opts.minutesAgo * 60_000);
  return prisma.aiAcquisitionSession.create({
    data: {
      tenantId,
      trackedSiteId,
      sessionKey: uniq('sk'),
      sourceClass: 'AI_REFERRAL',
      provider: opts.provider ?? 'openai',
      referrerHost: 'chatgpt.com',
      landingPath: opts.landingPath ?? '/',
      firstSeenAt: at,
      lastSeenAt: at,
      convertedAt: opts.converted ? at : null,
      eventCount: 2,
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });
}

describe('GET /api/discovery/sites', () => {
  it('boş liste + plan sınırı + snippet adresi; gizli alan yok', async () => {
    const { user } = await createTenant();
    await loginAs(user);
    const r = await call(listSites, { url: '/api/discovery/sites' });
    expect(r.status).toBe(200);
    expect(r.json.sites).toEqual([]);
    const limits = r.json.limits as unknown as { trackedSites: number; used: number; sensorEventsPerMonth: number };
    expect(limits.trackedSites).toBe(3);
    expect(limits.used).toBe(0);
    expect(limits.sensorEventsPerMonth).toBeGreaterThan(0);
    expect(String(r.json.scriptUrl)).toMatch(/^https?:\/\/.+\/sensor\/v1\.js$/);
    expect(r.json.canWrite).toBe(true);
  });

  it("ajans ev tenant'ında (kind AGENCY) tüm uçlar 403 brandContext", async () => {
    const { user, tenant } = await createTenant();
    await prisma.tenant.update({ where: { id: tenant.id }, data: { kind: 'AGENCY' } });
    await loginAs(user);
    expect((await call(listSites, { url: '/api/discovery/sites' })).status).toBe(403);
    const post = await call(createSite, {
      method: 'POST',
      url: '/api/discovery/sites',
      body: { domain: 'ornek.com' },
    });
    expect(post.status).toBe(403);
    expect(post.json.code).toBe('forbidden');
    expect((await call(getOverview, { url: '/api/discovery/overview' })).status).toBe(403);
    expect((await call(getSessions, { url: '/api/discovery/sessions' })).status).toBe(403);
  });
});

describe('POST /api/discovery/sites', () => {
  it('site oluşturur; publicKey YALNIZCA burada döner, özet/şifreli alanlar sızmaz', async () => {
    const { user, tenant } = await createTenant();
    await loginAs(user);
    const { res, site, publicKey } = await addSite('https://Ornek.Example.com/anasayfa', { siteKind: 'saas' });

    expect(site.domain).toBe('ornek.example.com');
    expect(site.status).toBe('PENDING');
    expect(site.siteKind).toBe('saas');
    expect(site.allowedOrigins).toContain('https://ornek.example.com');
    expect(site.allowedOrigins).toContain('https://www.ornek.example.com');
    expect(publicKey.startsWith('iais_')).toBe(true);
    expect(res.text).not.toContain('publicKeyHash');
    expect(res.text).not.toContain('ingestSecretEnc');

    // DB'de yalnızca özet tutulur
    const row = await prisma.trackedSite.findFirstOrThrow({ where: { tenantId: tenant.id } });
    expect(row.publicKeyHash).not.toContain(publicKey);
    expect(row.publicKeyHash).toHaveLength(64);

    // Liste ucunda ham anahtar bir daha görünmez
    const list = await call(listSites, { url: '/api/discovery/sites' });
    expect(list.text).not.toContain(publicKey);
    expect(list.text).not.toContain('publicKeyHash');
    expect(list.text).not.toContain('ingestSecretEnc');
    const sites = list.json.sites as unknown as (SiteRow & { publicKey?: string })[];
    expect(sites[0]?.publicKey).toBeUndefined();
    expect(sites[0]?.publicKeyPrefix).toBe(site.publicKeyPrefix);
  });

  it('geçersiz alan adı 400; aynı alan adı ikinci kez 409', async () => {
    const { user } = await createTenant();
    await loginAs(user);
    const bad = await call(createSite, {
      method: 'POST',
      url: '/api/discovery/sites',
      body: { domain: 'bu bir alan adı değil' },
    });
    expect(bad.status).toBe(400);
    expect(
      (await call(createSite, { method: 'POST', url: '/api/discovery/sites', body: { domain: 'localhost' } })).status,
    ).toBe(400);

    await addSite('tekrar.example.com');
    const dup = await call(createSite, {
      method: 'POST',
      url: '/api/discovery/sites',
      body: { domain: 'tekrar.example.com' },
    });
    expect(dup.status).toBe(409);
    expect(dup.json.code).toBe('conflict');
  });

  it('plan sınırı: STARTER 1 site → ikinci 403 plan_limit', async () => {
    const { user } = await createTenant({ plan: 'STARTER' });
    await loginAs(user);
    await addSite('birinci.example.com');
    const second = await call(createSite, {
      method: 'POST',
      url: '/api/discovery/sites',
      body: { domain: 'ikinci.example.com' },
    });
    expect(second.status).toBe(403);
    expect(second.json.code).toBe('plan_limit');
    expect(await prisma.trackedSite.count()).toBe(1);
  });

  it('VIEWER yazamaz (403) ama okuyabilir (canWrite=false)', async () => {
    const { tenant } = await createTenant();
    const viewer = await addMember(tenant.id, 'VIEWER');
    await loginAs(viewer);
    const post = await call(createSite, {
      method: 'POST',
      url: '/api/discovery/sites',
      body: { domain: 'viewer.example.com' },
    });
    expect(post.status).toBe(403);
    const list = await call(listSites, { url: '/api/discovery/sites' });
    expect(list.status).toBe(200);
    expect(list.json.canWrite).toBe(false);
  });
});

describe('PATCH / DELETE / keys / verify', () => {
  it('durum, saklama süresi, site türü ve origin listesi güncellenir; geçersiz değer 400', async () => {
    const { user } = await createTenant();
    await loginAs(user);
    const { site } = await addSite();

    const paused = await call(patchSite, {
      method: 'PATCH',
      url: `/api/discovery/sites/${site.id}`,
      params: { id: site.id },
      body: { status: 'PAUSED', retentionDays: 30, siteKind: 'ecommerce', installMethod: 'gtm' },
    });
    expect(paused.status).toBe(200);
    const updated = paused.json.site as unknown as SiteRow;
    expect(updated.status).toBe('PAUSED');
    expect(updated.retentionDays).toBe(30);
    expect(updated.siteKind).toBe('ecommerce');
    expect(paused.text).not.toContain('publicKeyHash');

    const resumed = await call(patchSite, {
      method: 'PATCH',
      url: `/api/discovery/sites/${site.id}`,
      params: { id: site.id },
      body: { status: 'ACTIVE' },
    });
    expect((resumed.json.site as unknown as SiteRow).status).toBe('ACTIVE');

    const badStatus = await call(patchSite, {
      method: 'PATCH',
      url: `/api/discovery/sites/${site.id}`,
      params: { id: site.id },
      body: { status: 'HACKED' },
    });
    expect(badStatus.status).toBe(400);

    const badRetention = await call(patchSite, {
      method: 'PATCH',
      url: `/api/discovery/sites/${site.id}`,
      params: { id: site.id },
      body: { retentionDays: 5000 },
    });
    expect(badRetention.status).toBe(400);

    // İptal edilen site yeniden açılamaz
    await call(patchSite, {
      method: 'PATCH',
      url: `/api/discovery/sites/${site.id}`,
      params: { id: site.id },
      body: { status: 'REVOKED' },
    });
    const reopen = await call(patchSite, {
      method: 'PATCH',
      url: `/api/discovery/sites/${site.id}`,
      params: { id: site.id },
      body: { status: 'ACTIVE' },
    });
    expect(reopen.status).toBe(409);
  });

  it('anahtar rotasyonu: değer bir kez döner, özet DB’de değişir, sır yanıt gövdesinde şifreli hâliyle geçmez', async () => {
    const { user } = await createTenant();
    await loginAs(user);
    const { site, publicKey } = await addSite();
    const before = await prisma.trackedSite.findUniqueOrThrow({ where: { id: site.id } });

    const rotated = await call(rotateKey, {
      method: 'POST',
      url: `/api/discovery/sites/${site.id}/keys`,
      params: { id: site.id },
      body: { kind: 'public' },
    });
    expect(rotated.status).toBe(200);
    const newKey = rotated.json.publicKey as unknown as string;
    expect(newKey.startsWith('iais_')).toBe(true);
    expect(newKey).not.toBe(publicKey);
    expect(rotated.text).not.toContain('publicKeyHash');
    const after = await prisma.trackedSite.findUniqueOrThrow({ where: { id: site.id } });
    expect(after.publicKeyHash).not.toBe(before.publicKeyHash);

    const secret = await call(rotateKey, {
      method: 'POST',
      url: `/api/discovery/sites/${site.id}/keys`,
      params: { id: site.id },
      body: { kind: 'ingest' },
    });
    expect(secret.status).toBe(200);
    const raw = secret.json.secret as unknown as string;
    expect(raw.startsWith('iaix_')).toBe(true);
    expect((secret.json.site as unknown as SiteRow).hasIngestSecret).toBe(true);
    expect(secret.text).not.toContain('ingestSecretEnc');
    const stored = await prisma.trackedSite.findUniqueOrThrow({ where: { id: site.id } });
    expect(stored.ingestSecretEnc).toBeTruthy();
    expect(stored.ingestSecretEnc).not.toContain(raw);

    const bad = await call(rotateKey, {
      method: 'POST',
      url: `/api/discovery/sites/${site.id}/keys`,
      params: { id: site.id },
      body: { kind: 'admin' },
    });
    expect(bad.status).toBe(400);
  });

  it('doğrulama token’ı ve meta etiketi döner (dış istek yok)', async () => {
    const { user } = await createTenant();
    await loginAs(user);
    const { site } = await addSite();
    const r = await call(verifyInfo, { url: `/api/discovery/sites/${site.id}/verify`, params: { id: site.id } });
    expect(r.status).toBe(200);
    const token = r.json.token as unknown as string;
    expect(token).toMatch(/^[0-9a-f]{32}$/);
    expect(String(r.json.metaTag)).toContain('independentai-site-verification');
    expect(String(r.json.metaTag)).toContain(token);
    expect(r.json.verifiedAt).toBeNull();
  });

  it('silme onay ister; onaylı silmede site ve telemetri verisi gider', async () => {
    const { user, tenant } = await createTenant();
    await loginAs(user);
    const { site } = await addSite();
    await seedSession(tenant.id, site.id, { minutesAgo: 5 });

    const noConfirm = await call(deleteSite, {
      method: 'DELETE',
      url: `/api/discovery/sites/${site.id}`,
      params: { id: site.id },
    });
    expect(noConfirm.status).toBe(400);
    expect(await prisma.trackedSite.count({ where: { id: site.id } })).toBe(1);

    const ok = await call(deleteSite, {
      method: 'DELETE',
      url: `/api/discovery/sites/${site.id}?confirm=1`,
      params: { id: site.id },
    });
    expect(ok.status).toBe(200);
    expect(await prisma.trackedSite.count({ where: { id: site.id } })).toBe(0);
    expect(await prisma.aiAcquisitionSession.count({ where: { trackedSiteId: site.id } })).toBe(0);
  });

  it('VIEWER yazma uçlarında 403; okuma uçlarında 200', async () => {
    const { user, tenant } = await createTenant();
    await loginAs(user);
    const { site } = await addSite();
    const viewer = await addMember(tenant.id, 'VIEWER');
    await loginAs(viewer);
    const params = { id: site.id };
    expect(
      (
        await call(patchSite, {
          method: 'PATCH',
          url: `/api/discovery/sites/${site.id}`,
          params,
          body: { status: 'PAUSED' },
        })
      ).status,
    ).toBe(403);
    expect(
      (await call(deleteSite, { method: 'DELETE', url: `/api/discovery/sites/${site.id}?confirm=1`, params })).status,
    ).toBe(403);
    expect(
      (
        await call(rotateKey, {
          method: 'POST',
          url: `/api/discovery/sites/${site.id}/keys`,
          params,
          body: { kind: 'public' },
        })
      ).status,
    ).toBe(403);
    expect((await call(verifyInfo, { url: `/api/discovery/sites/${site.id}/verify`, params })).status).toBe(200);
    expect((await call(listGoals, { url: `/api/discovery/sites/${site.id}/goals`, params })).status).toBe(200);
    expect(
      (
        await call(createGoal, {
          method: 'POST',
          url: `/api/discovery/sites/${site.id}/goals`,
          params,
          body: { name: 'X', type: 'LEAD', matchMethod: 'PATH', pathPattern: '/x' },
        })
      ).status,
    ).toBe(403);
  });
});

describe('tenant izolasyonu', () => {
  it("başka tenant'ın site id'si her uçta 404 (veri değişmez)", async () => {
    const owner = await createTenant();
    await loginAs(owner.user);
    const { site } = await addSite('sahibi.example.com');
    const goal = await call(createGoal, {
      method: 'POST',
      url: `/api/discovery/sites/${site.id}/goals`,
      params: { id: site.id },
      body: { name: 'Teşekkür', type: 'LEAD', matchMethod: 'PATH', pathPattern: '/tesekkurler' },
    });
    const goalId = (goal.json.goal as unknown as { id: string }).id;

    const other = await createTenant();
    await loginAs(other.user);
    const params = { id: site.id };
    expect(
      (
        await call(patchSite, {
          method: 'PATCH',
          url: `/api/discovery/sites/${site.id}`,
          params,
          body: { status: 'PAUSED' },
        })
      ).status,
    ).toBe(404);
    expect(
      (await call(deleteSite, { method: 'DELETE', url: `/api/discovery/sites/${site.id}?confirm=1`, params })).status,
    ).toBe(404);
    expect(
      (
        await call(rotateKey, {
          method: 'POST',
          url: `/api/discovery/sites/${site.id}/keys`,
          params,
          body: { kind: 'public' },
        })
      ).status,
    ).toBe(404);
    expect((await call(verifyInfo, { url: `/api/discovery/sites/${site.id}/verify`, params })).status).toBe(404);
    expect((await call(listGoals, { url: `/api/discovery/sites/${site.id}/goals`, params })).status).toBe(404);
    expect(
      (
        await call(patchGoal, {
          method: 'PATCH',
          url: `/api/discovery/sites/${site.id}/goals/${goalId}`,
          params: { id: site.id, goalId },
          body: { isActive: false },
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await call(applyTemplate, {
          method: 'POST',
          url: `/api/discovery/sites/${site.id}/goals/template`,
          params,
          body: { kind: 'saas' },
        })
      ).status,
    ).toBe(404);
    expect((await call(getOverview, { url: `/api/discovery/overview?siteId=${site.id}` })).status).toBe(404);
    expect((await call(getSessions, { url: `/api/discovery/sessions?siteId=${site.id}` })).status).toBe(404);

    expect(await prisma.trackedSite.count({ where: { id: site.id } })).toBe(1);
    expect(await prisma.siteGoal.count({ where: { id: goalId, isActive: true } })).toBe(1);

    // Bilinmeyen id de 404
    expect((await call(verifyInfo, { url: '/api/discovery/sites/yok/verify', params: { id: 'yok' } })).status).toBe(
      404,
    );
  });
});

describe('hedefler', () => {
  it('CRUD: PATH hedefi ekle, aktif/pasif değiştir, sil; 25 hedef sınırı geçerli', async () => {
    const { user } = await createTenant();
    await loginAs(user);
    const { site } = await addSite();
    const params = { id: site.id };

    const created = await call(createGoal, {
      method: 'POST',
      url: `/api/discovery/sites/${site.id}/goals`,
      params,
      body: { name: 'Teşekkür sayfası', type: 'LEAD', matchMethod: 'PATH', pathPattern: '/Tesekkurler/' },
    });
    expect(created.status).toBe(201);
    const goal = created.json.goal as unknown as { id: string; pathPattern: string; isActive: boolean };
    // Yol deseni yazıldığı gibi saklanır (sondaki `/` sadeleşir); eşleştirme büyük/küçük harf duyarsızdır.
    expect(goal.pathPattern).toBe('/Tesekkurler');
    expect(pathMatches(goal.pathPattern, '/tesekkurler')).toBe(true);
    expect(goal.isActive).toBe(true);

    const list = await call(listGoals, { url: `/api/discovery/sites/${site.id}/goals`, params });
    expect(list.status).toBe(200);
    expect((list.json.goals as unknown as unknown[]).length).toBe(1);
    expect((list.json.template as unknown as { kind: string }).kind).toBeTruthy();

    const off = await call(patchGoal, {
      method: 'PATCH',
      url: `/api/discovery/sites/${site.id}/goals/${goal.id}`,
      params: { id: site.id, goalId: goal.id },
      body: { isActive: false },
    });
    expect(off.status).toBe(200);
    expect((off.json.goal as unknown as { isActive: boolean }).isActive).toBe(false);

    const bad = await call(createGoal, {
      method: 'POST',
      url: `/api/discovery/sites/${site.id}/goals`,
      params,
      body: { name: 'Eksik', type: 'LEAD', matchMethod: 'PATH' },
    });
    expect(bad.status).toBe(400);

    const removed = await call(deleteGoal, {
      method: 'DELETE',
      url: `/api/discovery/sites/${site.id}/goals/${goal.id}`,
      params: { id: site.id, goalId: goal.id },
    });
    expect(removed.status).toBe(200);
    expect(await prisma.siteGoal.count({ where: { trackedSiteId: site.id } })).toBe(0);
  });

  it('şablon paketi uygulanır ve tekrar uygulanınca kopya üretmez', async () => {
    const { user } = await createTenant();
    await loginAs(user);
    const { site } = await addSite('sablon.example.com', { siteKind: 'saas' });
    const params = { id: site.id };

    const first = await call(applyTemplate, {
      method: 'POST',
      url: `/api/discovery/sites/${site.id}/goals/template`,
      params,
      body: { kind: 'saas' },
    });
    expect(first.status).toBe(201);
    const createdCount = (first.json.created as unknown as unknown[]).length;
    expect(createdCount).toBeGreaterThan(0);

    const again = await call(applyTemplate, {
      method: 'POST',
      url: `/api/discovery/sites/${site.id}/goals/template`,
      params,
      body: { kind: 'saas' },
    });
    expect(again.status).toBe(201);
    expect((again.json.created as unknown as unknown[]).length).toBe(0);
    expect(await prisma.siteGoal.count({ where: { trackedSiteId: site.id } })).toBe(createdCount);

    const bad = await call(applyTemplate, {
      method: 'POST',
      url: `/api/discovery/sites/${site.id}/goals/template`,
      params,
      body: { kind: 'olmayan' },
    });
    expect(bad.status).toBe(400);
  });
});

describe('özet ve oturumlar', () => {
  it('boş durumda 200 döner; üç kanal ayrı ve sıfır', async () => {
    const { user } = await createTenant();
    await loginAs(user);
    const r = await call(getOverview, { url: '/api/discovery/overview' });
    expect(r.status).toBe(200);
    const o = r.json.overview as unknown as {
      sites: unknown[];
      channels: { aiReferralSessions: number; crawlerHits: number; syntheticRuns: number };
      sessions: { total: number };
      crawler: { total: number; byBot: unknown[] };
      funnel: { stage: string }[];
      goals: unknown[];
    };
    expect(o.sites).toEqual([]);
    expect(o.channels).toEqual({ aiReferralSessions: 0, crawlerHits: 0, syntheticRuns: 0 });
    expect(o.sessions.total).toBe(0);
    expect(o.crawler.total).toBe(0);
    expect(o.funnel.map((f) => f.stage)).toEqual(['ai_visit', 'engaged', 'goal']);
    expect(r.json.canWrite).toBe(true);
  });

  it('site seçili özet: AI oturumları sayılır, crawler ile karışmaz', async () => {
    const { user, tenant } = await createTenant();
    await loginAs(user);
    const { site } = await addSite();
    await seedSession(tenant.id, site.id, { minutesAgo: 10, landingPath: '/fiyat', converted: false });
    await seedSession(tenant.id, site.id, { minutesAgo: 20, landingPath: '/fiyat' });

    const r = await call(getOverview, { url: `/api/discovery/overview?siteId=${site.id}&days=7` });
    expect(r.status).toBe(200);
    const o = r.json.overview as unknown as {
      siteId: string;
      range: { days: number };
      channels: { aiReferralSessions: number; crawlerHits: number };
      byProvider: { provider: string; sessions: number }[];
      topLandingPages: { path: string; sessions: number }[];
    };
    expect(o.siteId).toBe(site.id);
    expect(o.range.days).toBe(7);
    expect(o.channels.aiReferralSessions).toBe(2);
    expect(o.channels.crawlerHits).toBe(0);
    expect(o.byProvider[0]?.provider).toBe('openai');
    expect(o.topLandingPages[0]).toMatchObject({ path: '/fiyat', sessions: 2 });
    expect(r.text).not.toContain('publicKeyHash');
  });

  it('oturum listesi imleçle sayfalanır; geçersiz imleç 400', async () => {
    const { user, tenant } = await createTenant();
    await loginAs(user);
    const { site } = await addSite();
    await seedSession(tenant.id, site.id, { minutesAgo: 1, landingPath: '/a' });
    await seedSession(tenant.id, site.id, { minutesAgo: 2, landingPath: '/b' });
    await seedSession(tenant.id, site.id, { minutesAgo: 3, landingPath: '/c' });

    const first = await call(getSessions, { url: `/api/discovery/sessions?siteId=${site.id}&limit=2` });
    expect(first.status).toBe(200);
    const page1 = first.json as unknown as {
      items: { landingPath: string; providerLabel: string }[];
      nextCursor: string | null;
    };
    expect(page1.items.map((i) => i.landingPath)).toEqual(['/a', '/b']);
    expect(page1.items[0]?.providerLabel).toBe('ChatGPT');
    expect(page1.nextCursor).toBeTruthy();

    const second = await call(getSessions, {
      url: `/api/discovery/sessions?siteId=${site.id}&limit=2&cursor=${encodeURIComponent(page1.nextCursor!)}`,
    });
    expect(second.status).toBe(200);
    const page2 = second.json as unknown as { items: { landingPath: string }[]; nextCursor: string | null };
    expect(page2.items.map((i) => i.landingPath)).toEqual(['/c']);
    expect(page2.nextCursor).toBeNull();

    const bad = await call(getSessions, { url: `/api/discovery/sessions?siteId=${site.id}&cursor=abc` });
    expect(bad.status).toBe(400);
  });

  it('oturumlar tenant sınırını geçmez', async () => {
    const owner = await createTenant();
    await loginAs(owner.user);
    const { site } = await addSite('izole.example.com');
    await seedSession(owner.tenant.id, site.id, { minutesAgo: 1 });

    const other = await createTenant();
    await loginAs(other.user);
    const r = await call(getSessions, { url: '/api/discovery/sessions' });
    expect(r.status).toBe(200);
    expect((r.json as unknown as { items: unknown[] }).items).toEqual([]);
  });
});
