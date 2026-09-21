import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { transferOwnership } from '@/server/team';
import { prisma } from '@/server/prisma';
import { setSessionCookie } from '@/server/session';

/**
 * Sahiplik devri (yalnızca doğrudan OWNER; ajans üzerinden yasak). Devreden ADMIN olur ve her iki
 * kullanıcının sessionVersion'ı artar; bu yanıtla devredenin oturum çerezi yeni sürümle yenilenir
 * (aksi halde bir sonraki istek 401 olur). Hedefin eski oturumu düşer, yeniden giriş yapar.
 */
export const POST = route('team.transfer', async (req) => {
  const actor = await requireActor({ role: 'OWNER', directOnly: true });
  const body = await readJson<{ userId?: unknown }>(req);
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  if (!userId) throw new ClientError('userId gerekli');
  const result = await transferOwnership(actor, userId, { req });
  const me = await prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
  const res = NextResponse.json({ ok: true, newOwnerId: result.newOwnerId, role: me.role });
  await setSessionCookie(res, { userId: me.id, tenantId: me.tenantId, email: me.email, sv: me.sessionVersion });
  return res;
});
