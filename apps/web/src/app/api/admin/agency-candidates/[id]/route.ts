import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { readJson, ClientError, NotFoundError } from '@/server/errors';
import { requireSuperAdmin } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { audit } from '@/server/audit';
import { isAgencyStatusKey } from '@/lib/agency-labels';

/** PATCH {status?, note?} — aday aksiyonları (İletişime geç / Dönüştü / Yoksay / not). DECLARED elle atanamaz. */
export const PATCH = route('admin.agency_candidate_update', async (req, ctx) => {
  const actor = await requireSuperAdmin();
  const id = await requireParam(ctx, 'id');
  const row = await prisma.agencySignal.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!row) throw new NotFoundError('Aday bulunamadı');
  const body = await readJson<{ status?: unknown; note?: unknown }>(req);
  const data: { status?: 'CANDIDATE' | 'CONTACTED' | 'CONVERTED' | 'DISMISSED'; note?: string | null } = {};
  if (body.status !== undefined) {
    if (!isAgencyStatusKey(body.status) || body.status === 'DECLARED')
      throw new ClientError('Geçersiz durum (CANDIDATE, CONTACTED, CONVERTED, DISMISSED)');
    data.status = body.status;
  }
  if (body.note !== undefined) {
    if (body.note !== null && typeof body.note !== 'string') throw new ClientError('Not metin olmalı');
    const note = body.note ? body.note.trim().slice(0, 500) : null;
    data.note = note || null;
  }
  if (Object.keys(data).length === 0) throw new ClientError('Güncellenecek alan yok');
  const updated = await prisma.agencySignal.update({
    where: { id },
    data,
    select: { id: true, status: true, note: true, score: true, updatedAt: true },
  });
  await audit({
    action: 'admin.agency_candidate_update',
    actorUserId: actor.userId,
    targetType: 'agency_signal',
    targetId: id,
    meta: { from: row.status, ...data },
    req,
  });
  return NextResponse.json(updated);
});
