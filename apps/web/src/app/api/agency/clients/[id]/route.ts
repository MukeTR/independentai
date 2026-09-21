import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { readJson } from '@/server/errors';
import { requireAgencyActor } from '@/server/authz';
import { updateWorkspace, unlinkWorkspace } from '@/server/agency';
import { audit } from '@/server/audit';

/** Durum (ACTIVE/PAUSED/ARCHIVED), etiket, tag'ler, sorumlu üye (ADMIN+). */
export const PATCH = route('agency.client_update', async (req, ctx) => {
  const actor = await requireAgencyActor('ADMIN');
  const id = await requireParam(ctx, 'id');
  const body = await readJson<{ status?: unknown; label?: unknown; tags?: unknown; ownerMemberId?: unknown }>(req);
  const ws = await updateWorkspace(actor, id, body);
  await audit({
    action: 'agency.client_update',
    agencyId: actor.agency.id,
    tenantId: ws.tenantId,
    actorUserId: actor.userId,
    targetType: 'workspace',
    targetId: ws.id,
    meta: { fields: Object.keys(body), status: ws.status },
    req,
  });
  return NextResponse.json({
    ok: true,
    workspace: {
      id: ws.id,
      tenantId: ws.tenantId,
      status: ws.status,
      label: ws.label,
      tags: ws.tags,
      ownerMemberId: ws.ownerMemberId,
    },
  });
});

/** Bağlantıyı kes (OWNER): yalnızca ilişki silinir; müşteri tenant'ı ve verisi kalır. */
export const DELETE = route('agency.client_unlink', async (req, ctx) => {
  const actor = await requireAgencyActor('OWNER');
  const id = await requireParam(ctx, 'id');
  const result = await unlinkWorkspace(actor, id);
  await audit({
    action: 'agency.client_unlink',
    agencyId: actor.agency.id,
    tenantId: result.tenantId,
    actorUserId: actor.userId,
    targetType: 'workspace',
    targetId: id,
    meta: { orphan: result.orphan },
    req,
  });
  return NextResponse.json({ ok: true, ...result });
});
