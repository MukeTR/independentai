import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { hydrateEnvFromConfig } from '@/server/system-config';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { generateAeoContent } from '@/server/aeo-writer';

export const maxDuration = 60;

export const POST = route('tools.aeo_writer', async (req) => {
  const actor = await requireActor({ active: true });
  await enforceRateLimit(req, LIMITS.tool, `tenant:${actor.tenantId}`);
  const body = await readJson<{ type?: unknown; topic?: unknown; brand?: unknown; notes?: unknown }>(req);
  const type = body.type;
  if (type !== 'faq' && type !== 'qa' && type !== 'meta' && type !== 'social')
    throw new ClientError('Geçersiz içerik türü');
  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  if (topic.length < 3 || topic.length > 200) throw new ClientError('Konu 3-200 karakter olmalı');
  const brand = typeof body.brand === 'string' ? body.brand.trim().slice(0, 80) : undefined;
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 400) : undefined;
  await hydrateEnvFromConfig();
  return NextResponse.json(await generateAeoContent(type, topic, brand || undefined, notes || undefined));
});
