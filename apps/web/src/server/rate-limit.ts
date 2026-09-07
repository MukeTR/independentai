/**
 * Dağıtık rate limit — Postgres tabanlı sabit pencere sayaç.
 *
 * Neden DB? Vercel fonksiyonları instance-local bellek paylaşmaz; Redis/Upstash eklemeden
 * (ücretsiz mimariyi koruyarak) tüm instance'ların gördüğü tek sayaç Supabase'dir.
 * Tek atomik UPSERT ile yarış koşulu yok; süresi geçen pencereler sıfırlanır.
 *
 * IP güven modeli (Cloudflare → Vercel → fonksiyon):
 *   1. cf-connecting-ip  — Cloudflare proxy önde ise gerçek istemci IP'si.
 *   2. x-real-ip / x-forwarded-for ilk değeri — Vercel bunları kendisi yazar ve dışarıdan
 *      gelen değeri EZER (spoof korumalı). Cloudflare öndeyse bu Cloudflare edge IP'sidir.
 *   3. Hiçbiri yoksa: UA + dil hash'i ile "anonim" kova (herkesi tek kovaya atmaktan iyidir).
 * İkinci savunma hattı olarak her rota için küresel tavan da uygulanır.
 */
import { createHash } from 'node:crypto';
import { prisma } from './prisma';
import { RateLimitedError } from './errors';
import { log } from './logger';
import { utcTs } from './sql';

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
};

/**
 * Tek atomik UPSERT: pencere geçtiyse sıfırla, geçmediyse artır.
 * `cost` > 1 ise tek istek birden çok birim harcar (örn. toplu olay gönderimi).
 */
export async function consume(key: string, limit: number, windowMs: number, cost = 1): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const units = Math.max(1, Math.floor(cost));
  try {
    const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
      VALUES (${key}, ${units}, ${utcTs(resetAt)})
      ON CONFLICT ("key") DO UPDATE SET
        "count"   = CASE WHEN "RateLimitBucket"."resetAt" <= ${utcTs(now)} THEN ${units} ELSE "RateLimitBucket"."count" + ${units} END,
        "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= ${utcTs(now)} THEN ${utcTs(resetAt)} ELSE "RateLimitBucket"."resetAt" END
      RETURNING "count", "resetAt"
    `;
    const row = rows[0];
    if (!row) return { allowed: true, limit, remaining: Math.max(0, limit - units), resetAt };
    const count = Number(row.count);
    return { allowed: count <= limit, limit, remaining: Math.max(0, limit - count), resetAt: row.resetAt };
  } catch (err) {
    // DB erişilemezse "fail-open" yerine muhafazakâr davran: pahalı public uçlar için kapalı.
    log.error('ratelimit.db_error', { key: key.split(':')[0], err });
    return { allowed: false, limit, remaining: 0, resetAt };
  }
}

export function clientIp(req: Request): string {
  const h = req.headers;
  const cf = h.get('cf-connecting-ip')?.trim();
  if (cf) return cf;
  const real = h.get('x-real-ip')?.trim();
  if (real) return real;
  const xff = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (xff) return xff;
  const fp = createHash('sha256')
    .update(`${h.get('user-agent') ?? ''}|${h.get('accept-language') ?? ''}`)
    .digest('hex')
    .slice(0, 16);
  return `anon-${fp}`;
}

export type LimitSpec = {
  /** rota adı — anahtar ön eki */
  name: string;
  limit: number;
  windowMs: number;
  /** Küresel tavan (tüm istemciler toplamı) — DoS/maliyet sigortası */
  global?: { limit: number; windowMs: number };
};

/** Limit aşımında RateLimitedError fırlatır; aksi halde başlık bilgilerini döndürür. */
export async function enforceRateLimit(
  req: Request,
  spec: LimitSpec,
  subject?: string,
): Promise<Record<string, string>> {
  const who = subject ?? `ip:${clientIp(req)}`;
  const r = await consume(`${spec.name}:${who}`, spec.limit, spec.windowMs);
  const headers = {
    'X-RateLimit-Limit': String(r.limit),
    'X-RateLimit-Remaining': String(r.remaining),
    'X-RateLimit-Reset': String(Math.ceil(r.resetAt.getTime() / 1000)),
  };
  if (!r.allowed) {
    const retry = (r.resetAt.getTime() - Date.now()) / 1000;
    throw new RateLimitedError('Çok fazla istek. Lütfen biraz sonra tekrar deneyin.', retry, headers);
  }
  if (spec.global) {
    const g = await consume(`${spec.name}:__global__`, spec.global.limit, spec.global.windowMs);
    if (!g.allowed) {
      const retry = (g.resetAt.getTime() - Date.now()) / 1000;
      throw new RateLimitedError('Sistem şu an yoğun. Lütfen biraz sonra tekrar deneyin.', retry, headers);
    }
  }
  return headers;
}

/** Eski imza (bool döndürür) — geçiş dönemi için tutuldu. true = limit AŞILDI. */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const r = await consume(key, limit, windowMs);
  return !r.allowed;
}

/** Süresi geçmiş kovaları temizler (cron sonunda çağrılır). */
export async function pruneRateLimitBuckets(): Promise<number> {
  const res = await prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 60_000) } } });
  return res.count;
}

/** Sık kullanılan limit profilleri (tek yerde belgelenir; docs/api'de de anlatılır). */
export const LIMITS = {
  publicRankCheck: { name: 'rank-check', limit: 8, windowMs: 3_600_000, global: { limit: 400, windowMs: 3_600_000 } },
  publicAudit: { name: 'geo-audit', limit: 10, windowMs: 3_600_000, global: { limit: 500, windowMs: 3_600_000 } },
  publicContentAudit: {
    name: 'content-audit',
    limit: 10,
    windowMs: 3_600_000,
    global: { limit: 500, windowMs: 3_600_000 },
  },
  login: { name: 'login', limit: 10, windowMs: 900_000 },
  register: { name: 'register', limit: 5, windowMs: 3_600_000 },
  forgot: { name: 'forgot', limit: 5, windowMs: 3_600_000 },
  apiV1: { name: 'api-v1', limit: 60, windowMs: 60_000 },
  slackTest: { name: 'slack-test', limit: 3, windowMs: 3_600_000 },
  invite: { name: 'invite', limit: 20, windowMs: 3_600_000 },
  tool: { name: 'tool', limit: 30, windowMs: 3_600_000 },
} as const satisfies Record<string, LimitSpec>;
