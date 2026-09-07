import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { requireAgencyActor } from '@/server/authz';
import { setAssignments } from '@/server/agency';
import { prisma } from '@/server/prisma';
import { setSessionCookie } from '@/server/session';
import { audit } from '@/server/audit';

const OVERRIDES = new Set(['ADMIN', 'STRATEGIST', 'ANALYST']);

/** Üyenin müşteri atamalarını TAMAMEN değiştir: { workspaceIds: string[], roleOverride?: AgencyRole|null } */
export const PUT = route('agency.member_assign', async (req, ctx) => {
  const actor = await requireAgencyActor('ADMIN');
  const id = await requireParam(ctx, 'id');
  const body = await readJson<{ workspaceIds?: unknown; roleOverride?: unknown }>(req);
  const ids = Array.isArray(body.workspaceIds)
    ? body.workspaceIds.filter((x): x is string => typeof x === 'string' && x.length <= 64).slice(0, 500)
    : null;
  if (!ids) throw new ClientError('workspaceIds liste olmalı');
  let override: 'ADMIN' | 'STRATEGIST' | 'ANALYST' | null = null;
  if (body.roleOverride != null && body.roleOverride !== '') {
    if (typeof body.roleOverride !== 'string' || !OVERRIDES.has(body.roleOverride))
      throw new ClientError('Geçersiz rol');
    override = body.roleOverride as 'ADMIN' | 'STRATEGIST' | 'ANALYST';
  }
  await setAssignments(actor, id, [...new Set(ids)], override);
  await audit({
    action: 'agency.member_assign',
    agencyId: actor.agency.id,
    actorUserId: actor.userId,
    targetType: 'membership',
    targetId: id,
    meta: { count: new Set(ids).size, roleOverride: override },
    req,
  });
  const res = NextResponse.json({ ok: true, count: new Set(ids).size });
  const me = await prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
  await setSessionCookie(res, { userId: me.id, tenantId: me.tenantId, email: me.email, sv: me.sessionVersion });
  return res;
});
