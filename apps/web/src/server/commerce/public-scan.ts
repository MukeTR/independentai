/**
 * Herkese açık tarama uçlarının ortak omurgası (14 tür: e-ticaret 3'lüsü + 11 site aracı).
 *
 *  - Rate limit: giriş varsa tenant bazlı `LIMITS.tool`; yoksa IP + küresel (`PUBLIC_SCAN_LIMITS[kind]`).
 *    Ek olarak hedef site başına saatlik tavan (`SCAN_POLICY[kind].hostLimitPerHour`) → 429.
 *  - URL doğrulama: normalize → parsePublicUrl (SSRF); ham URL saklanmaz, `urlHash = sha256(url|kind|sector|competitorUrl)`.
 *  - Yasaklı site: ana (ve rakip) hostname listede ise 200 `{blocked:true, redirectUrl}`; fetch/persist yok, hits++.
 *  - Önbellek: aynı urlHash+kind için `SCAN_POLICY[kind].cacheMs` içinde PublicScan varsa `cached:true` (aynı token).
 *  - Kalıcılık: Audit (kind, tenantId nullable) + PublicScan (visitorHash pseudonim, sector, meta, partial; +30 gün)
 *    + Lead upsert (hostname + skor; PII yok). Yazma hatası sonucu engellemez (loglanır).
 *  - Zarf: `{...result, cached, scanId, reportToken, reportUrl, fetchedAt}`; rapor token'ı HMAC (report-token.ts).
 */
import { createHash } from 'node:crypto';
import { NextResponse, after } from 'next/server';
import type { AuditKind, Prisma } from '@independentai/db';
import { prisma } from '../prisma';
import { getActor } from '../authz';
import { ClientError, RateLimitedError, readJson } from '../errors';
import { consume, enforceRateLimit, LIMITS, type LimitSpec } from '../rate-limit';
import { log } from '../logger';
import { parsePublicUrl, UnsafeUrlError } from '../safe-fetch';
import { siteUrl } from '../env';
import { blockedJson, findBlockedSite } from '../blocklist';
import { upsertLeadFromScan } from '../leads';
import { signReportToken } from '../report-token';
import { touchAgencySignal } from '../agency-signal';
import { visitorHashFor } from '../visitor';
import { isSectorSlug } from '@/lib/tool-registry';
import type { CommerceFinding, Recommendation } from './scoring';

export type PublicScanKind = Extract<
  AuditKind,
  | 'COMMERCE'
  | 'PRODUCT_PAGE'
  | 'CRAWLER'
  | 'ONPAGE_SEO'
  | 'SOCIAL_PREVIEW'
  | 'SECURITY_HEADERS'
  | 'REDIRECTS'
  | 'BROKEN_LINKS'
  | 'ROBOTS_SITEMAP'
  | 'HREFLANG'
  | 'SCHEMA_AUDIT'
  | 'QUESTION_COVERAGE'
  | 'TRUST_SIGNALS'
  | 'COMPARE'
>;

const HOUR = 3_600_000;
const single = (name: string): LimitSpec => ({
  name,
  limit: 10,
  windowMs: HOUR,
  global: { limit: 500, windowMs: HOUR },
});
const multi = (name: string): LimitSpec => ({ name, limit: 5, windowMs: HOUR, global: { limit: 200, windowMs: HOUR } });

/** Public tarama limitleri — tek sayfalı araçlar IP 10/saat + küresel 500; çok istekli araçlar 5/saat + 200. */
export const PUBLIC_SCAN_LIMITS: Record<PublicScanKind, LimitSpec> = {
  COMMERCE: single('ecommerce-visibility'),
  PRODUCT_PAGE: single('product-page'),
  CRAWLER: single('ai-crawler'),
  ONPAGE_SEO: single('seo-karnesi'),
  SOCIAL_PREVIEW: single('whatsapp-onizleme'),
  SECURITY_HEADERS: single('guvenlik-basliklari'),
  REDIRECTS: single('yonlendirme-zinciri'),
  SCHEMA_AUDIT: single('schema-denetimi'),
  TRUST_SIGNALS: single('guven-sinyalleri'),
  BROKEN_LINKS: multi('kirik-link-bulucu'),
  ROBOTS_SITEMAP: multi('robots-sitemap-kontrol'),
  HREFLANG: multi('hreflang-kontrol'),
  QUESTION_COVERAGE: multi('musteriniz-nasil-soruyor'),
  COMPARE: multi('rakip-kiyas'),
};
/** Ürün yazıcı: LLM maliyeti → daha sıkı (IP 5/saat, küresel 100/saat). */
export const PRODUCT_WRITER_LIMIT: LimitSpec = {
  name: 'product-writer',
  limit: 5,
  windowMs: HOUR,
  global: { limit: 100, windowMs: HOUR },
};

/** Eski 3 tür 10 dk önbellek (paylaşım linki/ardışık tarama sigortası); yeni 11 tür 24 saat. */
export const SCAN_CACHE_MS = 10 * 60_000;
export const SCAN_RETENTION_MS = 30 * 86_400_000;
const DAY = 86_400_000;

export type ScanPolicy = { cacheMs: number; hostLimitPerHour: number };
export const SCAN_POLICY: Record<PublicScanKind, ScanPolicy> = {
  COMMERCE: { cacheMs: SCAN_CACHE_MS, hostLimitPerHour: 12 },
  PRODUCT_PAGE: { cacheMs: SCAN_CACHE_MS, hostLimitPerHour: 12 },
  CRAWLER: { cacheMs: SCAN_CACHE_MS, hostLimitPerHour: 12 },
  ONPAGE_SEO: { cacheMs: DAY, hostLimitPerHour: 12 },
  SOCIAL_PREVIEW: { cacheMs: DAY, hostLimitPerHour: 12 },
  SECURITY_HEADERS: { cacheMs: DAY, hostLimitPerHour: 12 },
  REDIRECTS: { cacheMs: DAY, hostLimitPerHour: 12 },
  SCHEMA_AUDIT: { cacheMs: DAY, hostLimitPerHour: 12 },
  TRUST_SIGNALS: { cacheMs: DAY, hostLimitPerHour: 12 },
  BROKEN_LINKS: { cacheMs: DAY, hostLimitPerHour: 6 },
  ROBOTS_SITEMAP: { cacheMs: DAY, hostLimitPerHour: 6 },
  HREFLANG: { cacheMs: DAY, hostLimitPerHour: 6 },
  QUESTION_COVERAGE: { cacheMs: DAY, hostLimitPerHour: 6 },
  COMPARE: { cacheMs: DAY, hostLimitPerHour: 6 },
};

const TRACKING_PARAMS = /^(utm_|fbclid|gclid|yclid|mc_|ref$|_ga$)/i;

/**
 * Kullanıcı URL'sini normalize eder: şema ekler, host küçültür, fragment ve takip parametrelerini
 * atar, sondaki / sadeleştirir. Güvensizse ClientError (fetch yapmaz).
 */
export function normalizeScanUrl(raw: unknown): { url: string; hostname: string; urlHash: string } {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (s.length < 3 || s.length > 300) throw new ClientError('Geçersiz URL');
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    throw new ClientError('Geçersiz URL');
  }
  u.hostname = u.hostname.toLowerCase();
  u.hash = '';
  for (const k of [...u.searchParams.keys()]) if (TRACKING_PARAMS.test(k)) u.searchParams.delete(k);
  if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, '');
  if (!u.hostname.includes('.')) throw new ClientError('Geçersiz alan adı');
  try {
    parsePublicUrl(u.toString());
  } catch (err) {
    throw new ClientError(err instanceof UnsafeUrlError ? err.message : 'Geçersiz URL');
  }
  const url = u.toString();
  return { url, hostname: u.hostname, urlHash: createHash('sha256').update(url).digest('hex') };
}

/** Önbellek/kalıcılık anahtarı: url|kind|sector|competitorUrl (ham URL saklanmaz). */
export function scanUrlHash(url: string, kind: PublicScanKind, input: ScanInput = {}): string {
  return createHash('sha256')
    .update(`${url}|${kind}|${input.sector ?? ''}|${input.competitorUrl ?? ''}`)
    .digest('hex');
}

export type ScanInput = { sector?: string; competitorUrl?: string };

export type ScanEnvelope<T> = T & {
  cached: boolean;
  scanId?: string;
  reportToken?: string;
  reportUrl?: string;
  fetchedAt?: string;
};

export type ScanResultLike = {
  url: string;
  score: number;
  breakdown: Record<string, number>;
  findings: CommerceFinding[];
  recommendations: Recommendation[];
  fetchedAt?: string;
  partial?: boolean;
  waf?: boolean;
  platform?: { platform?: string } | null;
};

function platformOf(result: ScanResultLike): string | null {
  const p = result.platform && typeof result.platform === 'object' ? result.platform.platform : null;
  return typeof p === 'string' && p ? p : null;
}

function envelope<T extends ScanResultLike>(
  result: T,
  extra: { cached: boolean; scanId?: string; createdAt?: Date },
): ScanEnvelope<T> {
  const fetchedAt =
    typeof result.fetchedAt === 'string' ? result.fetchedAt : (extra.createdAt ?? new Date()).toISOString();
  if (!extra.scanId) return { ...result, cached: extra.cached, fetchedAt };
  const reportToken = signReportToken(extra.scanId);
  return {
    ...result,
    cached: extra.cached,
    scanId: extra.scanId,
    reportToken,
    reportUrl: `${siteUrl()}/rapor/${reportToken}`,
    fetchedAt,
  };
}

/** Sektör (SECTOR_SLUGS) ve rakip URL'si (normalize + SSRF) doğrulaması; geçersizde ClientError. */
function validateInput(raw: ScanInput): { input: ScanInput; competitorHostname: string | null } {
  const input: ScanInput = {};
  if (raw.sector !== undefined && raw.sector !== null && raw.sector !== '') {
    if (!isSectorSlug(raw.sector)) throw new ClientError('Geçersiz sektör');
    input.sector = raw.sector;
  }
  let competitorHostname: string | null = null;
  if (raw.competitorUrl !== undefined && raw.competitorUrl !== null && raw.competitorUrl !== '') {
    const c = normalizeScanUrl(raw.competitorUrl);
    input.competitorUrl = c.url;
    competitorHostname = c.hostname;
  }
  return { input, competitorHostname };
}

/**
 * POST {url, sector?, competitorUrl?} gövdesini okuyan, limit/doğrulama/yasaklı site/önbellek/kalıcılık uygulayan
 * ortak akış. `run` yalnızca doğrulanmış URL (ve doğrulanmış girdi) ile çağrılır.
 */
export async function handlePublicScan<T extends ScanResultLike>(
  req: Request,
  kind: PublicScanKind,
  run: (url: string, input: ScanInput) => Promise<T>,
  opts: { input?: (body: Record<string, unknown>) => ScanInput } = {},
): Promise<NextResponse> {
  const actor = await getActor();
  const headers = actor
    ? await enforceRateLimit(req, LIMITS.tool, `tenant:${actor.tenantId}`)
    : await enforceRateLimit(req, PUBLIC_SCAN_LIMITS[kind]);

  const body = await readJson<Record<string, unknown>>(req);
  const { url, hostname } = normalizeScanUrl(body.url);
  const { input, competitorHostname } = validateInput(opts.input?.(body) ?? {});

  // Yasaklı site: ana ve rakip host — fetch/persist yok, hits++ (MF-14)
  const blocked =
    (await findBlockedSite(hostname)) ?? (competitorHostname ? await findBlockedSite(competitorHostname) : null);
  if (blocked) return blockedJson(blocked, headers);

  // Hedef site başına saatlik tavan (bir siteyi taramaya boğmayı engeller)
  const policy = SCAN_POLICY[kind];
  const host = await consume(`scan-host:${kind}:${hostname}`, policy.hostLimitPerHour, HOUR);
  if (!host.allowed) {
    throw new RateLimitedError(
      'Bu site son bir saatte çok tarandı. Lütfen biraz sonra tekrar deneyin.',
      (host.resetAt.getTime() - Date.now()) / 1000,
      headers,
    );
  }

  const urlHash = scanUrlHash(url, kind, input);
  const tenantId = actor?.tenantId ?? null;
  let visitorHash: string | null = null;
  try {
    visitorHash = visitorHashFor(req);
  } catch (err) {
    log.warn('public-scan.visitor_hash_failed', { err });
  }

  // Önbellek: politika süresi içinde aynı urlHash+tür → aynı scanId/token
  const since = new Date(Date.now() - policy.cacheMs);
  try {
    const hit = await prisma.publicScan.findFirst({
      where: { urlHash, kind, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, result: true, createdAt: true, score: true },
    });
    if (hit && hit.result && typeof hit.result === 'object') {
      const cachedResult = hit.result as unknown as T;
      const out = envelope(cachedResult, { cached: true, scanId: hit.id, createdAt: hit.createdAt });
      try {
        await upsertLeadFromScan({
          hostname,
          kind,
          score: hit.score,
          platform: platformOf(cachedResult),
          sector: input.sector ?? null,
          tenantId,
          reportToken: out.reportToken ?? null,
        });
      } catch (err) {
        log.error('lead.persist_failed', { kind, err });
      }
      scheduleAgencyTouch({ visitorHash, tenantId, hostname });
      return NextResponse.json(out, { headers });
    }
  } catch (err) {
    log.warn('public-scan.cache_lookup_failed', { kind, err });
  }

  const result = await run(url, input);

  let scanId: string | undefined;
  try {
    const meta: Record<string, unknown> = {};
    if (competitorHostname) meta.competitorHostname = competitorHostname;
    if (typeof result.waf === 'boolean') meta.waf = result.waf;
    if (typeof result.partial === 'boolean') meta.partial = result.partial;
    const [, scan] = await prisma.$transaction([
      prisma.audit.create({
        data: {
          tenantId,
          kind,
          url: result.url,
          overallScore: result.score,
          breakdown: result.breakdown as Prisma.InputJsonValue,
          findings: result.findings as unknown as Prisma.InputJsonValue,
          recommendations: result.recommendations as unknown as Prisma.InputJsonValue,
        },
      }),
      prisma.publicScan.create({
        data: {
          kind,
          urlHash,
          hostname,
          score: result.score,
          result: result as unknown as Prisma.InputJsonValue,
          visitorHash,
          tenantId,
          sector: input.sector ?? null,
          meta: Object.keys(meta).length ? (meta as Prisma.InputJsonValue) : undefined,
          partial: result.partial === true,
          expiresAt: new Date(Date.now() + SCAN_RETENTION_MS),
        },
        select: { id: true },
      }),
    ]);
    scanId = scan.id;
  } catch (err) {
    log.error('public-scan.persist_failed', { kind, err });
  }

  const out = envelope(result, { cached: false, scanId });
  try {
    await upsertLeadFromScan({
      hostname,
      kind,
      score: result.score,
      platform: platformOf(result),
      sector: input.sector ?? null,
      tenantId,
      reportToken: out.reportToken ?? null,
    });
  } catch (err) {
    log.error('lead.persist_failed', { kind, err });
  }
  scheduleAgencyTouch({ visitorHash, tenantId, hostname });
  return NextResponse.json(out, { headers });
}

/** Yanıt gönderildikten sonra ajans sinyali; istek bağlamı dışında (ör. birim test) sessizce atlanır. */
function scheduleAgencyTouch(input: { visitorHash: string | null; tenantId: string | null; hostname: string }): void {
  try {
    after(async () => {
      try {
        await touchAgencySignal(input);
      } catch (err) {
        log.warn('agency-signal.touch_failed', { err });
      }
    });
  } catch (err) {
    log.warn('agency-signal.schedule_failed', { err });
  }
}
