import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { acceptInvite } from '@/server/team';
import { prisma } from '@/server/prisma';
import { setSessionCookie } from '@/server/session';
import { audit } from '@/server/audit';

/** Giriş yapmış kullanıcı daveti kabul eder; yeni tenant için oturum çerezi yenilenir. */
export const POST = route('team.accept', async (req) => {
  const actor = await requireActor();
  const body = await readJson<{ token?: unknown }>(req);
  const token = typeof body.token === 'string' ? body.token : '';
  if (!token) throw new ClientError('token gerekli');
  const { tenantId, role } = await acceptInvite(actor, token);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
  await audit({ action: 'member.join', tenantId, actorUserId: actor.userId, meta: { role }, req });
  const res = NextResponse.json({ ok: true, tenantId, role, next: '/dashboard' });
  await setSessionCookie(res, { userId: user.id, tenantId: user.tenantId, email: user.email, sv: user.sessionVersion });
  return res;
});
