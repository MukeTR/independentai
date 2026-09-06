import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { hydrateEnvFromConfig } from '@/server/system-config';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { scanHallucinations } from '@/server/hallucination';

export const maxDuration = 60;

export const POST = route('tools.hallucination', async (req) => {
  const actor = await requireActor({ active: true });
  await enforceRateLimit(req, LIMITS.tool, `tenant:${actor.tenantId}`);
  void ClientError;
  void readJson;
  await hydrateEnvFromConfig();
  return NextResponse.json(await scanHallucinations(actor.tenantId));
});
