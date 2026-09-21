import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { acceptAgencyInvite } from '@/server/agency';
import { prisma } from '@/server/prisma';
import { setSessionCookie, clearWorkspaceCookie } from '@/server/session';
import { audit } from '@/server/audit';

/**
 * Giriş yapmış kullanıcı ajans davetini kabul eder: kullanıcı ajans ev tenant'ına taşınır,
 * sessionVersion artar → oturum çerezi yeni sv ile yenilenir (team/accept ile aynı kalıp).
 */
export const POST = route('agency.invite_accept', async (req) => {
  const actor = await requireActor();
  const body = await readJson<{ token?: unknown }>(req);
  const token = typeof body.token === 'string' ? body.token : '';
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(token)) throw new ClientError('token gerekli');
  const { agencyId } = await acceptAgencyInvite(actor, token);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
  await audit({ action: 'agency.member_join', agencyId, tenantId: user.tenantId, actorUserId: actor.userId, req });
  const res = NextResponse.json({ ok: true, agencyId, next: '/agency' });
  await setSessionCookie(res, { userId: user.id, tenantId: user.tenantId, email: user.email, sv: user.sessionVersion });
  clearWorkspaceCookie(res);
  return res;
});
