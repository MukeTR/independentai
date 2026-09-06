import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { prisma } from '@/server/prisma';
import { getActor } from '@/server/authz';
import { hydrateEnvFromConfig } from '@/server/system-config';
import { runGeoAudit, normalizeAuditUrl } from '@/server/geo-audit';
import { parsePublicUrl, UnsafeUrlError } from '@/server/safe-fetch';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { log } from '@/server/logger';

export const maxDuration = 60;

export const POST = route('tools.geo_audit', async (req) => {
  const actor = await getActor();
  if (actor) await enforceRateLimit(req, LIMITS.tool, `tenant:${actor.tenantId}`);
  else await enforceRateLimit(req, LIMITS.publicAudit);

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
  const result = await runGeoAudit(url);

  try {
    await prisma.audit.create({
      data: {
        tenantId: actor?.tenantId ?? null,
        kind: 'GEO',
        url: result.url,
        overallScore: result.overallScore,
        breakdown: result.breakdown,
        findings: result.findings,
      },
    });
  } catch (err) {
    log.error('geo-audit.persist_failed', { err });
  }
  return NextResponse.json(result);
});
