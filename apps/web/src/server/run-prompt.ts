/**
 * Ölçüm motoru — prompt × provider çalıştırma, kuyruk ve idempotency.
 *
 * Model: her (prompt, provider) çalıştırması bir ModelRun satırıdır ve satırın kendisi iş
 * kaydıdır (ayrı job tablosu yok):
 *
 *   PENDING ──claim(lease)──▶ RUNNING ──▶ SUCCESS
 *                                    └──▶ ERROR (errorCode; retryable ise attempt+1 ile yeni PENDING)
 *
 * Idempotency (cron): dedupeKey = `${promptId}:${provider}:${YYYY-MM-DD}:${attempt}` UNIQUE.
 *   - Cron iki kez tetiklense de aynı gün için ikinci satır oluşmaz (createMany skipDuplicates).
 *   - Bir provider başarılı, biri hatalı ise yalnızca hatalı olan yeniden denenir.
 *   - Kilit: `UPDATE ... WHERE status='PENDING' ... FOR UPDATE SKIP LOCKED` ile lease alınır;
 *     paralel fonksiyonlar aynı satırı işlemez. Lease süresi dolan RUNNING satırlar (çöken
 *     fonksiyon) yeniden claim edilebilir.
 *
 * Zaman bütçesi: Vercel Hobby 300 s. Cron rotası bütçe dolunca kalan işi bir sonraki halkaya
 * (zincirleme self-trigger) bırakır; bkz. api/cron/daily-run.
 */
import { prisma } from './prisma';
import {
  ALL_PROVIDERS,
  getAdapter,
  extractMentions,
  enrichMentions,
  extractCitations,
  lastUsage,
  AiProviderError,
  type BrandSpec,
  type RunPromptOutput,
} from '@independentai/ai';
import {
  type Prisma,
  type AiProvider,
  type Sentiment,
  type MentionType,
  type RunOrigin,
  type RunStatus,
} from '@independentai/db';
import { hydrateEnvFromConfig } from './system-config';
import { mockAllowed } from './env';
import { log } from './logger';
import { ConflictError } from './errors';
import { computeEntitlement } from './entitlement';
import { utcTs } from './sql';
import { publishForTenant } from './realtime';

export const PROVIDER_TIMEOUT_MS = 40_000;
const LEASE_MS = 120_000;
const MAX_ATTEMPTS = 3;
const CLAIM_BATCH = 6; // aynı anda işlenen (prompt, provider) satırı

type TenantContext = { ownSpecs: BrandSpec[]; compSpecs: BrandSpec[] };
const ctxCache = new Map<string, TenantContext>();

async function tenantContext(tenantId: string): Promise<TenantContext> {
  const cached = ctxCache.get(tenantId);
  if (cached) return cached;
  const [ownBrands, competitors] = await Promise.all([
    prisma.brand.findMany({ where: { tenantId, isOwn: true } }),
    prisma.competitor.findMany({ where: { tenantId } }),
  ]);
  const ctx = {
    ownSpecs: ownBrands.map((b) => ({ id: b.id, name: b.name, aliases: b.aliases, isOwn: true })),
    compSpecs: competitors.map((c) => ({ name: c.name, aliases: c.aliases, isOwn: false })),
  };
  ctxCache.set(tenantId, ctx);
  return ctx;
}
export function clearTenantContextCache() {
  ctxCache.clear();
}

export function dayBucket(d = new Date()): Date {
  const b = new Date(d);
  b.setUTCHours(0, 0, 0, 0);
  return b;
}
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Ham SQL'de Date parametresi. Prisma `DateTime` kolonları saat dilimsiz `timestamp(3)` (UTC değer) iken
 * `$queryRaw` Date parametrelerini `timestamptz` gönderir; doğrudan karşılaştırma oturum saat dilimine
 * (yerelde Europe/Istanbul) bağımlı yanlış sonuç verir. Parametre UTC'ye çevrilip naive'e düşürülür.
 * Tek kaynak: `server/sql.ts`.
 */

type RunResult = { ok: boolean; errorCode?: string; tenantId?: string };

/**
 * Tek bir (run satırı) için provider çağrısı + çıkarım + kayıt.
 * ModelRun sonucu (SUCCESS/ERROR) ile `run.completed` Realtime yayını AYNI transaction'da yazılır:
 * rollback olursa hayalet olay kalmaz. Payload'a AI yanıt metni girmez (entityId/jobId/status/provider).
 */
async function executeRun(runId: string): Promise<RunResult> {
  const run = await prisma.modelRun.findUnique({
    where: { id: runId },
    include: { prompt: { select: { id: true, text: true, language: true, version: true, tenantId: true } } },
  });
  if (!run) return { ok: false, errorCode: 'missing' };
  const tenantId = run.prompt.tenantId;
  const ctx = await tenantContext(tenantId);
  const adapter = getAdapter(run.provider, { allowMock: mockAllowed() });
  const completedPayload = (status: 'SUCCESS' | 'ERROR', errorCode?: string) => ({
    event: 'run.completed' as const,
    entityId: run.prompt.id,
    jobId: runId,
    status,
    provider: run.provider,
    origin: run.origin,
    ...(errorCode ? { errorCode } : {}),
  });

  try {
    const out: RunPromptOutput = await adapter.run({
      prompt: run.prompt.text,
      language: run.prompt.language === 'en' ? 'en' : 'tr',
      timeoutMs: PROVIDER_TIMEOUT_MS,
      country: 'TR',
    });
    const rawMentions = extractMentions(out.text, ctx.ownSpecs, ctx.compSpecs);
    // LLM ile sentiment/tip iyileştirme — best-effort; maliyeti run'a eklenir ve loglanır.
    const mentions = out.isMocked ? rawMentions : await enrichMentions(out.text, rawMentions);
    const enrichCost = lastUsage?.costUsd ?? null;
    const enrichLatency = lastUsage?.latencyMs ?? 0;
    const citations = extractCitations(out.text, out.citations);

    const totalCost = out.costUsd == null ? null : out.costUsd + (enrichCost ?? 0);

    await prisma.$transaction(async (tx) => {
      await tx.modelRun.update({
        where: { id: runId },
        data: {
          status: 'SUCCESS',
          modelName: out.modelName,
          responseText: out.text,
          citations: citations.length ? citations : undefined,
          tokensUsed: out.tokensUsed ?? null,
          inputTokens: out.inputTokens ?? null,
          outputTokens: out.outputTokens ?? null,
          costUsd: totalCost,
          latencyMs: out.latencyMs + enrichLatency,
          isMocked: out.isMocked,
          groundingMode: out.groundingMode,
          webSearchCount: out.webSearchCount ?? null,
          errorMessage: null,
          errorCode: null,
          completedAt: new Date(),
          leaseExpiresAt: null,
          mentions: {
            deleteMany: {},
            create: mentions.map((m) => ({
              brandId: m.brandId,
              mentionName: m.mentionName,
              isOwnBrand: m.isOwnBrand,
              isCompetitor: m.isCompetitor,
              position: m.position,
              sentiment: m.sentiment as Sentiment,
              mentionType: m.mentionType as MentionType,
              snippet: m.snippet,
            })),
          },
          citationLinks: {
            deleteMany: {},
            create: citations.map((c) => ({ tenantId, url: c.url, domain: c.domain, title: c.title })),
          },
        },
      });
      await publishForTenant(tenantId, completedPayload('SUCCESS'), tx);
    });
    log.info('run.success', {
      runId,
      provider: run.provider,
      tenantId,
      latencyMs: out.latencyMs,
      grounding: out.groundingMode,
      mocked: out.isMocked,
      costUsd: totalCost,
    });
    return { ok: true, tenantId };
  } catch (err) {
    const code = err instanceof AiProviderError ? err.code : 'unknown';
    const message = err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500);
    await prisma.$transaction(async (tx) => {
      await tx.modelRun.update({
        where: { id: runId },
        data: {
          status: 'ERROR',
          errorCode: code,
          errorMessage: message,
          modelName: run.modelName || 'error',
          completedAt: new Date(),
          leaseExpiresAt: null,
        },
      });
      await publishForTenant(tenantId, completedPayload('ERROR', code), tx);
    });
    log.warn('run.error', { runId, provider: run.provider, tenantId, code });
    return { ok: false, errorCode: code, tenantId };
  }
}

/**
 * Manuel / ilk çalıştırma: 3 provider paralel. Aynı prompt için hâlâ RUNNING satır varsa 409.
 */
export async function runPromptOnce(
  tenantId: string,
  promptId: string,
  opts: { origin?: Extract<RunOrigin, 'MANUAL' | 'INITIAL'>; triggeredBy?: string } = {},
) {
  await hydrateEnvFromConfig();
  const origin: RunOrigin = opts.origin ?? 'MANUAL';
  const prompt = await prisma.prompt.findFirst({ where: { id: promptId, tenantId } });
  if (!prompt) return { skipped: true as const, reason: 'prompt not found' };

  const inFlight = await prisma.modelRun.count({
    where: { promptId, status: { in: ['PENDING', 'RUNNING'] }, leaseExpiresAt: { gt: new Date() } },
  });
  if (inFlight > 0) throw new ConflictError('Bu soru için bir çalıştırma zaten devam ediyor');

  ctxCache.delete(tenantId);
  const now = new Date();
  const rows = await prisma.$transaction(
    ALL_PROVIDERS.map((provider) =>
      prisma.modelRun.create({
        data: {
          promptId,
          provider: provider as AiProvider,
          modelName: 'pending',
          responseText: '',
          status: 'RUNNING',
          origin,
          attempt: 1,
          promptVersion: prompt.version,
          locale: prompt.language,
          runDate: now,
          leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
        },
        select: { id: true },
      }),
    ),
  );

  const results = await Promise.all(rows.map((r) => executeRun(r.id)));
  const runs = await prisma.modelRun.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    include: { mentions: { orderBy: { position: 'asc' } } },
    orderBy: { provider: 'asc' },
  });
  return { runs, failed: results.filter((r) => !r.ok).length };
}

// ───────────────────────── Cron kuyruğu ─────────────────────────

/**
 * Bugünün (UTC) işlerini kuyruğa yazar. Yalnızca aktif tenant'ların (entitlement.active)
 * aktif promptları. Ajans müşteri çalışma alanı PAUSED/ARCHIVED ise o tenant'ın promptları da
 * alınmaz (duraklatılmış müşteri = ölçüm durur, maliyet üretmez).
 * createMany + skipDuplicates → tekrar çağrılması güvenlidir.
 */
export async function enqueueDailyRuns(
  bucket = dayBucket(),
): Promise<{ enqueued: number; prompts: number; skippedTenants: number }> {
  const prompts = await prisma.prompt.findMany({
    where: { isActive: true },
    select: {
      id: true,
      version: true,
      language: true,
      tenant: {
        select: { id: true, plan: true, trialEndsAt: true, agencyWorkspace: { select: { status: true } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  const key = dayKey(bucket);
  const data: Prisma.ModelRunCreateManyInput[] = [];
  let skippedTenants = 0;
  const skipped = new Set<string>();
  for (const p of prompts) {
    const ent = computeEntitlement({ plan: p.tenant.plan, trialEndsAt: p.tenant.trialEndsAt });
    const wsStatus = p.tenant.agencyWorkspace?.status;
    const workspaceBlocked = wsStatus === 'PAUSED' || wsStatus === 'ARCHIVED';
    if (!ent.active || workspaceBlocked) {
      if (!skipped.has(p.tenant.id)) {
        skipped.add(p.tenant.id);
        skippedTenants++;
      }
      continue;
    }
    for (const provider of ALL_PROVIDERS) {
      data.push({
        promptId: p.id,
        provider: provider as AiProvider,
        modelName: 'pending',
        responseText: '',
        status: 'PENDING' as RunStatus,
        origin: 'CRON' as RunOrigin,
        attempt: 1,
        dedupeKey: `${p.id}:${provider}:${key}:1`,
        scheduledFor: bucket,
        promptVersion: p.version,
        locale: p.language,
        runDate: new Date(),
      });
    }
  }
  const res = data.length ? await prisma.modelRun.createMany({ data, skipDuplicates: true }) : { count: 0 };
  return { enqueued: res.count, prompts: prompts.length, skippedTenants };
}

/** PENDING (veya lease'i dolmuş RUNNING) satırlardan en fazla `limit` tanesini kilitleyip claim eder. */
async function claimRuns(limit: number): Promise<string[]> {
  const now = new Date();
  const lease = new Date(now.getTime() + LEASE_MS);
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH picked AS (
      SELECT "id" FROM "ModelRun"
      WHERE ("status" = 'PENDING' OR ("status" = 'RUNNING' AND "leaseExpiresAt" IS NOT NULL AND "leaseExpiresAt" < ${utcTs(now)}))
        AND "origin" = 'CRON'
      ORDER BY "scheduledFor" ASC NULLS LAST, "attempt" ASC, "runDate" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    UPDATE "ModelRun" m SET "status" = 'RUNNING', "leaseExpiresAt" = ${utcTs(lease)}, "runDate" = ${utcTs(now)}
    FROM picked WHERE m."id" = picked."id"
    RETURNING m."id"
  `;
  return rows.map((r) => r.id);
}

/**
 * Hatalı cron satırları için yeniden deneme satırı üretir (retryable kod, attempt < MAX).
 * dedupeKey attempt'i içerdiğinden aynı deneme iki kez oluşmaz.
 */
export async function scheduleRetries(bucket = dayBucket()): Promise<number> {
  const failed = await prisma.modelRun.findMany({
    where: {
      origin: 'CRON',
      status: 'ERROR',
      scheduledFor: bucket,
      attempt: { lt: MAX_ATTEMPTS },
      errorCode: { in: ['rate_limit', 'timeout', 'server'] },
    },
    select: { id: true, promptId: true, provider: true, attempt: true, promptVersion: true, locale: true },
  });
  if (!failed.length) return 0;
  const key = dayKey(bucket);
  const res = await prisma.modelRun.createMany({
    data: failed.map((f) => ({
      promptId: f.promptId,
      provider: f.provider,
      modelName: 'pending',
      responseText: '',
      status: 'PENDING' as RunStatus,
      origin: 'CRON' as RunOrigin,
      attempt: f.attempt + 1,
      dedupeKey: `${f.promptId}:${f.provider}:${key}:${f.attempt + 1}`,
      scheduledFor: bucket,
      promptVersion: f.promptVersion,
      locale: f.locale,
      runDate: new Date(),
    })),
    skipDuplicates: true,
  });
  return res.count;
}

export type TenantRunStats = { processed: number; failed: number };
export type QueueStats = {
  processed: number;
  failed: number;
  remaining: number;
  /** Bu turda dokunulan tenant'lar (batch.completed yayını için) */
  byTenant?: Record<string, TenantRunStats>;
};

/** Kuyruğu `deadlineAt`'e kadar, CLAIM_BATCH'lik paralel dilimlerle tüketir. */
export async function processQueue(opts: { deadlineAt: number }): Promise<QueueStats> {
  await hydrateEnvFromConfig();
  ctxCache.clear();
  let processed = 0;
  let failed = 0;
  const byTenant: Record<string, TenantRunStats> = {};
  while (Date.now() + PROVIDER_TIMEOUT_MS + 5_000 < opts.deadlineAt) {
    const ids = await claimRuns(CLAIM_BATCH);
    if (!ids.length) break;
    const results = await Promise.all(ids.map((id) => executeRun(id)));
    processed += results.length;
    failed += results.filter((r) => !r.ok).length;
    for (const r of results) {
      if (!r.tenantId) continue;
      const t = (byTenant[r.tenantId] ??= { processed: 0, failed: 0 });
      t.processed += 1;
      if (!r.ok) t.failed += 1;
    }
  }
  const remaining = await prisma.modelRun.count({ where: { origin: 'CRON', status: 'PENDING' } });
  return { processed, failed, remaining, byTenant };
}

function mergeTenantStats(into: Record<string, TenantRunStats>, from?: Record<string, TenantRunStats>) {
  for (const [tenantId, s] of Object.entries(from ?? {})) {
    const t = (into[tenantId] ??= { processed: 0, failed: 0 });
    t.processed += s.processed;
    t.failed += s.failed;
  }
}

/**
 * Günlük tur (cron/admin): kuyruğa yaz → işle → retry planla → (varsa) tekrar işle.
 * `force`: admin testinde bugünün satırları zaten varsa yeni bir "manuel gün anahtarı" ile üretir.
 */
export async function runDuePrompts(opts: { deadlineAt: number; force?: boolean; hop?: number; triggeredBy?: string }) {
  const bucket = dayBucket();
  const batch = await prisma.runBatch.create({
    data: { origin: 'CRON', hop: opts.hop ?? 0, triggeredBy: opts.triggeredBy ?? 'vercel-cron' },
  });
  let enqueued = 0;
  if (opts.force) {
    // Aynı gün ikinci tam tur: dedupeKey'e zaman damgası ekleyerek yeni satırlar üret.
    const stamp = Date.now().toString(36);
    const prompts = await prisma.prompt.findMany({
      where: { isActive: true },
      select: { id: true, version: true, language: true },
    });
    const res = await prisma.modelRun.createMany({
      data: prompts.flatMap((p) =>
        ALL_PROVIDERS.map((provider) => ({
          promptId: p.id,
          provider: provider as AiProvider,
          modelName: 'pending',
          responseText: '',
          status: 'PENDING' as RunStatus,
          origin: 'CRON' as RunOrigin,
          attempt: 1,
          dedupeKey: `${p.id}:${provider}:${dayKey(bucket)}:force-${stamp}`,
          scheduledFor: bucket,
          promptVersion: p.version,
          locale: p.language,
        })),
      ),
      skipDuplicates: true,
    });
    enqueued = res.count;
  } else {
    enqueued = (await enqueueDailyRuns(bucket)).enqueued;
  }

  const first = await processQueue({ deadlineAt: opts.deadlineAt });
  let processed = first.processed;
  let failed = first.failed;
  let remaining = first.remaining;
  const byTenant: Record<string, TenantRunStats> = {};
  mergeTenantStats(byTenant, first.byTenant);

  if (remaining === 0 && Date.now() < opts.deadlineAt) {
    const retries = await scheduleRetries(bucket);
    if (retries > 0) {
      const second = await processQueue({ deadlineAt: opts.deadlineAt });
      processed += second.processed;
      failed += second.failed;
      remaining = second.remaining;
      mergeTenantStats(byTenant, second.byTenant);
    }
  }

  await prisma.runBatch.update({
    where: { id: batch.id },
    data: { finishedAt: new Date(), enqueued, processed, failed, remaining },
  });
  // Batch tamamlandı: bu turda run'ı işlenen her tenant'a (ve varsa ajansına) küçük bir özet yayını.
  // Kalıcı durum RunBatch/ModelRun'da; yayın best-effort olduğu için transaction dışında, sırayla.
  const batchStatus = remaining > 0 ? 'PARTIAL' : 'SUCCESS';
  for (const [tenantId, s] of Object.entries(byTenant)) {
    await publishForTenant(tenantId, {
      event: 'batch.completed',
      entityId: batch.id,
      jobId: batch.id,
      status: batchStatus,
      processed: s.processed,
      failed: s.failed,
      hop: opts.hop ?? 0,
    });
  }
  return { batchId: batch.id, enqueued, processed, failed, remaining, total: enqueued + processed };
}

/** Admin gözlem ekranı için kuyruk özeti. */
export async function queueSummary() {
  const [pending, running, errorToday, batches] = await Promise.all([
    prisma.modelRun.count({ where: { origin: 'CRON', status: 'PENDING' } }),
    prisma.modelRun.count({ where: { status: 'RUNNING' } }),
    prisma.modelRun.count({ where: { status: 'ERROR', runDate: { gte: dayBucket() } } }),
    prisma.runBatch.findMany({ orderBy: { startedAt: 'desc' }, take: 20 }),
  ]);
  return { pending, running, errorToday, batches };
}
