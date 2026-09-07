import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { getAvailableProviders } from '@independentai/ai';
import { cronSecret } from '@/server/env';

export const dynamic = 'force-dynamic';

/**
 * Sağlık/hazırlık ucu — gizli bilgi sızdırmaz: yalnızca "db ok?", provider SAYISI ve sürüm.
 * Yük dengeleyici/uptime izleme için 200/503 döner.
 */
export async function GET() {
  const started = Date.now();
  let db: 'ok' | 'error' = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = 'error';
  }
  const body = {
    status: db === 'ok' ? 'ok' : 'degraded',
    db,
    dbLatencyMs: Date.now() - started,
    providersConfigured: getAvailableProviders().length,
    cronConfigured: !!cronSecret(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: db === 'ok' ? 200 : 503, headers: { 'cache-control': 'no-store' } });
}
