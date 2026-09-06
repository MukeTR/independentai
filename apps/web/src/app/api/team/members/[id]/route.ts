import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { readJson } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { changeRole, removeMember } from '@/server/team';
import { audit } from '@/server/audit';

export const PATCH = route('team.role', async (req, ctx) => {
  const actor = await requireActor({ role: 'OWNER' });
  const id = await requireParam(ctx, 'id');
  const body = await readJson<{ role?: unknown }>(req);
  await changeRole(actor, id, body.role);
  await audit({
    action: 'member.role_change',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'user',
    targetId: id,
    meta: { role: body.role },
    req,
  });
  return NextResponse.json({ ok: true });
});

export const DELETE = route('team.remove', async (req, ctx) => {
  const actor = await requireActor({ write: true });
  const id = await requireParam(ctx, 'id');
  await removeMember(actor, id);
  await audit({
    action: 'member.remove',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'user',
    targetId: id,
    req,
  });
  return NextResponse.json({ ok: true });
});
