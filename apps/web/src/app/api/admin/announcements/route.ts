import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson } from '@/server/errors';
import { requireSuperAdmin } from '@/server/authz';
import { audit } from '@/server/audit';
import { createAnnouncement, listAnnouncements, parseAnnouncementInput } from '@/server/announcements';

/** Süper admin: tüm duyurular (yayında olmayanlar dahil). */
export const GET = route('admin.announcements_list', async () => {
  await requireSuperAdmin();
  return NextResponse.json({ items: await listAnnouncements() });
});

/** Süper admin: duyuru oluştur → 201 + `admin.announcement_create`. */
export const POST = route('admin.announcement_create', async (req) => {
  const actor = await requireSuperAdmin();
  const input = parseAnnouncementInput(await readJson(req), { partial: false });
  const row = await createAnnouncement(input, actor.userId);
  await audit({
    action: 'admin.announcement_create',
    actorUserId: actor.userId,
    targetType: 'announcement',
    targetId: row.id,
    meta: { placement: row.placement, tone: row.tone, enabled: row.enabled },
    req,
  });
  return NextResponse.json(row, { status: 201 });
});
