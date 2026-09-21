import type { Prisma } from '@independentai/db';
import { prisma } from './prisma';
import { computeEntitlement, type PlanTier } from './entitlement';

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

// ── Sayfalı listeler (gece programı W4): `select` ile alan seçimi — passwordHash/oauthSub ASLA dönmez ──

export const ADMIN_PAGE_SIZE = 50;

function pageTake(take?: number): number {
  return Math.max(1, Math.min(200, take ?? ADMIN_PAGE_SIZE));
}

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: 'OWNER' | 'ADMIN' | 'VIEWER';
  isSuperAdmin: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  tenant: { id: string; name: string; plan: PlanTier; trialEndsAt: Date; kind: 'BRAND' | 'AGENCY' };
};

export type UserStatusBadge = { key: 'active' | 'trial' | 'expired'; label: string };

/** Rozet: ücretli plan → Aktif; LAUNCH ve süre içinde → Deneme; süre (+ek süre) dolmuş → Süresi doldu. */
export function userStatusBadge(
  tenant: { plan: PlanTier; trialEndsAt: Date },
  now: Date = new Date(),
): UserStatusBadge {
  const ent = computeEntitlement({ plan: tenant.plan, trialEndsAt: tenant.trialEndsAt }, now);
  if (tenant.plan !== 'LAUNCH') return { key: 'active', label: 'Aktif' };
  if (ent.active) return { key: 'trial', label: 'Deneme' };
  return { key: 'expired', label: 'Süresi doldu' };
}

/** Kullanıcı listesi — cursor sayfalama (createdAt desc), e-posta/şirket araması (Türkçe küçük harf). */
export async function listAdminUsers(
  opts: { q?: string; cursor?: string | null; take?: number } = {},
): Promise<{ items: AdminUserRow[]; nextCursor: string | null; total: number }> {
  const take = pageTake(opts.take);
  const q = opts.q?.trim();
  const qLower = q ? q.toLocaleLowerCase('tr') : '';
  const where: Prisma.UserWhereInput = q
    ? { OR: [{ email: { contains: qLower } }, { tenant: { name: { contains: q, mode: 'insensitive' } } }] }
    : {};
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isSuperAdmin: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        tenant: { select: { id: true, name: true, plan: true, trialEndsAt: true, kind: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  const items = rows.slice(0, take);
  return { items, nextCursor: rows.length > take ? (items[items.length - 1]?.id ?? null) : null, total };
}

export type AdminTenantRow = {
  id: string;
  name: string;
  website: string | null;
  plan: PlanTier;
  kind: 'BRAND' | 'AGENCY';
  trialEndsAt: Date;
  createdAt: Date;
  onboardingCompletedAt: Date | null;
  _count: { users: number; prompts: number; brands: number; competitors: number };
};

/** Tenant listesi — cursor sayfalama, ad/web araması, `trialEndingDays` ile "N gün içinde biten deneme" filtresi. */
export async function listAdminTenants(
  opts: { q?: string; cursor?: string | null; take?: number; trialEndingDays?: number } = {},
): Promise<{ items: AdminTenantRow[]; nextCursor: string | null; total: number }> {
  const take = pageTake(opts.take);
  const q = opts.q?.trim();
  const now = new Date();
  const where: Prisma.TenantWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { website: { contains: q.toLocaleLowerCase('tr'), mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(opts.trialEndingDays
      ? {
          plan: 'LAUNCH',
          trialEndsAt: { gte: now, lte: new Date(now.getTime() + opts.trialEndingDays * 86_400_000) },
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        name: true,
        website: true,
        plan: true,
        kind: true,
        trialEndsAt: true,
        createdAt: true,
        onboardingCompletedAt: true,
        _count: { select: { users: true, prompts: true, brands: true, competitors: true } },
      },
    }),
    prisma.tenant.count({ where }),
  ]);
  const items = rows.slice(0, take);
  return { items, nextCursor: rows.length > take ? (items[items.length - 1]?.id ?? null) : null, total };
}

/** "Sahip ata" için süper admin listesi (yalnız id + e-posta). */
export function listSuperAdmins() {
  return prisma.user.findMany({
    where: { isSuperAdmin: true },
    orderBy: { email: 'asc' },
    select: { id: true, email: true },
    take: 50,
  });
}

export async function triggerManualCron(triggeredBy: string, opts: { force?: boolean } = {}) {
  // Cron endpoint'ini HTTP üzerinden çağırmak yerine aynı toplu çalıştırıcıyı doğrudan kullanır.
  // force: true → bugünün satırları zaten çalışmış olsa da yeni bir tam tur üretir.
  const { runDuePrompts } = await import('./run-prompt');
  return runDuePrompts({ deadlineAt: Date.now() + 240_000, force: opts.force ?? false, triggeredBy });
}
