/**
 * Server-side data access — server component ve internal kullanım (doğrudan Prisma).
 * Metrik formülleri packages/shared/metrics'ten (UI/API/rapor aynı sonucu verir).
 */
import { prisma } from './prisma';
import type { DashboardMetrics } from '@independentai/shared';
import { PROVIDER_LABELS, pct, shareOfVoiceOf, visibilityOf } from '@independentai/shared';
import { computeEntitlement } from './entitlement';

// ───────────────────────────── Auth ─────────────────────────────

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { tenant: true } });
  if (!user) return null;
  const entitlement = computeEntitlement({ plan: user.tenant.plan, trialEndsAt: user.tenant.trialEndsAt });
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    emailVerified: !!user.emailVerifiedAt,
    tenant: {
      id: user.tenant.id,
      name: user.tenant.name,
      website: user.tenant.website,
      plan: user.tenant.plan,
      trialEndsAt: user.tenant.trialEndsAt,
      trialDaysLeft: entitlement.trialDaysLeft,
      onboardingCompletedAt: user.tenant.onboardingCompletedAt,
    },
    entitlement,
  };
}

// ───────────────────────────── Brand ─────────────────────────────

export function listOwnBrands(tenantId: string) {
  return prisma.brand.findMany({ where: { tenantId, isOwn: true }, orderBy: { createdAt: 'asc' } });
}

// ───────────────────────────── Competitors ─────────────────────────────

export function listCompetitors(tenantId: string) {
  return prisma.competitor.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
}

// ───────────────────────────── Prompts ─────────────────────────────

export function listPrompts(tenantId: string) {
  return prisma.prompt.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { runs: { where: { status: 'SUCCESS' } } } } },
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

/** Özet metrikler — API v1 ve basit widget'lar için. Yalnızca gerekli alanlar seçilir. */
export async function getDashboardMetrics(tenantId: string, days = 30): Promise<DashboardMetrics> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const runs = await prisma.modelRun.findMany({
    where: { prompt: { tenantId }, runDate: { gte: since }, status: { in: ['SUCCESS', 'ERROR'] } },
    select: {
      status: true,
      provider: true,
      runDate: true,
      mentions: { select: { isOwnBrand: true, isCompetitor: true, mentionName: true } },
    },
  });

  const valid = runs.filter((r) => r.status === 'SUCCESS');
  const erroredRuns = runs.length - valid.length;

  const byDay = new Map<string, typeof valid>();
  for (const r of valid) {
    const key = r.runDate.toISOString().slice(0, 10);
    const arr = byDay.get(key) ?? [];
    arr.push(r);
    byDay.set(key, arr);
  }
  const trend = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rs]) => ({ date, visibility: visibilityOf(rs) }));

  const compMap = new Map<string, number>();
  for (const r of valid) {
    const names = new Set(r.mentions.filter((m) => m.isCompetitor).map((m) => m.mentionName));
    for (const n of names) compMap.set(n, (compMap.get(n) ?? 0) + 1);
  }
  const competitorBreakdown = [...compMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const provMap = new Map<string, typeof valid>();
  for (const r of valid) {
    const arr = provMap.get(r.provider) ?? [];
    arr.push(r);
    provMap.set(r.provider, arr);
  }
  const byProvider = [...provMap.entries()].map(([provider, rs]) => ({
    provider: PROVIDER_LABELS[provider as keyof typeof PROVIDER_LABELS] ?? provider,
    visibility: visibilityOf(rs),
  }));

  return {
    visibilityScore: visibilityOf(valid),
    shareOfVoice: shareOfVoiceOf(valid),
    totalRuns: valid.length,
    erroredRuns,
    totalMentions: valid.reduce((s, r) => s + r.mentions.length, 0),
    trend,
    competitorBreakdown,
    byProvider,
  };
}

export { pct };
