import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { readJson, NotFoundError } from '@/server/errors';
import { requireSuperAdmin } from '@/server/authz';
import { audit } from '@/server/audit';
import { deleteAnnouncement, parseAnnouncementInput, updateAnnouncement } from '@/server/announcements';

/** Süper admin: kısmi güncelleme (aç/kapa dahil) → `admin.announcement_update`. */
export const PATCH = route('admin.announcement_update', async (req, ctx) => {
  const actor = await requireSuperAdmin();
  const id = await requireParam(ctx, 'id');
  const patch = parseAnnouncementInput(await readJson(req), { partial: true });
  const row = await updateAnnouncement(id, patch);
  if (!row) throw new NotFoundError('Duyuru bulunamadı');
  await audit({
    action: 'admin.announcement_update',
    actorUserId: actor.userId,
    targetType: 'announcement',
    targetId: id,
    meta: { fields: Object.keys(patch), enabled: row.enabled },
    req,
  });
  return NextResponse.json(row);
});

/** Süper admin: sil → `admin.announcement_delete`. */
export const DELETE = route('admin.announcement_delete', async (req, ctx) => {
  const actor = await requireSuperAdmin();
  const id = await requireParam(ctx, 'id');
  const ok = await deleteAnnouncement(id);
  if (!ok) throw new NotFoundError('Duyuru bulunamadı');
  await audit({
    action: 'admin.announcement_delete',
    actorUserId: actor.userId,
    targetType: 'announcement',
    targetId: id,
    req,
  });
  return NextResponse.json({ ok: true });
});
