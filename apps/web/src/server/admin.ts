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
  // Cron endpoint'ini HTTP üzerinden çağırmak yerine aynı toplu çalıştırıcıyı
  // doğrudan kullanıyoruz — böylece CRON_SECRET'a ihtiyaç yok.
  // force: true → admin testinde aynı gün çalışmış promptlar da yeniden çalışır.
  const { runDuePrompts } = await import('./run-prompt');
  return runDuePrompts({ deadlineAt: Date.now() + 50_000, force: true });
}

