/**
 * GEO insight sorguları — Rekabet Radarı, Top Citation Sources, Görünürlük Boşluğu.
 * (Faz 1) Mevcut ModelRun / BrandMention / Citation verisinden türetilir.
 */
import { prisma } from './prisma';
import { PROVIDER_LABELS, SENTIMENT_SCORE } from '@independentai/shared';

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
