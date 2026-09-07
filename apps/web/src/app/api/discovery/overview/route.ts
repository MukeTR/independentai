import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { requireActor } from '@/server/authz';
import { getDiscoveryOverview } from '@/server/discovery/analytics';
import { getOwnedSite } from '@/server/discovery/sites';

/**
 * GET /api/discovery/overview?siteId=&days= — panel özeti.
 * Üç kanal (AI ziyareti / crawler isteği / sentetik ölçüm) ayrı döner; karıştırılmaz.
 * `siteId` verilirse önce sahiplik doğrulanır (başka tenant'ın id'si 404).
 */
export const GET = route('discovery.overview', async (req) => {
  const actor = await requireActor({ brandContext: true });
  const url = new URL(req.url);
  const siteId = url.searchParams.get('siteId');
  if (siteId) await getOwnedSite(actor, siteId);
  const rawDays = Number(url.searchParams.get('days') ?? 30);
  const days = Number.isFinite(rawDays) ? rawDays : 30;
  const overview = await getDiscoveryOverview(actor.tenantId, { siteId, days });
  return NextResponse.json({ overview, canWrite: actor.role !== 'VIEWER' && actor.entitlement.active });
});
