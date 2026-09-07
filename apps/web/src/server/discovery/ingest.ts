/**
 * Collector çekirdeği — tarayıcı SDK'sından gelen olayları doğrular, sınıflandırır ve yazar.
 *
 * Güvenlik zinciri (sırayla):
 *   1. Gövde boyutu ve şema (zod)
 *   2. Public key → site (yalnızca yazma yetkisi)
 *   3. Site durumu (PAUSED/REVOKED reddedilir)
 *   4. `Origin` başlığı allowlist'te mi (exact eşleşme; wildcard yok)
 *   5. Site + IP + küresel hız sınırı, aylık adil kullanım tavanı
 *   6. Zaman kayması/replay sınırı ve `eventId` dedupe
 *   7. Normalize + PII temizliği (events.ts)
 *
 * Ham IP asla saklanmaz (yalnızca hız sınırı anahtarında, kalıcı olmayan biçimde kullanılır).
 * Yanıt hızlıdır (202); sınıflandırma/rollup işleri çağıran tarafından `after()` ile yapılır.
 */
import type { AiAcquisitionSession, Prisma, SiteGoal, TrackedSite } from '@independentai/db';
import { prisma } from '../prisma';
import { log } from '../logger';
import { consume } from '../rate-limit';
import { computeEntitlement } from '../entitlement';
import { publishForTenant } from '../realtime';
import { classifySource } from './ai-sources';
import { matchGoal } from './goals';
import { normalizeEvent, type IncomingEvent, type NormalizedEvent } from './events';
import { originAllowed, resolveSiteByPublicKey } from './sites';

export const MAX_BODY_BYTES = 16 * 1024;
export const MAX_BATCH = 20;
/** Oturum penceresi: bu süre boyunca aynı sessionKey aynı ziyaret sayılır. */
export const SESSION_TTL_MS = 12 * 3_600_000;

export type IngestOutcome = {
  accepted: number;
  duplicates: number;
  rejected: { reason: string }[];
  conversions: number;
};

export class IngestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfterSec?: number,
  ) {
    super(message);
    this.name = 'IngestError';
  }
}

/** Public key + origin doğrulaması. Hata durumunda IngestError fırlatır. */
export async function authorizeSite(publicKey: string, origin: string | null): Promise<TrackedSite> {
  const site = await resolveSiteByPublicKey(publicKey);
  if (!site) throw new IngestError(401, 'invalid_key', 'Geçersiz site anahtarı');
  if (site.status === 'REVOKED') throw new IngestError(403, 'revoked', 'Site anahtarı iptal edilmiş');
  if (site.status === 'PAUSED') throw new IngestError(403, 'paused', 'Ölçüm duraklatılmış');
  if (!originAllowed(site, origin))
    throw new IngestError(403, 'origin_not_allowed', 'Origin bu site için kayıtlı değil');
  return site;
}

/** Site, IP ve küresel hız sınırı + aylık adil kullanım tavanı. */
export async function enforceCollectorLimits(site: TrackedSite, ip: string, count: number): Promise<void> {
  const perSite = await consume(`collect:site:${site.id}`, 600, 60_000);
  if (!perSite.allowed) {
    throw new IngestError(
      429,
      'rate_limited',
      'Çok fazla olay',
      Math.ceil((perSite.resetAt.getTime() - Date.now()) / 1000),
    );
  }
  const perIp = await consume(`collect:ip:${ip}`, 240, 60_000);
  if (!perIp.allowed) {
    throw new IngestError(
      429,
      'rate_limited',
      'Çok fazla olay',
      Math.ceil((perIp.resetAt.getTime() - Date.now()) / 1000),
    );
  }
  const global = await consume('collect:__global__', 60_000, 60_000);
  if (!global.allowed) throw new IngestError(429, 'rate_limited', 'Sistem yoğun', 30);

  // Aylık adil kullanım (plan tavanı). Kayan 30 günlük kova; sayaç DB'de tutulur.
  const tenant = await prisma.tenant.findUnique({
    where: { id: site.tenantId },
    select: { plan: true, trialEndsAt: true },
  });
  if (tenant) {
    const cap = computeEntitlement(tenant).limits.sensorEventsPerMonth;
    const monthly = await consume(`collect:quota:${site.id}`, cap, 30 * 86_400_000, count);
    if (!monthly.allowed) throw new IngestError(429, 'quota_exceeded', 'Aylık olay kotası doldu', 3600);
  }
}

type SessionContext = { session: AiAcquisitionSession; created: boolean };

/** Oturumu bulur veya açar; ilk olayda kaynak sınıflandırması yapılır. */
async function upsertSession(
  tx: Prisma.TransactionClient,
  site: TrackedSite,
  event: NormalizedEvent,
): Promise<SessionContext> {
  const existing = await tx.aiAcquisitionSession.findUnique({
    where: { trackedSiteId_sessionKey: { trackedSiteId: site.id, sessionKey: event.sessionKey } },
  });
  if (existing) {
    const session = await tx.aiAcquisitionSession.update({
      where: { id: existing.id },
      data: { lastSeenAt: event.occurredAt, eventCount: { increment: 1 } },
    });
    return { session, created: false };
  }
  const cls = classifySource({ referrerHost: event.referrerHost, utm: event.utm, siteHost: site.domain });
  const session = await tx.aiAcquisitionSession.create({
    data: {
      tenantId: site.tenantId,
      trackedSiteId: site.id,
      sessionKey: event.sessionKey,
      sourceClass: cls.sourceClass,
      provider: cls.provider,
      referrerHost: cls.referrerHost,
      landingPath: event.path,
      firstSeenAt: event.occurredAt,
      lastSeenAt: event.occurredAt,
      eventCount: 1,
      expiresAt: new Date(event.occurredAt.getTime() + site.retentionDays * 86_400_000),
    },
  });
  return { session, created: true };
}

export type StoredEvent = {
  eventId: string;
  sessionId: string;
  type: NormalizedEvent['type'];
  goalId: string | null;
  isConversion: boolean;
  sourceClass: AiAcquisitionSession['sourceClass'];
  provider: string | null;
};

/**
 * Tek olayı yazar. Aynı `dedupeKey` ikinci kez gelirse `null` döner (tekrar teslim yok sayılır).
 * Aynı oturumda aynı hedef ikinci kez tetiklenirse olay yazılır ama dönüşüm sayılmaz.
 */
export async function storeEvent(
  site: TrackedSite,
  goals: SiteGoal[],
  event: NormalizedEvent,
): Promise<StoredEvent | null> {
  const goal = matchGoal(goals, event);
  const expiresAt = new Date(event.occurredAt.getTime() + site.retentionDays * 86_400_000);

  try {
    return await prisma.$transaction(async (tx) => {
      const dup = await tx.aiJourneyEvent.findUnique({ where: { dedupeKey: event.dedupeKey }, select: { id: true } });
      if (dup) return null;

      const { session } = await upsertSession(tx, site, event);

      // Dönüşüm dedupe: bu oturumda bu hedef daha önce sayıldı mı?
      let isConversion = false;
      if (goal) {
        const prior = await tx.aiJourneyEvent.count({ where: { sessionId: session.id, goalId: goal.id } });
        isConversion = prior === 0;
      }

      await tx.aiJourneyEvent.create({
        data: {
          tenantId: site.tenantId,
          trackedSiteId: site.id,
          sessionId: session.id,
          dedupeKey: event.dedupeKey,
          type: event.type,
          path: event.path,
          entityType: event.entityType,
          entityId: event.entityId,
          entityLabel: event.entityLabel,
          goalId: goal?.id ?? null,
          value: event.value ?? (goal?.defaultValue ? Number(goal.defaultValue) : null),
          currency: event.currency ?? goal?.currency ?? null,
          sdkVersion: event.sdkVersion,
          occurredAt: event.occurredAt,
          expiresAt,
        },
      });

      if (isConversion && goal) {
        await tx.aiAcquisitionSession.update({
          where: { id: session.id },
          data: {
            convertedAt: session.convertedAt ?? event.occurredAt,
            goalId: session.goalId ?? goal.id,
            value: session.value ?? event.value ?? goal.defaultValue ?? null,
            currency: session.currency ?? event.currency ?? goal.currency ?? null,
          },
        });
      }

      return {
        eventId: event.dedupeKey,
        sessionId: session.id,
        type: event.type,
        goalId: goal?.id ?? null,
        isConversion,
        sourceClass: session.sourceClass,
        provider: session.provider,
      };
    });
  } catch (err) {
    // Yarışta aynı dedupeKey iki kez yazılmaya çalışılırsa: tekrar teslim, hata değil.
    if (err instanceof Error && /Unique constraint/i.test(err.message)) return null;
    throw err;
  }
}

// ───────────── Realtime (kısıtlı) ─────────────

const lastPublish = new Map<string, number>();
const PUBLISH_THROTTLE_MS = 10_000;

/** Yüksek hacimli her olay yayınlanmaz: site başına en fazla 10 sn'de bir toplu güncelleme. */
export async function publishDiscoveryUpdate(site: TrackedSite, outcome: IngestOutcome, force = false): Promise<void> {
  const now = Date.now();
  const last = lastPublish.get(site.id) ?? 0;
  if (!force && now - last < PUBLISH_THROTTLE_MS) return;
  lastPublish.set(site.id, now);
  await publishForTenant(site.tenantId, {
    event: 'discovery.updated',
    entityId: site.id,
    status: 'events',
    accepted: outcome.accepted,
    conversions: outcome.conversions,
  });
}

export async function publishConversion(site: TrackedSite, goalName: string): Promise<void> {
  await publishForTenant(site.tenantId, {
    event: 'discovery.goal',
    entityId: site.id,
    status: 'conversion',
    summary: goalName,
  });
}

export async function publishHealth(site: TrackedSite, status: string): Promise<void> {
  await publishForTenant(site.tenantId, { event: 'sensor.health', entityId: site.id, status });
}

// ───────────── Toplu işleme ─────────────

/** Bir istekteki tüm olayları işler; hiçbir olay diğerini bozmaz. */
export async function ingestBatch(site: TrackedSite, raw: IncomingEvent[]): Promise<IngestOutcome> {
  const goals = await prisma.siteGoal.findMany({ where: { trackedSiteId: site.id, isActive: true } });
  const outcome: IngestOutcome = { accepted: 0, duplicates: 0, rejected: [], conversions: 0 };
  let latestOccurred: Date | null = null;
  let sdkVersion: string | null = null;
  let firstConversionGoal: string | null = null;

  for (const item of raw) {
    const normalized = normalizeEvent(item);
    if (!normalized.ok) {
      outcome.rejected.push({ reason: normalized.reason });
      continue;
    }
    try {
      const stored = await storeEvent(site, goals, normalized.event);
      if (!stored) {
        outcome.duplicates += 1;
        continue;
      }
      outcome.accepted += 1;
      if (stored.isConversion) {
        outcome.conversions += 1;
        if (!firstConversionGoal) firstConversionGoal = goals.find((g) => g.id === stored.goalId)?.name ?? null;
      }
      if (!latestOccurred || normalized.event.occurredAt > latestOccurred) latestOccurred = normalized.event.occurredAt;
      sdkVersion = normalized.event.sdkVersion ?? sdkVersion;
    } catch (err) {
      log.error('discovery.ingest_failed', { siteId: site.id, err });
      outcome.rejected.push({ reason: 'internal' });
    }
  }

  if (outcome.accepted > 0) {
    const wasUnverified = !site.verifiedAt;
    await prisma.trackedSite.update({
      where: { id: site.id },
      data: {
        lastBrowserEventAt: new Date(),
        lastSdkVersion: sdkVersion ?? site.lastSdkVersion,
        // Kayıtlı origin'den geçerli olay geldi → sahiplik kanıtlandı, kurulum tamam.
        verifiedAt: site.verifiedAt ?? new Date(),
        status: site.status === 'PENDING' ? 'ACTIVE' : site.status,
      },
    });
    if (wasUnverified) await publishHealth(site, 'verified');
    await publishDiscoveryUpdate(site, outcome, wasUnverified);
    if (firstConversionGoal) await publishConversion(site, firstConversionGoal);
  }

  return outcome;
}
