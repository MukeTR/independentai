import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { requireAgencyActor } from '@/server/authz';
import { createLinkRequest } from '@/server/agency';
import { absoluteUrl } from '@/server/mailer';
import { enforceRateLimit } from '@/server/rate-limit';
import { audit } from '@/server/audit';

/**
 * "Mevcut hesabı bağla" isteği (OWNER/ADMIN): 7 gün geçerli tek kullanımlık link. Marka hesabının
 * OWNER'ı linki onaylayınca AgencyWorkspace oluşur; veri sahipliği markada kalır.
 */
export const POST = route('agency.link_create', async (req) => {
  const actor = await requireAgencyActor('ADMIN');
  await enforceRateLimit(req, { name: 'agency-link', limit: 20, windowMs: 3_600_000 }, `agency:${actor.agency.id}`);
  const { requestId, token } = await createLinkRequest(actor);
  await audit({
    action: 'agency.link_request',
    agencyId: actor.agency.id,
    actorUserId: actor.userId,
    targetType: 'link_request',
    targetId: requestId,
    req,
  });
  return NextResponse.json(
    { ok: true, requestId, link: absoluteUrl(`/agency/link/${token}`), expiresInDays: 7 },
    { status: 201 },
  );
});
