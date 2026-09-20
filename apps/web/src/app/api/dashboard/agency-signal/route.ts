import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { requireActor } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { AGENCY_BAND_HIDDEN_STATUSES, showsAgencyBand, type AgencyReason } from '@/server/agency-signal';

export type AgencySignalDto = {
  score: number;
  status: string | null;
  reasons: { key: string; evidence: string }[];
  showBand: boolean;
};

/** Tenant'ın kendi ajans sinyali (yalnız kendi hesabı; ham hostname listesi dönmez). */
export const GET = route('dashboard.agency_signal', async () => {
  const actor = await requireActor();
  const row = await prisma.agencySignal.findUnique({
    where: { subject_subjectId: { subject: 'TENANT', subjectId: actor.tenantId } },
    select: { score: true, status: true, reasons: true },
  });
  const reasons = Array.isArray(row?.reasons)
    ? (row.reasons as unknown as AgencyReason[]).map((r) => ({ key: r.key, evidence: r.evidence }))
    : [];
  const dto: AgencySignalDto = {
    score: row?.score ?? 0,
    status: row?.status ?? null,
    reasons,
    showBand:
      !!row &&
      actor.tenant.kind === 'BRAND' &&
      showsAgencyBand('TENANT', row.score) &&
      !AGENCY_BAND_HIDDEN_STATUSES.has(row.status),
  };
  return NextResponse.json(dto);
});
