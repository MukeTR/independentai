import { describe, expect, it } from 'vitest';
import { call, createTenant, loginAs, prisma, flushAfter } from './helpers';
import { POST as onboarding } from '@/app/api/onboarding/route';
import { POST as createPrompt } from '@/app/api/prompts/route';
import { POST as runRoute } from '@/app/api/prompts/[id]/run/route';
import { GET as cronDaily } from '@/app/api/cron/daily-run/route';
import { enqueueDailyRuns, processQueue, scheduleRetries, runPromptOnce, dayBucket } from '@/server/run-prompt';

describe('onboarding (atomik)', () => {
  it('marka + rakipler + sorular tek çağrıda; tekrarlar elenir; onboardingCompletedAt set edilir; ilk run başlar', async () => {
    const { user, tenant } = await createTenant({ onboarded: false });
    await loginAs(user);
    const r = await call(onboarding, {
      method: 'POST',
      body: {
        brand: { name: 'KarPanel', aliases: ['karpanel.com', 'KARPANEL.COM'], website: 'karpanel.com' },
        competitors: ['Adisyo', 'adisyo', 'Simpra', 'KarPanel'],
        prompts: ['En iyi POS yazılımı?', 'en iyi pos yazılımı?', 'Restoran muhasebe programı'],
      },
    });
    expect(r.status).toBe(201);
    const t = await prisma.tenant.findUniqueOrThrow({ where: { id: tenant.id } });
    expect(t.onboardingCompletedAt).not.toBeNull();
    expect(await prisma.brand.count({ where: { tenantId: tenant.id, isOwn: true } })).toBe(1);
    expect((await prisma.brand.findFirst({ where: { tenantId: tenant.id } }))!.aliases).toEqual(['karpanel.com']);
    expect(await prisma.competitor.count({ where: { tenantId: tenant.id } })).toBe(2); // KarPanel kendi markası → elendi
    expect(await prisma.prompt.count({ where: { tenantId: tenant.id } })).toBe(2);
    await flushAfter();
    expect(await prisma.modelRun.count({ where: { prompt: { tenantId: tenant.id }, origin: 'INITIAL' } })).toBe(6);
  });

  it('geçersiz soru tüm işlemi geri alır (yarım kurulum yok)', async () => {
    const { user, tenant } = await createTenant({ onboarded: false });
    await loginAs(user);
    const r = await call(onboarding, {
      method: 'POST',
      body: { brand: { name: 'X' }, competitors: ['A'], prompts: ['kısa'] },
    });
    expect(r.status).toBe(400);
    expect(await prisma.brand.count({ where: { tenantId: tenant.id } })).toBe(0);
    expect(await prisma.competitor.count({ where: { tenantId: tenant.id } })).toBe(0);
    expect((await prisma.tenant.findUniqueOrThrow({ where: { id: tenant.id } })).onboardingCompletedAt).toBeNull();
  });

  it('yeniden çağrı idempotent (var olanı günceller, çoğaltmaz)', async () => {
    const { user, tenant } = await createTenant({ onboarded: false });
    await loginAs(user);
    const body = { brand: { name: 'X Marka' }, competitors: ['A'], prompts: ['Bir soru daha var'] };
    await call(onboarding, { method: 'POST', body });
    await call(onboarding, { method: 'POST', body: { ...body, brand: { name: 'X Marka Yeni' } } });
    await flushAfter();
    expect(await prisma.brand.count({ where: { tenantId: tenant.id } })).toBe(1);
    expect((await prisma.brand.findFirst({ where: { tenantId: tenant.id } }))!.name).toBe('X Marka Yeni');
    expect(await prisma.prompt.count({ where: { tenantId: tenant.id } })).toBe(1);
  });
});

describe('cron kuyruğu ve idempotency', () => {
  async function seed() {
    const { user, tenant } = await createTenant();
    await prisma.brand.create({ data: { tenantId: tenant.id, name: 'KarPanel', isOwn: true } });
    await prisma.competitor.create({ data: { tenantId: tenant.id, name: 'Adisyo' } });
    const p1 = await prisma.prompt.create({ data: { tenantId: tenant.id, text: 'Soru bir burada' } });
    const p2 = await prisma.prompt.create({ data: { tenantId: tenant.id, text: 'Soru iki burada', isActive: false } });
    return { user, tenant, p1, p2 };
  }

  it('enqueue iki kez çağrılsa da gün başına (prompt, provider) tek satır; pasif prompt girmez', async () => {
    const { p1 } = await seed();
    const a = await enqueueDailyRuns();
    const b = await enqueueDailyRuns();
    expect(a.enqueued).toBe(3);
    expect(b.enqueued).toBe(0);
    expect(await prisma.modelRun.count({ where: { promptId: p1.id, origin: 'CRON', status: 'PENDING' } })).toBe(3);
  });

  it('processQueue mock ile satırları SUCCESS yapar; mention/citation yazılır; maliyet null (mock)', async () => {
    const { p1 } = await seed();
    await enqueueDailyRuns();
    const s = await processQueue({ deadlineAt: Date.now() + 60_000 });
    expect(s.processed).toBe(3);
    expect(s.remaining).toBe(0);
    const runs = await prisma.modelRun.findMany({ where: { promptId: p1.id }, include: { mentions: true } });
    expect(runs.every((r) => r.status === 'SUCCESS' && r.isMocked)).toBe(true);
    expect(runs.every((r) => r.costUsd === null)).toBe(true);
    expect(runs.some((r) => r.mentions.length > 0)).toBe(true);
  });

  it('retryable hata için attempt 2 satırı üretilir; auth hatası için üretilmez', async () => {
    const { p1 } = await seed();
    const bucket = dayBucket();
    await prisma.modelRun.create({
      data: {
        promptId: p1.id,
        provider: 'OPENAI',
        modelName: 'x',
        responseText: '',
        status: 'ERROR',
        errorCode: 'rate_limit',
        origin: 'CRON',
        attempt: 1,
        scheduledFor: bucket,
        dedupeKey: `${p1.id}:OPENAI:${bucket.toISOString().slice(0, 10)}:1`,
      },
    });
    await prisma.modelRun.create({
      data: {
        promptId: p1.id,
        provider: 'GOOGLE',
        modelName: 'x',
        responseText: '',
        status: 'ERROR',
        errorCode: 'auth',
        origin: 'CRON',
        attempt: 1,
        scheduledFor: bucket,
        dedupeKey: `${p1.id}:GOOGLE:${bucket.toISOString().slice(0, 10)}:1`,
      },
    });
    expect(await scheduleRetries(bucket)).toBe(1);
    expect(await scheduleRetries(bucket)).toBe(0); // idempotent
    const retry = await prisma.modelRun.findFirst({ where: { promptId: p1.id, attempt: 2 } });
    expect(retry?.provider).toBe('OPENAI');
    expect(retry?.status).toBe('PENDING');
  });

  it('lease süresi dolmuş RUNNING satır yeniden claim edilir (çöken fonksiyon senaryosu)', async () => {
    const { p1 } = await seed();
    await enqueueDailyRuns();
    await prisma.modelRun.updateMany({
      where: { promptId: p1.id },
      data: { status: 'RUNNING', leaseExpiresAt: new Date(Date.now() - 1000) },
    });
    const s = await processQueue({ deadlineAt: Date.now() + 60_000 });
    expect(s.processed).toBe(3);
  });

  it('manuel çalıştırma devam ederken ikinci istek 409', async () => {
    const { user, tenant, p1 } = await seed();
    await loginAs(user);
    await prisma.modelRun.create({
      data: {
        promptId: p1.id,
        provider: 'OPENAI',
        modelName: 'pending',
        responseText: '',
        status: 'RUNNING',
        origin: 'MANUAL',
        leaseExpiresAt: new Date(Date.now() + 60_000),
      },
    });
    const r = await call(runRoute, { method: 'POST', params: { id: p1.id } });
    expect(r.status).toBe(409);
    void tenant;
  });

  it('runPromptOnce 3 provider için satır yazar; başarısız sayısı döner', async () => {
    const { tenant, p1 } = await seed();
    const r = await runPromptOnce(tenant.id, p1.id, { origin: 'MANUAL' });
    expect((r as { runs?: unknown[] }).runs?.length).toBe(3);
  });

  it('cron ucu: yanlış secret 401; doğru secret turu çalıştırır ve batch kaydı yazar', async () => {
    await seed();
    expect((await call(cronDaily, { url: '/api/cron/daily-run' })).status).toBe(401);
    expect(
      (await call(cronDaily, { url: '/api/cron/daily-run', headers: { authorization: 'Bearer yanlis' } })).status,
    ).toBe(401);
    const ok = await call(cronDaily, {
      url: '/api/cron/daily-run',
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    expect(ok.status).toBe(200);
    expect(ok.json.enqueued).toBe(3);
    expect(ok.json.processed).toBe(3);
    expect(ok.json.willChain).toBe(false);
    expect(await prisma.runBatch.count()).toBe(1);
    // ikinci tetikleme: yeni satır üretmez
    const again = await call(cronDaily, {
      url: '/api/cron/daily-run',
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    expect(again.json.enqueued).toBe(0);
    expect(again.json.processed).toBe(0);
  });

  it("soru eklenince ilk ölçüm after() ile başlar ve prompt sürümü run'a yazılır", async () => {
    const { user, p1 } = await seed();
    await loginAs(user);
    const r = await call(createPrompt, { method: 'POST', body: { text: 'Yeni bir soru daha' } });
    expect(r.status).toBe(201);
    await flushAfter();
    const runs = await prisma.modelRun.findMany({ where: { promptId: String(r.json.id) } });
    expect(runs).toHaveLength(3);
    expect(runs[0]!.origin).toBe('INITIAL');
    expect(runs[0]!.promptVersion).toBe(1);
    void p1;
  });
});
