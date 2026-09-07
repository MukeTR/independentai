/**
 * Discovery panelinin istemci sözleşmesi ve saf yardımcıları.
 *
 * Tipler sunucu modüllerinden `import type` ile alınır (derlemede silinir, istemci paketine
 * sunucu kodu girmez). Buradaki fonksiyonlar saftır; birim testi `tests/unit/discovery-ui.test.ts`.
 */
import type { DiscoveryOverview, RecentSession } from '@/server/discovery/analytics';
import type { GoalView } from '@/server/discovery/goals';
import type { TrackedSiteView } from '@/server/discovery/sites';

export type { DiscoveryOverview, GoalView, RecentSession, TrackedSiteView };

export type SiteLimits = { trackedSites: number; sensorEventsPerMonth: number; used: number };

export type SitesResponse = {
  sites: TrackedSiteView[];
  scriptUrl: string;
  limits: SiteLimits;
  canWrite: boolean;
};

export type CreateSiteResponse = { site: TrackedSiteView; publicKey: string; scriptUrl: string };
export type RotateKeyResponse = {
  kind: 'public' | 'ingest';
  publicKey?: string;
  secret?: string;
  site: TrackedSiteView;
};
export type VerifyInfoResponse = { token: string; metaTag: string; verifiedAt: string | null; origin: string };
export type VerifyResponse = { verified: boolean; reason: string; site: TrackedSiteView };
export type OverviewResponse = { overview: DiscoveryOverview; canWrite: boolean };
export type SessionsPage = { items: RecentSession[]; nextCursor: string | null };
export type GoalTemplateItem = {
  name: string;
  type: string;
  matchMethod: string;
  eventName?: string;
  pathPattern?: string;
};
export type GoalsResponse = { goals: GoalView[]; template: { kind: string; items: GoalTemplateItem[] } };

/** Panelin desteklediği gün aralıkları (analytics 1-90 gün arasını kabul eder). */
export const RANGE_DAYS = [7, 30, 90] as const;
export type RangeDays = (typeof RANGE_DAYS)[number];

export const SITE_KIND_LABELS: Record<string, string> = {
  saas: 'SaaS / yazılım',
  service: 'Hizmet / yerel işletme',
  media: 'Medya / yayın',
  education: 'Eğitim',
  marketplace: 'Pazaryeri / ilan',
  ecommerce: 'E-ticaret',
  other: 'Diğer',
};

export const INSTALL_METHOD_LABELS: Record<string, string> = {
  script: 'HTML snippet',
  gtm: 'Google Tag Manager',
  wordpress: 'WordPress',
  nextjs: 'Next.js',
  nuxt: 'Nuxt',
  webflow: 'Webflow',
  framer: 'Framer',
  wix: 'Wix',
  squarespace: 'Squarespace',
  cloudflare: 'Cloudflare Worker',
  server: 'Sunucu / edge',
  other: 'Diğer',
};

export const SITE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Kurulum bekliyor',
  ACTIVE: 'Ölçüm açık',
  PAUSED: 'Duraklatıldı',
  REVOKED: 'İptal edildi',
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  PAGE_VIEW: 'Sayfa görüntüleme',
  CONTENT_VIEW: 'İçerik görüntüleme',
  CTA_CLICK: 'Buton tıklaması',
  FORM_START: 'Form başlatma',
  FORM_SUBMIT: 'Form gönderimi',
  SIGN_UP: 'Kayıt',
  DEMO_REQUEST: 'Demo talebi',
  PHONE_CLICK: 'Telefon tıklaması',
  BOOKING: 'Randevu',
  APPLICATION: 'Başvuru',
  SUBSCRIBE: 'Abonelik',
  PRODUCT_VIEW: 'Ürün görüntüleme',
  ADD_TO_CART: 'Sepete ekleme',
  PURCHASE: 'Satın alma',
  CUSTOM: 'Özel olay',
};

export const GOAL_TYPE_LABELS: Record<string, string> = {
  SIGN_UP: 'Kayıt',
  LEAD: 'Potansiyel müşteri',
  DEMO: 'Demo',
  CONTACT: 'İletişim',
  BOOKING: 'Randevu',
  APPLICATION: 'Başvuru',
  SUBSCRIBE: 'Abonelik',
  PURCHASE: 'Satın alma',
  CUSTOM: 'Özel',
};

export const GOAL_MATCH_LABELS: Record<string, string> = {
  PATH: 'URL yolu',
  EVENT: 'Olay adı',
  DATA_ATTRIBUTE: 'data-iai-event',
};

export const BOT_PURPOSE_LABELS: Record<string, string> = {
  TRAINING: 'Model eğitimi',
  SEARCH: 'Arama dizini',
  ASSISTANT: 'Asistan yanıtı',
  AGENT: 'Kullanıcı adına ajan',
  OTHER: 'Diğer',
};

export const SOURCE_CLASS_LABELS: Record<string, string> = {
  AI_REFERRAL: 'AI ürününden',
  DIRECT: 'Doğrudan',
  ORGANIC: 'Arama motoru',
  OTHER: 'Diğer site',
};

export function labelOf(map: Record<string, string>, key: string | null | undefined, fallback = 'Bilinmiyor'): string {
  if (!key) return fallback;
  return map[key] ?? key;
}

/** Sayfaya yapıştırılacak sensör snippet'i (anahtar yalnızca üretildiği anda elimizdedir). */
export function snippetFor(scriptUrl: string, publicKey: string): string {
  return `<script async src="${scriptUrl}" data-site="${publicKey}"></script>`;
}

/**
 * Sepet/ürün/ciro kartları yalnızca e-ticaret bağlamında gösterilir.
 *  - Site türü açıkça seçilmişse ona uyulur (e-ticaret değilse gösterilmez).
 *  - Tür seçilmemişse tanımlı hedeflerden çıkarım yapılır (satın alma hedefi varsa gösterilir).
 */
export function showCommerceCards(
  siteKind: string | null | undefined,
  goals: { type: string }[] = [],
  events: { type: string }[] = [],
): boolean {
  if (siteKind) return siteKind === 'ecommerce';
  if (goals.some((g) => g.type === 'PURCHASE')) return true;
  return events.some((e) => e.type === 'PURCHASE' || e.type === 'ADD_TO_CART');
}

/** Sayı biçimi (tr) — 0 dâhil her zaman bir değer döner. */
export function num(n: number | null | undefined): string {
  return (typeof n === 'number' && Number.isFinite(n) ? n : 0).toLocaleString('tr-TR');
}

/** Para birimi bilinmiyorsa sembolsüz gösterilir (uydurma para birimi yok). */
export function money(value: number | null | undefined, currency: string | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const formatted = value.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
  return currency ? `${formatted} ${currency}` : formatted;
}

/** Oran (%) — payda 0 ise "—" (sıfıra bölmeden sahte yüzde üretme). */
export function ratio(part: number, total: number): string {
  if (!total) return '—';
  return `%${((part / total) * 100).toFixed(part / total >= 0.1 ? 0 : 1)}`;
}
