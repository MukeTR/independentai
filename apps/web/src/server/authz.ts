/**
 * Yetkilendirme — merkezi politika.
 *
 *  - `getActor()`   : JWT + DB'den güncel kullanıcı/tenant/rol/entitlement (istek başına cache'li).
 *                     Eski JWT claim'ine güvenilmez: rol, tenant ve sessionVersion DB'den okunur.
 *  - `requireActor(opts)` : opts.role → minimum rol; opts.write → salt-okunur/deneme kontrolü.
 *
 * Rol hiyerarşisi: VIEWER < ADMIN < OWNER. Süper admin, kendi tenant'ında OWNER gibi davranır;
 * platform geneli işlemler için ayrıca `requireSuperAdmin()`.
 */
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { prisma } from './prisma';
import { getSession } from './session';
import { UnauthorizedError, ForbiddenError, TrialExpiredError } from './errors';
import { computeEntitlement, type Entitlement } from './entitlement';

export type Role = 'OWNER' | 'ADMIN' | 'VIEWER';
const RANK: Record<Role, number> = { VIEWER: 0, ADMIN: 1, OWNER: 2 };

export type Actor = {
  userId: string;
  tenantId: string;
  email: string;
  name: string | null;
  role: Role;
  isSuperAdmin: boolean;
  emailVerified: boolean;
  tenant: {
    id: string;
    name: string;
    website: string | null;
    plan: Entitlement['plan'];
    trialEndsAt: Date;
    onboardingCompletedAt: Date | null;
  };
  entitlement: Entitlement;
};

/** İstek başına tek DB okuması (React cache — server component + route handler'da çalışır). */
export const getActor = cache(async (): Promise<Actor | null> => {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { tenant: true },
  });
  if (!user) return null;
  // Oturum iptali: logout-all / şifre değişimi sessionVersion'ı artırır.
  if (user.sessionVersion !== session.sv) return null;
  // Tenant değişimi (davet kabulü vb.) sonrası eski çerez geçersizdir.
  if (user.tenantId !== session.tenantId) return null;

  return {
    userId: user.id,
    tenantId: user.tenantId,
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
      onboardingCompletedAt: user.tenant.onboardingCompletedAt,
    },
    entitlement: computeEntitlement({ plan: user.tenant.plan, trialEndsAt: user.tenant.trialEndsAt }),
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
};

export async function requireActor(opts: RequireOpts = {}): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new UnauthorizedError();
  const minRole: Role = opts.role ?? (opts.write ? 'ADMIN' : 'VIEWER');
  if (!hasRole(actor, minRole)) {
    throw new ForbiddenError(
      minRole === 'OWNER'
        ? 'Bu işlem yalnızca hesap sahibi tarafından yapılabilir'
        : 'Görüntüleyici rolü değişiklik yapamaz',
    );
  }
  if ((opts.write || opts.active) && !actor.entitlement.active) throw new TrialExpiredError();
  return actor;
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
  return actor;
}
