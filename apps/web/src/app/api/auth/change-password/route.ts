import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError, UnauthorizedError } from '@/server/errors';
import { prisma } from '@/server/prisma';
import { requireActor } from '@/server/authz';
import { hashPassword, verifyPassword } from '@/server/password';
import { validatePassword } from '@/server/normalize';
import { setSessionCookie } from '@/server/session';
import { audit } from '@/server/audit';

/** Mevcut şifre + yeni şifre. Diğer oturumlar düşer; bu oturum yeni sv ile yenilenir. */
export const POST = route('auth.change_password', async (req) => {
  const actor = await requireActor();
  const body = await readJson<{ currentPassword?: unknown; newPassword?: unknown }>(req);
  const user = await prisma.user.findUnique({ where: { id: actor.userId } });
  if (!user) throw new UnauthorizedError();
  const next = validatePassword(body.newPassword);
  if (user.passwordHash) {
    const cur = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    if (!verifyPassword(cur, user.passwordHash)) throw new ClientError('Mevcut şifre hatalı');
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(next), sessionVersion: { increment: 1 } },
  });
  await audit({ action: 'auth.password_change', tenantId: actor.tenantId, actorUserId: actor.userId, req });
  const res = NextResponse.json({ ok: true });
  await setSessionCookie(res, {
    userId: updated.id,
    tenantId: updated.tenantId,
    email: updated.email,
    sv: updated.sessionVersion,
  });
  return res;
});
