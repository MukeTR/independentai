/**
 * Universal event sözleşmesi — sektörden bağımsız.
 *
 * Bir olay yalnızca şunları taşır: olay kimliği, zaman, normalize yol, referrer HOST'u,
 * olay tipi, opsiyonel varlık (entity) ve hedef bilgisi. Query string, hash, form/DOM metni,
 * çerez, e-posta/telefon gibi PII ve ham IP **asla** kabul edilmez; gelirse burada temizlenir.
 *
 * Sözleşme hem tarayıcı SDK'sı hem sunucu/edge ingest tarafından kullanılır; doğrulama tek yerdedir.
 */
import { z } from 'zod';
import type { SiteEventType } from '@independentai/db';

/** Tüm site türlerinde ortak olay tipleri (e-ticaret yalnızca bir şablon). */
export const SITE_EVENT_TYPES = [
  'PAGE_VIEW',
  'CONTENT_VIEW',
  'CTA_CLICK',
  'FORM_START',
  'FORM_SUBMIT',
  'SIGN_UP',
  'DEMO_REQUEST',
  'PHONE_CLICK',
  'BOOKING',
  'APPLICATION',
  'SUBSCRIBE',
  'PRODUCT_VIEW',
  'ADD_TO_CART',
  'PURCHASE',
  'CUSTOM',
] as const satisfies readonly SiteEventType[];

export type SiteEventName = (typeof SITE_EVENT_TYPES)[number];

/** SDK küçük olsun diye olay adlarını snake_case gönderir; sunucu enum'a çevirir. */
const WIRE_TO_ENUM = new Map<string, SiteEventName>(SITE_EVENT_TYPES.map((t) => [t.toLowerCase(), t]));

export function toEventType(wire: unknown): SiteEventName | null {
  if (typeof wire !== 'string') return null;
  const key = wire
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return WIRE_TO_ENUM.get(key) ?? null;
}

// ───────────── Temizleme ─────────────

const MAX_PATH = 512;
const MAX_LABEL = 120;
const MAX_ID = 120;
const MAX_TYPE = 40;

/** E-posta, telefon, uzun token ve benzeri değerleri yol/etiket içinden çıkarır. */
const PII_PATTERNS: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]'],
  [/\+?\d[\d\s()-]{8,}\d/g, '[phone]'],
  // JWT benzeri veya uzun rastgele tokenlar
  [/\b[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[token]'],
  [/\b(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{32,}\b/g, '[token]'],
];

export function redactPii(input: string): string {
  let out = input;
  for (const [re, rep] of PII_PATTERNS) out = out.replace(re, rep);
  return out;
}

/**
 * Yolu normalize eder: yalnızca pathname; query/hash atılır, sondaki `/` sadeleşir,
 * PII temizlenir, uzunluk sınırlanır. Geçersizse `/` döner.
 */
export function normalizePath(raw: unknown): string {
  if (typeof raw !== 'string' || !raw) return '/';
  let p = raw.trim();
  // Tam URL geldiyse yalnızca pathname'i al
  if (/^https?:\/\//i.test(p)) {
    try {
      p = new URL(p).pathname;
    } catch {
      return '/';
    }
  }
  p = p.split('#')[0]!.split('?')[0]!;
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/{2,}/g, '/');
  if (p.length > 1) p = p.replace(/\/+$/, '') || '/';
  p = redactPii(p);
  return p.slice(0, MAX_PATH);
}

/** Host'u normalize eder (küçük harf, port ve www yok). Geçersizse null. */
export function normalizeHost(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  let h = raw.trim().toLowerCase();
  if (/^https?:\/\//i.test(h)) {
    try {
      h = new URL(h).hostname;
    } catch {
      return null;
    }
  }
  h = h.replace(/:\d+$/, '').replace(/^www\./, '');
  return /^[a-z0-9][a-z0-9.-]{1,253}\.[a-z]{2,}$/.test(h) ? h : null;
}

/** Origin'i kanonikleştirir: şema + host (+ varsayılan olmayan port). Geçersizse null. */
export function normalizeOrigin(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const value = raw.trim();
  try {
    const u = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (!u.hostname.includes('.') && u.hostname !== 'localhost') return null;
    const defaultPort = (u.protocol === 'https:' && u.port === '443') || (u.protocol === 'http:' && u.port === '80');
    return `${u.protocol}//${u.hostname.toLowerCase()}${u.port && !defaultPort ? `:${u.port}` : ''}`;
  } catch {
    return null;
  }
}

/** Serbest ama güvenli kısa değer: harf/rakam/-/_/. ve boşluk; PII temizlenmiş. */
export function safeToken(raw: unknown, max = MAX_TYPE): string | null {
  if (typeof raw !== 'string') return null;
  const v = redactPii(raw.trim())
    .replace(/[^\p{L}\p{N}\s._:-]/gu, '')
    .trim();
  return v ? v.slice(0, max) : null;
}

// ───────────── Şema ─────────────

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'] as const;

/** Tarayıcıdan gelen tek olay (wire biçimi). */
export const IncomingEventSchema = z.object({
  /** İstemcinin ürettiği benzersiz olay kimliği (dedupe) */
  id: z.string().min(8).max(64),
  /** Anonim oturum anahtarı (çerezsiz, kısa ömürlü) */
  sid: z.string().min(8).max(64),
  /** Olay tipi (snake_case veya enum) */
  t: z.string().min(2).max(40),
  /** Yol (query/hash sunucuda da atılır) */
  p: z.string().max(2048).optional(),
  /** Referrer host'u (tam URL gelirse host'a indirilir) */
  r: z.string().max(512).optional(),
  /** Olay zamanı (ms epoch) */
  ts: z.number().int().positive().optional(),
  /** Varlık: tip / id / etiket */
  et: z.string().max(80).optional(),
  ei: z.string().max(200).optional(),
  el: z.string().max(300).optional(),
  /** Özel olay adı (t = custom) */
  n: z.string().max(60).optional(),
  /** Değer ve para birimi (yalnızca site sahibinin gönderdiği ticari değer) */
  v: z.number().finite().nonnegative().max(1_000_000_000).optional(),
  c: z.string().length(3).optional(),
  /** SDK sürümü */
  sv: z.string().max(20).optional(),
  /** Allowlist UTM alanları */
  u: z.record(z.string().max(120)).optional(),
});

export type IncomingEvent = z.infer<typeof IncomingEventSchema>;

export const BatchSchema = z.object({
  k: z.string().min(8).max(120), // public site key
  e: z.array(IncomingEventSchema).min(1).max(20),
});

/** Doğrulanmış, saklamaya hazır olay. */
export type NormalizedEvent = {
  dedupeKey: string;
  sessionKey: string;
  type: SiteEventName;
  customName: string | null;
  path: string;
  referrerHost: string | null;
  occurredAt: Date;
  entityType: string | null;
  entityId: string | null;
  entityLabel: string | null;
  value: number | null;
  currency: string | null;
  sdkVersion: string | null;
  utm: Record<string, string> | null;
};

/** Zaman kayması sınırı: gelecekte 5 dk, geçmişte 24 saat. */
export const MAX_FUTURE_SKEW_MS = 5 * 60_000;
export const MAX_PAST_SKEW_MS = 24 * 3_600_000;

export type NormalizeResult = { ok: true; event: NormalizedEvent } | { ok: false; reason: string };

export function normalizeEvent(raw: IncomingEvent, now = Date.now()): NormalizeResult {
  const type = toEventType(raw.t);
  if (!type) return { ok: false, reason: 'unknown_event_type' };

  const ts = raw.ts ?? now;
  if (ts > now + MAX_FUTURE_SKEW_MS) return { ok: false, reason: 'timestamp_in_future' };
  if (ts < now - MAX_PAST_SKEW_MS) return { ok: false, reason: 'timestamp_too_old' };

  const utm: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const v = raw.u?.[key];
    const safe = safeToken(v, 120);
    if (safe) utm[key] = safe;
  }

  return {
    ok: true,
    event: {
      dedupeKey: raw.id,
      sessionKey: raw.sid,
      type,
      customName: type === 'CUSTOM' ? safeToken(raw.n, 60) : null,
      path: normalizePath(raw.p),
      referrerHost: normalizeHost(raw.r),
      occurredAt: new Date(ts),
      entityType: safeToken(raw.et, MAX_TYPE),
      entityId: safeToken(raw.ei, MAX_ID),
      entityLabel: safeToken(raw.el, MAX_LABEL),
      value: raw.v ?? null,
      currency: raw.c
        ? raw.c
            .toUpperCase()
            .replace(/[^A-Z]/g, '')
            .slice(0, 3) || null
        : null,
      sdkVersion: safeToken(raw.sv, 20),
      utm: Object.keys(utm).length ? utm : null,
    },
  };
}
