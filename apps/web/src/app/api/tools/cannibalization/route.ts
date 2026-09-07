import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { hydrateEnvFromConfig } from '@/server/system-config';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { runCannibalization } from '@/server/cannibalization';

export const maxDuration = 60;

export const POST = route('tools.cannibalization', async (req) => {
  const actor = await requireActor({ active: true });
  await enforceRateLimit(req, LIMITS.tool, `tenant:${actor.tenantId}`);
  const body = await readJson<{ input?: unknown }>(req);
  const input = typeof body.input === 'string' ? body.input.trim() : '';
  if (input.length < 5 || input.length > 4000) throw new ClientError('Girdi 5-4000 karakter olmalı');
  await hydrateEnvFromConfig();
  return NextResponse.json(await runCannibalization(input));
});
