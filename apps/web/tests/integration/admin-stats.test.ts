/**
 * /api/admin/stats — seed ile birebir sayılar: bugün/7g/30g tarama, kind kırılımı, partial oranı, lead durumları,
 * 7 günde iletişim, ajans adayı ≥50, aktif duyuru, yasaklı isabet, 7 gün içinde deneme biten LAUNCH tenant,
 * atlanan bildirim, 14 günlük sparkline (son eleman = bugün). getScanStats: host top, sektör, WAF, son taramalar.
 */
import { describe, expect, it } from 'vitest';
import { call, createTenant, loginAs, logout, prisma } from './helpers';
import { GET as stats } from '@/app/api/admin/stats/route';
import { getScanStats, startOfIstanbulDay, istanbulDayKey } from '@/server/admin-stats';
import type { AdminStats } from '@/server/admin-stats';

const DAY = 86_400_000;

async function scan(
  hostname: string,
  opts: { at: Date; kind?: 'CRAWLER' | 'COMMERCE'; partial?: boolean; waf?: boolean; sector?: string },
) {
  return prisma.publicScan.create({
    data: {
      kind: opts.kind ?? 'CRAWLER',
      urlHash: `h-${hostname}-${opts.at.getTime()}`,
      hostname,
      score: 50,
      result: {},
      partial: opts.partial ?? false,
      sector: opts.sector ?? null,
      meta: opts.waf ? { waf: true } : undefined,
      createdAt: opts.at,
      expiresAt: new Date(opts.at.getTime() + 30 * DAY),
    },
  });
}

describe('admin › istatistikler', () => {
  it('401 / OWNER 403', async () => {
    logout();
    expect((await call(stats)).status).toBe(401);
    const { user } = await createTenant();
    await loginAs(user);
    expect((await call(stats)).status).toBe(403);
  });

  it('sayılar seed ile eşleşir; sparkline 14 gün ve son eleman bugün', async () => {
    const now = new Date();
    const todayStart = startOfIstanbulDay(now);
    const safeToday = new Date(Math.max(todayStart.getTime() + 60_000, now.getTime() - 60_000));
    await scan('a.example', { at: safeToday });
    await scan('a.example', { at: safeToday, kind: 'COMMERCE', partial: true });
    await scan('b.example', { at: new Date(now.getTime() - 3 * DAY), waf: true, sector: 'klinik' });
    await scan('c.example', { at: new Date(now.getTime() - 10 * DAY) });
    await scan('d.example', { at: new Date(now.getTime() - 40 * DAY) }); // 30 gün dışı

    await prisma.lead.createMany({
      data: [
        { hostname: 'a.example', status: 'NEW' },
        { hostname: 'b.example', status: 'CONTACTED', source: 'CONTACT', contactEmail: 'x@b.example', consentAt: now },
        {
          hostname: 'c.example',
          status: 'WON',
          source: 'CONTACT',
          contactEmail: 'y@c.example',
          consentAt: new Date(now.getTime() - 9 * DAY),
        },
      ],
    });
    await prisma.agencySignal.createMany({
      data: [
        { subject: 'VISITOR', subjectId: 'v1', score: 60, reasons: [] },
        { subject: 'VISITOR', subjectId: 'v2', score: 30, reasons: [] },
        { subject: 'TENANT', subjectId: 't1', score: 90, reasons: [], status: 'DISMISSED' },
      ],
    });
    await prisma.announcement.createMany({
      data: [
        { text: 'açık', enabled: true },
        { text: 'kapalı', enabled: false },
        { text: 'süresi dolmuş', enabled: true, endsAt: new Date(now.getTime() - 1000) },
      ],
    });
    await prisma.blockedSite.createMany({
      data: [
        { hostname: 'x.example', redirectUrl: 'https://youtu.be/abc', hits: 3 },
        { hostname: 'y.example', redirectUrl: 'https://youtu.be/abc', hits: 4 },
      ],
    });
    await prisma.notificationLog.createMany({
      data: [
        { kind: 'contact', channel: 'email', status: 'skipped' },
        { kind: 'contact', channel: 'email', status: 'sent' },
      ],
    });
    // Deneme 3 gün sonra biten LAUNCH + 3 gün sonra biten ama ücretli + 20 gün sonra biten
    await createTenant({ trialDaysLeft: 3 });
    await createTenant({ trialDaysLeft: 3, plan: 'STARTER' });
    await createTenant({ trialDaysLeft: 20 });

    const { user } = await createTenant({ superAdmin: true });
    await loginAs(user);
    const r = await call(stats);
    expect(r.status).toBe(200);
    const s = r.json as unknown as AdminStats;
    expect(s.scans.today).toBe(2);
    expect(s.scans.d7).toBe(3);
    expect(s.scans.d30).toBe(4);
    expect(s.scans.byKind.CRAWLER).toBe(3);
    expect(s.scans.byKind.COMMERCE).toBe(1);
    expect(s.scans.partialRatio).toBeCloseTo(0.25);
    expect(s.leads.total).toBe(3);
    expect(s.leads.byStatus).toEqual({ NEW: 1, CONTACTED: 1, QUALIFIED: 0, WON: 1, LOST: 0 });
    expect(s.leads.contacts7d).toBe(1);
    expect(s.conversion7d).toEqual({ contacts: 1, scans: 3, ratio: 1 / 3 });
    expect(s.agencyCandidates).toBe(1);
    expect(s.activeAnnouncements).toBe(1);
    expect(s.blockedHits).toBe(7);
    expect(s.trialsEndingIn7d).toBe(1);
    expect(s.notificationsSkipped7d).toBe(1);
    expect(s.sparkline).toHaveLength(14);
    expect(s.sparklineDays).toHaveLength(14);
    expect(s.sparklineDays[13]).toBe(istanbulDayKey(now));
    expect(s.sparkline[13]).toBe(2);
    expect(s.sparkline.reduce((a, b) => a + b, 0)).toBe(4); // 10 gün önceki dahil, 40 gün önceki hariç
    expect(r.text).not.toMatch(/passwordHash|secret|sk-|visitorHash/i);

    const sc = await getScanStats(now);
    expect(sc.total30d).toBe(4);
    expect(sc.partial30d).toBe(1);
    expect(sc.waf30d).toBe(1);
    expect(sc.topHosts[0]).toMatchObject({ hostname: 'a.example', n: 2 });
    expect(sc.sectors).toEqual([{ sector: 'klinik', n: 1 }]);
    expect(sc.recent).toHaveLength(5);
    expect(sc.recent.find((x) => x.hostname === 'b.example')?.waf).toBe(true);
    expect(sc.days).toHaveLength(14);
    expect(sc.matrix.CRAWLER?.[istanbulDayKey(now)]).toBe(1);
    expect(JSON.stringify(sc)).not.toMatch(/visitorHash|urlHash/);
  });
});
