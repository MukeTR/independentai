import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { NotFoundError } from '@/server/errors';
import { prisma } from '@/server/prisma';
import { requireActor } from '@/server/authz';
import { runPromptOnce } from '@/server/run-prompt';
import { enforceRateLimit } from '@/server/rate-limit';
import { audit } from '@/server/audit';

export const maxDuration = 120;

export const POST = route('prompts.run', async (req, ctx) => {
  const actor = await requireActor({ write: true });
  const id = await requireParam(ctx, 'id');
  const owned = await prisma.prompt.findFirst({ where: { id, tenantId: actor.tenantId } });
  if (!owned) throw new NotFoundError();
  // Tenant başına günlük manuel çalıştırma tavanı (maliyet koruması) + dakikalık burst limiti
  await enforceRateLimit(
    req,
    { name: 'manual-run-day', limit: actor.entitlement.limits.manualRunsPerDay, windowMs: 86_400_000 },
    `tenant:${actor.tenantId}`,
  );
  await enforceRateLimit(req, { name: 'manual-run-min', limit: 5, windowMs: 60_000 }, `tenant:${actor.tenantId}`);
  const result = await runPromptOnce(actor.tenantId, id, { origin: 'MANUAL', triggeredBy: actor.userId });
  await audit({
    action: 'prompt.run',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'prompt',
    targetId: id,
    req,
  });
  return NextResponse.json(result);
});
