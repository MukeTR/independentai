/**
 * Supabase Realtime köprüsü (sunucu tarafı).
 *
 *  - Token: uygulamanın kendi oturumu doğrulandıktan sonra, DB'den güncel kullanıcı/tenant/rol/
 *    sessionVersion okunur ve 10 dakikalık, iss/aud/exp içeren bir Supabase JWT üretilir.
 *    İmzalama: `SUPABASE_JWT_PRIVATE_KEY_JWK` (ES256/RS256, Supabase'e "import" edilmiş anahtar;
 *    kid zorunlu) tercih edilir; yoksa `SUPABASE_JWT_SECRET` (HS256 legacy) kullanılır.
 *    Claim'ler: role=authenticated, sub, tenant_id, user_id, app_role, session_version, agency_id, topics.
 *  - Yayın: `realtime.send(payload, event, topic, private=true)` SQL fonksiyonu, veri değişikliğiyle
 *    AYNI transaction içinde çağrılır (rollback → hayalet olay yok). Realtime kapalıysa no-op.
 *  - Kanal adları: tenant:<tenantId> (müşteri detayı), agency:<agencyId> (portföy). Yetki
 *    `realtime.messages` RLS politikalarıyla (supabase/realtime-policies.sql) doğrulanır.
 *  - Payload minimum: entity id, event, status, progress, safe summary, timestamp, job id. AI cevabı,
 *    token, e-posta veya ham katalog verisi ASLA yayınlanmaz.
 */
import { SignJWT, importJWK, type JWK } from 'jose';
import type { Prisma } from '@independentai/db';
import { prisma } from './prisma';
import { log } from './logger';

export type RealtimeEventName =
  | 'run.progress'
  | 'run.completed'
  | 'batch.completed'
  | 'notification.delivered'
  | 'team.changed'
  | 'agency.changed'
  | 'integration.sync'
  | 'integration.changed';

export type RealtimePayload = {
  event: RealtimeEventName;
  entityId?: string;
  status?: string;
  progress?: number; // 0-100
  summary?: string; // güvenli, kısa
  jobId?: string;
  ts: string;
  eventId: string;
  [k: string]: unknown;
};

export const REALTIME_TOKEN_TTL_SEC = 10 * 60;

export function realtimeConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    (process.env.SUPABASE_JWT_PRIVATE_KEY_JWK || process.env.SUPABASE_JWT_SECRET)
  );
}

/** DB tarafında realtime.send var mı (Supabase) — yerel/test ortamında stub şeması ile true olabilir. */
export function realtimePublishEnabled(): boolean {
  return process.env.REALTIME_PUBLISH === '1' || (realtimeConfigured() && process.env.REALTIME_PUBLISH !== '0');
}

export function tenantTopic(tenantId: string): string {
  return `tenant:${tenantId}`;
}
export function agencyTopic(agencyId: string): string {
  return `agency:${agencyId}`;
}

function randomEventId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const FORBIDDEN_KEYS = /(responseText|token|secret|password|webhook|email|credentials|apiKey)/i;

/** Payload'ı sınırlar: yasak alan yok, string'ler kısa, derinlik yok. */
export function sanitizePayload(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (FORBIDDEN_KEYS.test(k)) continue;
    if (v == null) continue;
    if (typeof v === 'string') out[k] = v.length > 200 ? v.slice(0, 200) : v;
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    else if (Array.isArray(v)) out[k] = v.slice(0, 20).filter((x) => typeof x === 'string' || typeof x === 'number');
  }
  return out;
}

type Tx = Prisma.TransactionClient | typeof prisma;

/**
 * `realtime.send` fonksiyonu DB'de var mı? Süreç başına bir kez bakılır (transaction DIŞINDA, ayrı bağlantı).
 * Yoksa yayın sessizce kapatılır: bir tx içinde başarısız SQL tüm transaction'ı iptal ederdi (ModelRun yazımı dahil).
 */
let sendAvailable: Promise<boolean> | null = null;
function realtimeSendAvailable(): Promise<boolean> {
  if (!sendAvailable) {
    sendAvailable = prisma.$queryRaw<
      { ok: boolean }[]
    >`SELECT to_regprocedure('realtime.send(jsonb,text,text,boolean)') IS NOT NULL AS ok`
      .then((rows) => {
        const ok = !!rows[0]?.ok;
        if (!ok)
          log.warn('realtime.send_missing', { hint: 'supabase/realtime-policies.sql ve realtime şeması uygulanmalı' });
        return ok;
      })
      .catch((err) => {
        log.warn('realtime.send_probe_failed', { err });
        sendAvailable = null; // sonraki çağrıda yeniden dene
        return false;
      });
  }
  return sendAvailable;
}

/**
 * Bir topic'e private broadcast yazar. `tx` verilirse aynı transaction içinde çalışır.
 * Hata durumunda iş akışını BOZMAZ (loglar); Realtime "best effort" katmandır, kalıcı durum API'dedir.
 */
export async function publish(
  topic: string,
  payload: Omit<RealtimePayload, 'ts' | 'eventId'>,
  tx: Tx = prisma,
): Promise<void> {
  if (!realtimePublishEnabled()) return;
  if (!(await realtimeSendAvailable())) return;
  const body: RealtimePayload = {
    ...sanitizePayload(payload as Record<string, unknown>),
    event: payload.event,
    ts: new Date().toISOString(),
    eventId: randomEventId(),
  } as RealtimePayload;
  try {
    await tx.$executeRaw`SELECT realtime.send(${JSON.stringify(body)}::jsonb, ${payload.event}, ${topic}, true)`;
  } catch (err) {
    log.warn('realtime.publish_failed', { topic, event: payload.event, err });
  }
}

/** Hem tenant hem (varsa) ajans topic'ine yayın. */
export async function publishForTenant(
  tenantId: string,
  payload: Omit<RealtimePayload, 'ts' | 'eventId'>,
  tx: Tx = prisma,
): Promise<void> {
  await publish(tenantTopic(tenantId), payload, tx);
  try {
    const ws = await tx.agencyWorkspace.findUnique({ where: { tenantId }, select: { agencyId: true } });
    if (ws) await publish(agencyTopic(ws.agencyId), { ...payload, tenantId }, tx);
  } catch {
    /* best effort */
  }
}

// ───────────── Token ─────────────

export type RealtimeClaims = {
  userId: string;
  tenantId: string;
  role: string;
  sessionVersion: number;
  agencyId?: string | null;
  /** Dinlemeye yetkili topic listesi (RLS tarafında da doğrulanır) */
  topics: string[];
};

export async function mintRealtimeToken(claims: RealtimeClaims): Promise<{ token: string; expiresAt: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('Realtime yapılandırılmamış');
  const now = Math.floor(Date.now() / 1000);
  const exp = now + REALTIME_TOKEN_TTL_SEC;
  const builder = new SignJWT({
    role: 'authenticated',
    aud: 'authenticated',
    iss: `${url.replace(/\/$/, '')}/auth/v1`,
    user_id: claims.userId,
    tenant_id: claims.tenantId,
    app_role: claims.role,
    session_version: claims.sessionVersion,
    agency_id: claims.agencyId ?? null,
    topics: claims.topics.slice(0, 50),
  })
    .setSubject(claims.userId)
    .setIssuedAt(now)
    .setExpirationTime(exp);

  const jwkRaw = process.env.SUPABASE_JWT_PRIVATE_KEY_JWK;
  if (jwkRaw) {
    const jwk = JSON.parse(jwkRaw) as JWK & { kid?: string; alg?: string };
    const alg = jwk.alg ?? (jwk.kty === 'EC' ? 'ES256' : 'RS256');
    const key = await importJWK(jwk, alg);
    const token = await builder
      .setProtectedHeader({ alg, typ: 'JWT', kid: jwk.kid ?? process.env.SUPABASE_JWT_KID })
      .sign(key);
    return { token, expiresAt: exp * 1000 };
  }
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('Realtime imzalama anahtarı yok');
  const token = await builder.setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).sign(new TextEncoder().encode(secret));
  return { token, expiresAt: exp * 1000 };
}
