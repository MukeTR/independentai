import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { requireAgencyActor } from '@/server/authz';
import { transferAgencyOwnership } from '@/server/agency';
import { prisma } from '@/server/prisma';
import { setSessionCookie } from '@/server/session';

/** Sahiplik devri (OWNER): hedef OWNER olur, mevcut sahip ADMIN'e düşer; oturum çerezi yenilenir. */
export const POST = route('agency.transfer', async (_req, ctx) => {
  const actor = await requireAgencyActor('OWNER');
  const id = await requireParam(ctx, 'id');
  await transferAgencyOwnership(actor, id);
  const res = NextResponse.json({ ok: true });
  const me = await prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
  await setSessionCookie(res, { userId: me.id, tenantId: me.tenantId, email: me.email, sv: me.sessionVersion });
  return res;
});
