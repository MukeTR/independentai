import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { requireActor } from '@/server/authz';
import { revokeShare } from '@/server/report-share';
import { audit } from '@/server/audit';

/** İptal (revokedAt): link anında 410 döner. */
export const DELETE = route('shares.revoke', async (req, ctx) => {
  const actor = await requireActor({ write: true, brandContext: true });
  const id = await requireParam(ctx, 'id');
  await revokeShare(actor, id);
  await audit({
    action: 'share.revoke',
    tenantId: actor.tenantId,
    agencyId: actor.agency?.id ?? null,
    actorUserId: actor.userId,
    targetType: 'report_share',
    targetId: id,
    req,
  });
  return NextResponse.json({ ok: true });
});
