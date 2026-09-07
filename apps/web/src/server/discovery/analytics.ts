/**
 * Discovery panel sorguları.
 *
 * Üç ölçüm birbirine karıştırılmaz ve UI'da ayrı gösterilir:
 *   • `aiReferralSessions` — AI ürününden gelen **gerçek insan** ziyareti (browser SDK)
 *   • `crawlerHits`        — AI crawler/fetcher **istekleri** (server/edge); ziyaret veya öneri değildir
 *   • `syntheticRuns`      — Independent AI'ın kendi çalıştırdığı görünürlük ölçümü (ModelRun)
 *
 * Benzersiz kişi iddiası üretilmez: "oturum" çerezsiz, kısa ömürlü bir gruplamadır.
 */
import type { SourceClass } from '@independentai/db';
import { prisma } from '../prisma';
import { providerLabel } from './ai-sources';
import { computeHealth, type SiteHealth } from './sites';

export type DiscoveryRange = { days: number; from: Date; to: Date };

export function rangeOf(days: number): DiscoveryRange {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  return { days, from, to };
}

export type SiteSummary = {
  id: string;
  domain: string;
  siteKind: string | null;
  status: string;
  health: SiteHealth;
  publicKeyPrefix: string;
};

export type DiscoveryOverview = {
  range: { days: number; from: string; to: string };
  sites: SiteSummary[];
  siteId: string | null;
  /** Üç kanalın kesin ayrımı */
  channels: { aiReferralSessions: number; crawlerHits: number; syntheticRuns: number };
  sessions: {
    total: number;
    aiReferral: number;
    direct: number;
    organic: number;
    other: number;
    converted: number;
  };
  byProvider: { provider: string; label: string; sessions: number; conversions: number }[];
  topLandingPages: { path: string; sessions: number; conversions: number }[];
  topEntities: { entityType: string | null; entityId: string | null; label: string | null; views: number }[];
  goals: { id: string; name: string; type: string; conversions: number; value: number | null; currency: string | null }[];
  events: { type: string; count: number }[];
  funnel: { stage: string; label: string; count: number }[];
  crawler: {
    total: number;
    verified: number;
    unverified: number;
    byBot: { bot: string; operator: string | null; purpose: string; hits: number; verified: number }[];
    topPaths: { path: string; hits: number }[];
    lastSeenAt: string | null;
  };
  /** Kurulum sağlığı özeti (site seçiliyse) */
  health: SiteHealth | null;
};

const EMPTY_SESSIONS = { total: 0, aiReferral: 0, direct: 0, organic: 0, other: 0, converted: 0 };

function sourceBucket(cls: SourceClass): keyof typeof EMPTY_SESSIONS {
  if (cls === 'AI_REFERRAL') return 'aiReferral';
  if (cls === 'DIRECT') return 'direct';
  if (cls === 'ORGANIC') return 'organic';
  return 'other';
}

/**
 * Panel özeti. `siteId` verilmezse tenant'ın tüm siteleri toplanır.
 * Tüm sorgular tenant'a bağlıdır; site filtresi ayrıca sahiplik doğrulanmış id ile gelir.
 */
export async function getDiscoveryOverview(
  tenantId: string,
  opts: { siteId?: string | null; days?: number } = {},
): Promise<DiscoveryOverview> {
  const days = Math.min(90, Math.max(1, Math.floor(opts.days ?? 30)));
  const range = rangeOf(days);
  const sitesRaw = await prisma.trackedSite.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
  const sites: SiteSummary[] = sitesRaw.map((s) => ({
    id: s.id,
    domain: s.domain,
    siteKind: s.siteKind,
    status: s.status,
    health: computeHealth(s),
    publicKeyPrefix: s.publicKeyPrefix,
  }));

  const siteId = opts.siteId && sitesRaw.some((s) => s.id === opts.siteId) ? opts.siteId : null;
  const siteFilter = siteId ? { trackedSiteId: siteId } : {};
  const window = { gte: range.from, lte: range.to };

  const [sessionGroups, convertedCount, providerRows, landingRows, entityRows, eventGroups, goalRows, crawlerGroups, crawlerPaths, crawlerLast, syntheticRuns] =
    await Promise.all([
      prisma.aiAcquisitionSession.groupBy({
        by: ['sourceClass'],
        where: { tenantId, ...siteFilter, firstSeenAt: window },
        _count: { _all: true },
      }),
      prisma.aiAcquisitionSession.count({ where: { tenantId, ...siteFilter, firstSeenAt: window, convertedAt: { not: null } } }),
      prisma.$queryRaw<{ provider: string | null; sessions: bigint; conversions: bigint }[]>`
        SELECT "provider",
               COUNT(*)::bigint AS sessions,
               COUNT("convertedAt")::bigint AS conversions
        FROM "AiAcquisitionSession"
        WHERE "tenantId" = ${tenantId}
          AND ("trackedSiteId" = ${siteId} OR ${siteId}::text IS NULL)
          AND "sourceClass" = 'AI_REFERRAL'
          AND "firstSeenAt" BETWEEN ${range.from} AND ${range.to}
        GROUP BY "provider" ORDER BY sessions DESC LIMIT 20`,
      prisma.$queryRaw<{ landingPath: string; sessions: bigint; conversions: bigint }[]>`
        SELECT "landingPath",
               COUNT(*)::bigint AS sessions,
               COUNT("convertedAt")::bigint AS conversions
        FROM "AiAcquisitionSession"
        WHERE "tenantId" = ${tenantId}
          AND ("trackedSiteId" = ${siteId} OR ${siteId}::text IS NULL)
          AND "sourceClass" = 'AI_REFERRAL'
          AND "firstSeenAt" BETWEEN ${range.from} AND ${range.to}
        GROUP BY "landingPath" ORDER BY sessions DESC LIMIT 15`,
      prisma.$queryRaw<{ entityType: string | null; entityId: string | null; entityLabel: string | null; views: bigint }[]>`
        SELECT "entityType", "entityId", MAX("entityLabel") AS "entityLabel", COUNT(*)::bigint AS views
        FROM "AiJourneyEvent"
        WHERE "tenantId" = ${tenantId}
          AND ("trackedSiteId" = ${siteId} OR ${siteId}::text IS NULL)
          AND "entityType" IS NOT NULL
          AND "occurredAt" BETWEEN ${range.from} AND ${range.to}
        GROUP BY "entityType", "entityId" ORDER BY views DESC LIMIT 15`,
      prisma.aiJourneyEvent.groupBy({
        by: ['type'],
        where: { tenantId, ...siteFilter, occurredAt: window },
        _count: { _all: true },
      }),
      prisma.$queryRaw<{ id: string; name: string; type: string; conversions: bigint; value: number | null; currency: string | null }[]>`
        SELECT g."id", g."name", g."type"::text AS type,
               COUNT(DISTINCT e."sessionId")::bigint AS conversions,
               SUM(e."value")::float8 AS value,
               MAX(e."currency") AS currency
        FROM "SiteGoal" g
        LEFT JOIN "AiJourneyEvent" e
          ON e."goalId" = g."id" AND e."occurredAt" BETWEEN ${range.from} AND ${range.to}
        WHERE g."tenantId" = ${tenantId}
          AND (g."trackedSiteId" = ${siteId} OR ${siteId}::text IS NULL)
        GROUP BY g."id", g."name", g."type" ORDER BY conversions DESC LIMIT 20`,
      prisma.aiCrawlerEvent.groupBy({
        by: ['canonicalBotId', 'operator', 'purpose', 'verification'],
        where: { tenantId, ...siteFilter, occurredAt: window },
        _count: { _all: true },
      }),
      prisma.$queryRaw<{ path: string; hits: bigint }[]>`
        SELECT "path", COUNT(*)::bigint AS hits
        FROM "AiCrawlerEvent"
        WHERE "tenantId" = ${tenantId}
          AND ("trackedSiteId" = ${siteId} OR ${siteId}::text IS NULL)
          AND "occurredAt" BETWEEN ${range.from} AND ${range.to}
        GROUP BY "path" ORDER BY hits DESC LIMIT 15`,
      prisma.aiCrawlerEvent.findFirst({
        where: { tenantId, ...siteFilter },
        orderBy: { occurredAt: 'desc' },
        select: { occurredAt: true },
      }),
      prisma.modelRun.count({ where: { prompt: { tenantId }, runDate: window, status: 'SUCCESS' } }),
    ]);

  const sessions = { ...EMPTY_SESSIONS, converted: convertedCount };
  for (const g of sessionGroups) {
    sessions.total += g._count._all;
    sessions[sourceBucket(g.sourceClass)] += g._count._all;
  }

  const byBotMap = new Map<string, { bot: string; operator: string | null; purpose: string; hits: number; verified: number }>();
  let crawlerTotal = 0;
  let crawlerVerified = 0;
  for (const c of crawlerGroups) {
    const key = c.canonicalBotId ?? 'unknown';
    const row = byBotMap.get(key) ?? { bot: key, operator: c.operator, purpose: c.purpose, hits: 0, verified: 0 };
    row.hits += c._count._all;
    if (c.verification === 'VERIFIED') row.verified += c._count._all;
    byBotMap.set(key, row);
    crawlerTotal += c._count._all;
    if (c.verification === 'VERIFIED') crawlerVerified += c._count._all;
  }

  const aiSessions = sessions.aiReferral;
  const engaged = await prisma.aiAcquisitionSession.count({
    where: { tenantId, ...siteFilter, firstSeenAt: window, sourceClass: 'AI_REFERRAL', eventCount: { gt: 1 } },
  });
  const aiConverted = await prisma.aiAcquisitionSession.count({
    where: { tenantId, ...siteFilter, firstSeenAt: window, sourceClass: 'AI_REFERRAL', convertedAt: { not: null } },
  });

  return {
    range: { days, from: range.from.toISOString(), to: range.to.toISOString() },
    sites,
    siteId,
    channels: { aiReferralSessions: aiSessions, crawlerHits: crawlerTotal, syntheticRuns },
    sessions,
    byProvider: providerRows.map((p) => ({
      provider: p.provider ?? 'unknown',
      label: providerLabel(p.provider),
      sessions: Number(p.sessions),
      conversions: Number(p.conversions),
    })),
    topLandingPages: landingRows.map((l) => ({
      path: l.landingPath,
      sessions: Number(l.sessions),
      conversions: Number(l.conversions),
    })),
    topEntities: entityRows.map((e) => ({
      entityType: e.entityType,
      entityId: e.entityId,
      label: e.entityLabel,
      views: Number(e.views),
    })),
    goals: goalRows.map((g) => ({
      id: g.id,
      name: g.name,
      type: g.type,
      conversions: Number(g.conversions),
      value: g.value ?? null,
      currency: g.currency,
    })),
    events: eventGroups.map((e) => ({ type: e.type, count: e._count._all })).sort((a, b) => b.count - a.count),
    funnel: [
      { stage: 'ai_visit', label: 'AI kaynaklı ziyaret', count: aiSessions },
      { stage: 'engaged', label: 'Sitede etkileşim', count: engaged },
      { stage: 'goal', label: 'Hedefe ulaştı', count: aiConverted },
    ],
    crawler: {
      total: crawlerTotal,
      verified: crawlerVerified,
      unverified: crawlerTotal - crawlerVerified,
      byBot: [...byBotMap.values()].sort((a, b) => b.hits - a.hits).slice(0, 15),
      topPaths: crawlerPaths.map((p) => ({ path: p.path, hits: Number(p.hits) })),
      lastSeenAt: crawlerLast?.occurredAt.toISOString() ?? null,
    },
    health: siteId ? (sites.find((s) => s.id === siteId)?.health ?? null) : null,
  };
}

/** Son olay akışı (sayfalı) — PII yok, yalnızca yol/varlık/hedef. */
export async function listRecentSessions(
  tenantId: string,
  opts: { siteId?: string | null; cursor?: string | null; limit?: number } = {},
): Promise<{ items: RecentSession[]; nextCursor: string | null }> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const rows = await prisma.aiAcquisitionSession.findMany({
    where: {
      tenantId,
      ...(opts.siteId ? { trackedSiteId: opts.siteId } : {}),
      ...(opts.cursor ? { firstSeenAt: { lt: new Date(opts.cursor) } } : {}),
    },
    orderBy: { firstSeenAt: 'desc' },
    take: limit + 1,
    include: {
      goal: { select: { name: true } },
      events: { orderBy: { occurredAt: 'asc' }, take: 8, select: { type: true, path: true, entityLabel: true, occurredAt: true } },
    },
  });
  const items = rows.slice(0, limit).map((s) => ({
    id: s.id,
    sourceClass: s.sourceClass,
    provider: s.provider,
    providerLabel: providerLabel(s.provider),
    landingPath: s.landingPath,
    firstSeenAt: s.firstSeenAt.toISOString(),
    lastSeenAt: s.lastSeenAt.toISOString(),
    eventCount: s.eventCount,
    convertedAt: s.convertedAt?.toISOString() ?? null,
    goalName: s.goal?.name ?? null,
    steps: s.events.map((e) => ({
      type: e.type,
      path: e.path,
      label: e.entityLabel,
      at: e.occurredAt.toISOString(),
    })),
  }));
  const next = rows.length > limit ? rows[limit - 1]!.firstSeenAt.toISOString() : null;
  return { items, nextCursor: next };
}

export type RecentSession = {
  id: string;
  sourceClass: SourceClass;
  provider: string | null;
  providerLabel: string;
  landingPath: string;
  firstSeenAt: string;
  lastSeenAt: string;
  eventCount: number;
  convertedAt: string | null;
  goalName: string | null;
  steps: { type: string; path: string; label: string | null; at: string }[];
};
