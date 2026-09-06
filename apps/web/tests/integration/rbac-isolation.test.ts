import { describe, expect, it } from 'vitest';
import { addMember, call, createTenant, loginAs, prisma, flushAfter } from './helpers';
import { POST as createPrompt, GET as listPrompts } from '@/app/api/prompts/route';
import { GET as getPrompt, PATCH as patchPrompt, DELETE as deletePrompt } from '@/app/api/prompts/[id]/route';
import { POST as createCompetitor } from '@/app/api/competitors/route';
import { DELETE as deleteCompetitor } from '@/app/api/competitors/[id]/route';
import { POST as createBrand, GET as listBrands } from '@/app/api/brands/route';
import { PATCH as patchBrand } from '@/app/api/brands/[id]/route';
import { GET as listTokens, POST as createToken } from '@/app/api/api-tokens/route';
import { PUT as putAlerts } from '@/app/api/alerts/route';
import { POST as runPrompt } from '@/app/api/prompts/[id]/run/route';
import { GET as metrics } from '@/app/api/dashboard/metrics/route';
import { POST as triggerCron } from '@/app/api/admin/trigger-cron/route';
import { GET as adminJobs } from '@/app/api/admin/jobs/route';

describe('RBAC (sunucu tarafı)', () => {
  it('VIEWER yazamaz (403), ADMIN yazabilir, OWNER token üretebilir; ADMIN token üretemez', async () => {
    const { tenant, user: owner } = await createTenant();
    const viewer = await addMember(tenant.id, 'VIEWER');
    const admin = await addMember(tenant.id, 'ADMIN');

    await loginAs(viewer);
    expect((await call(createPrompt, { method: 'POST', body: { text: 'En iyi POS hangisi?' } })).status).toBe(403);
    expect((await call(createCompetitor, { method: 'POST', body: { name: 'Adisyo' } })).status).toBe(403);
    expect((await call(putAlerts, { method: 'PUT', body: { emailEnabled: false } })).status).toBe(403);
    expect((await call(listPrompts)).status).toBe(200); // okuma serbest

    await loginAs(admin);
    const created = await call(createPrompt, { method: 'POST', body: { text: 'En iyi POS hangisi?' } });
    expect(created.status).toBe(201);
    await flushAfter();
    expect((await call(createToken, { method: 'POST', body: { name: 'x' } })).status).toBe(403);
    expect((await call(listTokens)).status).toBe(403);

    await loginAs(owner);
    const tok = await call(createToken, { method: 'POST', body: { name: 'Zapier' } });
    expect(tok.status).toBe(201);
    expect(String(tok.json.token)).toMatch(/^iai_live_/);
  });

  it('süper admin uçları sıradan OWNER için 403', async () => {
    const { user } = await createTenant();
    await loginAs(user);
    expect((await call(triggerCron, { method: 'POST' })).status).toBe(403);
    expect((await call(adminJobs)).status).toBe(403);
  });

  it('oturum yoksa 401', async () => {
    expect((await call(listPrompts)).status).toBe(401);
    expect((await call(metrics)).status).toBe(401);
  });
});

describe('tenant izolasyonu (IDOR)', () => {
  it("başka tenant'ın prompt/rakip/markasına GET/PATCH/DELETE 404", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const pA = await prisma.prompt.create({ data: { tenantId: a.tenant.id, text: 'A promptu burada' } });
    const cA = await prisma.competitor.create({ data: { tenantId: a.tenant.id, name: 'RakipA' } });
    const bA = await prisma.brand.create({ data: { tenantId: a.tenant.id, name: 'MarkaA', isOwn: true } });

    await loginAs(b.user);
    expect((await call(getPrompt, { params: { id: pA.id } })).status).toBe(404);
    expect(
      (await call(patchPrompt, { method: 'PATCH', body: { isActive: false }, params: { id: pA.id } })).status,
    ).toBe(404);
    expect((await call(deletePrompt, { method: 'DELETE', params: { id: pA.id } })).status).toBe(404);
    expect((await call(runPrompt, { method: 'POST', params: { id: pA.id } })).status).toBe(404);
    expect((await call(deleteCompetitor, { method: 'DELETE', params: { id: cA.id } })).status).toBe(404);
    expect((await call(patchBrand, { method: 'PATCH', body: { name: 'Hack' }, params: { id: bA.id } })).status).toBe(
      404,
    );

    // veri dokunulmadı
    expect((await prisma.prompt.findUnique({ where: { id: pA.id } }))!.isActive).toBe(true);
    expect(await prisma.competitor.count({ where: { id: cA.id } })).toBe(1);
    expect((await prisma.brand.findUnique({ where: { id: bA.id } }))!.name).toBe('MarkaA');
    // liste yalnızca kendi verisi
    const list = await call(listPrompts);
    expect((list.json as unknown as unknown[]).length).toBe(0);
  });

  it("metrikler yalnızca kendi tenant'ının run'larını sayar", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const pA = await prisma.prompt.create({ data: { tenantId: a.tenant.id, text: 'A promptu burada' } });
    await prisma.modelRun.create({
      data: {
        promptId: pA.id,
        provider: 'OPENAI',
        modelName: 'm',
        responseText: 'x',
        status: 'SUCCESS',
        mentions: { create: [{ mentionName: 'MarkaA', isOwnBrand: true, position: 1, snippet: 's' }] },
      },
    });
    await loginAs(b.user);
    const m = await call(metrics);
    expect(m.json.totalRuns).toBe(0);
    await loginAs(a.user);
    expect((await call(metrics)).json.totalRuns).toBe(1);
  });
});

describe('deneme süresi (entitlement)', () => {
  it('süresi dolmuş tenant: okuma 200, yazma 403 trial_expired, cron kuyruğuna girmez', async () => {
    const { user, tenant } = await createTenant({ trialDaysLeft: -30 });
    await prisma.prompt.create({ data: { tenantId: tenant.id, text: 'Eski soru burada' } });
    await loginAs(user);
    expect((await call(listPrompts)).status).toBe(200);
    const w = await call(createPrompt, { method: 'POST', body: { text: 'Yeni soru ekle' } });
    expect(w.status).toBe(403);
    expect(w.json.code).toBe('trial_expired');
    const { enqueueDailyRuns } = await import('@/server/run-prompt');
    const q = await enqueueDailyRuns();
    expect(q.enqueued).toBe(0);
    expect(q.skippedTenants).toBe(1);
  });

  it('ücretli plan atanmış tenant süre dolsa da yazabilir', async () => {
    const { user } = await createTenant({ trialDaysLeft: -30, plan: 'STARTER' });
    await loginAs(user);
    expect((await call(createPrompt, { method: 'POST', body: { text: 'Yeni soru ekle' } })).status).toBe(201);
    await flushAfter();
  });

  it('lansmanda tek kendi markası; ikincisi 409', async () => {
    const { user } = await createTenant();
    await loginAs(user);
    expect((await call(createBrand, { method: 'POST', body: { name: 'Marka1' } })).status).toBe(201);
    expect((await call(createBrand, { method: 'POST', body: { name: 'Marka2' } })).status).toBe(409);
    expect((await call(listBrands)).json).toHaveLength(1);
  });
});
