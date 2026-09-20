/**
 * Gece bakımı — süresi dolmuş PublicScan temizliği (partiler, deadline'da erken dönüş) ve ajans sinyali
 * toplu hesabı (≤500, deadline, DECLARED korunur); daily-run hop 0 üzerinden uçtan uca.
 */
import { describe, expect, it } from 'vitest';
import { call, createTenant, prisma } from './helpers';
import { GET as cronDaily } from '@/app/api/cron/daily-run/route';
import { pruneExpiredPublicScans } from '@/server/public-scan-maintenance';
import { runAgencySignals } from '@/server/agency-signal';

const DAY = 86_400_000;

async function seedScan(
  hostname: string,
  opts: { expiredDays?: number; tenantId?: string; visitorHash?: string } = {},
) {
  return prisma.publicScan.create({
    data: {
      kind: 'CRAWLER',
      urlHash: `h-${hostname}-${Math.random()}`,
      hostname,
      score: 40,
      result: {},
      tenantId: opts.tenantId ?? null,
      visitorHash: opts.visitorHash ?? null,
      expiresAt: new Date(Date.now() + (opts.expiredDays ? -opts.expiredDays * DAY : 30 * DAY)),
    },
  });
}

describe('pruneExpiredPublicScans', () => {
  it('dolmuş satırlar silinir, geçerli olanlar kalır; ikinci koşu 0', async () => {
    await seedScan('dolmus-1.example', { expiredDays: 1 });
    await seedScan('dolmus-2.example', { expiredDays: 10 });
    const keep = await seedScan('gecerli.example');
    const r = await pruneExpiredPublicScans({ deadlineAt: Date.now() + 10_000 });
    expect(r.deleted).toBe(2);
    expect(await prisma.publicScan.findMany({ select: { id: true } })).toEqual([{ id: keep.id }]);
    expect((await pruneExpiredPublicScans({ deadlineAt: Date.now() + 10_000 })).deleted).toBe(0);
  });

  it('deadline geçmişse hiçbir şey silmeden erken döner', async () => {
    await seedScan('dolmus.example', { expiredDays: 3 });
    const r = await pruneExpiredPublicScans({ deadlineAt: Date.now() - 1 });
    expect(r.deleted).toBe(0);
    expect(await prisma.publicScan.count()).toBe(1);
  });
});

describe('runAgencySignals', () => {
  it('deadline geçmişse skipped; normalde tenant + ziyaretçi hesaplanır; DECLARED ezilmez', async () => {
    expect(await runAgencySignals({ deadlineAt: Date.now() - 1 })).toEqual({
      tenants: 0,
      visitors: 0,
      skipped: true,
      partial: false,
    });

    const a = await createTenant({ email: 'a@ajansx.example' });
    await prisma.tenant.update({ where: { id: a.tenant.id }, data: { industry: 'ajans' } });
    const b = await createTenant();
    await seedScan('b1.example', { tenantId: b.tenant.id });
    await seedScan('b2.example', { tenantId: b.tenant.id });
    await prisma.agencySignal.create({
      data: {
        subject: 'TENANT',
        subjectId: b.tenant.id,
        score: 100,
        status: 'DECLARED',
        declaredAt: new Date(),
        reasons: [],
      },
    });
    const vh = 'b'.repeat(64);
    await seedScan('v1.example', { visitorHash: vh });
    await seedScan('v2.example', { visitorHash: vh });
    await seedScan('v3.example', { visitorHash: vh });
    await seedScan('tek.example', { visitorHash: 'c'.repeat(64) }); // tek tarama → hesaplanmaz

    const r = await runAgencySignals({ deadlineAt: Date.now() + 20_000 });
    expect(r.skipped).toBe(false);
    expect(r.tenants).toBe(2);
    expect(r.visitors).toBe(1);
    const sa = await prisma.agencySignal.findUniqueOrThrow({
      where: { subject_subjectId: { subject: 'TENANT', subjectId: a.tenant.id } },
    });
    expect(sa.score).toBe(60); // industry 40 + e-posta 20
    const sb = await prisma.agencySignal.findUniqueOrThrow({
      where: { subject_subjectId: { subject: 'TENANT', subjectId: b.tenant.id } },
    });
    expect(sb.status).toBe('DECLARED');
    expect(sb.score).toBe(100);
    expect(sb.hostnames.sort()).toEqual(['b1.example', 'b2.example']);
    const sv = await prisma.agencySignal.findUniqueOrThrow({
      where: { subject_subjectId: { subject: 'VISITOR', subjectId: vh } },
    });
    expect(sv.score).toBe(30);
    expect(await prisma.agencySignal.count({ where: { subjectId: 'c'.repeat(64) } })).toBe(0);
  });
});

describe('daily-run hop 0 (uçtan uca)', () => {
  it('cron bakım bloğu dolmuş taramayı siler ve sinyali hesaplar; 200 döner', async () => {
    await seedScan('dolmus.example', { expiredDays: 2 });
    const t = await createTenant({ email: 'x@kreatifstudio.example' });
    await prisma.tenant.update({ where: { id: t.tenant.id }, data: { industry: 'ajans' } });
    const r = await call(cronDaily, {
      url: '/api/cron/daily-run',
      headers: { authorization: 'Bearer test-cron-secret-1234567890' },
    });
    expect(r.status).toBe(200);
    expect(r.json.hop).toBe(0);
    expect(await prisma.publicScan.count({ where: { hostname: 'dolmus.example' } })).toBe(0);
    expect(await prisma.agencySignal.count({ where: { subjectId: t.tenant.id } })).toBe(1);
    expect((await call(cronDaily, { url: '/api/cron/daily-run' })).status).toBe(401);
  });
});
