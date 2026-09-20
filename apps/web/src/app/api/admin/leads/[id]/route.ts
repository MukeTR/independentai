import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { readJson, NotFoundError } from '@/server/errors';
import { requireSuperAdmin } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { audit } from '@/server/audit';
import { LEAD_DETAIL_SELECT, applyLeadPatch, parseLeadPatch, toLeadDetailDto } from '@/server/lead-admin';

/** Süper admin: lead detayı. `?reveal=1` → tam e-posta/telefon + `admin.lead_reveal_email` audit satırı. */
export const GET = route('admin.lead_get', async (req, ctx) => {
  const actor = await requireSuperAdmin();
  const id = await requireParam(ctx, 'id');
  const row = await prisma.lead.findUnique({ where: { id }, select: LEAD_DETAIL_SELECT });
  if (!row) throw new NotFoundError('Lead bulunamadı');
  const reveal = new URL(req.url).searchParams.get('reveal') === '1';
  if (reveal && (row.contactEmail || row.contactPhone)) {
    await audit({
      action: 'admin.lead_reveal_email',
      actorUserId: actor.userId,
      targetType: 'lead',
      targetId: id,
      meta: { hostname: row.hostname },
      req,
    });
  }
  return NextResponse.json(toLeadDetailDto(row, { reveal }));
});

/**
 * Süper admin: aksiyon/durum/not/sahip. Gövde: {action?, status?, note?, ownerUserId?, notes?}.
 * Her çağrı activity.push + `admin.lead_update` audit satırı.
 */
export const PATCH = route('admin.lead_update', async (req, ctx) => {
  const actor = await requireSuperAdmin();
  const id = await requireParam(ctx, 'id');
  const input = parseLeadPatch(await readJson(req));
  const ok = await applyLeadPatch(id, input, actor.userId);
  if (!ok) throw new NotFoundError('Lead bulunamadı');
  await audit({
    action: 'admin.lead_update',
    actorUserId: actor.userId,
    targetType: 'lead',
    targetId: id,
    meta: {
      ...(input.action ? { action: input.action } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.ownerUserId !== undefined ? { ownerUserId: input.ownerUserId } : {}),
      ...(input.note ? { hasNote: true } : {}),
      ...(input.notes !== undefined ? { notesChanged: true } : {}),
    },
    req,
  });
  const row = await prisma.lead.findUniqueOrThrow({ where: { id }, select: LEAD_DETAIL_SELECT });
  return NextResponse.json(toLeadDetailDto(row));
});

/** Süper admin: lead'i siler (KVKK silme hakkı). Audit'e yalnız hostname + iletişim var/yok yazılır. */
export const DELETE = route('admin.lead_delete', async (req, ctx) => {
  const actor = await requireSuperAdmin();
  const id = await requireParam(ctx, 'id');
  const row = await prisma.lead.findUnique({ where: { id }, select: { hostname: true, contactEmail: true } });
  if (!row) throw new NotFoundError('Lead bulunamadı');
  await prisma.lead.delete({ where: { id } });
  await audit({
    action: 'admin.lead_delete',
    actorUserId: actor.userId,
    targetType: 'lead',
    targetId: id,
    meta: { hostname: row.hostname, hadContact: !!row.contactEmail },
    req,
  });
  return NextResponse.json({ ok: true });
});
