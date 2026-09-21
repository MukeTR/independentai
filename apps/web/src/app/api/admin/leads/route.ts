import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { requireSuperAdmin } from '@/server/authz';
import { ClientError } from '@/server/errors';
import { prisma } from '@/server/prisma';
import { listLeads } from '@/server/leads';
import { isLeadSource, isLeadStatus } from '@/server/lead-admin';
import { maskEmail } from '@/server/logger';

/**
 * Süper admin: lead listesi — `?status&source&q&cursor&take`. E-posta maskeli döner (tam değer: /[id]?reveal=1).
 * `counts.bySource` / `counts.byStatus` sekme ve hap sayıları içindir (byStatus seçili kaynağa göre).
 */
export const GET = route('admin.leads_list', async (req) => {
  await requireSuperAdmin();
  const sp = new URL(req.url).searchParams;
  const status = sp.get('status') ?? undefined;
  const source = sp.get('source') ?? undefined;
  if (status !== undefined && !isLeadStatus(status)) throw new ClientError('Geçersiz durum');
  if (source !== undefined && !isLeadSource(source)) throw new ClientError('Geçersiz kaynak');
  const q = (sp.get('q') ?? '').slice(0, 120) || undefined;
  const cursor = sp.get('cursor') || undefined;
  const takeRaw = Number(sp.get('take') ?? 50);
  const take = Number.isFinite(takeRaw) ? Math.max(1, Math.min(200, Math.floor(takeRaw))) : 50;

  const [page, bySourceRows, byStatusRows] = await Promise.all([
    listLeads({ status, source, q, cursor, take }),
    prisma.lead.groupBy({ by: ['source'], _count: { _all: true } }),
    prisma.lead.groupBy({ by: ['status'], where: source ? { source } : {}, _count: { _all: true } }),
  ]);
  const bySource: Record<string, number> = {};
  for (const r of bySourceRows) bySource[r.source] = r._count._all;
  const byStatus: Record<string, number> = {};
  for (const r of byStatusRows) byStatus[r.status] = r._count._all;

  return NextResponse.json({
    items: page.items.map((l) => ({ ...l, contactEmail: maskEmail(l.contactEmail), contactPhone: undefined })),
    nextCursor: page.nextCursor,
    counts: { bySource, byStatus },
  });
});
