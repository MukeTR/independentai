import { prisma } from './prisma';

export { requireSuperAdmin } from './authz';
export { ForbiddenError } from './errors';

export async function getPlatformStats() {
  const [tenants, users, prompts, runs, mentions, recentRuns, costSum, costUnknown] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.prompt.count(),
    prisma.modelRun.count(),
    prisma.brandMention.count(),
    prisma.modelRun.count({ where: { runDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.modelRun.aggregate({ _sum: { costUsd: true } }),
    prisma.modelRun.count({ where: { status: 'SUCCESS', isMocked: false, costUsd: null } }),
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
    costUnknownRuns: costUnknown,
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

export async function triggerManualCron(triggeredBy: string, opts: { force?: boolean } = {}) {
  // Cron endpoint'ini HTTP üzerinden çağırmak yerine aynı toplu çalıştırıcıyı doğrudan kullanır.
  // force: true → bugünün satırları zaten çalışmış olsa da yeni bir tam tur üretir.
  const { runDuePrompts } = await import('./run-prompt');
  return runDuePrompts({ deadlineAt: Date.now() + 240_000, force: opts.force ?? false, triggeredBy });
}
