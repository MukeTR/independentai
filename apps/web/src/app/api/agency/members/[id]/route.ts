import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { readJson } from '@/server/errors';
import { requireAgencyActor } from '@/server/authz';
import { setMemberScope, removeAgencyMember } from '@/server/agency';
import { prisma } from '@/server/prisma';
import { setSessionCookie } from '@/server/session';
import { audit } from '@/server/audit';

/** Rol / tüm müşteriler / askıya alma (OWNER/ADMIN; Owner ataması yalnızca Owner). */
export const PATCH = route('agency.member_update', async (req, ctx) => {
  const actor = await requireAgencyActor('ADMIN');
  const id = await requireParam(ctx, 'id');
  const body = await readJson<{ role?: unknown; allClients?: unknown; status?: unknown }>(req);
  await setMemberScope(actor, id, body);
  await audit({
    action: 'agency.member_update',
    agencyId: actor.agency.id,
    actorUserId: actor.userId,
    targetType: 'membership',
    targetId: id,
    meta: { role: body.role, allClients: body.allClients, status: body.status },
    req,
  });
  // Hedef kendisiyse sessionVersion arttı → çerez yenilenmeli (aksi halde oturum düşer).
  const res = NextResponse.json({ ok: true });
  const me = await prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
  await setSessionCookie(res, { userId: me.id, tenantId: me.tenantId, email: me.email, sv: me.sessionVersion });
  return res;
});

/** Üyeyi çıkar (OWNER/ADMIN; sahibi yalnızca sahip). Kullanıcı boş bir marka hesabına taşınır. */
export const DELETE = route('agency.member_remove', async (req, ctx) => {
  const actor = await requireAgencyActor('ADMIN');
  const id = await requireParam(ctx, 'id');
  await removeAgencyMember(actor, id);
  await audit({
    action: 'agency.member_remove',
    agencyId: actor.agency.id,
    actorUserId: actor.userId,
    targetType: 'membership',
    targetId: id,
    req,
  });
  return NextResponse.json({ ok: true });
});
