/**
 * Sunucu/edge telemetrisi — JavaScript çalıştırmayan AI crawler/fetcher istekleri.
 *
 * Tarayıcı SDK'sı bu istekleri **göremez**; bu yüzden ayrı, imzalı bir kanal vardır:
 *   POST /api/collect/v1/server
 *   X-IAI-Key        : public site key (siteyi tanımlar)
 *   X-IAI-Timestamp  : ms epoch (±5 dk)
 *   X-IAI-Signature  : hex HMAC-SHA256(ingest secret, `${timestamp}.${rawBody}`)
 *
 * Gönderen taraf ham erişim logu, Cookie, Authorization, query string veya kalıcı IP GÖNDERMEZ.
 * IP yalnızca doğrulama için opsiyoneldir; asla saklanmaz.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { promises as dns } from 'node:dns';
import { z } from 'zod';
import type { TrackedSite, VerificationLevel } from '@independentai/db';
import { prisma } from '../prisma';
import { log } from '../logger';
import { consume } from '../rate-limit';
import { normalizePath, safeToken } from './events';
import { verifyBot, type BotDefinition } from './bots';
import { IngestError } from './ingest';
import { readIngestSecret } from './sites';

export const MAX_SERVER_BATCH = 200;
export const MAX_SIGNATURE_SKEW_MS = 5 * 60_000;

export const ServerHitSchema = z.object({
  /** Gönderenin ürettiği benzersiz kimlik (dedupe) */
  id: z.string().min(8).max(80),
  /** User-agent (yalnızca bot eşleştirmesi için; saklanmaz) */
  ua: z.string().max(512),
  path: z.string().max(2048),
  status: z.number().int().min(100).max(599).optional(),
  ct: z.string().max(120).optional(),
  ts: z.number().int().positive().optional(),
  /** Telemetriyi gönderen katman */
  src: z.enum(['cloudflare', 'vercel', 'nginx', 'server']).optional(),
  /** Edge sağlayıcısı botu doğruladıysa (örn. Cloudflare verified bot) */
  verified: z.boolean().optional(),
  /** Yalnızca doğrulama için; saklanmaz */
  ip: z.string().max(64).optional(),
});

export const ServerBatchSchema = z.object({ hits: z.array(ServerHitSchema).min(1).max(MAX_SERVER_BATCH) });

export type ServerHit = z.infer<typeof ServerHitSchema>;

/** Sabit zamanlı imza karşılaştırması. */
export function signPayload(secret: string, timestamp: string, rawBody: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

export function signaturesMatch(expected: string, received: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** İmza + zaman kayması doğrulaması. Hata durumunda IngestError. */
export function verifyServerRequest(site: TrackedSite, rawBody: string, headers: Headers, now = Date.now()): void {
  const secret = readIngestSecret(site);
  if (!secret) throw new IngestError(403, 'no_ingest_secret', 'Bu site için sunucu ingest sırrı üretilmemiş');

  const timestamp = headers.get('x-iai-timestamp') ?? '';
  const signature = headers.get('x-iai-signature') ?? '';
  if (!timestamp || !signature) throw new IngestError(401, 'missing_signature', 'İmza başlıkları eksik');

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_SIGNATURE_SKEW_MS) {
    throw new IngestError(401, 'stale_timestamp', 'İmza zaman damgası geçersiz');
  }
  if (!signaturesMatch(signPayload(secret, timestamp, rawBody), signature)) {
    throw new IngestError(401, 'bad_signature', 'İmza doğrulanamadı');
  }
}

// ───────────── Bot doğrulama (sınırlı, önbellekli) ─────────────

type CacheEntry = { verified: boolean; at: number };
const rdnsCache = new Map<string, CacheEntry>();
const RDNS_TTL_MS = 6 * 3_600_000;
const RDNS_MAX_ENTRIES = 5_000;
const RDNS_TIMEOUT_MS = 1_500;

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]).catch(() => null);
}

/**
 * Ters DNS + ileri doğrulama: IP → hostname (operatörün alan adı soneki) → hostname → IP eşleşmesi.
 * Yalnızca operatörün böyle bir yöntemi belgelediği botlar için çalışır; sonuç önbelleklenir.
 * Collector isteğini kilitlememesi için kısa zaman aşımı vardır ve `after()` içinde çağrılır.
 */
export async function verifyReverseDns(ip: string, bot: BotDefinition): Promise<boolean> {
  if (bot.verificationMethod !== 'reverse_dns' || !bot.reverseDnsSuffixes?.length) return false;
  const key = `${bot.canonicalId}:${ip}`;
  const hit = rdnsCache.get(key);
  if (hit && Date.now() - hit.at < RDNS_TTL_MS) return hit.verified;

  let verified = false;
  try {
    const hosts = await withTimeout(dns.reverse(ip), RDNS_TIMEOUT_MS);
    const host = hosts?.find((h) => bot.reverseDnsSuffixes!.some((sfx) => h.toLowerCase().endsWith(sfx)));
    if (host) {
      const forward = await withTimeout(dns.resolve(host), RDNS_TIMEOUT_MS);
      verified = !!forward?.includes(ip);
    }
  } catch {
    verified = false;
  }
  if (rdnsCache.size > RDNS_MAX_ENTRIES) rdnsCache.clear();
  rdnsCache.set(key, { verified, at: Date.now() });
  return verified;
}

export type CrawlerOutcome = { accepted: number; duplicates: number; ignored: number; verified: number };

/**
 * Bir sunucu/edge partisini işler.
 *  - Kontrol token'ları (Google-Extended vb.) ziyaret üretmez.
 *  - Bilinmeyen user-agent'lar (AI botu olmayan trafik) yok sayılır.
 *  - Doğrulama: edge sinyali → ters DNS (yalnızca destekleyen botlar) → yalnızca UA (UNVERIFIED).
 */
export async function ingestServerHits(site: TrackedSite, hits: ServerHit[]): Promise<CrawlerOutcome> {
  const outcome: CrawlerOutcome = { accepted: 0, duplicates: 0, ignored: 0, verified: 0 };
  const now = Date.now();

  for (const hit of hits) {
    const verdict = verifyBot(hit.ua, { edgeVerified: hit.verified === true });
    if (verdict.ignore || !verdict.bot) {
      outcome.ignored += 1;
      continue;
    }

    let verification: VerificationLevel = verdict.verification;
    let method = verdict.method;
    // Ters DNS yalnızca edge doğrulaması yoksa ve IP verilmişse denenir (IP saklanmaz).
    if (verification !== 'VERIFIED' && hit.ip && verdict.bot.verificationMethod === 'reverse_dns') {
      if (await verifyReverseDns(hit.ip, verdict.bot)) {
        verification = 'VERIFIED';
        method = 'reverse_dns';
      }
    }

    const occurredAt = new Date(hit.ts && Math.abs(now - hit.ts) < 7 * 86_400_000 ? hit.ts : now);
    const dedupeKey = `${site.id}:${hit.id}`;
    try {
      const bot = await prisma.aiBotIdentity.findUnique({ where: { canonicalId: verdict.bot.canonicalId }, select: { id: true } });
      await prisma.aiCrawlerEvent.create({
        data: {
          tenantId: site.tenantId,
          trackedSiteId: site.id,
          dedupeKey,
          botId: bot?.id ?? null,
          operator: verdict.bot.operator,
          canonicalBotId: verdict.bot.canonicalId,
          purpose: verdict.bot.purpose,
          verification,
          verificationMethod: method,
          path: normalizePath(hit.path),
          status: hit.status ?? null,
          contentType: safeToken(hit.ct, 120),
          source: hit.src ?? 'server',
          occurredAt,
          expiresAt: new Date(occurredAt.getTime() + site.retentionDays * 86_400_000),
        },
      });
      outcome.accepted += 1;
      if (verification === 'VERIFIED') outcome.verified += 1;
    } catch (err) {
      if (err instanceof Error && /Unique constraint/i.test(err.message)) {
        outcome.duplicates += 1;
        continue;
      }
      log.error('discovery.crawler_ingest_failed', { siteId: site.id, err });
    }
  }

  if (outcome.accepted > 0) {
    await prisma.trackedSite.update({ where: { id: site.id }, data: { lastServerEventAt: new Date() } });
  }
  return outcome;
}

export async function enforceServerLimits(site: TrackedSite, count: number): Promise<void> {
  const perSite = await consume(`collect:server:${site.id}`, 6_000, 60_000, count);
  if (!perSite.allowed) throw new IngestError(429, 'rate_limited', 'Çok fazla olay', 60);
}

/** Botları DB'ye tohumlar (registry sürümü değişince güncellenir). */
export async function seedBotRegistry(): Promise<number> {
  const { BOT_REGISTRY, BOT_REGISTRY_VERSION } = await import('./bots');
  let n = 0;
  for (const b of BOT_REGISTRY) {
    await prisma.aiBotIdentity.upsert({
      where: { canonicalId: b.canonicalId },
      create: {
        canonicalId: b.canonicalId,
        operator: b.operator,
        displayName: b.displayName,
        purpose: b.purpose,
        userAgents: b.userAgents,
        verificationMethod: b.verificationMethod,
        reverseDnsSuffixes: b.reverseDnsSuffixes ?? [],
        docsUrl: b.docsUrl ?? null,
        registryVersion: BOT_REGISTRY_VERSION,
      },
      update: {
        operator: b.operator,
        displayName: b.displayName,
        purpose: b.purpose,
        userAgents: b.userAgents,
        verificationMethod: b.verificationMethod,
        reverseDnsSuffixes: b.reverseDnsSuffixes ?? [],
        docsUrl: b.docsUrl ?? null,
        registryVersion: BOT_REGISTRY_VERSION,
        isActive: true,
      },
    });
    n += 1;
  }
  return n;
}
