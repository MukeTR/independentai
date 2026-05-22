import { prisma } from './prisma';
import { requireSession } from './session';

export class ForbiddenError extends Error {
  constructor() {
    super('Forbidden — super admin required');
  }
}

/**
 * Sadece isSuperAdmin=true olan platform sahibi geçer.
 * Tenant-level OWNER/ADMIN ile karıştırılmamalı.
 */
export async function requireSuperAdmin() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { isSuperAdmin: true } });
  if (!user?.isSuperAdmin) throw new ForbiddenError();
  return session;
}

export async function getPlatformStats() {
  const [tenants, users, prompts, runs, mentions, recentRuns, costSum] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.prompt.count(),
    prisma.modelRun.count(),
    prisma.brandMention.count(),
    prisma.modelRun.count({ where: { runDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.modelRun.aggregate({ _sum: { costUsd: true } }),
  ]);

  const recentTenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      name: true,
      website: true,
      createdAt: true,
      trialEndsAt: true,
      _count: { select: { users: true, prompts: true } },
    },
  });

  return {
    tenants,
    users,
    prompts,
    runs,
    mentions,
    recentRuns7d: recentRuns,
    totalCostUsd: costSum._sum.costUsd ?? 0,
    recentTenants,
  };
}

export function listAllTenants() {
  return prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true, prompts: true, brands: true, competitors: true } },
    },
  });
}

export function getTenantDetail(id: string) {
  return prisma.tenant.findUnique({
    where: { id },
    include: {
      users: { orderBy: { createdAt: 'asc' } },
      brands: true,
      competitors: true,
      prompts: { include: { _count: { select: { runs: true } } } },
    },
  });
}

export function listAllUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: { tenant: { select: { id: true, name: true } } },
  });
}

export function listRecentRuns(limit = 50) {
  return prisma.modelRun.findMany({
    orderBy: { runDate: 'desc' },
    take: limit,
    include: {
      prompt: { select: { id: true, text: true, tenantId: true, tenant: { select: { name: true } } } },
      _count: { select: { mentions: true } },
    },
  });
}

export async function triggerManualCron() {
  // Vercel cron endpoint'imizi local olarak çalıştırmak yerine,
  // doğrudan run-prompt logic'ini import edip aynı şeyi yapıyoruz.
  // Bu sayede CRON_SECRET'a ihtiyaç yok.
  const { runPromptOnce } = await import('./run-prompt');
  const prompts = await prisma.prompt.findMany({
    where: { isActive: true },
    select: { id: true, tenantId: true },
  });
  const results: { promptId: string; ok: boolean; error?: string }[] = [];
  for (const p of prompts) {
    try {
      await runPromptOnce(p.tenantId, p.id);
      results.push({ promptId: p.id, ok: true });
    } catch (err) {
      results.push({
        promptId: p.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return { processed: results.length, failed: results.filter((r) => !r.ok).length };
}
