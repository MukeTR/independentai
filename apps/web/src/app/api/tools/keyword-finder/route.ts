import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { hydrateEnvFromConfig } from '@/server/system-config';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { findPromptIdeas } from '@/server/keyword-finder';

export const maxDuration = 60;

export const POST = route('tools.keyword_finder', async (req) => {
  const actor = await requireActor({ active: true });
  await enforceRateLimit(req, LIMITS.tool, `tenant:${actor.tenantId}`);
  const body = await readJson<{ topic?: unknown; industry?: unknown }>(req);
  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  if (topic.length < 2 || topic.length > 120) throw new ClientError('Konu 2-120 karakter olmalı');
  const industry = typeof body.industry === 'string' ? body.industry.trim().slice(0, 80) : undefined;
  await hydrateEnvFromConfig();
  return NextResponse.json({ ideas: await findPromptIdeas(topic, industry || undefined) });
});
