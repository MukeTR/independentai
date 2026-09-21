import { NextResponse, after, type NextRequest } from 'next/server';
import { runWeeklyReports } from '@/server/notify';
import { cronAuthorized } from '@/server/cron-auth';
import { cronSecret, siteUrl } from '@/server/env';
import { log } from '@/server/logger';

export const maxDuration = 300;
const MAX_HOPS = 6;

/** Haftalık rapor cron'u — "0 6 * * 1". Bütçe dolarsa zincirleme devam eder (idempotent: lastNotifiedAt). */
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ message: 'Yetkisiz', code: 'unauthorized' }, { status: 401 });
  const hop = Math.max(0, Math.min(MAX_HOPS, Number(req.nextUrl.searchParams.get('hop') ?? 0) || 0));
  const startedAt = Date.now();
  const result = await runWeeklyReports({ deadlineAt: startedAt + 240_000 });
  const willChain = result.remaining > 0 && hop < MAX_HOPS;
  if (willChain) {
    const next = `${siteUrl()}/api/cron/weekly-report?hop=${hop + 1}`;
    after(async () => {
      try {
        await fetch(next, {
          headers: { authorization: `Bearer ${cronSecret()}` },
          signal: AbortSignal.timeout(15_000),
        });
      } catch (err) {
        log.warn('cron.weekly_chain_failed', { hop: hop + 1, err });
      }
    });
  }
  log.info('cron.weekly_report', { hop, ...result, willChain });
  return NextResponse.json({ ...result, hop, willChain, timestamp: new Date().toISOString() });
}
