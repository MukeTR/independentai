import { prisma } from '@/server/prisma';
import { log } from '@/server/logger';
import { AGENCY_BAND_HIDDEN_STATUSES, showsAgencyBand } from '@/server/agency-signal';
import { AgencyBandClient } from './agency-band-client';

/**
 * Ajans bandı (sunucu sarmalayıcı) — yalnız BRAND tenant, skor ≥70 ve durum DECLARED/DISMISSED/CONVERTED değilse.
 * Tek indeksli sorgu; hata bandı gizler (panel etkilenmez). Kapatma (7 gün) istemcide localStorage ile.
 */
export async function AgencyBand({ tenantId, tenantKind }: { tenantId: string; tenantKind: 'BRAND' | 'AGENCY' }) {
  if (tenantKind !== 'BRAND') return null;
  try {
    const row = await prisma.agencySignal.findUnique({
      where: { subject_subjectId: { subject: 'TENANT', subjectId: tenantId } },
      select: { score: true, status: true },
    });
    if (!row || !showsAgencyBand('TENANT', row.score) || AGENCY_BAND_HIDDEN_STATUSES.has(row.status)) return null;
    return <AgencyBandClient score={row.score} />;
  } catch (err) {
    log.warn('agency-band.lookup_failed', { err });
    return null;
  }
}
