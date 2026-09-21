import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { requireAgencyActor, hasAgencyRole } from '@/server/authz';
import { listAgencyMembers } from '@/server/agency';
import { prisma } from '@/server/prisma';

/**
 * Ekip listesi (ANALYST+ görebilir; ekip içi olduğundan e-posta maskelenmez).
 * Atama düzenleyicisi için müşteri listesi yalnızca ADMIN+'a eklenir.
 */
export const GET = route('agency.members', async () => {
  const actor = await requireAgencyActor();
  const { members, invites } = await listAgencyMembers(actor.agency.id);
  const canManage = hasAgencyRole(actor, 'ADMIN');
  const workspaces = canManage
    ? (
        await prisma.agencyWorkspace.findMany({
          where: { agencyId: actor.agency.id, status: { not: 'ARCHIVED' } },
          select: { id: true, status: true, tenant: { select: { name: true } } },
          orderBy: { tenant: { name: 'asc' } },
          take: 500,
        })
      ).map((w) => ({ id: w.id, name: w.tenant.name, status: w.status }))
    : [];
  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      role: m.role,
      status: m.status,
      allClients: m.allClients,
      createdAt: m.createdAt.toISOString(),
      user: {
        id: m.user.id,
        email: m.user.email,
        name: m.user.name,
        lastActiveAt: m.user.lastActiveAt?.toISOString() ?? null,
        lastLoginAt: m.user.lastLoginAt?.toISOString() ?? null,
        emailVerified: !!m.user.emailVerifiedAt,
      },
      access: m.access.map((a) => ({ workspaceId: a.workspaceId, roleOverride: a.roleOverride })),
    })),
    invites: invites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      allClients: i.allClients,
      workspaceIds: i.workspaceIds,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
    })),
    workspaces,
    me: { membershipId: actor.agency.membershipId, userId: actor.userId, role: actor.agency.role },
    entitlement: actor.agency.entitlement,
  });
});
