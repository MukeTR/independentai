import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { requireActor } from '@/server/authz';
import { listMembers } from '@/server/team';
import { realtimeConfigured } from '@/server/realtime';

export const GET = route('team.list', async () => {
  const actor = await requireActor();
  const data = await listMembers(actor.tenantId);
  return NextResponse.json({
    ...data,
    me: { id: actor.userId, role: actor.role, name: actor.name, tenantId: actor.tenantId, viaAgency: actor.viaAgency },
    limit: actor.entitlement.limits.members,
    // Presence (çevrimiçi noktası) yalnızca Realtime yapılandırılmışsa denenir.
    realtime: realtimeConfigured(),
  });
});
