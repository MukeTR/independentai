/**
 * GEO insight sorguları — Rekabet Radarı, Top Citation Sources, Görünürlük Boşluğu.
 * (Faz 1) Mevcut ModelRun / BrandMention / Citation verisinden türetilir.
 */
import type { GoalType } from '@independentai/db';
import { prisma } from './prisma';
import { PROVIDER_LABELS, SENTIMENT_SCORE } from '@independentai/shared';
import { contextTokens, meaningfulWords, wordMatchesTokens } from './discovery/attribution';

function sinceDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// ───────────────── Top Citation Sources ─────────────────

export type CitationSource = { domain: string; count: number };

export async function getTopCitationSources(tenantId: string, days = 30, limit = 12): Promise<CitationSource[]> {
  const rows = await prisma.citation.groupBy({
    by: ['domain'],
    where: { tenantId, runDate: { gte: sinceDays(days) } },
    _count: { domain: true },
    orderBy: { _count: { domain: 'desc' } },
    take: limit,
  });
  return rows.map((r) => ({ domain: r.domain, count: r._count.domain }));
}

// ───────────────── Backlink Bulucu (Faz 6) ─────────────────

export type BacklinkTarget = {
  domain: string;
  count: number;
  sampleUrls: string[];
};

/**
 * AI motorlarının sektörünüzde en çok atıf verdiği siteler — yer almanız gereken
 * outreach hedefleri. Citation verisinin domain bazında zenginleştirilmiş hali.
 */
export async function getBacklinkTargets(tenantId: string, days = 60, limit = 20): Promise<BacklinkTarget[]> {
  const since = sinceDays(days);
  // Doğru sayım: tüm pencere üzerinden groupBy (take cap'i tarafından çarpıtılmaz)
  const grouped = await prisma.citation.groupBy({
    by: ['domain'],
    where: { tenantId, runDate: { gte: since } },
    _count: { domain: true },
    orderBy: { _count: { domain: 'desc' } },
    take: limit,
  });
  if (grouped.length === 0) return [];

  // Sadece üst domainler için örnek URL'ler
  const topDomains = grouped.map((g) => g.domain);
  const sampleRows = await prisma.citation.findMany({
    where: { tenantId, runDate: { gte: since }, domain: { in: topDomains } },
    select: { domain: true, url: true },
    orderBy: { runDate: 'desc' },
  });
  const samples = new Map<string, Set<string>>();
  for (const r of sampleRows) {
    const set = samples.get(r.domain) ?? new Set<string>();
    if (set.size < 3) set.add(r.url);
    samples.set(r.domain, set);
  }

  return grouped.map((g) => ({
    domain: g.domain,
    count: g._count.domain,
    sampleUrls: [...(samples.get(g.domain) ?? [])],
  }));
}

// ───────────────── Rekabet Radarı ─────────────────

export type RadarEntity = {
  name: string;
  isOwn: boolean;
  visibility: number; // % run'da göründü
  mentions: number; // toplam bahis (normalize edilmemiş)
  sentiment: number; // 0-100
  position: number; // 0-100 (erken bahis = yüksek)
  recommend: number; // % RECOMMENDED
};

export async function getRadarData(tenantId: string, days = 30): Promise<{ entities: RadarEntity[]; axes: string[] }> {
  const runs = await prisma.modelRun.findMany({
    where: { prompt: { tenantId }, runDate: { gte: sinceDays(days) }, status: 'SUCCESS' },
    select: {
      id: true,
      mentions: {
        select: {
          isOwnBrand: true,
          isCompetitor: true,
          mentionName: true,
          sentiment: true,
          position: true,
          mentionType: true,
        },
      },
    },
    take: 3000,
  });
  const totalRuns = runs.length || 1;

  // Entity = "own" (kendi markaları toplu) + en çok bahsi geçen rakip adları
  type Acc = { runIds: Set<string>; count: number; sentSum: number; posSum: number; recCount: number };
  const make = (): Acc => ({ runIds: new Set(), count: 0, sentSum: 0, posSum: 0, recCount: 0 });

  const own = make();
  const comps = new Map<string, Acc>();

  for (const r of runs) {
    for (const m of r.mentions) {
      const target = m.isOwnBrand ? own : m.isCompetitor ? getOrInit(comps, m.mentionName, make) : null;
      if (!target) continue;
      target.runIds.add(r.id);
      target.count += 1;
      target.sentSum += SENTIMENT_SCORE[m.sentiment as keyof typeof SENTIMENT_SCORE] ?? 50;
      target.posSum += Math.max(0, 100 - (m.position - 1) * 15);
      if (m.mentionType === 'RECOMMENDED') target.recCount += 1;
    }
  }

  const toEntity = (name: string, isOwn: boolean, a: Acc): RadarEntity => ({
    name,
    isOwn,
    visibility: Math.round((a.runIds.size / totalRuns) * 100),
    mentions: a.count,
    sentiment: a.count ? Math.round(a.sentSum / a.count) : 0,
    position: a.count ? Math.round(a.posSum / a.count) : 0,
    recommend: a.count ? Math.round((a.recCount / a.count) * 100) : 0,
  });

  const topComps = [...comps.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([name, a]) => toEntity(name, false, a));

  const entities: RadarEntity[] = [toEntity('Markanız', true, own), ...topComps];
  return { entities, axes: ['Görünürlük', 'Bahis', 'Sentiment', 'Pozisyon', 'Öneri'] };
}

function getOrInit<K, V>(map: Map<K, V>, key: K, factory: () => V): V {
  let v = map.get(key);
  if (!v) {
    v = factory();
    map.set(key, v);
  }
  return v;
}

// ───────────────── Görünürlük Boşluğu (Citation/Visibility Gap) ─────────────────

export type VisibilityGap = {
  promptId: string;
  promptText: string;
  competitors: string[]; // bu promptta öne çıkan rakipler
  providers: string[]; // hangi modellerde markanız yoktu
};

/**
 * Markanızın görünmediği ama rakiplerin göründüğü promptlar — somut fırsat listesi.
 */
export async function getVisibilityGaps(tenantId: string, days = 30, limit = 15): Promise<VisibilityGap[]> {
  const runs = await prisma.modelRun.findMany({
    where: { prompt: { tenantId }, runDate: { gte: sinceDays(days) }, status: 'SUCCESS' },
    select: {
      id: true,
      promptId: true,
      provider: true,
      mentions: { select: { isOwnBrand: true, isCompetitor: true, mentionName: true } },
      prompt: { select: { text: true } },
    },
    orderBy: { runDate: 'desc' },
    take: 3000,
  });

  // Sadece her (prompt × provider) için EN SON çalıştırmayı dikkate al — böylece 30 gün
  // önce bir kez görünmek bugünkü boşluğu gizlemez. runs zaten tarih azalan sıralı, ilk = en son.
  type Run = (typeof runs)[number];
  const latest = new Map<string, Run>();
  for (const r of runs) {
    const key = `${r.promptId}|${r.provider}`;
    if (!latest.has(key)) latest.set(key, r);
  }

  // promptId → { text, ownSeen, comps:Set, missingProviders:Set }
  type G = { text: string; ownSeen: boolean; comps: Set<string>; missing: Set<string> };
  const byPrompt = new Map<string, G>();

  for (const r of latest.values()) {
    const g = getOrInit(byPrompt, r.promptId, () => ({
      text: r.prompt.text,
      ownSeen: false,
      comps: new Set<string>(),
      missing: new Set<string>(),
    }));
    const ownHere = r.mentions.some((m) => m.isOwnBrand);
    if (ownHere) g.ownSeen = true;
    const compsHere = r.mentions.filter((m) => m.isCompetitor);
    compsHere.forEach((m) => g.comps.add(m.mentionName));
    if (!ownHere && compsHere.length > 0) {
      g.missing.add(PROVIDER_LABELS[r.provider as keyof typeof PROVIDER_LABELS] ?? r.provider);
    }
  }

  return [...byPrompt.entries()]
    .filter(([, g]) => !g.ownSeen && g.comps.size > 0)
    .map(([promptId, g]) => ({
      promptId,
      promptText: g.text,
      competitors: [...g.comps].slice(0, 5),
      providers: [...g.missing],
    }))
    .slice(0, limit);
}

// ─────────── Görünürlük Boşluğu × Gerçek Trafik (AI Discovery Sensor) ───────────

/**
 * Hedef türünün stratejik ağırlığı. E-ticaret dışı sitelerde "ciro" yoktur; değer
 * lead/demo/başvuru/abonelik cinsinden ifade edilir. Ağırlıklar sabittir ve UI'da açıklanır.
 */
const GOAL_STRATEGIC_WEIGHT: Record<GoalType, number> = {
  PURCHASE: 100,
  DEMO: 90,
  LEAD: 85,
  APPLICATION: 80,
  BOOKING: 80,
  SIGN_UP: 70,
  SUBSCRIBE: 60,
  CONTACT: 55,
  CUSTOM: 40,
};

const GOAL_OUTCOME_LABEL: Record<GoalType, string> = {
  PURCHASE: 'satış',
  DEMO: 'demo talebi',
  LEAD: 'potansiyel müşteri',
  APPLICATION: 'başvuru',
  BOOKING: 'randevu',
  SIGN_UP: 'kayıt',
  SUBSCRIBE: 'abonelik',
  CONTACT: 'iletişim',
  CUSTOM: 'hedef',
};

export type PrioritizedGap = {
  promptId: string;
  text: string;
  /** Bu soruda öne çıkan rakipler */
  competitors: string[];
  /** Markanın görünmediği AI ürünleri */
  missingProviders: string[];
  /** Sorunun konusuyla örtüşen gerçek ziyaret ilgisi */
  trafficSignal: {
    sessions: number;
    entityViews: number;
    matchedPaths: string[];
    matchedEntities: string[];
    score: number;
  };
  /** Bu ilgiden doğan hedef tamamlamaları (ciro değil; sektöre göre lead/demo/başvuru) */
  goalSignal: {
    conversions: number;
    topGoal: string | null;
    goalType: GoalType | null;
    score: number;
    /** Kullanıcıya gösterilecek değer ifadesi — e-ticaret dışında ciro yazılmaz */
    valueLabel: string | null;
  };
  /** 0-100 öncelik puanı */
  priority: number;
  rationale: string;
};

/**
 * Mevcut görünürlük boşluklarını **gerçek trafik sinyaliyle** sıralar.
 *
 * Formül (çarpımsal, açıklanabilir):
 *   `gapBase`        = 40 + min(30, rakip×6) + min(30, eksik sağlayıcı×10)   → 40..100
 *   `trafficCarpani` = 0,6 + 0,4 × (bu sorunun konusuyla örtüşen ziyaret ilgisi / en yüksek ilgi)
 *   `hedefCarpani`   = 0,8 + 0,2 × (örtüşen hedef tamamlamalarının stratejik değeri / en yüksek değer)
 *   `priority`       = gapBase × trafficCarpani × hedefCarpani
 *
 * Trafik sinyali yoksa boşluk yine listelenir (çarpan 0,6) — ölçüm yokluğu "fırsat yok"
 * anlamına gelmez; yalnızca sıralamada geri düşer. `getVisibilityGaps` mantığı değiştirilmez.
 */
export async function prioritizeGapsWithTraffic(
  tenantId: string,
  opts: { siteId?: string | null; days?: number; limit?: number } = {},
): Promise<PrioritizedGap[]> {
  const days = Math.min(180, Math.max(1, Math.floor(opts.days ?? 30)));
  const limit = Math.min(50, Math.max(1, Math.floor(opts.limit ?? 15)));
  const since = sinceDays(days);

  const gaps = await getVisibilityGaps(tenantId, days, 50);
  if (gaps.length === 0) return [];

  // Site kapsamı: yalnızca tenant'ın kendi siteleri (cross-tenant sızıntı yok).
  const sites = await prisma.trackedSite.findMany({
    where: { tenantId, ...(opts.siteId ? { id: opts.siteId } : {}) },
    select: { id: true, siteKind: true },
  });
  const siteIds = sites.map((s) => s.id);
  // Ciro/sepet dili YALNIZCA kapsamdaki tüm siteler e-ticaretse kullanılır.
  const isCommerce = sites.length > 0 && sites.every((s) => s.siteKind === 'ecommerce');

  const [landingRows, entityRows, convertedSessions] = siteIds.length
    ? await Promise.all([
        prisma.aiAcquisitionSession.groupBy({
          by: ['landingPath'],
          where: { tenantId, trackedSiteId: { in: siteIds }, sourceClass: 'AI_REFERRAL', firstSeenAt: { gte: since } },
          _count: { _all: true },
          orderBy: { _count: { landingPath: 'desc' } },
          take: 200,
        }),
        prisma.aiJourneyEvent.groupBy({
          by: ['entityLabel'],
          where: {
            tenantId,
            trackedSiteId: { in: siteIds },
            entityLabel: { not: null },
            occurredAt: { gte: since },
          },
          _count: { _all: true },
          orderBy: { _count: { entityLabel: 'desc' } },
          take: 200,
        }),
        prisma.aiAcquisitionSession.findMany({
          where: {
            tenantId,
            trackedSiteId: { in: siteIds },
            sourceClass: 'AI_REFERRAL',
            firstSeenAt: { gte: since },
            convertedAt: { not: null },
            goalId: { not: null },
          },
          select: { landingPath: true, value: true, goal: { select: { name: true, type: true } } },
          take: 2000,
        }),
      ])
    : [[], [], []];

  const paths = landingRows.map((r) => ({
    path: r.landingPath,
    sessions: r._count._all,
    tokens: contextTokens(r.landingPath),
  }));
  const entities = entityRows
    .filter((r): r is typeof r & { entityLabel: string } => !!r.entityLabel)
    .map((r) => ({ label: r.entityLabel, views: r._count._all, tokens: meaningfulWords(r.entityLabel, 8) }));

  type Row = {
    gap: VisibilityGap;
    words: string[];
    sessions: number;
    entityViews: number;
    matchedPaths: string[];
    matchedEntities: string[];
    conversions: number;
    goalValue: number;
    goalCounts: Map<string, { type: GoalType; count: number }>;
    revenue: number;
  };

  const rows: Row[] = gaps.map((gap) => {
    const words = meaningfulWords(gap.promptText);
    const row: Row = {
      gap,
      words,
      sessions: 0,
      entityViews: 0,
      matchedPaths: [],
      matchedEntities: [],
      conversions: 0,
      goalValue: 0,
      goalCounts: new Map(),
      revenue: 0,
    };
    if (words.length === 0) return row;

    const matchedPathSet = new Set<string>();
    for (const p of paths) {
      if (!words.some((w) => wordMatchesTokens(w, p.tokens))) continue;
      row.sessions += p.sessions;
      matchedPathSet.add(p.path);
      if (row.matchedPaths.length < 5) row.matchedPaths.push(p.path);
    }
    for (const e of entities) {
      if (!words.some((w) => wordMatchesTokens(w, e.tokens))) continue;
      row.entityViews += e.views;
      if (row.matchedEntities.length < 5) row.matchedEntities.push(e.label);
    }
    for (const s of convertedSessions) {
      if (!matchedPathSet.has(s.landingPath) || !s.goal) continue;
      row.conversions += 1;
      row.goalValue += GOAL_STRATEGIC_WEIGHT[s.goal.type];
      row.revenue += s.value ? Number(s.value) : 0;
      const acc = row.goalCounts.get(s.goal.name) ?? { type: s.goal.type, count: 0 };
      acc.count += 1;
      row.goalCounts.set(s.goal.name, acc);
    }
    return row;
  });

  const interestOf = (r: Row) => r.sessions + r.entityViews * 0.25;
  const maxInterest = Math.max(...rows.map(interestOf), 0);
  const maxGoalValue = Math.max(...rows.map((r) => r.goalValue), 0);

  return rows
    .map((r) => {
      const gapBase = 40 + Math.min(30, r.gap.competitors.length * 6) + Math.min(30, r.gap.providers.length * 10);
      const trafficNorm = maxInterest > 0 ? interestOf(r) / maxInterest : 0;
      const goalNorm = maxGoalValue > 0 ? r.goalValue / maxGoalValue : 0;
      const priority = Math.round(gapBase * (0.6 + 0.4 * trafficNorm) * (0.8 + 0.2 * goalNorm));

      const top = [...r.goalCounts.entries()].sort((a, b) => b[1].count - a[1].count)[0] ?? null;
      const outcome = top ? GOAL_OUTCOME_LABEL[top[1].type] : null;
      const valueLabel = !top
        ? null
        : isCommerce && r.revenue > 0
          ? `${r.conversions} ${outcome} · ≈ ${Math.round(r.revenue).toLocaleString('tr-TR')} değerinde`
          : `${r.conversions} ${outcome}`;

      return {
        promptId: r.gap.promptId,
        text: r.gap.promptText,
        competitors: r.gap.competitors,
        missingProviders: r.gap.providers,
        trafficSignal: {
          sessions: r.sessions,
          entityViews: r.entityViews,
          matchedPaths: r.matchedPaths,
          matchedEntities: r.matchedEntities,
          score: Math.round(trafficNorm * 100),
        },
        goalSignal: {
          conversions: r.conversions,
          topGoal: top ? top[0] : null,
          goalType: top ? top[1].type : null,
          score: Math.round(goalNorm * 100),
          valueLabel,
        },
        priority,
        rationale: buildGapRationale({
          competitors: r.gap.competitors,
          providers: r.gap.providers,
          sessions: r.sessions,
          entityViews: r.entityViews,
          matchedPaths: r.matchedPaths,
          valueLabel,
        }),
      } satisfies PrioritizedGap;
    })
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        b.trafficSignal.sessions - a.trafficSignal.sessions ||
        a.promptId.localeCompare(b.promptId),
    )
    .slice(0, limit);
}

/** Öncelik açıklaması — sayılar nereden geliyor, kullanıcı görebilsin. */
function buildGapRationale(input: {
  competitors: string[];
  providers: string[];
  sessions: number;
  entityViews: number;
  matchedPaths: string[];
  valueLabel: string | null;
}): string {
  const parts: string[] = [];
  parts.push(
    input.competitors.length > 0
      ? `Bu soruda ${input.competitors.slice(0, 3).join(', ')} görünüyor, markanız görünmüyor`
      : 'Bu soruda markanız görünmüyor',
  );
  if (input.providers.length > 0) parts.push(`${input.providers.join(', ')} tarafında eksiksiniz`);
  if (input.sessions > 0) {
    const where = input.matchedPaths.length ? ` (${input.matchedPaths.slice(0, 2).join(', ')})` : '';
    parts.push(`aynı konuyla ilgili ${input.sessions} AI kaynaklı ziyaret ölçüldü${where}`);
  } else if (input.entityViews > 0) {
    parts.push(`aynı konudaki içerik ${input.entityViews} kez görüntülendi`);
  } else {
    parts.push('bu konuda henüz ölçülmüş AI ziyareti yok, sıralamada geride tutuldu');
  }
  if (input.valueLabel) parts.push(`bu ilgiden ${input.valueLabel} doğdu`);
  return `${parts.join('; ')}.`;
}
