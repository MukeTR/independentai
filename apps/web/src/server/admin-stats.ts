/**
 * Admin genel bakış ve tarama istatistikleri (yalnız süper admin sayfaları/uçları çağırır).
 *
 *  - `getAdminStats()`: /admin KPI şeridi — bugün/7g/30g public tarama, kind kırılımı, partial oranı, lead durumları,
 *    7 günde iletişim formu, dönüşüm (iletişim / tarama), ajans adayı ≥50, aktif duyuru, yasaklı site isabeti,
 *    7 gün içinde deneme biten LAUNCH tenant'ı, 7 günde atlanan bildirim, 14 günlük sparkline.
 *  - `getScanStats()`: /admin/scans — kind×gün matrisi (14 gün), en çok taranan 20 host, sektör dağılımı,
 *    partial/WAF oranı, son 50 tarama (rapor linki için id; ham URL/IP/visitorHash DÖNMEZ).
 *
 * Gün sınırları Europe/Istanbul'a göredir (TSİ, UTC+3 sabit — 2016'dan beri yaz saati yok).
 * Tüm sayılar tek sorgu turunda `Promise.all` ile alınır; bir sorgu hata verirse sayfa hata sınırına düşer.
 */
import type { AuditKind, LeadStatus, Prisma } from '@independentai/db';
import { prisma } from './prisma';
import { AGENCY_THRESHOLDS } from './agency-signal';
import { utcTs } from './sql';

const DAY_MS = 86_400_000;
/** Europe/Istanbul: UTC+3, yaz saati yok (2016-09'dan beri). */
const ISTANBUL_OFFSET_MS = 3 * 3_600_000;
const SPARKLINE_DAYS = 14;

export type ScanWindowStats = { today: number; d7: number; d30: number };

export type AdminStats = {
  scans: ScanWindowStats & { byKind: Partial<Record<AuditKind, number>>; partialRatio: number };
  leads: { byStatus: Record<LeadStatus, number>; contacts7d: number; total: number };
  /** 7 günde iletişim formu / 7 günde public tarama (0–1; tarama yoksa 0) */
  conversion7d: { contacts: number; scans: number; ratio: number };
  agencyCandidates: number;
  activeAnnouncements: number;
  blockedHits: number;
  trialsEndingIn7d: number;
  notificationsSkipped7d: number;
  /** Son 14 gün günlük public tarama sayısı (eski → yeni) */
  sparkline: number[];
  /** Sparkline günlerinin YYYY-MM-DD etiketleri (TSİ) */
  sparklineDays: string[];
  computedAt: string;
};

export function emptyAdminStats(): AdminStats {
  return {
    scans: { today: 0, d7: 0, d30: 0, byKind: {}, partialRatio: 0 },
    leads: { byStatus: { NEW: 0, CONTACTED: 0, QUALIFIED: 0, WON: 0, LOST: 0 }, contacts7d: 0, total: 0 },
    conversion7d: { contacts: 0, scans: 0, ratio: 0 },
    agencyCandidates: 0,
    activeAnnouncements: 0,
    blockedHits: 0,
    trialsEndingIn7d: 0,
    notificationsSkipped7d: 0,
    sparkline: Array.from({ length: SPARKLINE_DAYS }, () => 0),
    sparklineDays: [],
    computedAt: new Date().toISOString(),
  };
}

/** TSİ gün başlangıcı (UTC Date olarak). */
export function startOfIstanbulDay(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + ISTANBUL_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - ISTANBUL_OFFSET_MS);
}

/** YYYY-MM-DD (TSİ) */
export function istanbulDayKey(d: Date): string {
  return new Date(d.getTime() + ISTANBUL_OFFSET_MS).toISOString().slice(0, 10);
}

function sparklineDayKeys(now: Date, days = SPARKLINE_DAYS): string[] {
  const start = startOfIstanbulDay(now);
  return Array.from({ length: days }, (_, i) => istanbulDayKey(new Date(start.getTime() - (days - 1 - i) * DAY_MS)));
}

/** Gün bazında public tarama sayıları (TSİ günü; ham SQL — tarih parametresi utcTs ile sabitlenir). */
async function dailyScanCounts(since: Date): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<{ day: string; n: number }[]>`
    SELECT to_char(("createdAt" + interval '3 hours'), 'YYYY-MM-DD') AS day, count(*)::int AS n
    FROM "PublicScan"
    WHERE "createdAt" >= ${utcTs(since)}
    GROUP BY 1
  `;
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.day, Number(r.n));
  return map;
}

/** Şu an etkin duyuru koşulu (tüm yerleşimler). */
function activeAnnouncementWhere(now: Date): Prisma.AnnouncementWhereInput {
  return {
    enabled: true,
    OR: [{ startsAt: null }, { startsAt: { lte: now } }],
    AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
  };
}

export async function getAdminStats(now: Date = new Date()): Promise<AdminStats> {
  const today = startOfIstanbulDay(now);
  const d7 = new Date(now.getTime() - 7 * DAY_MS);
  const d30 = new Date(now.getTime() - 30 * DAY_MS);
  const in7d = new Date(now.getTime() + 7 * DAY_MS);
  const dayKeys = sparklineDayKeys(now);
  const sparkSince = new Date(today.getTime() - (SPARKLINE_DAYS - 1) * DAY_MS);

  const [
    scansToday,
    scans7d,
    scans30d,
    partial30d,
    byKindRows,
    leadsByStatus,
    leadsTotal,
    contacts7d,
    agencyCandidates,
    activeAnnouncements,
    blockedAgg,
    trialsEndingIn7d,
    notificationsSkipped7d,
    daily,
  ] = await Promise.all([
    prisma.publicScan.count({ where: { createdAt: { gte: today } } }),
    prisma.publicScan.count({ where: { createdAt: { gte: d7 } } }),
    prisma.publicScan.count({ where: { createdAt: { gte: d30 } } }),
    prisma.publicScan.count({ where: { createdAt: { gte: d30 }, partial: true } }),
    prisma.publicScan.groupBy({ by: ['kind'], where: { createdAt: { gte: d30 } }, _count: { _all: true } }),
    prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.lead.count(),
    prisma.lead.count({ where: { consentAt: { gte: d7 } } }),
    prisma.agencySignal.count({
      where: { score: { gte: AGENCY_THRESHOLDS.candidate }, status: { in: ['CANDIDATE', 'CONTACTED'] } },
    }),
    prisma.announcement.count({ where: activeAnnouncementWhere(now) }),
    prisma.blockedSite.aggregate({ _sum: { hits: true } }),
    prisma.tenant.count({ where: { plan: 'LAUNCH', trialEndsAt: { gte: now, lte: in7d } } }),
    prisma.notificationLog.count({ where: { status: 'skipped', createdAt: { gte: d7 } } }),
    dailyScanCounts(sparkSince),
  ]);

  const byKind: Partial<Record<AuditKind, number>> = {};
  for (const r of byKindRows) byKind[r.kind] = r._count._all;

  const byStatus: Record<LeadStatus, number> = { NEW: 0, CONTACTED: 0, QUALIFIED: 0, WON: 0, LOST: 0 };
  for (const r of leadsByStatus) byStatus[r.status] = r._count._all;

  return {
    scans: {
      today: scansToday,
      d7: scans7d,
      d30: scans30d,
      byKind,
      partialRatio: scans30d ? partial30d / scans30d : 0,
    },
    leads: { byStatus, contacts7d, total: leadsTotal },
    conversion7d: { contacts: contacts7d, scans: scans7d, ratio: scans7d ? contacts7d / scans7d : 0 },
    agencyCandidates,
    activeAnnouncements,
    blockedHits: blockedAgg._sum.hits ?? 0,
    trialsEndingIn7d,
    notificationsSkipped7d,
    sparkline: dayKeys.map((k) => daily.get(k) ?? 0),
    sparklineDays: dayKeys,
    computedAt: now.toISOString(),
  };
}

// ── /admin/scans ──

export type ScanKindDay = { kind: AuditKind; day: string; n: number };

export type RecentScan = {
  id: string;
  kind: AuditKind;
  hostname: string;
  score: number | null;
  sector: string | null;
  partial: boolean;
  waf: boolean;
  tenantId: string | null;
  createdAt: Date;
};

export type ScanStats = {
  days: string[];
  kinds: AuditKind[];
  /** kind → gün etiketine göre sayı */
  matrix: Record<string, Record<string, number>>;
  topHosts: { hostname: string; n: number; lastAt: Date }[];
  sectors: { sector: string; n: number }[];
  total30d: number;
  partial30d: number;
  waf30d: number;
  recent: RecentScan[];
  computedAt: string;
};

function metaWaf(meta: unknown): boolean {
  return !!meta && typeof meta === 'object' && (meta as { waf?: unknown }).waf === true;
}

export async function getScanStats(now: Date = new Date()): Promise<ScanStats> {
  const today = startOfIstanbulDay(now);
  const d30 = new Date(now.getTime() - 30 * DAY_MS);
  const days = sparklineDayKeys(now);
  const since = new Date(today.getTime() - (SPARKLINE_DAYS - 1) * DAY_MS);

  const [kindDayRows, hostRows, sectorRows, total30d, partial30d, wafRows, recentRows] = await Promise.all([
    prisma.$queryRaw<{ kind: AuditKind; day: string; n: number }[]>`
      SELECT "kind", to_char(("createdAt" + interval '3 hours'), 'YYYY-MM-DD') AS day, count(*)::int AS n
      FROM "PublicScan"
      WHERE "createdAt" >= ${utcTs(since)}
      GROUP BY 1, 2
    `,
    prisma.publicScan.groupBy({
      by: ['hostname'],
      where: { createdAt: { gte: d30 } },
      _count: { _all: true },
      _max: { createdAt: true },
      orderBy: { _count: { hostname: 'desc' } },
      take: 20,
    }),
    prisma.publicScan.groupBy({
      by: ['sector'],
      where: { createdAt: { gte: d30 }, sector: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { sector: 'desc' } },
      take: 12,
    }),
    prisma.publicScan.count({ where: { createdAt: { gte: d30 } } }),
    prisma.publicScan.count({ where: { createdAt: { gte: d30 }, partial: true } }),
    prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM "PublicScan"
      WHERE "createdAt" >= ${utcTs(d30)} AND ("meta"->>'waf') = 'true'
    `,
    prisma.publicScan.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        kind: true,
        hostname: true,
        score: true,
        sector: true,
        partial: true,
        meta: true,
        tenantId: true,
        createdAt: true,
      },
    }),
  ]);

  const matrix: Record<string, Record<string, number>> = {};
  const kindSet = new Set<AuditKind>();
  for (const r of kindDayRows) {
    kindSet.add(r.kind);
    matrix[r.kind] ??= {};
    matrix[r.kind]![r.day] = Number(r.n);
  }

  return {
    days,
    kinds: [...kindSet].sort(),
    matrix,
    topHosts: hostRows.map((h) => ({ hostname: h.hostname, n: h._count._all, lastAt: h._max.createdAt ?? now })),
    sectors: sectorRows.map((s) => ({ sector: s.sector ?? '—', n: s._count._all })),
    total30d,
    partial30d,
    waf30d: Number(wafRows[0]?.n ?? 0),
    recent: recentRows.map((r) => ({
      id: r.id,
      kind: r.kind,
      hostname: r.hostname,
      score: r.score,
      sector: r.sector,
      partial: r.partial,
      waf: metaWaf(r.meta),
      tenantId: r.tenantId,
      createdAt: r.createdAt,
    })),
    computedAt: now.toISOString(),
  };
}
