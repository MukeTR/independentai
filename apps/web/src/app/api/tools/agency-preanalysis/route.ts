import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { enforceRateLimit } from '@/server/rate-limit';
import { hydrateEnvFromConfig } from '@/server/system-config';
import { runGeoAudit, normalizeAuditUrl, type AuditFinding } from '@/server/geo-audit';
import { parsePublicUrl, safeFetch, UnsafeUrlError } from '@/server/safe-fetch';
import { detectPlatform, PLATFORM_LABELS } from '@/server/commerce/platform-detect';
import type { PreanalysisItem } from '@/lib/preanalysis-types';

export const maxDuration = 60;

const MAX_DOMAINS = 3;
const HOST_RE = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;
const LIMIT = {
  name: 'agency-preanalysis',
  limit: 3,
  windowMs: 3_600_000,
  global: { limit: 100, windowMs: 3_600_000 },
};

function normalizeDomain(raw: unknown): string {
  if (typeof raw !== 'string') throw new ClientError('Alan adı metin olmalı');
  let s = raw.trim().toLowerCase();
  if (!s) throw new ClientError('Alan adı boş olamaz');
  s =
    s
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split(/[/?#]/)[0] ?? '';
  if (!HOST_RE.test(s)) throw new ClientError(`Geçersiz alan adı: ${raw.slice(0, 60)}`);
  return s;
}

/** Bulgular: önce "fail", sonra "warn"; ilk 3. */
function topFindings(findings: AuditFinding[], n = 3): AuditFinding[] {
  const rank: Record<AuditFinding['status'], number> = { fail: 0, warn: 1, pass: 2 };
  return [...findings].sort((a, b) => rank[a.status] - rank[b.status]).slice(0, n);
}

/**
 * Ajans ön-analizi (public, e-posta duvarı yok): ≤3 alan adı → GEO skoru + platform tespiti + ilk 3
 * bulgu. Kalıcı kayıt yok (PublicScan/Audit yazılmaz). IP başına 3/saat, küresel 100/saat.
 */
export const POST = route('tools.agency_preanalysis', async (req) => {
  await enforceRateLimit(req, LIMIT);
  const body = await readJson<{ domains?: unknown }>(req);
  if (!Array.isArray(body.domains) || body.domains.length === 0) throw new ClientError('En az bir alan adı girin');
  if (body.domains.length > MAX_DOMAINS) throw new ClientError(`En fazla ${MAX_DOMAINS} alan adı`);
  const domains = [...new Set(body.domains.map(normalizeDomain))];

  await hydrateEnvFromConfig();
  const results: PreanalysisItem[] = await Promise.all(
    domains.map(async (domain) => {
      const url = normalizeAuditUrl(domain);
      try {
        parsePublicUrl(url);
      } catch (err) {
        throw new ClientError(err instanceof UnsafeUrlError ? err.message : 'Geçersiz URL');
      }
      const [audit, page] = await Promise.all([runGeoAudit(url), safeFetch(url, { timeout: 8_000 }).catch(() => null)]);
      const det =
        page && page.ok ? detectPlatform(page.text, page.headers, page.url) : detectPlatform('', new Headers(), url);
      return {
        domain,
        url: audit.url,
        score: audit.overallScore,
        breakdown: audit.breakdown,
        platform: {
          platform: det.platform,
          label: PLATFORM_LABELS[det.platform],
          confidence: Math.round(det.confidence * 100) / 100,
          connectorAvailable: det.connectorAvailable,
        },
        findings: topFindings(audit.findings),
        fetched: !!(page && page.ok),
      };
    }),
  );
  return NextResponse.json({ results, generatedAt: new Date().toISOString() });
});
