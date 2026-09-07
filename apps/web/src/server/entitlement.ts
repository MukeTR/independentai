/**
 * Plan / deneme yetkilendirmesi — TEK kaynak. UI gizlemekle yetinmez; her yazma ve
 * çalıştırma sunucuda buradan geçer.
 *
 * Marka hesabı (LAUNCH/STARTER/GROWTH) ve ajans hesabı (LAUNCH/STUDIO/SCALE) ayrı limit
 * tablolarıyla yönetilir. Fiyat yoktur; STARTER/GROWTH/STUDIO/SCALE yalnızca süper admin atar.
 * Süre + ek süre (TRIAL_GRACE_DAYS) dolduğunda hesap SALT-OKUNUR olur: veri silinmez.
 */
import { trialGraceDays } from './env';

export type PlanTier = 'LAUNCH' | 'STARTER' | 'GROWTH';
export type AgencyPlanTier = 'LAUNCH' | 'STUDIO' | 'SCALE';

export type Entitlement = {
  plan: PlanTier;
  /** Yazma/çalıştırma açık mı? */
  active: boolean;
  /** Salt-okunur nedeni */
  reason: 'ok' | 'trial_expired' | 'workspace_paused';
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
    /** Mağaza bağlantısı sayısı */
    storeConnections: number;
    /** Katalogdan senkronlanacak en fazla ürün */
    catalogProducts: number;
    /** AI Discovery: izlenen site (sensor) sayısı */
    trackedSites: number;
    /** Site başına aylık kabul edilen ham olay üst sınırı (adil kullanım) */
    sensorEventsPerMonth: number;
  };
};

const DAY = 86_400_000;

const LIMITS: Record<PlanTier, Entitlement['limits']> = {
  // Lansman: "adil kullanım" tavanları (pazarlama metniyle aynı: capabilities.ts)
  LAUNCH: {
    ownBrands: 1,
    prompts: 200,
    competitors: 50,
    members: 5,
    apiTokens: 5,
    manualRunsPerDay: 60,
    storeConnections: 2,
    catalogProducts: 5000,
    trackedSites: 3,
    sensorEventsPerMonth: 250_000,
  },
  STARTER: {
    ownBrands: 1,
    prompts: 50,
    competitors: 10,
    members: 3,
    apiTokens: 2,
    manualRunsPerDay: 30,
    storeConnections: 1,
    catalogProducts: 2000,
    trackedSites: 1,
    sensorEventsPerMonth: 250_000,
  },
  GROWTH: {
    ownBrands: 5,
    prompts: 1000,
    competitors: 200,
    members: 50,
    apiTokens: 20,
    manualRunsPerDay: 300,
    storeConnections: 10,
    catalogProducts: 50000,
    trackedSites: 10,
    sensorEventsPerMonth: 2_000_000,
  },
};

export function computeEntitlement(tenant: { plan: PlanTier; trialEndsAt: Date }, now = new Date()): Entitlement {
  const trialMs = tenant.trialEndsAt.getTime() - now.getTime();
  const trialDaysLeft = Math.max(0, Math.ceil(trialMs / DAY));
  const graceMs = tenant.trialEndsAt.getTime() + trialGraceDays() * DAY - now.getTime();
  const graceDaysLeft = Math.max(0, Math.ceil(graceMs / DAY));
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

// ───────────── Ajans planı ─────────────

export type AgencyEntitlement = {
  plan: AgencyPlanTier;
  active: boolean;
  limits: { seats: number; clients: number; shareLinks: number };
  usage: { seats: number; clients: number };
  /** Kalan koltuk/müşteri (0 ise ekleme reddedilir) */
  seatsLeft: number;
  clientsLeft: number;
  /** Beyaz etiket (kaynak gizleme) bu planda var mı — lansmanda yok, dürüstçe belirtilir */
  whiteLabel: boolean;
};

const AGENCY_LIMITS: Record<AgencyPlanTier, AgencyEntitlement['limits'] & { whiteLabel: boolean }> = {
  LAUNCH: { seats: 5, clients: 10, shareLinks: 20, whiteLabel: false },
  STUDIO: { seats: 15, clients: 40, shareLinks: 100, whiteLabel: true },
  SCALE: { seats: 100, clients: 500, shareLinks: 1000, whiteLabel: true },
};

export function computeAgencyEntitlement(
  input: { plan: AgencyPlanTier; trialEndsAt: Date; seats: number; clients: number },
  now = new Date(),
): AgencyEntitlement {
  const cfg = AGENCY_LIMITS[input.plan];
  const paid = input.plan !== 'LAUNCH';
  const graceMs = input.trialEndsAt.getTime() + trialGraceDays() * DAY - now.getTime();
  const active = paid || graceMs > 0;
  return {
    plan: input.plan,
    active,
    limits: { seats: cfg.seats, clients: cfg.clients, shareLinks: cfg.shareLinks },
    usage: { seats: input.seats, clients: input.clients },
    seatsLeft: Math.max(0, cfg.seats - input.seats),
    clientsLeft: Math.max(0, cfg.clients - input.clients),
    whiteLabel: cfg.whiteLabel,
  };
}
