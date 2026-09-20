/**
 * Ajans tespiti — ziyaretçi/tenant sinyal hesabı (5 host → ≥45), route üzerinden after() ile touch,
 * "Ben ajansım" beyanı (→100 DECLARED + audit + Lead ONBOARDING/ajans, e-posta yalnız izinle), VIEWER 403,
 * DECLARED/DISMISSED yeniden hesapta ezilmez, dashboard GET, admin aday PATCH (403 admin değil).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addMember, call, createTenant, flushAfter, loginAs, logout, prisma } from './helpers';
import { GOOD_HOME, GOOD_ROBOTS, GOOD_SITEMAP, GOOD_LLMS } from '../fixtures/commerce-html';

vi.mock('@/server/safe-fetch', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    safeFetch: async (rawUrl: string) => {
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

import { POST as aiCrawler } from '@/app/api/tools/ai-crawler/route';
import { POST as declare } from '@/app/api/agency-signal/declare/route';
import { GET as mySignal } from '@/app/api/dashboard/agency-signal/route';
import { PATCH as patchCandidate } from '@/app/api/admin/agency-candidates/[id]/route';
import { computeTenantSignal, computeVisitorSignal, markPreanalysisUsed } from '@/server/agency-signal';
import { clearBlocklistCache } from '@/server/blocklist';

const VH = 'a'.repeat(64);
const DAY = 86_400_000;

async function seedScans(
  data: {
    hostname: string;
    visitorHash?: string;
    tenantId?: string;
    kind?: 'CRAWLER' | 'COMPARE' | 'QUESTION_COVERAGE';
    sector?: string;
    ageDays?: number;
  }[],
) {
  for (const d of data) {
    await prisma.publicScan.create({
      data: {
        kind: d.kind ?? 'CRAWLER',
        urlHash: `h-${d.hostname}-${d.kind ?? 'CRAWLER'}-${d.sector ?? ''}-${Math.random()}`,
        hostname: d.hostname,
        score: 50,
        result: {},
        visitorHash: d.visitorHash ?? null,
        tenantId: d.tenantId ?? null,
        sector: d.sector ?? null,
        createdAt: new Date(Date.now() - (d.ageDays ?? 0) * DAY),
        expiresAt: new Date(Date.now() + 30 * DAY),
      },
    });
  }
}

beforeEach(() => clearBlocklistCache());

describe('ziyaretçi sinyali', () => {
  it('5 farklı eTLD+1 → ≥45; alt alan adları tek site sayılır; 30 günden eski taramalar sayılmaz', async () => {
    await seedScans([
      { hostname: 'a.example', visitorHash: VH },
      { hostname: 'shop.a.example', visitorHash: VH },
      { hostname: 'b.example', visitorHash: VH },
      { hostname: 'c.example', visitorHash: VH },
      { hostname: 'd.example', visitorHash: VH },
      { hostname: 'e.example', visitorHash: VH },
      { hostname: 'eski.example', visitorHash: VH, ageDays: 40 },
    ]);
    const s = await computeVisitorSignal(VH);
    expect(s?.score).toBeGreaterThanOrEqual(45);
    expect(s?.reasons.find((r) => r.key === 'many_hosts')?.weight).toBe(45);
    expect(s?.hostnames).not.toContain('eski.example');
    const row = await prisma.agencySignal.findUniqueOrThrow({
      where: { subject_subjectId: { subject: 'VISITOR', subjectId: VH } },
    });
    expect(row.score).toBe(s?.score);
    expect(row.status).toBe('CANDIDATE');
  });

  it('skorsuz ziyaretçi için satır açılmaz; ön-analiz nedeni kalıcı ve hostname yazılmaz', async () => {
    expect((await computeVisitorSignal(VH))?.persisted).toBe(false);
    expect(await prisma.agencySignal.count()).toBe(0);
    await markPreanalysisUsed(VH);
    const row = await prisma.agencySignal.findUniqueOrThrow({
      where: { subject_subjectId: { subject: 'VISITOR', subjectId: VH } },
    });
    expect(row.score).toBe(10);
    expect(row.hostnames).toEqual([]);
    await seedScans([
      { hostname: 'x.example', visitorHash: VH },
      { hostname: 'y.example', visitorHash: VH },
    ]);
    const s = await computeVisitorSignal(VH);
    expect(s?.score).toBe(25); // 15 (2 site) + 10 (ön-analiz korunur)
  });

  it("public tarama route'u after() ile touch eder: 5 host aynı ziyaretçi → aday", async () => {
    logout();
    for (const host of ['s1.example', 's2.example', 's3.example', 's4.example', 's5.example']) {
      const r = await call(aiCrawler, {
        method: 'POST',
        body: { url: host },
        headers: { 'x-forwarded-for': '198.51.100.240', 'user-agent': 'Mozilla/5.0 Chrome/128' },
      });
      expect(r.status).toBe(200);
    }
    await flushAfter();
    const rows = await prisma.agencySignal.findMany({ where: { subject: 'VISITOR' } });
    expect(rows.length).toBe(1);
    expect(rows[0]!.score).toBeGreaterThanOrEqual(45);
    expect(rows[0]!.hostnames.length).toBe(5);
    expect(rows[0]!.subjectId).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('tenant sinyali ve beyan', () => {
  it('sektör ajans + e-posta anahtar kelimesi → 60 aday; band ≥70 değil; GET kendi skoru', async () => {
    const { user, tenant } = await createTenant({ email: 'ekip@dijitalmedya.example' });
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { industry: 'ajans', website: 'https://dijitalmedya.example' },
    });
    const s = await computeTenantSignal(tenant.id);
    expect(s?.score).toBe(60);
    expect(s?.reasons.map((r) => r.key).sort()).toEqual(['email_keyword', 'industry_agency']);
    await loginAs(user);
    const g = await call(mySignal);
    expect(g.status).toBe(200);
    expect(g.json).toMatchObject({ score: 60, status: 'CANDIDATE', showBand: false });
    expect(g.text).not.toMatch(/hostnames|198\.51/);

    // 3 site daha (kendi sitesi dışında 2) → 60 + 30 + 15 = 100'e kırpılır… (many_hosts 3 → 30, mismatch 15) = 100 → band
    await seedScans([
      { hostname: 'dijitalmedya.example', tenantId: tenant.id },
      { hostname: 'musteri1.example', tenantId: tenant.id },
      { hostname: 'musteri2.example', tenantId: tenant.id },
    ]);
    const s2 = await computeTenantSignal(tenant.id);
    expect(s2?.score).toBe(100);
    expect((await call(mySignal)).json).toMatchObject({ score: 100, showBand: true });
  });

  it('ajans hesabı (kind AGENCY) hesaplanmaz', async () => {
    const { tenant } = await createTenant();
    await prisma.tenant.update({ where: { id: tenant.id }, data: { kind: 'AGENCY', industry: 'ajans' } });
    expect(await computeTenantSignal(tenant.id)).toBeNull();
    expect(await prisma.agencySignal.count()).toBe(0);
  });

  it('declare: OWNER → 100 DECLARED + audit + Lead ONBOARDING/ajans (e-posta yalnız izinle); yeniden hesap ezmez; VIEWER 403; ajans hesabı 400', async () => {
    const { user, tenant } = await createTenant();
    await prisma.tenant.update({ where: { id: tenant.id }, data: { website: 'https://www.beyan.example' } });
    const viewer = await addMember(tenant.id, 'VIEWER');
    await loginAs(viewer);
    expect((await call(declare, { method: 'POST', body: {} })).status).toBe(403);
    expect(await prisma.agencySignal.count()).toBe(0);

    await loginAs(user);
    const r = await call(declare, { method: 'POST', body: { contactConsent: false } });
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ ok: true, score: 100, status: 'DECLARED' });
    const row = await prisma.agencySignal.findUniqueOrThrow({
      where: { subject_subjectId: { subject: 'TENANT', subjectId: tenant.id } },
    });
    expect(row.status).toBe('DECLARED');
    expect(row.declaredAt).not.toBeNull();
    expect(await prisma.auditLog.count({ where: { action: 'agency.declared', tenantId: tenant.id } })).toBe(1);
    const lead = await prisma.lead.findUniqueOrThrow({ where: { hostname: 'beyan.example' } });
    expect(lead.source).toBe('ONBOARDING');
    expect(lead.topic).toBe('ajans');
    expect(lead.tenantId).toBe(tenant.id);
    expect(lead.contactEmail).toBeNull();
    expect(JSON.stringify(lead.activity)).toContain('agency_declared');

    // izinle: e-posta + consentAt yazılır; gövdesiz istek de geçerli
    const r2 = await call(declare, { method: 'POST', body: { contactConsent: true } });
    expect(r2.status).toBe(200);
    const lead2 = await prisma.lead.findUniqueOrThrow({ where: { hostname: 'beyan.example' } });
    expect(lead2.contactEmail).toBe(user.email.toLowerCase());
    expect(lead2.consentAt).not.toBeNull();
    expect((await call(declare, { method: 'POST' })).status).toBe(200);

    // yeniden hesap DECLARED'ı ezmez (skor 100, statü kalır)
    const s = await computeTenantSignal(tenant.id);
    expect(s?.status).toBe('DECLARED');
    expect(s?.score).toBe(100);
    const g = await call(mySignal);
    expect(g.json).toMatchObject({ score: 100, status: 'DECLARED', showBand: false });

    const ag = await createTenant();
    await prisma.tenant.update({ where: { id: ag.tenant.id }, data: { kind: 'AGENCY' } });
    await loginAs(ag.user);
    expect((await call(declare, { method: 'POST', body: {} })).status).toBe(400);
  });

  it('declare tenant başına 5/saat: 6. istek 429', async () => {
    const { user } = await createTenant();
    await loginAs(user);
    let last = { status: 0 };
    for (let i = 0; i < 6; i += 1) last = await call(declare, { method: 'POST', body: {} });
    expect(last.status).toBe(429);
  });
});

describe('admin aday aksiyonları', () => {
  it('PATCH status/note + audit; DISMISSED yeniden hesapta ezilmez; DECLARED elle atanamaz; admin değil 403', async () => {
    const { tenant } = await createTenant({ email: 'x@reklamajansi.example' });
    await prisma.tenant.update({ where: { id: tenant.id }, data: { industry: 'ajans' } });
    const s = await computeTenantSignal(tenant.id);
    expect(s?.score).toBe(60);
    const row = await prisma.agencySignal.findFirstOrThrow({ where: { subjectId: tenant.id } });

    const { user: owner } = await createTenant();
    await loginAs(owner);
    expect(
      (await call(patchCandidate, { method: 'PATCH', body: { status: 'CONTACTED' }, params: { id: row.id } })).status,
    ).toBe(403);

    const { user: admin } = await createTenant({ superAdmin: true });
    await loginAs(admin);
    const r = await call(patchCandidate, {
      method: 'PATCH',
      body: { status: 'CONTACTED', note: 'Arandı' },
      params: { id: row.id },
    });
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ status: 'CONTACTED', note: 'Arandı' });
    expect(await prisma.auditLog.count({ where: { action: 'admin.agency_candidate_update', targetId: row.id } })).toBe(
      1,
    );
    expect(
      (await call(patchCandidate, { method: 'PATCH', body: { status: 'DECLARED' }, params: { id: row.id } })).status,
    ).toBe(400);
    expect(
      (await call(patchCandidate, { method: 'PATCH', body: { status: 'X' }, params: { id: row.id } })).status,
    ).toBe(400);
    expect((await call(patchCandidate, { method: 'PATCH', body: {}, params: { id: row.id } })).status).toBe(400);
    expect(
      (await call(patchCandidate, { method: 'PATCH', body: { status: 'CONTACTED' }, params: { id: 'yok' } })).status,
    ).toBe(404);

    await call(patchCandidate, { method: 'PATCH', body: { status: 'DISMISSED' }, params: { id: row.id } });
    await seedScans([
      { hostname: 'm1.example', tenantId: tenant.id },
      { hostname: 'm2.example', tenantId: tenant.id },
      { hostname: 'm3.example', tenantId: tenant.id },
    ]);
    const s2 = await computeTenantSignal(tenant.id);
    expect(s2?.status).toBe('DISMISSED');
    expect(s2?.score).toBe(60); // skor korunur, kanıt tazelenir
    expect(s2?.hostnames.length).toBe(3);
  });
});
