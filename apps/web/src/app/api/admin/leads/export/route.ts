import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { requireSuperAdmin } from '@/server/authz';
import { ClientError } from '@/server/errors';
import { prisma } from '@/server/prisma';
import { audit } from '@/server/audit';
import { isLeadSource, isLeadStatus, leadsToCsv } from '@/server/lead-admin';
import type { Prisma } from '@independentai/db';

const EXPORT_MAX = 5000;

/**
 * Süper admin: CSV dışa aktarım (`?status&source&q`), en fazla 5000 satır, UTF-8 BOM.
 * E-posta/ad yalnız `consentAt` dolu satırlarda; telefon/mesaj hiç yazılmaz. `admin.lead_export` audit satırı.
 */
export const GET = route('admin.leads_export', async (req) => {
  const actor = await requireSuperAdmin();
  const sp = new URL(req.url).searchParams;
  const status = sp.get('status') ?? undefined;
  const source = sp.get('source') ?? undefined;
  if (status !== undefined && !isLeadStatus(status)) throw new ClientError('Geçersiz durum');
  if (source !== undefined && !isLeadSource(source)) throw new ClientError('Geçersiz kaynak');
  const q = (sp.get('q') ?? '').trim().slice(0, 120);
  const where: Prisma.LeadWhereInput = {
    ...(status ? { status } : {}),
    ...(source ? { source } : {}),
    ...(q
      ? {
          OR: [
            { hostname: { contains: q.toLocaleLowerCase('tr') } },
            { contactEmail: { contains: q.toLocaleLowerCase('tr') } },
            { company: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const rows = await prisma.lead.findMany({
    where,
    orderBy: [{ lastSeenAt: 'desc' }, { id: 'desc' }],
    take: EXPORT_MAX,
    select: {
      id: true,
      hostname: true,
      status: true,
      source: true,
      scanCount: true,
      lastScore: true,
      bestScore: true,
      platform: true,
      sector: true,
      contactName: true,
      contactEmail: true,
      company: true,
      topic: true,
      consentAt: true,
      firstSeenAt: true,
      lastSeenAt: true,
    },
  });
  await audit({
    action: 'admin.lead_export',
    actorUserId: actor.userId,
    targetType: 'lead',
    meta: { rows: rows.length, status: status ?? null, source: source ?? null, q: q ? true : false },
    req,
  });
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(leadsToCsv(rows), {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="leads-${day}.csv"`,
      'cache-control': 'no-store',
    },
  });
});
