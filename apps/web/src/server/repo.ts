/**
 * Server-side data access — server components ve internal kullanım için
 * (HTTP API'siz, doğrudan Prisma).
 */
import { prisma } from './prisma';
import type { DashboardMetrics } from '@independentai/shared';
import { PROVIDER_LABELS } from '@independentai/shared';

// ───────────────────────────── Auth ─────────────────────────────

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tenant: true },
  });
  if (!user) return null;
  const trialDaysLeft = Math.max(
    0,
    Math.ceil((user.tenant.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenant: {
      id: user.tenant.id,
      name: user.tenant.name,
      website: user.tenant.website,
      trialEndsAt: user.tenant.trialEndsAt,
      trialDaysLeft,
    },
  };
}

// ───────────────────────────── Brand ─────────────────────────────

export function listOwnBrands(tenantId: string) {
  return prisma.brand.findMany({
    where: { tenantId, isOwn: true },
    orderBy: { createdAt: 'asc' },
  });
}

// ───────────────────────────── Competitors ─────────────────────────────

export function listCompetitors(tenantId: string) {
  return prisma.competitor.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'asc' },
  });
}

// ───────────────────────────── Prompts ─────────────────────────────

export function listPrompts(tenantId: string) {
  return prisma.prompt.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { runs: true } } },
  });
}

export function getPromptWithRuns(tenantId: string, id: string) {
  return prisma.prompt.findFirst({
    where: { id, tenantId },
    include: {
      runs: {
        orderBy: { runDate: 'desc' },
        take: 30,
        include: { mentions: { orderBy: { position: 'asc' } } },
      },
    },
  });
}

// ───────────────────────────── Dashboard ─────────────────────────────

export async function getDashboardMetrics(tenantId: string, days = 30): Promise<DashboardMetrics> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const runs = await prisma.modelRun.findMany({
    where: { prompt: { tenantId }, runDate: { gte: since } },
    include: { mentions: true },
  });

  const totalRuns = runs.length;
  const runsWithOwn = runs.filter((r) => r.mentions.some((m) => m.isOwnBrand)).length;
  const visibilityScore = totalRuns ? Math.round((runsWithOwn / totalRuns) * 100) : 0;

  const allMentions = runs.flatMap((r) => r.mentions);
  const ownMentions = allMentions.filter((m) => m.isOwnBrand).length;
  const compMentions = allMentions.filter((m) => m.isCompetitor).length;
  const shareOfVoice = ownMentions + compMentions > 0
    ? Math.round((ownMentions / (ownMentions + compMentions)) * 100)
    : 0;

  const byDay = new Map<string, { withOwn: number; total: number }>();
  for (const r of runs) {
    const key = r.runDate.toISOString().slice(0, 10);
    const bucket = byDay.get(key) ?? { withOwn: 0, total: 0 };
    bucket.total += 1;
    if (r.mentions.some((m) => m.isOwnBrand)) bucket.withOwn += 1;
    byDay.set(key, bucket);
  }
  const trend = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => ({
      date,
      visibility: b.total ? Math.round((b.withOwn / b.total) * 100) : 0,
    }));

  const compMap = new Map<string, number>();
  for (const m of allMentions) {
    if (!m.isCompetitor) continue;
    compMap.set(m.mentionName, (compMap.get(m.mentionName) ?? 0) + 1);
  }
  const competitorBreakdown = [...compMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const provMap = new Map<string, { withOwn: number; total: number }>();
  for (const r of runs) {
    const key = r.provider;
    const bucket = provMap.get(key) ?? { withOwn: 0, total: 0 };
    bucket.total += 1;
    if (r.mentions.some((m) => m.isOwnBrand)) bucket.withOwn += 1;
    provMap.set(key, bucket);
  }
  const byProvider = [...provMap.entries()].map(([provider, b]) => ({
    provider: PROVIDER_LABELS[provider as keyof typeof PROVIDER_LABELS] ?? provider,
    visibility: b.total ? Math.round((b.withOwn / b.total) * 100) : 0,
  }));

  return {
    visibilityScore,
    shareOfVoice,
    totalRuns,
    totalMentions: allMentions.length,
    trend,
    competitorBreakdown,
    byProvider,
  };
}
