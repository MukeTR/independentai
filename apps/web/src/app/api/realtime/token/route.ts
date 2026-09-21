import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { requireActor, allowedRealtimeTopics } from '@/server/authz';
import { mintRealtimeToken, realtimeConfigured, REALTIME_TOKEN_TTL_SEC } from '@/server/realtime';
import { enforceRateLimit } from '@/server/rate-limit';
import { prisma } from '@/server/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/realtime/token — kısa ömürlü (10 dk) Supabase Realtime JWT'si.
 * Uygulama oturumu doğrulanır; claim'ler DB'den (tenant, rol, sessionVersion, izinli topic listesi).
 * Realtime yapılandırılmamışsa { enabled:false } döner; istemci polling'e düşer.
 */
export const GET = route('realtime.token', async (req) => {
  const actor = await requireActor();
  await enforceRateLimit(req, { name: 'realtime-token', limit: 30, windowMs: 60_000 }, `user:${actor.userId}`);
  if (!realtimeConfigured()) {
    return NextResponse.json({ enabled: false, reason: 'not_configured' });
  }
  const [topics, user] = await Promise.all([
    allowedRealtimeTopics(actor),
    prisma.user.findUniqueOrThrow({ where: { id: actor.userId }, select: { sessionVersion: true } }),
  ]);
  const { token, expiresAt } = await mintRealtimeToken({
    userId: actor.userId,
    tenantId: actor.tenantId,
    role: actor.role,
    sessionVersion: user.sessionVersion,
    agencyId: actor.agency?.id ?? null,
    topics,
  });
  return NextResponse.json({
    enabled: true,
    token,
    expiresAt,
    ttlSec: REALTIME_TOKEN_TTL_SEC,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    topics,
    tenantId: actor.tenantId,
  });
});
