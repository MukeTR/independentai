import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { readJson } from '@/server/errors';
import { requireSuperAdmin } from '@/server/authz';
import { audit } from '@/server/audit';
import { deleteReferenceLogo, referenceLogoPatchSchema, updateReferenceLogo } from '@/server/reference-logos';

/** PATCH {name?, logoUrl?, siteUrl?, sector?, published?} · DELETE — süper admin, her mutasyon audit'li. */
export const PATCH = route('admin.reference_logo_update', async (req, ctx) => {
  const actor = await requireSuperAdmin();
  const id = await requireParam(ctx, 'id');
  const patch = referenceLogoPatchSchema.parse(await readJson(req));
  const row = await updateReferenceLogo(id, patch);
  await audit({
    action: 'admin.reference_logo_update',
    actorUserId: actor.userId,
    targetType: 'reference_logo',
    targetId: row.id,
    meta: { ...patch, name: row.name },
    req,
  });
  return NextResponse.json(row);
});

export const DELETE = route('admin.reference_logo_delete', async (req, ctx) => {
  const actor = await requireSuperAdmin();
  const id = await requireParam(ctx, 'id');
  const row = await deleteReferenceLogo(id);
  await audit({
    action: 'admin.reference_logo_delete',
    actorUserId: actor.userId,
    targetType: 'reference_logo',
    targetId: row.id,
    meta: { name: row.name, logoUrl: row.logoUrl },
    req,
  });
  return NextResponse.json({ ok: true, id: row.id });
});
