/**
 * Kalıcı rapor — `/rapor/<token>` ve `GET /api/rapor/<token>` için tek okuma noktası.
 *
 *  - Token HMAC ile doğrulanır (report-token.ts); geçerliyse PublicScan KAYITLI sonucu okunur.
 *  - Ağ yok, LLM yok: rapor yalnız tarama anında kaydedilmiş JSON'dan çizilir.
 *  - Yok/bozuk imza → `missing` (404); `expiresAt` geçmiş → `gone` (410); hostname yasaklı listedeyse → `blocked`
 *    (yönlendirme; allowlist `findBlockedSite` içinde doğrulanmıştır).
 *  - Yanıt/sayfa PII taşımaz: visitorHash, tenantId, urlHash SEÇİLMEZ (select listesi bilinçli olarak dar).
 *  - `recordReportView` views++ best-effort (hata yutulur, loglanır).
 */
import { cache } from 'react';
import type { AuditKind } from '@independentai/db';
import { prisma } from './prisma';
import { log } from './logger';
import { siteUrl } from './env';
import { verifyReportToken } from './report-token';
import { findBlockedSite, recordBlockedHit } from './blocklist';
import { toolByKind, toolPath, type ToolEntry } from '@/lib/tool-registry';

export type ReportFinding = { category: string; status: 'pass' | 'warn' | 'fail'; title: string; detail: string };
export type ReportAxis = { key: string; label: string; weight: number; description: string };

/** Tarama anında kaydedilen sonucun rapor için okunan alt kümesi (fazlası `extra`/ham JSON'da kalır). */
export type StoredScanResult = {
  url?: string;
  finalUrl?: string;
  score?: number;
  breakdown?: Record<string, number>;
  axes?: ReportAxis[];
  findings?: ReportFinding[];
  recommendations?: {
    title: string;
    difficulty: 'Kolay' | 'Orta' | 'Zor';
    impact: 'Yüksek' | 'Orta' | 'Düşük';
    detail: string;
    category: string;
    steps?: string[];
  }[];
  partial?: boolean;
  waf?: boolean;
  fetchedAt?: string;
  extra?: unknown;
  [k: string]: unknown;
};

export type ReportMeta = { competitorHostname?: string; waf?: boolean; partial?: boolean };

export type PublicReport = {
  scanId: string;
  token: string;
  reportUrl: string;
  kind: AuditKind;
  tool: ToolEntry | null;
  toolTitle: string;
  hostname: string;
  score: number | null;
  sector: string | null;
  meta: ReportMeta;
  partial: boolean;
  waf: boolean;
  views: number;
  createdAt: Date;
  expiresAt: Date;
  result: StoredScanResult;
};

export type ResolvedReport =
  | { status: 'missing' }
  | { status: 'gone'; hostname: string; kind: AuditKind; tool: ToolEntry | null; rescanPath: string }
  | { status: 'blocked'; redirectUrl: string }
  | { status: 'ok'; report: PublicReport };

const FALLBACK_TOOL_TITLE = 'Site taraması';

export function reportPath(token: string): string {
  return `/rapor/${token}`;
}

export function reportUrlFor(token: string): string {
  return `${siteUrl()}${reportPath(token)}`;
}

/** Hostname'den yeniden tarama yolu; sektörlü araçlarda `?sektor=` de taşınır. Ham URL saklanmadığından hostname yeter. */
export function rescanPath(tool: ToolEntry | null, hostname: string, sector?: string | null): string {
  if (!tool) return `/arac?url=${encodeURIComponent(hostname)}`;
  const q = new URLSearchParams({ url: hostname });
  if (sector) q.set('sektor', sector);
  return `${toolPath(tool.slug)}?${q.toString()}`;
}

export type VerdictCounts = { fail: number; warn: number; pass: number; total: number };

export function verdictCounts(findings: ReportFinding[] | undefined): VerdictCounts {
  const c: VerdictCounts = { fail: 0, warn: 0, pass: 0, total: 0 };
  for (const f of findings ?? []) {
    if (f.status === 'fail') c.fail += 1;
    else if (f.status === 'warn') c.warn += 1;
    else if (f.status === 'pass') c.pass += 1;
    else continue;
    c.total += 1;
  }
  return c;
}

/** "3 kritik, 4 uyarı, 9 tamam" — mikro-kopya sözleşmesi (hüküm cümlesi). */
export function verdictLine(findings: ReportFinding[] | undefined): string {
  const c = verdictCounts(findings);
  if (c.total === 0) return 'Kontrol sonucu yok';
  return `${c.fail} kritik, ${c.warn} uyarı, ${c.pass} tamam`;
}

/** Kalan gün (yukarı yuvarlanır; geçmişse 0). */
export function daysLeft(expiresAt: Date, now = new Date()): number {
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

/** WhatsApp paylaşım metni — kişisel veri yok; hostname + araç + skor + hüküm + bağlantı. */
export function whatsappShareText(input: {
  hostname: string;
  toolTitle: string;
  score: number | null;
  verdict: string;
  reportUrl: string;
}): string {
  const scorePart = input.score == null ? '' : ` ${input.score}/100 ·`;
  return `${input.hostname} — ${input.toolTitle}:${scorePart} ${input.verdict}. Rapor: ${input.reportUrl}`;
}

export function whatsappShareHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function parseMeta(raw: unknown): ReportMeta {
  if (!raw || typeof raw !== 'object') return {};
  const m = raw as Record<string, unknown>;
  const out: ReportMeta = {};
  if (typeof m.competitorHostname === 'string') out.competitorHostname = m.competitorHostname;
  if (typeof m.waf === 'boolean') out.waf = m.waf;
  if (typeof m.partial === 'boolean') out.partial = m.partial;
  return out;
}

/**
 * Token → rapor. İstek başına memoize (generateMetadata + sayfa + OG görseli tek okuma).
 * Ağ/LLM çağrısı yok; yalnız PublicScan + BlockedSite okuması.
 */
export const resolveReport = cache(async function resolveReport(token: unknown): Promise<ResolvedReport> {
  const scanId = verifyReportToken(token);
  if (!scanId) return { status: 'missing' };
  const row = await prisma.publicScan.findUnique({
    where: { id: scanId },
    select: {
      id: true,
      kind: true,
      hostname: true,
      score: true,
      result: true,
      sector: true,
      meta: true,
      partial: true,
      views: true,
      createdAt: true,
      expiresAt: true,
    },
  });
  if (!row) return { status: 'missing' };
  const tool = toolByKind(row.kind) ?? null;
  if (row.expiresAt.getTime() <= Date.now()) {
    return {
      status: 'gone',
      hostname: row.hostname,
      kind: row.kind,
      tool,
      rescanPath: rescanPath(tool, row.hostname, row.sector),
    };
  }
  const blocked = await findBlockedSite(row.hostname);
  if (blocked) {
    void recordBlockedHit(blocked.id);
    return { status: 'blocked', redirectUrl: blocked.redirectUrl };
  }
  const result = (row.result && typeof row.result === 'object' ? row.result : {}) as StoredScanResult;
  const meta = parseMeta(row.meta);
  const tokenStr = token as string;
  return {
    status: 'ok',
    report: {
      scanId: row.id,
      token: tokenStr,
      reportUrl: reportUrlFor(tokenStr),
      kind: row.kind,
      tool,
      toolTitle: tool?.title ?? FALLBACK_TOOL_TITLE,
      hostname: row.hostname,
      score: typeof row.score === 'number' ? row.score : typeof result.score === 'number' ? result.score : null,
      sector: row.sector,
      meta,
      partial: row.partial || result.partial === true || meta.partial === true,
      waf: result.waf === true || meta.waf === true,
      views: row.views,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      result,
    },
  };
});

/** views++ — best-effort; sayfa görüntülemesini asla bozmaz. */
export async function recordReportView(scanId: string): Promise<void> {
  try {
    await prisma.publicScan.updateMany({ where: { id: scanId }, data: { views: { increment: 1 } } });
  } catch (err) {
    log.warn('public-report.view_failed', { scanId, err });
  }
}

/** JSON ucu gövdesi — ham IP/hash/tenant YOK; yalnız herkese açık site verisi ve tarama çıktısı. */
export function publicReportJson(report: PublicReport) {
  return {
    token: report.token,
    reportUrl: report.reportUrl,
    kind: report.kind,
    tool: report.tool ? { slug: report.tool.slug, title: report.tool.title, path: toolPath(report.tool.slug) } : null,
    hostname: report.hostname,
    score: report.score,
    verdict: verdictLine(report.result.findings),
    sector: report.sector,
    competitorHostname: report.meta.competitorHostname ?? null,
    partial: report.partial,
    waf: report.waf,
    createdAt: report.createdAt.toISOString(),
    expiresAt: report.expiresAt.toISOString(),
    daysLeft: daysLeft(report.expiresAt),
    rescanPath: rescanPath(report.tool, report.hostname, report.sector),
    result: report.result,
  };
}
