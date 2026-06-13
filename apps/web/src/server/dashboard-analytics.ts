/**
 * Kapsamlı dashboard analitiği — izlenen tüm detaylardan (ModelRun, BrandMention,
 * Citation) tek geçişte zengin metrik seti üretir. Yeni "command center" dashboard'u besler.
 */
import { prisma } from './prisma';
import { PROVIDER_LABELS } from '@independentai/shared';

const SENTIMENT_SCORE = { POSITIVE: 100, NEUTRAL: 50, NEGATIVE: 0 } as const;

export type ComprehensiveAnalytics = {
  hasData: boolean;
  window: number;
  kpis: {
    visibility: number;
    visibilityPrev: number;
    sov: number;
    sovPrev: number;
    totalRuns: number;
    totalMentions: number;
    avgPosition: number; // kendi markanın ortalama sırası (düşük = iyi)
    recommendRate: number; // kendi bahislerinin % kaçı RECOMMENDED
  };
  trend: { date: string; visibility: number; sov: number }[];
  byProvider: { provider: string; visibility: number; mentions: number; avgPosition: number; runs: number }[];
  sentiment: { positive: number; neutral: number; negative: number };
  sentimentTrend: { date: string; positive: number; neutral: number; negative: number }[];
  mentionTypes: { type: string; label: string; count: number }[];
  positionHistogram: { bucket: string; count: number }[];
  competitors: { name: string; mentions: number; sov: number; sentiment: number; avgPosition: number }[];
  promptPerformance: {
    id: string;
    text: string;
    category: string | null;
    runs: number;
    visibility: number;
    avgPosition: number | null;
    sparkline: number[];
  }[];
  categoryBreakdown: { category: string; visibility: number; runs: number }[];
  health: { errorRate: number; mockRate: number; avgLatencyMs: number; totalCostUsd: number };
  activity: {
    id: string;
    date: string;
    provider: string;
    promptText: string;
    ownMentioned: boolean;
    position: number | null;
    sentiment: string | null;
  }[];
};

const MENTION_TYPE_LABELS: Record<string, string> = {
  RECOMMENDED: 'Önerildi',
  LISTED: 'Listelendi',
  COMPARED: 'Karşılaştırıldı',
  PASSING: 'Geçerken',
};

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getComprehensiveAnalytics(tenantId: string, days = 30): Promise<ComprehensiveAnalytics> {
  const now = Date.now();
  const since = new Date(now - days * 86400000);
  const prevSince = new Date(now - 2 * days * 86400000);

  // Tek sorgu: mevcut + önceki pencere (delta için), mention + prompt dahil
  const allRuns = await prisma.modelRun.findMany({
    where: { prompt: { tenantId }, runDate: { gte: prevSince } },
    include: {
      mentions: true,
      prompt: { select: { id: true, text: true, category: true } },
    },
    orderBy: { runDate: 'desc' },
  });

  const runs = allRuns.filter((r) => r.runDate >= since);
  const prevRuns = allRuns.filter((r) => r.runDate < since);
  const validRuns = runs.filter((r) => !r.errorMessage);

  const empty = validRuns.length === 0;

  // ---- KPI: visibility & SoV (mevcut + önceki) ----
  const visOf = (rs: typeof runs) => {
    const valid = rs.filter((r) => !r.errorMessage);
    if (!valid.length) return 0;
    const withOwn = valid.filter((r) => r.mentions.some((m) => m.isOwnBrand)).length;
    return Math.round((withOwn / valid.length) * 100);
  };
  const sovOf = (rs: typeof runs) => {
    const ms = rs.flatMap((r) => r.mentions);
    const own = ms.filter((m) => m.isOwnBrand).length;
    const comp = ms.filter((m) => m.isCompetitor).length;
    return own + comp > 0 ? Math.round((own / (own + comp)) * 100) : 0;
  };

  const ownMentions = validRuns.flatMap((r) => r.mentions).filter((m) => m.isOwnBrand);
  const avgPosition = ownMentions.length
    ? Math.round((ownMentions.reduce((s, m) => s + m.position, 0) / ownMentions.length) * 10) / 10
    : 0;
  const recommendRate = ownMentions.length
    ? Math.round((ownMentions.filter((m) => m.mentionType === 'RECOMMENDED').length / ownMentions.length) * 100)
    : 0;

  // ---- Trend (günlük visibility + sov) ----
  const byDay = new Map<string, { withOwn: number; total: number; own: number; comp: number }>();
  for (const r of validRuns) {
    const k = dayKey(r.runDate);
    const b = byDay.get(k) ?? { withOwn: 0, total: 0, own: 0, comp: 0 };
    b.total += 1;
    if (r.mentions.some((m) => m.isOwnBrand)) b.withOwn += 1;
    b.own += r.mentions.filter((m) => m.isOwnBrand).length;
    b.comp += r.mentions.filter((m) => m.isCompetitor).length;
    byDay.set(k, b);
  }
  const trend = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => ({
      date,
      visibility: b.total ? Math.round((b.withOwn / b.total) * 100) : 0,
      sov: b.own + b.comp ? Math.round((b.own / (b.own + b.comp)) * 100) : 0,
    }));

  // ---- Provider kırılımı ----
  const provMap = new Map<string, { withOwn: number; total: number; mentions: number; posSum: number; posN: number }>();
  for (const r of validRuns) {
    const key = r.provider;
    const b = provMap.get(key) ?? { withOwn: 0, total: 0, mentions: 0, posSum: 0, posN: 0 };
    b.total += 1;
    const own = r.mentions.filter((m) => m.isOwnBrand);
    if (own.length) b.withOwn += 1;
    b.mentions += own.length;
    for (const m of own) {
      b.posSum += m.position;
      b.posN += 1;
    }
    provMap.set(key, b);
  }
  const byProvider = [...provMap.entries()].map(([provider, b]) => ({
    provider: PROVIDER_LABELS[provider as keyof typeof PROVIDER_LABELS] ?? provider,
    visibility: b.total ? Math.round((b.withOwn / b.total) * 100) : 0,
    mentions: b.mentions,
    avgPosition: b.posN ? Math.round((b.posSum / b.posN) * 10) / 10 : 0,
    runs: b.total,
  }));

  // ---- Sentiment (kendi marka) ----
  const sentiment = { positive: 0, neutral: 0, negative: 0 };
  for (const m of ownMentions) {
    if (m.sentiment === 'POSITIVE') sentiment.positive += 1;
    else if (m.sentiment === 'NEGATIVE') sentiment.negative += 1;
    else sentiment.neutral += 1;
  }

  // ---- Sentiment trend ----
  const sentByDay = new Map<string, { positive: number; neutral: number; negative: number }>();
  for (const r of validRuns) {
    const k = dayKey(r.runDate);
    const b = sentByDay.get(k) ?? { positive: 0, neutral: 0, negative: 0 };
    for (const m of r.mentions.filter((x) => x.isOwnBrand)) {
      if (m.sentiment === 'POSITIVE') b.positive += 1;
      else if (m.sentiment === 'NEGATIVE') b.negative += 1;
      else b.neutral += 1;
    }
    sentByDay.set(k, b);
  }
  const sentimentTrend = [...sentByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => ({ date, ...b }));

  // ---- Mention type kırılımı (kendi marka) ----
  const mtMap = new Map<string, number>();
  for (const m of ownMentions) mtMap.set(m.mentionType, (mtMap.get(m.mentionType) ?? 0) + 1);
  const mentionTypes = ['RECOMMENDED', 'LISTED', 'COMPARED', 'PASSING'].map((t) => ({
    type: t,
    label: MENTION_TYPE_LABELS[t] ?? t,
    count: mtMap.get(t) ?? 0,
  }));

  // ---- Pozisyon histogramı (kendi marka) ----
  const posMap = new Map<string, number>();
  for (const m of ownMentions) {
    const bucket = m.position >= 6 ? '6+' : String(m.position);
    posMap.set(bucket, (posMap.get(bucket) ?? 0) + 1);
  }
  const positionHistogram = ['1', '2', '3', '4', '5', '6+'].map((bucket) => ({ bucket, count: posMap.get(bucket) ?? 0 }));

  // ---- Rakip lider tablosu ----
  type C = { mentions: number; sentSum: number; posSum: number; posN: number };
  const compMap = new Map<string, C>();
  let totalCompMentions = 0;
  for (const r of validRuns) {
    for (const m of r.mentions.filter((x) => x.isCompetitor)) {
      const c = compMap.get(m.mentionName) ?? { mentions: 0, sentSum: 0, posSum: 0, posN: 0 };
      c.mentions += 1;
      c.sentSum += SENTIMENT_SCORE[m.sentiment as keyof typeof SENTIMENT_SCORE] ?? 50;
      c.posSum += m.position;
      c.posN += 1;
      compMap.set(m.mentionName, c);
      totalCompMentions += 1;
    }
  }
  const ownTotal = ownMentions.length;
  const sovDenom = ownTotal + totalCompMentions || 1;
  const competitors = [...compMap.entries()]
    .map(([name, c]) => ({
      name,
      mentions: c.mentions,
      sov: Math.round((c.mentions / sovDenom) * 100),
      sentiment: c.mentions ? Math.round(c.sentSum / c.mentions) : 0,
      avgPosition: c.posN ? Math.round((c.posSum / c.posN) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 10);

  // ---- Prompt performansı + sparkline ----
  type P = { text: string; category: string | null; runs: number; withOwn: number; posSum: number; posN: number; daily: Map<string, { w: number; t: number }> };
  const promptMap = new Map<string, P>();
  for (const r of validRuns) {
    const p =
      promptMap.get(r.prompt.id) ??
      { text: r.prompt.text, category: r.prompt.category, runs: 0, withOwn: 0, posSum: 0, posN: 0, daily: new Map() };
    p.runs += 1;
    const own = r.mentions.filter((m) => m.isOwnBrand);
    if (own.length) p.withOwn += 1;
    for (const m of own) {
      p.posSum += m.position;
      p.posN += 1;
    }
    const k = dayKey(r.runDate);
    const d = p.daily.get(k) ?? { w: 0, t: 0 };
    d.t += 1;
    if (own.length) d.w += 1;
    p.daily.set(k, d);
    promptMap.set(r.prompt.id, p);
  }
  const promptPerformance = [...promptMap.entries()]
    .map(([id, p]) => ({
      id,
      text: p.text,
      category: p.category,
      runs: p.runs,
      visibility: p.runs ? Math.round((p.withOwn / p.runs) * 100) : 0,
      avgPosition: p.posN ? Math.round((p.posSum / p.posN) * 10) / 10 : null,
      sparkline: [...p.daily.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, d]) => (d.t ? Math.round((d.w / d.t) * 100) : 0)),
    }))
    .sort((a, b) => b.visibility - a.visibility);

  // ---- Kategori kırılımı ----
  const catMap = new Map<string, { withOwn: number; total: number }>();
  for (const r of validRuns) {
    const cat = r.prompt.category || 'diğer';
    const b = catMap.get(cat) ?? { withOwn: 0, total: 0 };
    b.total += 1;
    if (r.mentions.some((m) => m.isOwnBrand)) b.withOwn += 1;
    catMap.set(cat, b);
  }
  const categoryBreakdown = [...catMap.entries()].map(([category, b]) => ({
    category,
    visibility: b.total ? Math.round((b.withOwn / b.total) * 100) : 0,
    runs: b.total,
  }));

  // ---- Sağlık / ops ----
  const errored = runs.filter((r) => r.errorMessage).length;
  const mocked = runs.filter((r) => r.isMocked).length;
  const latencies = validRuns.map((r) => r.latencyMs ?? 0).filter((x) => x > 0);
  const health = {
    errorRate: runs.length ? Math.round((errored / runs.length) * 100) : 0,
    mockRate: runs.length ? Math.round((mocked / runs.length) * 100) : 0,
    avgLatencyMs: latencies.length ? Math.round(latencies.reduce((s, x) => s + x, 0) / latencies.length) : 0,
    totalCostUsd: Math.round(validRuns.reduce((s, r) => s + (r.costUsd ?? 0), 0) * 10000) / 10000,
  };

  // ---- Aktivite akışı ----
  const activity = validRuns.slice(0, 20).map((r) => {
    const own = r.mentions.find((m) => m.isOwnBrand);
    return {
      id: r.id,
      date: r.runDate.toISOString(),
      provider: PROVIDER_LABELS[r.provider as keyof typeof PROVIDER_LABELS] ?? r.provider,
      promptText: r.prompt.text,
      ownMentioned: !!own,
      position: own?.position ?? null,
      sentiment: own?.sentiment ?? null,
    };
  });

  return {
    hasData: !empty,
    window: days,
    kpis: {
      visibility: visOf(runs),
      visibilityPrev: visOf(prevRuns),
      sov: sovOf(runs),
      sovPrev: sovOf(prevRuns),
      totalRuns: runs.length,
      totalMentions: validRuns.flatMap((r) => r.mentions).length,
      avgPosition,
      recommendRate,
    },
    trend,
    byProvider,
    sentiment,
    sentimentTrend,
    mentionTypes,
    positionHistogram,
    competitors,
    promptPerformance,
    categoryBreakdown,
    health,
    activity,
  };
}
