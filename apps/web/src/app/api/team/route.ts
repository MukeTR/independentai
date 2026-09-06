import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { requireActor } from '@/server/authz';
import { listMembers } from '@/server/team';

export const GET = route('team.list', async () => {
  const actor = await requireActor();
  const data = await listMembers(actor.tenantId);
  return NextResponse.json({
    ...data,
    me: { id: actor.userId, role: actor.role },
    limit: actor.entitlement.limits.members,
  });
});
