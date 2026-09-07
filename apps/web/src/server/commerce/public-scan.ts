/**
 * Herkese açık tarama uçlarının ortak omurgası (e-ticaret görünürlük, ürün sayfası, AI crawler).
 *
 *  - Rate limit: giriş varsa tenant bazlı `LIMITS.tool`; yoksa IP 10/saat + küresel 500/saat.
 *  - URL doğrulama: normalize → parsePublicUrl (SSRF); ham URL saklanmaz, sha256 hash'i saklanır.
 *  - Önbellek: aynı urlHash+kind için 10 dk içinde PublicScan varsa `cached:true` ile döner
 *    (aynı mağazayı arka arkaya tarayan kullanıcı/paylaşım linki için maliyet sigortası).
 *  - Kalıcılık: Audit (kind, tenantId nullable) + PublicScan (expiresAt +30 gün). Yazma hatası
 *    sonucu engellemez (loglanır).
 */
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { AuditKind, Prisma } from '@independentai/db';
import { prisma } from '../prisma';
import { getActor } from '../authz';
import { ClientError, readJson } from '../errors';
import { enforceRateLimit, LIMITS, type LimitSpec } from '../rate-limit';
import { log } from '../logger';
import { parsePublicUrl, UnsafeUrlError } from '../safe-fetch';
import type { CommerceFinding, Recommendation } from './scoring';

export type PublicScanKind = Extract<AuditKind, 'COMMERCE' | 'PRODUCT_PAGE' | 'CRAWLER'>;

/** Public tarama limitleri (IP başına 10/saat, küresel 500/saat). */
export const PUBLIC_SCAN_LIMITS: Record<PublicScanKind, LimitSpec> = {
  COMMERCE: {
    name: 'ecommerce-visibility',
    limit: 10,
    windowMs: 3_600_000,
    global: { limit: 500, windowMs: 3_600_000 },
  },
  PRODUCT_PAGE: { name: 'product-page', limit: 10, windowMs: 3_600_000, global: { limit: 500, windowMs: 3_600_000 } },
  CRAWLER: { name: 'ai-crawler', limit: 10, windowMs: 3_600_000, global: { limit: 500, windowMs: 3_600_000 } },
};
/** Ürün yazıcı: LLM maliyeti → daha sıkı (IP 5/saat, küresel 100/saat). */
export const PRODUCT_WRITER_LIMIT: LimitSpec = {
  name: 'product-writer',
  limit: 5,
  windowMs: 3_600_000,
  global: { limit: 100, windowMs: 3_600_000 },
};

export const SCAN_CACHE_MS = 10 * 60_000;
export const SCAN_RETENTION_MS = 30 * 86_400_000;

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

export type ScanEnvelope<T> = T & { cached: boolean; scanId?: string };

type ScanResultLike = {
  url: string;
  score: number;
  breakdown: Record<string, number>;
  findings: CommerceFinding[];
  recommendations: Recommendation[];
};

/**
 * POST {url} gövdesini okuyan, limit/doğrulama/önbellek/kalıcılık uygulayan ortak akış.
 * `run` yalnızca doğrulanmış URL ile çağrılır.
 */
export async function handlePublicScan<T extends ScanResultLike>(
  req: Request,
  kind: PublicScanKind,
  run: (url: string) => Promise<T>,
): Promise<NextResponse> {
  const actor = await getActor();
  const headers = actor
    ? await enforceRateLimit(req, LIMITS.tool, `tenant:${actor.tenantId}`)
    : await enforceRateLimit(req, PUBLIC_SCAN_LIMITS[kind]);

  const body = await readJson<{ url?: unknown }>(req);
  const { url, hostname, urlHash } = normalizeScanUrl(body.url);

  // Önbellek: 10 dk içinde aynı URL+tür
  const since = new Date(Date.now() - SCAN_CACHE_MS);
  try {
    const hit = await prisma.publicScan.findFirst({
      where: { urlHash, kind, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, result: true },
    });
    if (hit && hit.result && typeof hit.result === 'object') {
      return NextResponse.json({ ...(hit.result as object), cached: true, scanId: hit.id }, { headers });
    }
  } catch (err) {
    log.warn('public-scan.cache_lookup_failed', { kind, err });
  }

  const result = await run(url);

  let scanId: string | undefined;
  try {
    const [, scan] = await prisma.$transaction([
      prisma.audit.create({
        data: {
          tenantId: actor?.tenantId ?? null,
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
          expiresAt: new Date(Date.now() + SCAN_RETENTION_MS),
        },
        select: { id: true },
      }),
    ]);
    scanId = scan.id;
  } catch (err) {
    log.error('public-scan.persist_failed', { kind, err });
  }
  return NextResponse.json({ ...result, cached: false, ...(scanId ? { scanId } : {}) }, { headers });
}
