/**
 * Plan / deneme yetkilendirmesi — TEK kaynak. UI gizlemekle yetinmez; her yazma ve
 * çalıştırma sunucuda buradan geçer.
 *
 * Lansman (LAUNCH): trialEndsAt'e kadar tüm özellikler. Süre + ek süre (TRIAL_GRACE_DAYS)
 * dolduğunda hesap SALT-OKUNUR olur: veri silinmez, panel açılır, ama yeni soru/rakip/
 * çalıştırma ve cron kapalıdır. Fiyat/ödeme sağlayıcısı henüz yok; STARTER/GROWTH yalnızca
 * super admin tarafından elle atanır (bkz. ADMIN.md).
 */
import { trialGraceDays } from './env';

export type PlanTier = 'LAUNCH' | 'STARTER' | 'GROWTH';

export type Entitlement = {
  plan: PlanTier;
  /** Yazma/çalıştırma açık mı? */
  active: boolean;
  /** Salt-okunur nedeni */
  reason: 'ok' | 'trial_expired';
  trialEndsAt: string;
  trialDaysLeft: number;
  graceDaysLeft: number;
  limits: {
    ownBrands: number;
    prompts: number;
    competitors: number;
    members: number;
    apiTokens: number;
    /** Public API + panel için günlük manuel çalıştırma üst sınırı (tenant) */
    manualRunsPerDay: number;
  };
};

const DAY = 86_400_000;

const LIMITS: Record<PlanTier, Entitlement['limits']> = {
  // Lansman: "sınırsız" pazarlama vaadi → makul kötüye-kullanım tavanı. Bu tavanlar
  // pazarlama metninde "adil kullanım" olarak belgelenir (bkz. capabilities.ts).
  LAUNCH: { ownBrands: 1, prompts: 200, competitors: 50, members: 5, apiTokens: 5, manualRunsPerDay: 60 },
  STARTER: { ownBrands: 1, prompts: 50, competitors: 10, members: 3, apiTokens: 2, manualRunsPerDay: 30 },
  GROWTH: { ownBrands: 5, prompts: 1000, competitors: 200, members: 50, apiTokens: 20, manualRunsPerDay: 300 },
};

export function computeEntitlement(tenant: { plan: PlanTier; trialEndsAt: Date }, now = new Date()): Entitlement {
  const trialMs = tenant.trialEndsAt.getTime() - now.getTime();
  const trialDaysLeft = Math.max(0, Math.ceil(trialMs / DAY));
  const graceMs = tenant.trialEndsAt.getTime() + trialGraceDays() * DAY - now.getTime();
  const graceDaysLeft = Math.max(0, Math.ceil(graceMs / DAY));

  // Ücretli plan atanmışsa deneme süresine bakılmaz.
  const paid = tenant.plan !== 'LAUNCH';
  const active = paid || graceMs > 0;

  return {
    plan: tenant.plan,
    active,
    reason: active ? 'ok' : 'trial_expired',
    trialEndsAt: tenant.trialEndsAt.toISOString(),
    trialDaysLeft,
    graceDaysLeft,
    limits: LIMITS[tenant.plan],
  };
}
