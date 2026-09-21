/**
 * Kayıt sonrası ilk site taraması — onboarding tamamlanınca `after()` içinde, mevcut AI Crawler motoruyla
 * (`runCrawlerAudit`; yeni motor importu YOK) `Audit` kind CRAWLER tenantId'li yazılır.
 *
 *  - 20 s bütçe (Promise.race); süre dolarsa/hata olursa sessizce vazgeçilir (`ok:false`), onboarding bozulmaz.
 *  - PublicScan YAZILMAZ (kalıcı rapor/lead akışı public araçlara aittir); yasaklı host taranmaz.
 *  - Test ortamında (IAI_TEST_MODE) ağ çağrısı yapılmaz; `IAI_FIRST_SCAN_IN_TEST=1` ile (mock'lu testte) açılır.
 */
import type { Prisma } from '@independentai/db';
import { prisma } from './prisma';
import { log } from './logger';
import { isTestEnv } from './env';
import { findBlockedSite } from './blocklist';
import { normalizeScanUrl } from './commerce/public-scan';
import { runCrawlerAudit, type CrawlerAuditResult } from './commerce/crawler-audit';
import type { CommerceFinding, Recommendation } from './commerce/scoring';

export const FIRST_SCAN_BUDGET_MS = 20_000;

export type FirstScanOutcome =
  | { ok: true; auditId: string; score: number }
  | { ok: false; reason: 'no_website' | 'invalid_url' | 'blocked' | 'timeout' | 'failed' | 'test_env' };

/**
 * Tenant'ın web sitesini tarar ve Audit(CRAWLER, tenantId) yazar. Hiçbir durumda fırlatmaz.
 * `opts.run` yalnız test enjeksiyonu içindir (varsayılan `runCrawlerAudit`).
 */
export async function runFirstSiteScan(
  tenantId: string,
  website: string | null | undefined,
  opts: { run?: (url: string) => Promise<CrawlerAuditResult>; budgetMs?: number } = {},
): Promise<FirstScanOutcome> {
  if (!website) return { ok: false, reason: 'no_website' };
  if (isTestEnv() && process.env.IAI_FIRST_SCAN_IN_TEST !== '1') return { ok: false, reason: 'test_env' };
  let url: string;
  let hostname: string;
  try {
    ({ url, hostname } = normalizeScanUrl(website));
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }
  try {
    if (await findBlockedSite(hostname)) return { ok: false, reason: 'blocked' };
    const run = opts.run ?? runCrawlerAudit;
    const budget = opts.budgetMs ?? FIRST_SCAN_BUDGET_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const result = await Promise.race([
      run(url),
      new Promise<'timeout'>((resolve) => {
        timer = setTimeout(() => resolve('timeout'), budget);
      }),
    ]).finally(() => clearTimeout(timer));
    if (result === 'timeout') {
      log.warn('first-scan.timeout', { tenantId, hostname, budget });
      return { ok: false, reason: 'timeout' };
    }
    const row = await prisma.audit.create({
      data: {
        tenantId,
        kind: 'CRAWLER',
        url: result.url,
        overallScore: result.score,
        breakdown: result.breakdown as Prisma.InputJsonValue,
        findings: result.findings as unknown as Prisma.InputJsonValue,
        recommendations: result.recommendations as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    log.info('first-scan.done', { tenantId, hostname, score: result.score });
    return { ok: true, auditId: row.id, score: result.score };
  } catch (err) {
    log.warn('first-scan.failed', { tenantId, hostname, err });
    return { ok: false, reason: 'failed' };
  }
}

export type FirstScanCardData = {
  auditId: string;
  url: string;
  hostname: string;
  score: number;
  createdAt: Date;
  verdict: { fail: number; warn: number; pass: number };
  recommendations: Recommendation[];
};

function isFinding(x: unknown): x is CommerceFinding {
  return !!x && typeof x === 'object' && typeof (x as CommerceFinding).status === 'string';
}

/** Panel kartı için tenant'ın en son CRAWLER denetimi (ilk tarama ya da sonraki panel taraması); yoksa null. */
export async function getFirstScan(tenantId: string): Promise<FirstScanCardData | null> {
  const row = await prisma.audit.findFirst({
    where: { tenantId, kind: 'CRAWLER' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, url: true, overallScore: true, findings: true, recommendations: true, createdAt: true },
  });
  if (!row) return null;
  const findings = Array.isArray(row.findings) ? (row.findings as unknown[]).filter(isFinding) : [];
  const verdict = { fail: 0, warn: 0, pass: 0 };
  for (const f of findings) if (f.status in verdict) verdict[f.status as keyof typeof verdict] += 1;
  const recs = Array.isArray(row.recommendations) ? (row.recommendations as unknown as Recommendation[]) : [];
  let hostname = row.url;
  try {
    hostname = new URL(row.url).hostname;
  } catch {
    /* ham url kalsın */
  }
  return {
    auditId: row.id,
    url: row.url,
    hostname,
    score: row.overallScore,
    createdAt: row.createdAt,
    verdict,
    recommendations: recs.filter((r) => r && typeof r.title === 'string').slice(0, 3),
  };
}
