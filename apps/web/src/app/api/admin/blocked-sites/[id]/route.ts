import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { readJson } from '@/server/errors';
import { requireSuperAdmin } from '@/server/authz';
import { audit } from '@/server/audit';
import { deleteBlockedSite, parseBlockedSitePatch, updateBlockedSite } from '@/server/blocked-sites-admin';

/** PATCH {hostname?, redirectUrl?, note?} · DELETE — süper admin; her mutasyon audit'li ve önbelleği temizler. */
export const PATCH = route('admin.blocked_site_update', async (req, ctx) => {
  const actor = await requireSuperAdmin();
  const id = await requireParam(ctx, 'id');
  const patch = parseBlockedSitePatch(await readJson(req));
  const row = await updateBlockedSite(id, patch);
  await audit({
    action: 'admin.blocked_site_update',
    actorUserId: actor.userId,
    targetType: 'blocked_site',
    targetId: row.id,
    meta: { ...patch, hostname: row.hostname },
    req,
  });
  return NextResponse.json(row);
});

export const DELETE = route('admin.blocked_site_delete', async (req, ctx) => {
  const actor = await requireSuperAdmin();
  const id = await requireParam(ctx, 'id');
  const row = await deleteBlockedSite(id);
  await audit({
    action: 'admin.blocked_site_delete',
    actorUserId: actor.userId,
    targetType: 'blocked_site',
    targetId: row.id,
    meta: { hostname: row.hostname, hits: row.hits },
    req,
  });
  return NextResponse.json({ ok: true, id: row.id });
});
