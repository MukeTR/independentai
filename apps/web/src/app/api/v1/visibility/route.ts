import { NextRequest, NextResponse } from 'next/server';
import { authenticateToken } from '@/server/api-token';
import { getDashboardMetrics } from '@/server/repo';
import { getTopCitationSources } from '@/server/insights';

/**
 * Public API v1 — Bearer API token ile tenant görünürlük verisini döndürür.
 * Örnek: curl -H "Authorization: Bearer iai_live_xxx" https://independentai.space/api/v1/visibility
 */
export async function GET(req: NextRequest) {
  try {
    const tenantId = await authenticateToken(req.headers.get('authorization'));
    if (!tenantId) {
      return NextResponse.json({ message: 'Geçersiz veya eksik API token' }, { status: 401 });
    }

    const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get('days')) || 30));
    const [metrics, citationSources] = await Promise.all([
      getDashboardMetrics(tenantId, days),
      getTopCitationSources(tenantId, days),
    ]);

    return NextResponse.json({
      window_days: days,
      visibility_score: metrics.visibilityScore,
      share_of_voice: metrics.shareOfVoice,
      total_runs: metrics.totalRuns,
      total_mentions: metrics.totalMentions,
      trend: metrics.trend,
      by_provider: metrics.byProvider,
      competitors: metrics.competitorBreakdown,
      top_citation_sources: citationSources,
    });
  } catch (err) {
    console.error('[api/v1/visibility]', err);
    return NextResponse.json({ message: 'İşlem sırasında bir hata oluştu' }, { status: 500 });
  }
}
