import { NextResponse, after, type NextRequest } from 'next/server';
import { runDuePrompts } from '@/server/run-prompt';
import { runDailyDropAlerts } from '@/server/notify';
import { pruneRateLimitBuckets } from '@/server/rate-limit';
import { enqueueDailyCatalogSyncs, processCatalogSyncs, type SyncStats } from '@/server/commerce/catalog-sync';
import { runDiscoveryMaintenance, type RollupStats } from '@/server/discovery/rollup';
import { seedBotRegistry } from '@/server/discovery/crawler-ingest';
import { cronSecret, siteUrl } from '@/server/env';
import { log } from '@/server/logger';
import { cronAuthorized } from '@/server/cron-auth';

export const maxDuration = 300; // Vercel Hobby/Pro varsayılan ve Hobby maksimumu (fluid compute)

const RUN_BUDGET_MS = 230_000; // prompt turu; kalan süre uyarılar + zincir tetikleme
const MAX_HOPS = 12; // zincirleme tetikleme üst sınırı (12 × ~4 dk ≈ 50 dk)

/**
 * Günlük cron — vercel.json: "0 23 * * *" (Hobby: günde 1, ±59 dk sapma).
 * Bütçe dolunca kalan iş için kendini `?hop=n+1` ile yeniden tetikler (after → fetch),
 * böylece Hobby'nin "günde bir kez" kısıtına rağmen backlog aynı gece biter.
 */
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ message: 'Yetkisiz', code: 'unauthorized' }, { status: 401 });

  const hop = Math.max(0, Math.min(MAX_HOPS, Number(req.nextUrl.searchParams.get('hop') ?? 0) || 0));
  const startedAt = Date.now();
  const deadlineAt = startedAt + RUN_BUDGET_MS;

  const runs = await runDuePrompts({ deadlineAt, hop, triggeredBy: hop === 0 ? 'vercel-cron' : `chain-${hop}` });

  // Katalog senkronu: prompt kuyruğu bitince kalan bütçeyle (idempotent; kaldığı yerden devam eder).
  let catalog: SyncStats | { skipped: true } = { skipped: true };
  if (runs.remaining === 0 && Date.now() < startedAt + 200_000) {
    try {
      if (hop === 0) await enqueueDailyCatalogSyncs();
      catalog = await processCatalogSyncs({ deadlineAt: startedAt + 240_000 });
    } catch (err) {
      log.warn('cron.catalog_sync_failed', { err });
    }
  }
  // AI Discovery bakımı: gün bazlı rollup + saklama süresi dolmuş ham olayların temizliği.
  // Prompt ve katalog turlarından sonra, kalan bütçede; hata turu durdurmaz.
  let discovery: RollupStats | { skipped: true } = { skipped: true };
  if (runs.remaining === 0 && Date.now() < startedAt + 250_000) {
    try {
      if (hop === 0) await seedBotRegistry();
      discovery = await runDiscoveryMaintenance({ deadlineAt: startedAt + 285_000 });
    } catch (err) {
      log.warn('cron.discovery_failed', { err });
    }
  }

  const catalogRemaining = 'remaining' in catalog ? catalog.remaining : 0;

  let alerts: Awaited<ReturnType<typeof runDailyDropAlerts>> | { skipped: true } = { skipped: true };
  if (runs.remaining === 0 && Date.now() < startedAt + 280_000) {
    alerts = await runDailyDropAlerts({ deadlineAt: startedAt + 285_000 });
    try {
      await pruneRateLimitBuckets();
    } catch {
      /* best-effort */
    }
  }

  const willChain = (runs.remaining > 0 || catalogRemaining > 0) && hop < MAX_HOPS;
  if (willChain) {
    const next = `${siteUrl()}/api/cron/daily-run?hop=${hop + 1}`;
    after(async () => {
      try {
        await fetch(next, {
          headers: { authorization: `Bearer ${cronSecret()}`, 'x-iai-chain': '1' },
          signal: AbortSignal.timeout(15_000),
        });
      } catch (err) {
        // Zincir kopsa bile satırlar PENDING kalır; sonraki günlük tetikleme devam eder.
        log.warn('cron.chain_failed', { hop: hop + 1, err });
      }
    });
  }

  log.info('cron.daily_run', {
    hop,
    ...runs,
    catalog,
    discovery,
    alerts,
    willChain,
    durationMs: Date.now() - startedAt,
  });
  return NextResponse.json({
    ...runs,
    catalog,
    discovery,
    alerts,
    hop,
    willChain,
    durationMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  });
}
