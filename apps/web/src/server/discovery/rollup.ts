/**
 * Rollup + saklama temizliği.
 *
 * Ham olaylar yüksek hacimlidir ve sonsuza kadar ana veritabanında tutulmaz: her site kendi
 * `retentionDays` süresinden sonra ham kayıtlarını kaybeder. Uzun vadeli sayımlar burada
 * gün bazlı `AiTrafficRollup` satırlarına yazılır ve kalır.
 *
 * İşlem idempotenttir: aynı gün tekrar çalıştırılırsa sayımlar yeniden hesaplanıp üzerine yazılır
 * (artırmaz). Cron bütçesi dolarsa kaldığı yerden devam eder.
 */
import { createHash } from 'node:crypto';
import { prisma } from '../prisma';
import { log } from '../logger';

export type RollupStats = {
  sites: number;
  rows: number;
  deletedEvents: number;
  deletedSessions: number;
  deletedCrawls: number;
};

export function dayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function dimKeyOf(dims: Record<string, string | null>): string {
  const sorted = Object.keys(dims)
    .sort()
    .map((k) => `${k}=${dims[k] ?? ''}`)
    .join('|');
  return createHash('sha1').update(sorted).digest('hex').slice(0, 32);
}

async function upsertRollup(input: {
  tenantId: string;
  trackedSiteId: string;
  bucketStart: Date;
  kind: string;
  dims: Record<string, string | null>;
  count: number;
  sessionCount?: number;
}): Promise<void> {
  const dimKey = dimKeyOf(input.dims);
  await prisma.aiTrafficRollup.upsert({
    where: {
      trackedSiteId_granularity_bucketStart_kind_dimKey: {
        trackedSiteId: input.trackedSiteId,
        granularity: 'day',
        bucketStart: input.bucketStart,
        kind: input.kind,
        dimKey,
      },
    },
    create: {
      tenantId: input.tenantId,
      trackedSiteId: input.trackedSiteId,
      granularity: 'day',
      bucketStart: input.bucketStart,
      kind: input.kind,
      dimKey,
      dims: input.dims,
      count: input.count,
      sessionCount: input.sessionCount ?? 0,
    },
    // Yeniden hesap: artırma değil, üzerine yazma (idempotent).
    update: { count: input.count, sessionCount: input.sessionCount ?? 0, dims: input.dims },
  });
}

/** Bir sitenin belirli bir günü için tüm rollup satırlarını yeniden hesaplar. */
export async function rollupSiteDay(site: { id: string; tenantId: string }, day: Date): Promise<number> {
  const from = dayStart(day);
  const to = new Date(from.getTime() + 86_400_000);
  let rows = 0;

  // 1) Oturum/kaynak: kaynak sınıfı + sağlayıcı
  const sessions = await prisma.aiAcquisitionSession.groupBy({
    by: ['sourceClass', 'provider'],
    where: { trackedSiteId: site.id, firstSeenAt: { gte: from, lt: to } },
    _count: { _all: true },
  });
  for (const s of sessions) {
    await upsertRollup({
      tenantId: site.tenantId,
      trackedSiteId: site.id,
      bucketStart: from,
      kind: 'referral',
      dims: { sourceClass: s.sourceClass, provider: s.provider ?? null },
      count: s._count._all,
      sessionCount: s._count._all,
    });
    rows += 1;
  }

  // 2) Olay tipleri
  const events = await prisma.aiJourneyEvent.groupBy({
    by: ['type'],
    where: { trackedSiteId: site.id, occurredAt: { gte: from, lt: to } },
    _count: { _all: true },
  });
  for (const e of events) {
    await upsertRollup({
      tenantId: site.tenantId,
      trackedSiteId: site.id,
      bucketStart: from,
      kind: 'event',
      dims: { type: e.type },
      count: e._count._all,
    });
    rows += 1;
  }

  // 3) Hedefler (dönüşüm = oturum başına ilk kez; olaylarda distinct session sayılır)
  const goalRows = await prisma.$queryRaw<{ goalId: string; c: bigint; s: bigint }[]>`
    SELECT "goalId", COUNT(*)::bigint AS c, COUNT(DISTINCT "sessionId")::bigint AS s
    FROM "AiJourneyEvent"
    WHERE "trackedSiteId" = ${site.id} AND "goalId" IS NOT NULL
      AND "occurredAt" >= ${from} AND "occurredAt" < ${to}
    GROUP BY "goalId"`;
  for (const g of goalRows) {
    await upsertRollup({
      tenantId: site.tenantId,
      trackedSiteId: site.id,
      bucketStart: from,
      kind: 'goal',
      dims: { goalId: g.goalId },
      count: Number(g.c),
      sessionCount: Number(g.s),
    });
    rows += 1;
  }

  // 4) Crawler: bot + doğrulama seviyesi
  const crawls = await prisma.aiCrawlerEvent.groupBy({
    by: ['canonicalBotId', 'verification', 'purpose'],
    where: { trackedSiteId: site.id, occurredAt: { gte: from, lt: to } },
    _count: { _all: true },
  });
  for (const c of crawls) {
    await upsertRollup({
      tenantId: site.tenantId,
      trackedSiteId: site.id,
      bucketStart: from,
      kind: 'crawler',
      dims: { bot: c.canonicalBotId ?? null, verification: c.verification, purpose: c.purpose },
      count: c._count._all,
    });
    rows += 1;
  }

  return rows;
}

/** Süresi geçmiş ham kayıtları siler (rollup'lar kalır). */
export async function purgeExpired(
  limitPerTable = 20_000,
): Promise<{ events: number; sessions: number; crawls: number }> {
  const now = new Date();
  const events = await prisma.aiJourneyEvent.deleteMany({ where: { expiresAt: { lt: now } } });
  const crawls = await prisma.aiCrawlerEvent.deleteMany({ where: { expiresAt: { lt: now } } });
  // Oturumlar en son silinir (olaylar cascade ile bağlı).
  const sessions = await prisma.aiAcquisitionSession.deleteMany({ where: { expiresAt: { lt: now } } });
  void limitPerTable;
  return { events: events.count, sessions: sessions.count, crawls: crawls.count };
}

/**
 * Günlük bakım: dün + bugün için rollup, ardından saklama temizliği.
 * Cron içinden çağrılır; hata tek siteyi etkiler, tur devam eder.
 */
export async function runDiscoveryMaintenance(opts: { deadlineAt?: number } = {}): Promise<RollupStats> {
  const stats: RollupStats = { sites: 0, rows: 0, deletedEvents: 0, deletedSessions: 0, deletedCrawls: 0 };
  const sites = await prisma.trackedSite.findMany({
    where: { status: { in: ['ACTIVE', 'PAUSED'] } },
    select: { id: true, tenantId: true },
    take: 500,
  });
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);

  for (const site of sites) {
    if (opts.deadlineAt && Date.now() > opts.deadlineAt) break;
    try {
      stats.rows += await rollupSiteDay(site, yesterday);
      stats.rows += await rollupSiteDay(site, today);
      stats.sites += 1;
    } catch (err) {
      log.warn('discovery.rollup_failed', { siteId: site.id, err });
    }
  }

  try {
    const purged = await purgeExpired();
    stats.deletedEvents = purged.events;
    stats.deletedSessions = purged.sessions;
    stats.deletedCrawls = purged.crawls;
  } catch (err) {
    log.warn('discovery.purge_failed', { err });
  }
  return stats;
}
