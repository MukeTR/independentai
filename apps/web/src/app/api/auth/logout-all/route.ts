import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { requireActor } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { clearSessionCookie } from '@/server/session';
import { audit } from '@/server/audit';

/** Tüm cihazlardaki oturumları düşürür (sessionVersion++). */
export const POST = route('auth.logout_all', async (req) => {
  const actor = await requireActor();
  await prisma.user.update({ where: { id: actor.userId }, data: { sessionVersion: { increment: 1 } } });
  await audit({ action: 'auth.logout_all', tenantId: actor.tenantId, actorUserId: actor.userId, req });
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
});
