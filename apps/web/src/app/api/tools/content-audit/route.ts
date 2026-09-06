import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { prisma } from '@/server/prisma';
import { getActor } from '@/server/authz';
import { hydrateEnvFromConfig } from '@/server/system-config';
import { runContentAudit } from '@/server/content-audit';
import { normalizeAuditUrl } from '@/server/geo-audit';
import { parsePublicUrl, UnsafeUrlError } from '@/server/safe-fetch';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { log } from '@/server/logger';

export const maxDuration = 60;

export const POST = route('tools.content_audit', async (req) => {
  const actor = await getActor();
  if (actor) await enforceRateLimit(req, LIMITS.tool, `tenant:${actor.tenantId}`);
  else await enforceRateLimit(req, LIMITS.publicContentAudit);

  const body = await readJson<{ url?: unknown }>(req);
  const raw = typeof body.url === 'string' ? body.url : '';
  if (raw.length < 3 || raw.length > 300) throw new ClientError('Geçersiz URL');
  const url = normalizeAuditUrl(raw);
  try {
    parsePublicUrl(url);
  } catch (err) {
    throw new ClientError(err instanceof UnsafeUrlError ? err.message : 'Geçersiz URL');
  }

  await hydrateEnvFromConfig();
  const result = await runContentAudit(url);
  try {
    await prisma.audit.create({
      data: {
        tenantId: actor?.tenantId ?? null,
        kind: 'CONTENT',
        url: result.url,
        overallScore: result.contentScore,
        breakdown: result.stats,
        findings: [{ category: 'Özet', status: 'pass', title: 'Özet', detail: result.summary }],
        recommendations: result.recommendations,
      },
    });
  } catch (err) {
    log.error('content-audit.persist_failed', { err });
  }
  return NextResponse.json(result);
});
