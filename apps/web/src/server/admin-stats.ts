/**
 * Admin genel bakış istatistikleri — iskelet (PREP). W4 gerçek sorguları doldurur:
 * bugün/7g/30g PublicScan kind kırılımı, Lead by status, iletişim sayısı, ajans adayı ≥50, aktif duyuru,
 * BlockedSite hits, 7 gün içinde deneme biten tenant, NotificationLog skipped, 14 gün sparkline.
 */
import type { AuditKind, LeadStatus } from '@independentai/db';

export type ScanWindowStats = { today: number; d7: number; d30: number };

export type AdminStats = {
  scans: ScanWindowStats & { byKind: Partial<Record<AuditKind, number>>; partialRatio: number };
  leads: { byStatus: Record<LeadStatus, number>; contacts7d: number; total: number };
  agencyCandidates: number;
  activeAnnouncements: number;
  blockedHits: number;
  trialsEndingIn7d: number;
  notificationsSkipped7d: number;
  /** Son 14 gün günlük public tarama sayısı (eski → yeni) */
  sparkline: number[];
  computedAt: string;
};

export function emptyAdminStats(): AdminStats {
  return {
    scans: { today: 0, d7: 0, d30: 0, byKind: {}, partialRatio: 0 },
    leads: { byStatus: { NEW: 0, CONTACTED: 0, QUALIFIED: 0, WON: 0, LOST: 0 }, contacts7d: 0, total: 0 },
    agencyCandidates: 0,
    activeAnnouncements: 0,
    blockedHits: 0,
    trialsEndingIn7d: 0,
    notificationsSkipped7d: 0,
    sparkline: Array.from({ length: 14 }, () => 0),
    computedAt: new Date().toISOString(),
  };
}

/** PREP: boş istatistik döner; W4 gerçek sorguları ekler. */
export async function getAdminStats(): Promise<AdminStats> {
  return emptyAdminStats();
}
