/**
 * Rollup idempotency, saklama temizliği ve Realtime davranışı (kısıtlama + tenant izolasyonu).
 */
import { describe, it, expect } from 'vitest';
import { createTenant, call, flushAfter, prisma, uniq } from './helpers';
import { POST as collectEvent } from '@/app/api/collect/v1/event/route';
import { hashKey, PUBLIC_KEY_PREFIX } from '@/server/discovery/sites';
import { rollupSiteDay, purgeExpired, runDiscoveryMaintenance, dayStart, dimKeyOf } from '@/server/discovery/rollup';
import { seedBotRegistry } from '@/server/discovery/crawler-ingest';

const ORIGIN = 'https://ornek.com';

async function seedSite(retentionDays = 90) {
  const { tenant } = await createTenant();
  const publicKey = `${PUBLIC_KEY_PREFIX}${uniq('k')}${'a'.repeat(20)}`;
  const domain = `${uniq('d')}.example`;
  const site = await prisma.trackedSite.create({
    data: {
      tenantId: tenant.id,
      domain,
      normalizedOrigin: `https://${domain}`,
      allowedOrigins: [`https://${domain}`, ORIGIN],
      publicKeyHash: hashKey(publicKey),
      publicKeyPrefix: `${publicKey.slice(0, 11)}…`,
      status: 'ACTIVE',
      retentionDays,
    },
  });
  return { tenant, site, publicKey };
}

async function send(publicKey: string, events: unknown[]) {
  return call(collectEvent, {
    method: 'POST',
    url: '/api/collect/v1/event',
    body: { k: publicKey, e: events },
    headers: { origin: ORIGIN },
  });
}

function event(over: Record<string, unknown> = {}) {
  return {
    id: `${uniq('evt')}12345678`,
    sid: `${uniq('sid')}1234567`,
    t: 'page_view',
    p: '/',
    ts: Date.now(),
    ...over,
  };
}

async function messages(topic: string) {
  return prisma.$queryRawUnsafe<{ event: string; payload: Record<string, unknown> }[]>(
    'select event, payload from realtime.messages where topic = $1 order by id',
    topic,
  );
}

describe('rollup', () => {
  it('gün bazlı sayımları üretir ve tekrar çalıştırınca artırmaz (idempotent)', async () => {
    const { site, publicKey } = await seedSite();
    await send(publicKey, [
      event({ r: 'https://chatgpt.com/x' }),
      event({ r: 'https://claude.ai/x' }),
      event({ t: 'cta_click' }),
    ]);
    await flushAfter();

    const first = await rollupSiteDay(site, new Date());
    expect(first).toBeGreaterThan(0);
    const rowsAfterFirst = await prisma.aiTrafficRollup.findMany({ where: { trackedSiteId: site.id } });
    const referral = rowsAfterFirst.filter((r) => r.kind === 'referral');
    expect(referral.length).toBeGreaterThan(0);
    const totalSessions = referral.reduce((s, r) => s + r.sessionCount, 0);
    expect(totalSessions).toBe(3);

    // İkinci kez: satır sayısı ve sayımlar aynı kalmalı
    await rollupSiteDay(site, new Date());
    const rowsAfterSecond = await prisma.aiTrafficRollup.findMany({ where: { trackedSiteId: site.id } });
    expect(rowsAfterSecond.length).toBe(rowsAfterFirst.length);
    expect(rowsAfterSecond.reduce((s, r) => s + r.count, 0)).toBe(rowsAfterFirst.reduce((s, r) => s + r.count, 0));

    // Boyut anahtarı beklenen biçimde
    const aiRow = referral.find((r) => (r.dims as { provider?: string }).provider === 'openai');
    expect(aiRow).toBeTruthy();
    expect(aiRow!.dimKey).toBe(dimKeyOf({ sourceClass: 'AI_REFERRAL', provider: 'openai' }));
    expect(aiRow!.granularity).toBe('day');
    expect(aiRow!.bucketStart.toISOString()).toBe(dayStart(new Date()).toISOString());
  });

  it('hedef dönüşümü rollup’ta oturum bazında sayılır', async () => {
    const { site, publicKey } = await seedSite();
    await prisma.siteGoal.create({
      data: {
        tenantId: site.tenantId,
        trackedSiteId: site.id,
        name: 'Teşekkürler',
        type: 'LEAD',
        matchMethod: 'PATH',
        pathPattern: '/tesekkurler',
      },
    });
    const sid = `${uniq('sid')}1234567`;
    await send(publicKey, [event({ sid, p: '/' })]);
    await flushAfter();
    await send(publicKey, [event({ sid, p: '/tesekkurler' }), event({ sid, p: '/tesekkurler' })]);
    await flushAfter();

    await rollupSiteDay(site, new Date());
    const goalRow = await prisma.aiTrafficRollup.findFirstOrThrow({ where: { trackedSiteId: site.id, kind: 'goal' } });
    expect(goalRow.count).toBe(2); // iki olay
    expect(goalRow.sessionCount).toBe(1); // tek oturum
  });
});

describe('saklama temizliği', () => {
  it('süresi dolmuş ham olaylar silinir, rollup satırları kalır', async () => {
    const { site, publicKey } = await seedSite();
    await send(publicKey, [event()]);
    await flushAfter();
    await rollupSiteDay(site, new Date());

    const rollupsBefore = await prisma.aiTrafficRollup.count({ where: { trackedSiteId: site.id } });
    expect(rollupsBefore).toBeGreaterThan(0);

    // Saklama süresini geçmiş gibi işaretle
    const past = new Date(Date.now() - 60_000);
    await prisma.aiJourneyEvent.updateMany({ where: { trackedSiteId: site.id }, data: { expiresAt: past } });
    await prisma.aiAcquisitionSession.updateMany({ where: { trackedSiteId: site.id }, data: { expiresAt: past } });

    const purged = await purgeExpired();
    expect(purged.events + purged.sessions).toBeGreaterThan(0);
    expect(await prisma.aiJourneyEvent.count({ where: { trackedSiteId: site.id } })).toBe(0);
    expect(await prisma.aiAcquisitionSession.count({ where: { trackedSiteId: site.id } })).toBe(0);
    expect(await prisma.aiTrafficRollup.count({ where: { trackedSiteId: site.id } })).toBe(rollupsBefore);
  });

  it('bakım turu bot kaydını tohumlar ve siteleri işler', async () => {
    const { site, publicKey } = await seedSite();
    await send(publicKey, [event()]);
    await flushAfter();
    const seeded = await seedBotRegistry();
    expect(seeded).toBeGreaterThan(10);
    expect(await prisma.aiBotIdentity.count({ where: { canonicalId: 'openai.gptbot' } })).toBe(1);
    // Tekrar tohumlama kopya üretmez
    await seedBotRegistry();
    expect(await prisma.aiBotIdentity.count({ where: { canonicalId: 'openai.gptbot' } })).toBe(1);

    const stats = await runDiscoveryMaintenance({ deadlineAt: Date.now() + 60_000 });
    expect(stats.sites).toBeGreaterThan(0);
    expect(await prisma.aiTrafficRollup.count({ where: { trackedSiteId: site.id } })).toBeGreaterThan(0);
  });

  it('site silinince tüm telemetri cascade ile gider', async () => {
    const { site, publicKey } = await seedSite();
    await send(publicKey, [event()]);
    await flushAfter();
    await rollupSiteDay(site, new Date());
    await prisma.trackedSite.delete({ where: { id: site.id } });
    expect(await prisma.aiJourneyEvent.count({ where: { trackedSiteId: site.id } })).toBe(0);
    expect(await prisma.aiAcquisitionSession.count({ where: { trackedSiteId: site.id } })).toBe(0);
    expect(await prisma.aiTrafficRollup.count({ where: { trackedSiteId: site.id } })).toBe(0);
  });
});

describe('Realtime', () => {
  it('yüksek hacimde her olay yayınlanmaz (kısıtlama) ve payload küçüktür', async () => {
    const { tenant, publicKey } = await seedSite();
    // İlk parti: doğrulama olayı + toplu güncelleme
    await send(publicKey, [event()]);
    await flushAfter();
    const afterFirst = (await messages(`tenant:${tenant.id}`)).length;

    // Hemen ardından 5 parti daha: kısıtlama nedeniyle yeni yayın beklenmiyor
    for (let i = 0; i < 5; i += 1) {
      await send(publicKey, [event()]);
      await flushAfter();
    }
    const afterMany = await messages(`tenant:${tenant.id}`);
    expect(afterMany.length).toBe(afterFirst);

    const discovery = afterMany.filter((m) => String(m.event).startsWith('discovery.') || m.event === 'sensor.health');
    expect(discovery.length).toBeGreaterThan(0);
    for (const m of discovery) {
      const json = JSON.stringify(m.payload);
      expect(json.length).toBeLessThan(600);
      expect(json).not.toMatch(/publicKey|ingestSecret|referrerHost|@/i);
    }
  });

  it('hedef dönüşümü ayrı olayla bildirilir ve yalnızca kendi tenant topic’ine gider', async () => {
    const a = await seedSite();
    const b = await seedSite();
    await prisma.siteGoal.create({
      data: {
        tenantId: a.site.tenantId,
        trackedSiteId: a.site.id,
        name: 'Demo',
        type: 'DEMO',
        matchMethod: 'EVENT',
        eventName: 'demo_request',
      },
    });
    await send(a.publicKey, [event({ t: 'demo_request' })]);
    await flushAfter();

    const mine = await messages(`tenant:${a.tenant.id}`);
    expect(mine.some((m) => m.event === 'discovery.goal')).toBe(true);
    const other = await messages(`tenant:${b.tenant.id}`);
    expect(other.length).toBe(0);
  });
});
