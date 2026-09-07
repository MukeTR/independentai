import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { ClientError } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { listRecentSessions } from '@/server/discovery/analytics';
import { getOwnedSite } from '@/server/discovery/sites';

const MAX_LIMIT = 50;

/**
 * GET /api/discovery/sessions?siteId=&cursor=&limit= — son oturumlar (imleçli).
 * İmleç, son satırın `firstSeenAt` ISO damgasıdır. PII yoktur: yalnızca yol/varlık/hedef.
 */
export const GET = route('discovery.sessions', async (req) => {
  const actor = await requireActor({ brandContext: true });
  const url = new URL(req.url);
  const siteId = url.searchParams.get('siteId');
  if (siteId) await getOwnedSite(actor, siteId);

  const cursor = url.searchParams.get('cursor');
  if (cursor && !Number.isFinite(Date.parse(cursor))) throw new ClientError('Geçersiz imleç');

  const rawLimit = Number(url.searchParams.get('limit') ?? 20);
  const limit = Number.isFinite(rawLimit) ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(rawLimit))) : 20;

  const page = await listRecentSessions(actor.tenantId, { siteId, cursor, limit });
  return NextResponse.json(page);
});
