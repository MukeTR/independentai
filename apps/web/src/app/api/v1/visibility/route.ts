import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { authenticateToken } from '@/server/api-token';
import { getDashboardMetrics } from '@/server/repo';
import { getTopCitationSources } from '@/server/insights';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';

/**
 * Public API v1 — salt-okunur görünürlük verisi.
 *   GET /api/v1/visibility?days=30   Authorization: Bearer iai_live_...
 * Limit: token başına 60 istek/dk (X-RateLimit-* başlıkları). Dokümantasyon: /docs/api
 * CORS: tarayıcıdan token kullanımı önerilmez; yine de GET için `*` izin verilir (token gizli kalmalı).
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export const GET = route('v1.visibility', async (req) => {
  const actor = await authenticateToken(req.headers.get('authorization'), 'read:visibility');
  const rl = await enforceRateLimit(req, LIMITS.apiV1, `token:${actor.tokenId}`);

  const raw = Number(new URL(req.url).searchParams.get('days') ?? 30);
  const days = Number.isFinite(raw) ? Math.min(90, Math.max(1, Math.floor(raw))) : 30;
  const [metrics, citationSources] = await Promise.all([
    getDashboardMetrics(actor.tenantId, days),
    getTopCitationSources(actor.tenantId, days),
  ]);

  return NextResponse.json(
    {
      window_days: days,
      generated_at: new Date().toISOString(),
      visibility_score: metrics.visibilityScore,
      share_of_voice: metrics.shareOfVoice,
      total_runs: metrics.totalRuns,
      errored_runs: metrics.erroredRuns,
      total_mentions: metrics.totalMentions,
      trend: metrics.trend,
      by_provider: metrics.byProvider,
      competitors: metrics.competitorBreakdown,
      top_citation_sources: citationSources,
      definitions: {
        visibility_score: 'own-brand-mentioned SUCCESS runs / SUCCESS runs × 100',
        share_of_voice: 'own mentions / (own + competitor mentions) × 100; errored runs excluded',
      },
    },
    { headers: { ...CORS, ...rl } },
  );
});
