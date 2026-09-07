/**
 * Yetkilendirme — merkezi politika (marka hesabı + ajans katmanı).
 *
 *  - `getActor()`: JWT çerezi → DB'den güncel kullanıcı/tenant/rol/sessionVersion (istek başına cache).
 *    Ajans üyesi ise aktif çalışma alanı çerezi (`iai_ws`) DB'de doğrulanır: AgencyWorkspace +
 *    membership.allClients / WorkspaceAccess. Kullanıcının gönderdiği tenantId'ye ASLA güvenilmez.
 *  - Efektif rol: doğrudan üyelikte User.role; ajans üzerinden erişimde ajans rolü → tenant rolüne
 *    map edilir (OWNER/ADMIN/STRATEGIST → yazma, ANALYST → salt-okunur). Müşteri tenant'ının kendi
 *    OWNER'ına özel işlemler (hesap silme, ownership transfer) ajans üzerinden yapılamaz (`directOnly`).
 *  - Rol hiyerarşisi: VIEWER < ADMIN < OWNER. Süper admin ayrıca `requireSuperAdmin()`.
 */
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AgencyRole, WorkspaceStatus } from '@independentai/db';
import { prisma } from './prisma';
import { getSession } from './session';
import { UnauthorizedError, ForbiddenError, TrialExpiredError } from './errors';
import { computeEntitlement, computeAgencyEntitlement, type Entitlement, type AgencyEntitlement } from './entitlement';

export type Role = 'OWNER' | 'ADMIN' | 'VIEWER';
const RANK: Record<Role, number> = { VIEWER: 0, ADMIN: 1, OWNER: 2 };
export const WORKSPACE_COOKIE = 'iai_ws';

/** Ajans rolü → tenant (çalışma alanı) içindeki efektif rol */
export function agencyRoleToTenantRole(role: AgencyRole): Role {
  if (role === 'OWNER') return 'OWNER';
  if (role === 'ADMIN' || role === 'STRATEGIST') return 'ADMIN';
  return 'VIEWER';
}

export type AgencyContext = {
  id: string;
  name: string;
  homeTenantId: string;
  membershipId: string;
  role: AgencyRole;
  allClients: boolean;
  entitlement: AgencyEntitlement;
  /** Seçili müşteri çalışma alanı (varsa) */
  workspace: {
    id: string;
    tenantId: string;
    status: WorkspaceStatus;
    label: string | null;
    roleOverride: AgencyRole | null;
  } | null;
};

export type Actor = {
  userId: string;
  /** Efektif tenant: doğrudan üyelikte ev tenant'ı; ajans üyesinde seçili müşteri (yoksa ajans ev tenant'ı) */
  tenantId: string;
  email: string;
  name: string | null;
  /** Efektif rol (ajans üzerinden erişimde map edilmiş) */
  role: Role;
  /** Kullanıcının kendi ev tenant'ındaki rolü */
  homeRole: Role;
  homeTenantId: string;
  isSuperAdmin: boolean;
  emailVerified: boolean;
  /** Bu tenant'a ajans üzerinden mi erişiliyor? */
  viaAgency: boolean;
  agency: AgencyContext | null;
  tenant: {
    id: string;
    name: string;
    website: string | null;
    kind: 'BRAND' | 'AGENCY';
    plan: Entitlement['plan'];
    trialEndsAt: Date;
    onboardingCompletedAt: Date | null;
  };
  entitlement: Entitlement;
};

async function readWorkspaceCookie(): Promise<string | null> {
  try {
    const store = await cookies();
    const v = store.get(WORKSPACE_COOKIE)?.value;
    return v && /^[A-Za-z0-9_-]{5,64}$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

/** İstek başına tek DB okuması (React cache — server component + route handler'da çalışır). */
export const getActor = cache(async (): Promise<Actor | null> => {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      tenant: true,
      agencyMemberships: {
        where: { status: 'ACTIVE' },
        take: 1,
        include: { agency: { select: { id: true, name: true, plan: true, tenantId: true } } },
      },
    },
  });
  if (!user) return null;
  // Oturum iptali: logout-all / şifre değişimi / rol-erişim değişimi sessionVersion'ı artırır.
  if (user.sessionVersion !== session.sv) return null;
  // Tenant değişimi (davet kabulü vb.) sonrası eski çerez geçersizdir.
  if (user.tenantId !== session.tenantId) return null;

  const homeTenant = user.tenant;
  const membership = user.agencyMemberships[0] ?? null;
  const base = {
    userId: user.id,
    email: user.email,
    name: user.name,
    homeRole: user.role as Role,
    homeTenantId: user.tenantId,
    isSuperAdmin: user.isSuperAdmin,
    emailVerified: !!user.emailVerifiedAt,
  };

  // ── Ajans üyesi: seçili çalışma alanı ──
  if (membership && homeTenant.kind === 'AGENCY' && membership.agency.tenantId === homeTenant.id) {
    const [seatCount, clientCount] = await Promise.all([
      prisma.agencyMembership.count({ where: { agencyId: membership.agencyId, status: 'ACTIVE' } }),
      prisma.agencyWorkspace.count({ where: { agencyId: membership.agencyId, status: { not: 'ARCHIVED' } } }),
    ]);
    const agencyEnt = computeAgencyEntitlement({
      plan: membership.agency.plan,
      trialEndsAt: homeTenant.trialEndsAt,
      seats: seatCount,
      clients: clientCount,
    });
    const wsId = await readWorkspaceCookie();
    let workspace: AgencyContext['workspace'] = null;
    let effectiveTenant = homeTenant;
    let effectiveRole: Role = agencyRoleToTenantRole(membership.role);

    if (wsId) {
      const ws = await prisma.agencyWorkspace.findFirst({
        where: { tenantId: wsId, agencyId: membership.agencyId, status: { not: 'ARCHIVED' } },
        include: { tenant: true, access: { where: { membershipId: membership.id }, take: 1 } },
      });
      const allowed = ws && (membership.allClients || ws.access.length > 0);
      if (ws && allowed) {
        const override = ws.access[0]?.roleOverride ?? null;
        workspace = { id: ws.id, tenantId: ws.tenantId, status: ws.status, label: ws.label, roleOverride: override };
        effectiveTenant = ws.tenant;
        effectiveRole = agencyRoleToTenantRole(override ?? membership.role);
      }
      // Çerez geçersizse sessizce ajans ev tenant'ına düşülür (UI seçim ekranı gösterir).
    }

    const entitlement = computeEntitlement({ plan: effectiveTenant.plan, trialEndsAt: effectiveTenant.trialEndsAt });
    // Ajans ev tenant'ında (portföy) ajans planı geçerlidir; müşteri alanında müşteri planı + duraklatma.
    const effectiveEnt: Entitlement = workspace
      ? workspace.status === 'PAUSED'
        ? { ...entitlement, active: false, reason: 'workspace_paused' }
        : entitlement
      : { ...entitlement, active: agencyEnt.active, reason: agencyEnt.active ? 'ok' : 'trial_expired' };
    return {
      ...base,
      tenantId: effectiveTenant.id,
      role: workspace ? effectiveRole : agencyRoleToTenantRole(membership.role),
      viaAgency: !!workspace,
      agency: {
        id: membership.agencyId,
        name: membership.agency.name,
        homeTenantId: membership.agency.tenantId,
        membershipId: membership.id,
        role: membership.role,
        allClients: membership.allClients,
        entitlement: agencyEnt,
        workspace,
      },
      tenant: {
        id: effectiveTenant.id,
        name: effectiveTenant.name,
        website: effectiveTenant.website,
        kind: effectiveTenant.kind,
        plan: effectiveTenant.plan,
        trialEndsAt: effectiveTenant.trialEndsAt,
        onboardingCompletedAt: effectiveTenant.onboardingCompletedAt,
      },
      entitlement: effectiveEnt,
    };
  }

  // ── Doğrudan marka hesabı ──
  return {
    ...base,
    tenantId: user.tenantId,
    role: user.role as Role,
    viaAgency: false,
    agency: null,
    tenant: {
      id: homeTenant.id,
      name: homeTenant.name,
      website: homeTenant.website,
      kind: homeTenant.kind,
      plan: homeTenant.plan,
      trialEndsAt: homeTenant.trialEndsAt,
      onboardingCompletedAt: homeTenant.onboardingCompletedAt,
    },
    entitlement: computeEntitlement({ plan: homeTenant.plan, trialEndsAt: homeTenant.trialEndsAt }),
  };
});

export function hasRole(actor: Pick<Actor, 'role'>, min: Role): boolean {
  return RANK[actor.role] >= RANK[min];
}

export type RequireOpts = {
  /** Minimum rol (varsayılan VIEWER = giriş yapmış herkes) */
  role?: Role;
  /** Yazma/çalıştırma işlemi: VIEWER reddedilir, deneme süresi dolmuşsa 403 trial_expired */
  write?: boolean;
  /** Maliyetli ama veri yazmayan işlem (araçlar): rol şartı yok, deneme dolmuşsa 403 */
  active?: boolean;
  /** Yalnızca tenant'ın KENDİ üyesi (ajans üzerinden erişim yasak): hesap silme, ownership transfer */
  directOnly?: boolean;
  /** Marka verisi gerektiren uç: ajans ev tenant'ında çalışamaz (çalışma alanı seçilmeli) */
  brandContext?: boolean;
};

export async function requireActor(opts: RequireOpts = {}): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new UnauthorizedError();
  if (opts.directOnly && actor.viaAgency)
    throw new ForbiddenError('Bu işlem yalnızca hesabın kendi sahibi tarafından yapılabilir');
  if (opts.brandContext && actor.tenant.kind === 'AGENCY')
    throw new ForbiddenError('Önce bir müşteri çalışma alanı seçin');
  const minRole: Role = opts.role ?? (opts.write ? 'ADMIN' : 'VIEWER');
  if (!hasRole(actor, minRole)) {
    throw new ForbiddenError(
      minRole === 'OWNER'
        ? 'Bu işlem yalnızca hesap sahibi tarafından yapılabilir'
        : 'Görüntüleyici rolü değişiklik yapamaz',
    );
  }
  if ((opts.write || opts.active) && !actor.entitlement.active) {
    if (actor.entitlement.reason === 'workspace_paused')
      throw new ForbiddenError('Bu müşteri çalışma alanı duraklatılmış; yazma ve ölçüm kapalı');
    throw new TrialExpiredError();
  }
  return actor;
}

/** Ajans bağlamı zorunlu; opsiyonel minimum ajans rolü. */
const AGENCY_RANK: Record<AgencyRole, number> = { ANALYST: 0, STRATEGIST: 1, ADMIN: 2, OWNER: 3 };
export function hasAgencyRole(actor: Actor, min: AgencyRole): boolean {
  return !!actor.agency && AGENCY_RANK[actor.agency.role] >= AGENCY_RANK[min];
}
export async function requireAgencyActor(minRole: AgencyRole = 'ANALYST'): Promise<Actor & { agency: AgencyContext }> {
  const actor = await getActor();
  if (!actor) throw new UnauthorizedError();
  if (!actor.agency) throw new ForbiddenError('Bu işlem için ajans hesabı gerekir');
  if (!hasAgencyRole(actor, minRole)) throw new ForbiddenError('Ajans rolünüz bu işlem için yeterli değil');
  return actor as Actor & { agency: AgencyContext };
}

/** Yalnızca platform sahibi (isSuperAdmin). Tenant rolüyle karıştırılmamalı. */
export async function requireSuperAdmin(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new UnauthorizedError();
  if (!actor.isSuperAdmin) throw new ForbiddenError('Süper admin yetkisi gerekli');
  return actor;
}

/**
 * Sayfa (server component) kullanımı: oturum yoksa hata fırlatmak yerine /login'e yönlendirir.
 * (Layout zaten yönlendirir; sayfa paralel render edildiğinden gürültülü "Yetkisiz" hatası üretmesin.)
 */
export async function requirePageActor(opts: RequireOpts = {}): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect('/login?error=session_expired');
  if (opts.role && !hasRole(actor, opts.role)) redirect('/dashboard');
  if (opts.brandContext && actor.tenant.kind === 'AGENCY') redirect('/agency/clients?select=1');
  return actor;
}

/** Ajans üyesinin dinleyebileceği Realtime topic'leri (RLS ile aynı kural). */
export async function allowedRealtimeTopics(actor: Actor): Promise<string[]> {
  const topics = new Set<string>();
  if (actor.tenant.kind === 'BRAND' && !actor.viaAgency) topics.add(`tenant:${actor.homeTenantId}`);
  if (actor.agency) {
    topics.add(`agency:${actor.agency.id}`);
    const where = actor.agency.allClients
      ? { agencyId: actor.agency.id, status: { not: 'ARCHIVED' as const } }
      : {
          agencyId: actor.agency.id,
          status: { not: 'ARCHIVED' as const },
          access: { some: { membershipId: actor.agency.membershipId } },
        };
    const rows = await prisma.agencyWorkspace.findMany({ where, select: { tenantId: true }, take: 200 });
    for (const r of rows) topics.add(`tenant:${r.tenantId}`);
  }
  return [...topics];
}
