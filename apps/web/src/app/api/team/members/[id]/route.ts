import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { readJson } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { changeRole, removeMember } from '@/server/team';

/** Rol değişimi (yalnızca OWNER). Audit + `team.changed` yayını `changeRole` içinde. */
export const PATCH = route('team.role', async (req, ctx) => {
  const actor = await requireActor({ role: 'OWNER' });
  const id = await requireParam(ctx, 'id');
  const body = await readJson<{ role?: unknown }>(req);
  await changeRole(actor, id, body.role, { req });
  return NextResponse.json({ ok: true });
});

/** Üye çıkarma (ADMIN+; OWNER'ı yalnızca OWNER). Audit + yayın `removeMember` içinde. */
export const DELETE = route('team.remove', async (req, ctx) => {
  const actor = await requireActor({ write: true });
  const id = await requireParam(ctx, 'id');
  await removeMember(actor, id, { req });
  return NextResponse.json({ ok: true });
});
