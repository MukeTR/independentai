import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import type { DashboardMetrics } from '@independentai/shared';
import { PROVIDER_LABELS } from '@independentai/shared';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async metrics(tenantId: string, days = 30): Promise<DashboardMetrics> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const runs = await this.prisma.modelRun.findMany({
      where: { prompt: { tenantId }, runDate: { gte: since } },
      include: { mentions: true },
    });

    const totalRuns = runs.length;
    const runsWithOwn = runs.filter((r) => r.mentions.some((m) => m.isOwnBrand)).length;
    const visibilityScore = totalRuns ? Math.round((runsWithOwn / totalRuns) * 100) : 0;

    const allMentions = runs.flatMap((r) => r.mentions);
    const ownMentions = allMentions.filter((m) => m.isOwnBrand).length;
    const compMentions = allMentions.filter((m) => m.isCompetitor).length;
    const shareOfVoice = ownMentions + compMentions > 0
      ? Math.round((ownMentions / (ownMentions + compMentions)) * 100)
      : 0;

    // Trend: gün gün visibility
    const byDay = new Map<string, { withOwn: number; total: number }>();
    for (const r of runs) {
      const key = r.runDate.toISOString().slice(0, 10);
      const bucket = byDay.get(key) ?? { withOwn: 0, total: 0 };
      bucket.total += 1;
      if (r.mentions.some((m) => m.isOwnBrand)) bucket.withOwn += 1;
      byDay.set(key, bucket);
    }
    const trend = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, b]) => ({
        date,
        visibility: b.total ? Math.round((b.withOwn / b.total) * 100) : 0,
      }));

    // Competitor breakdown
    const compMap = new Map<string, number>();
    for (const m of allMentions) {
      if (!m.isCompetitor) continue;
      compMap.set(m.mentionName, (compMap.get(m.mentionName) ?? 0) + 1);
    }
    const competitorBreakdown = [...compMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // By provider
    const provMap = new Map<string, { withOwn: number; total: number }>();
    for (const r of runs) {
      const key = r.provider;
      const bucket = provMap.get(key) ?? { withOwn: 0, total: 0 };
      bucket.total += 1;
      if (r.mentions.some((m) => m.isOwnBrand)) bucket.withOwn += 1;
      provMap.set(key, bucket);
    }
    const byProvider = [...provMap.entries()].map(([provider, b]) => ({
      provider: PROVIDER_LABELS[provider as keyof typeof PROVIDER_LABELS] ?? provider,
      visibility: b.total ? Math.round((b.withOwn / b.total) * 100) : 0,
    }));

    return {
      visibilityScore,
      shareOfVoice,
      totalRuns,
      totalMentions: allMentions.length,
      trend,
      competitorBreakdown,
      byProvider,
    };
  }
}
