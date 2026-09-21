import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { requireAgencyActor } from '@/server/authz';
import { revokeAgencyInvite } from '@/server/agency';
import { audit } from '@/server/audit';

export const DELETE = route('agency.invite_revoke', async (req, ctx) => {
  const actor = await requireAgencyActor('ADMIN');
  const id = await requireParam(ctx, 'id');
  await revokeAgencyInvite(actor, id);
  await audit({
    action: 'agency.invite_revoke',
    agencyId: actor.agency.id,
    actorUserId: actor.userId,
    targetType: 'invite',
    targetId: id,
    req,
  });
  return NextResponse.json({ ok: true });
});
