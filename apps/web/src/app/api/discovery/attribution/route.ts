import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { ClientError } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { enforceRateLimit } from '@/server/rate-limit';
import { audit } from '@/server/audit';
import { listAttributions, runAttributionForSite } from '@/server/discovery/attribution';
import { getOwnedSite } from '@/server/discovery/sites';

/**
 * GET  /api/discovery/attribution?siteId&days&source → kaynağına göre gruplanmış attribution.
 * POST /api/discovery/attribution?siteId             → son oturumlar için INFERRED üretir.
 *
 * Üç kaynak (USER_REPORTED / INFERRED / SYNTHETIC) yanıtta ayrı gruplar hâlinde döner;
 * SYNTHETIC veritabanında tutulmaz, ModelRun'lardan okunur.
 */
export const GET = route('discovery.attribution.list', async (req) => {
  const actor = await requireActor({ brandContext: true });
  const q = new URL(req.url).searchParams;
  const rawSite = q.get('siteId');
  // Yabancı bir siteId tenant filtresine takılır; yine de sahiplik açıkça doğrulanır.
  const siteId = rawSite ? (await getOwnedSite(actor, rawSite)).id : null;
  const days = Number(q.get('days') ?? 30);
  const data = await listAttributions(actor.tenantId, {
    siteId,
    days: Number.isFinite(days) ? days : 30,
    source: q.get('source'),
  });
  return NextResponse.json(data);
});

export const POST = route('discovery.attribution.run', async (req) => {
  const actor = await requireActor({ write: true, brandContext: true });
  const q = new URL(req.url).searchParams;
  const rawSite = q.get('siteId');
  if (!rawSite) throw new ClientError('siteId gerekli');
  const site = await getOwnedSite(actor, rawSite);

  // Tahmin üretimi tüm oturumları tarar: tenant başına saatte 10 çalıştırma.
  await enforceRateLimit(
    req,
    { name: 'discovery-attribution', limit: 10, windowMs: 3_600_000, global: { limit: 300, windowMs: 3_600_000 } },
    `tenant:${actor.tenantId}`,
  );

  const limit = Number(q.get('limit') ?? 200);
  const result = await runAttributionForSite(site.id, { limit: Number.isFinite(limit) ? limit : 200 });
  await audit({
    action: 'discovery.attribution_run',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'tracked_site',
    targetId: site.id,
    meta: { scanned: result.scanned, created: result.created, updated: result.updated },
    req,
  });
  return NextResponse.json(result);
});
