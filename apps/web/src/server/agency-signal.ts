/**
 * Ajans tespiti — tenant veya pseudonim ziyaretçi (visitorHash) için ağırlıklı skor (0–100).
 *
 *  - Saf `scoreAgencySignals` (birim testli) + veri toplayan `computeVisitorSignal` / `computeTenantSignal`
 *    (PublicScan 30 gün, Competitor/Brand, Tenant.industry, kullanıcı e-postası) → `AgencySignal` upsert.
 *  - `touchAgencySignal` her public taramada `after()` içinde; `runAgencySignals` gece bakımı (≤500 tenant + ≤500
 *    ziyaretçi, deadline'a uyar). `declareAgency` "Ben ajansım" beyanı (skor 100, DECLARED, Lead ONBOARDING/ajans).
 *  - DECLARED/DISMISSED satırların skoru/durumu yeniden hesapta EZİLMEZ (yalnız kanıt/computedAt tazelenir).
 *  - Ajans hesabı (Tenant.kind=AGENCY / AgencyAccount) hesaplanmaz — admin "zaten ajans" sekmesinde listelenir.
 *  - KVKK: visitorHash pseudonim, ham IP/UA yok; hostnames ≤20 kanıt; hiçbir alan LLM'e gitmez;
 *    e-posta Lead'e yalnız kullanıcı kutuyu işaretlerse yazılır.
 */
import type { AgencySignalStatus, AgencySubject, Prisma } from '@independentai/db';
import { prisma } from './prisma';
import { log } from './logger';
import { etldPlusOne } from './public-suffix';

export type AgencySubjectKind = 'TENANT' | 'VISITOR';

export type AgencyReasonKey =
  | 'many_hosts'
  | 'many_sectors'
  | 'email_keyword'
  | 'website_mismatch'
  | 'many_competitors'
  | 'industry_agency'
  | 'compare_heavy'
  | 'preanalysis_used';

/** Üst sınır puanlar (spec §5.3); `many_hosts` kademeli: 2 → 15, 3–4 → 30, ≥5 → 45. */
export const AGENCY_WEIGHTS: Record<AgencyReasonKey, number> = {
  many_hosts: 45,
  many_sectors: 15,
  email_keyword: 20,
  website_mismatch: 15,
  many_competitors: 10,
  industry_agency: 40,
  compare_heavy: 10,
  preanalysis_used: 10,
};

export const AGENCY_THRESHOLDS = {
  /** admin aday listesi */
  candidate: 50,
  /** uygulama içi band (yalnız TENANT) */
  band: 70,
} as const;

export const AGENCY_EMAIL_KEYWORDS =
  /ajans|agency|digital|dijital|medya|media|reklam|creative|kreatif|studio|stüdyo|marketing|pazarlama|growth|seo/i;

/** eTLD+1 — ortak modülden (server/public-suffix.ts); geriye uyum için buradan da dışa aktarılır. */
export { etldPlusOne } from './public-suffix';

export type AgencySignalInput = {
  subject: AgencySubjectKind;
  /** 30 günde taranan farklı eTLD+1 sayısı */
  distinctHosts30d?: number;
  /** QUESTION_COVERAGE'da kullanılan farklı sektör sayısı */
  distinctSectors?: number;
  /** TENANT: kullanıcı e-postası */
  email?: string | null;
  /** TENANT: Tenant.website hostname'i */
  websiteHost?: string | null;
  /** TENANT: oturumlu taranan hostname'ler */
  scannedHosts?: string[];
  /** TENANT: Competitor sayısı */
  competitorCount?: number;
  /** TENANT: Brand.isOwn=false sayısı */
  foreignBrands?: number;
  /** TENANT: Tenant.industry */
  industry?: string | null;
  /** 7 günde rakip-kiyas taraması */
  compareScans7d?: number;
  /** VISITOR: agency-preanalysis çağrısı */
  preanalysisUsed?: boolean;
  /** "Ben ajansım" beyanı */
  declared?: boolean;
};

export type AgencyReason = { key: AgencyReasonKey; weight: number; evidence: string };

/** Saf skor: min(100, Σ). Beyan varsa 100. */
export function scoreAgencySignals(input: AgencySignalInput): { score: number; reasons: AgencyReason[] } {
  const reasons: AgencyReason[] = [];
  const tenant = input.subject === 'TENANT';

  const hosts = input.distinctHosts30d ?? 0;
  if (hosts >= 5) reasons.push({ key: 'many_hosts', weight: 45, evidence: `30 günde ${hosts} farklı site` });
  else if (hosts >= 3) reasons.push({ key: 'many_hosts', weight: 30, evidence: `30 günde ${hosts} farklı site` });
  else if (hosts === 2) reasons.push({ key: 'many_hosts', weight: 15, evidence: '30 günde 2 farklı site' });

  const sectors = input.distinctSectors ?? 0;
  if (sectors >= 2)
    reasons.push({ key: 'many_sectors', weight: AGENCY_WEIGHTS.many_sectors, evidence: `${sectors} farklı sektör` });

  if (tenant && input.email) {
    const [local = '', domain = ''] = input.email.toLowerCase().split('@');
    const m = AGENCY_EMAIL_KEYWORDS.exec(local) ?? AGENCY_EMAIL_KEYWORDS.exec(domain.split('.')[0] ?? '');
    if (m) reasons.push({ key: 'email_keyword', weight: AGENCY_WEIGHTS.email_keyword, evidence: `e-posta: “${m[0]}”` });
  }

  if (tenant && input.websiteHost && input.scannedHosts && input.scannedHosts.length) {
    const own = etldPlusOne(input.websiteHost);
    const others = new Set(input.scannedHosts.map(etldPlusOne).filter((h) => h && h !== own));
    if (others.size >= 2)
      reasons.push({
        key: 'website_mismatch',
        weight: AGENCY_WEIGHTS.website_mismatch,
        evidence: `kendi sitesi dışında ${others.size} site`,
      });
  }

  if (tenant && ((input.competitorCount ?? 0) >= 15 || (input.foreignBrands ?? 0) >= 3))
    reasons.push({
      key: 'many_competitors',
      weight: AGENCY_WEIGHTS.many_competitors,
      evidence: `${input.competitorCount ?? 0} rakip · ${input.foreignBrands ?? 0} yabancı marka`,
    });

  if (tenant && input.industry && /^(ajans|agency)$/i.test(input.industry.trim()))
    reasons.push({ key: 'industry_agency', weight: AGENCY_WEIGHTS.industry_agency, evidence: 'sektör: ajans' });

  if ((input.compareScans7d ?? 0) >= 3)
    reasons.push({
      key: 'compare_heavy',
      weight: AGENCY_WEIGHTS.compare_heavy,
      evidence: `7 günde ${input.compareScans7d} rakip kıyası`,
    });

  if (!tenant && input.preanalysisUsed)
    reasons.push({ key: 'preanalysis_used', weight: AGENCY_WEIGHTS.preanalysis_used, evidence: 'ajans ön-analizi' });

  const sum = reasons.reduce((a, r) => a + r.weight, 0);
  const score = input.declared ? 100 : Math.min(100, sum);
  return { score, reasons };
}

export function isAgencyCandidate(score: number): boolean {
  return score >= AGENCY_THRESHOLDS.candidate;
}

export function showsAgencyBand(subject: AgencySubjectKind, score: number): boolean {
  return subject === 'TENANT' && score >= AGENCY_THRESHOLDS.band;
}

export type AgencySignalSummary = {
  subject: AgencySubjectKind;
  subjectId: string;
  score: number;
  reasons: AgencyReason[];
  hostnames: string[];
  status: AgencySignalStatus;
  /** DB'ye yazıldı mı (skorsuz ziyaretçi satırı açılmaz) */
  persisted: boolean;
};

export type TouchAgencySignalInput = {
  visitorHash?: string | null;
  tenantId?: string | null;
  hostname: string;
};

const DAY_MS = 86_400_000;
/** AgencySignal.hostnames kanıt üst sınırı */
export const AGENCY_MAX_HOSTNAMES = 20;
/** Gece bakımı üst sınırları */
export const AGENCY_RUN_CAP = { tenants: 500, visitors: 500 } as const;
/** Yeniden hesapta skoru/durumu korunan statüler */
export const AGENCY_PROTECTED_STATUSES: ReadonlySet<AgencySignalStatus> = new Set(['DECLARED', 'DISMISSED']);
/** Bandın gösterilmediği statüler (beyan edildi / yoksayıldı / dönüştü) */
export const AGENCY_BAND_HIDDEN_STATUSES: ReadonlySet<AgencySignalStatus> = new Set([
  'DECLARED',
  'DISMISSED',
  'CONVERTED',
]);

/** Tenant.website → hostname (www. atılır); geçersizse null. */
export function websiteHostOf(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
    const h = u.hostname.toLowerCase().replace(/^www\./, '');
    return h.includes('.') ? h : null;
  } catch {
    return null;
  }
}

function reasonsOf(raw: unknown): AgencyReason[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (r): r is AgencyReason =>
      !!r &&
      typeof r === 'object' &&
      typeof (r as AgencyReason).key === 'string' &&
      typeof (r as AgencyReason).weight === 'number',
  );
}

type ScanFacts = {
  hostnames: string[];
  distinctHosts30d: number;
  distinctSectors: number;
  compareScans7d: number;
};

/** Son 30 günün PublicScan satırlarından kanıt: farklı eTLD+1, QUESTION_COVERAGE sektörleri, 7 günde COMPARE. */
async function scanFacts(where: { visitorHash: string } | { tenantId: string }): Promise<ScanFacts> {
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY_MS);
  const since7 = new Date(now - 7 * DAY_MS);
  const rows = await prisma.publicScan.findMany({
    where: { ...where, createdAt: { gte: since30 } },
    select: { hostname: true, kind: true, sector: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 2000,
  });
  const hosts = new Set<string>();
  const etlds = new Set<string>();
  const sectors = new Set<string>();
  let compare7 = 0;
  for (const r of rows) {
    hosts.add(r.hostname);
    etlds.add(etldPlusOne(r.hostname));
    if (r.kind === 'QUESTION_COVERAGE' && r.sector) sectors.add(r.sector);
    if (r.kind === 'COMPARE' && r.createdAt >= since7) compare7 += 1;
  }
  return {
    hostnames: [...hosts].slice(0, AGENCY_MAX_HOSTNAMES),
    distinctHosts30d: etlds.size,
    distinctSectors: sectors.size,
    compareScans7d: compare7,
  };
}

async function findSignal(subject: AgencySubject, subjectId: string) {
  return prisma.agencySignal.findUnique({
    where: { subject_subjectId: { subject, subjectId } },
    select: { id: true, status: true, score: true, reasons: true, hostnames: true },
  });
}

/**
 * Hesaplanan skoru yazar. Satır yoksa ve skor `minScore` altındaysa satır AÇILMAZ (veri minimizasyonu).
 * DECLARED/DISMISSED: skor/durum korunur, yalnız kanıt (reasons/hostnames) ve computedAt tazelenir.
 */
async function persistSignal(
  subject: AgencySubject,
  subjectId: string,
  computed: { score: number; reasons: AgencyReason[] },
  hostnames: string[],
  minScore: number,
): Promise<AgencySignalSummary> {
  const existing = await findSignal(subject, subjectId);
  const reasonsJson = computed.reasons as unknown as Prisma.InputJsonValue;
  if (!existing) {
    if (computed.score < minScore)
      return {
        subject,
        subjectId,
        score: computed.score,
        reasons: computed.reasons,
        hostnames,
        status: 'CANDIDATE',
        persisted: false,
      };
    const row = await prisma.agencySignal.create({
      data: { subject, subjectId, score: computed.score, reasons: reasonsJson, hostnames, computedAt: new Date() },
      select: { status: true },
    });
    return {
      subject,
      subjectId,
      score: computed.score,
      reasons: computed.reasons,
      hostnames,
      status: row.status,
      persisted: true,
    };
  }
  const protectedRow = AGENCY_PROTECTED_STATUSES.has(existing.status);
  const row = await prisma.agencySignal.update({
    where: { id: existing.id },
    data: protectedRow
      ? { reasons: reasonsJson, hostnames, computedAt: new Date() }
      : { score: computed.score, reasons: reasonsJson, hostnames, computedAt: new Date() },
    select: { status: true, score: true },
  });
  return {
    subject,
    subjectId,
    score: row.score,
    reasons: computed.reasons,
    hostnames,
    status: row.status,
    persisted: true,
  };
}

/**
 * Her public taramada `after()` içinde çağrılır. Oturumlu taramada tenant sinyali (ziyaretçi ayrıca sayılmaz,
 * çift liste olmasın); kayıtsızda ziyaretçi sinyali. Hatalar çağıranda yutulur.
 */
export async function touchAgencySignal(input: TouchAgencySignalInput): Promise<void> {
  if (input.tenantId) {
    await computeTenantSignal(input.tenantId);
    return;
  }
  if (input.visitorHash) await computeVisitorSignal(input.visitorHash);
}

/**
 * Ziyaretçi (visitorHash) sinyali: PublicScan kanıtı + (varsa) daha önce işaretlenmiş ajans ön-analizi.
 * Skor 0 ise satır açılmaz; `opts.preanalysisUsed` ön-analiz ucundan gelir (hostname yazılmaz, yalnız reasons).
 */
export async function computeVisitorSignal(
  visitorHash: string,
  opts: { preanalysisUsed?: boolean } = {},
): Promise<AgencySignalSummary | null> {
  if (!/^[a-f0-9]{64}$/.test(visitorHash)) return null;
  const [facts, existing] = await Promise.all([scanFacts({ visitorHash }), findSignal('VISITOR', visitorHash)]);
  const preanalysisUsed =
    opts.preanalysisUsed === true || reasonsOf(existing?.reasons).some((r) => r.key === 'preanalysis_used');
  const computed = scoreAgencySignals({
    subject: 'VISITOR',
    distinctHosts30d: facts.distinctHosts30d,
    distinctSectors: facts.distinctSectors,
    compareScans7d: facts.compareScans7d,
    preanalysisUsed,
  });
  return persistSignal('VISITOR', visitorHash, computed, facts.hostnames, 1);
}

/** Ajans ön-analizi çağrısı: yalnız `preanalysis_used` nedeni (alan adları yazılmaz). */
export async function markPreanalysisUsed(visitorHash: string): Promise<void> {
  await computeVisitorSignal(visitorHash, { preanalysisUsed: true });
}

/**
 * Tenant sinyali: oturumlu PublicScan kanıtı + e-posta anahtar kelimesi + web sitesi uyuşmazlığı + rakip/marka
 * sayısı + Tenant.industry. Ajans hesabı (kind=AGENCY / AgencyAccount) hesaplanmaz → null.
 */
export async function computeTenantSignal(tenantId: string): Promise<AgencySignalSummary | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      website: true,
      industry: true,
      kind: true,
      agency: { select: { id: true } },
      users: { select: { email: true }, orderBy: { createdAt: 'asc' }, take: 5 },
    },
  });
  if (!tenant || tenant.kind === 'AGENCY' || tenant.agency) return null;
  const [facts, competitorCount, foreignBrands] = await Promise.all([
    scanFacts({ tenantId }),
    prisma.competitor.count({ where: { tenantId } }),
    prisma.brand.count({ where: { tenantId, isOwn: false } }),
  ]);
  const emails = tenant.users.map((u) => u.email);
  const email =
    emails.find((e) =>
      AGENCY_EMAIL_KEYWORDS.test(e.replace(/@.*$/, '') + ' ' + (e.split('@')[1]?.split('.')[0] ?? '')),
    ) ??
    emails[0] ??
    null;
  const computed = scoreAgencySignals({
    subject: 'TENANT',
    distinctHosts30d: facts.distinctHosts30d,
    distinctSectors: facts.distinctSectors,
    email,
    websiteHost: websiteHostOf(tenant.website),
    scannedHosts: facts.hostnames,
    competitorCount,
    foreignBrands,
    industry: tenant.industry,
    compareScans7d: facts.compareScans7d,
  });
  return persistSignal('TENANT', tenantId, computed, facts.hostnames, 1);
}

export type AgencySignalRunStats = { tenants: number; visitors: number; skipped: boolean; partial: boolean };

/**
 * Gece bakımı (daily-run hop 0): son 30 günde taraması olan tenant'lar ∪ sektörü ajans olanlar ∪ açık adaylar
 * (≤500) ve ≥2 taramalı ziyaretçiler (≤500). Deadline geçince kalanlar bir sonraki geceye kalır (`partial:true`).
 */
export async function runAgencySignals(opts: { deadlineAt: number }): Promise<AgencySignalRunStats> {
  const stats: AgencySignalRunStats = { tenants: 0, visitors: 0, skipped: false, partial: false };
  if (Date.now() >= opts.deadlineAt) return { ...stats, skipped: true };
  const since30 = new Date(Date.now() - 30 * DAY_MS);

  const tenantIds = new Set<string>();
  const [scanned, byIndustry, open] = await Promise.all([
    prisma.publicScan.groupBy({
      by: ['tenantId'],
      where: { tenantId: { not: null }, createdAt: { gte: since30 } },
      _count: { _all: true },
      orderBy: { _count: { tenantId: 'desc' } },
      take: AGENCY_RUN_CAP.tenants,
    }),
    prisma.tenant.findMany({
      where: { kind: 'BRAND', industry: { in: ['ajans', 'agency'] } },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.agencySignal.findMany({
      where: { subject: 'TENANT', status: { in: ['CANDIDATE', 'CONTACTED'] } },
      select: { subjectId: true },
      orderBy: { computedAt: 'asc' },
      take: 200,
    }),
  ]);
  for (const r of scanned) if (r.tenantId) tenantIds.add(r.tenantId);
  for (const t of byIndustry) tenantIds.add(t.id);
  for (const s of open) tenantIds.add(s.subjectId);

  for (const id of [...tenantIds].slice(0, AGENCY_RUN_CAP.tenants)) {
    if (Date.now() >= opts.deadlineAt) return { ...stats, partial: true };
    try {
      await computeTenantSignal(id);
      stats.tenants += 1;
    } catch (err) {
      log.warn('agency-signal.tenant_failed', { tenantId: id, err });
    }
  }

  const visitors = await prisma.publicScan.groupBy({
    by: ['visitorHash'],
    where: { visitorHash: { not: null }, tenantId: null, createdAt: { gte: since30 } },
    _count: { _all: true },
    having: { visitorHash: { _count: { gte: 2 } } },
    orderBy: { _count: { visitorHash: 'desc' } },
    take: AGENCY_RUN_CAP.visitors,
  });
  for (const v of visitors) {
    if (!v.visitorHash) continue;
    if (Date.now() >= opts.deadlineAt) return { ...stats, partial: true };
    try {
      await computeVisitorSignal(v.visitorHash);
      stats.visitors += 1;
    } catch (err) {
      log.warn('agency-signal.visitor_failed', { err });
    }
  }
  if (stats.tenants || stats.visitors) log.info('agency-signal.run', stats);
  return stats;
}

// ───────────── "Ben ajansım" beyanı ─────────────

export type DeclareAgencyInput = {
  tenantId: string;
  userId: string;
  email: string;
  website: string | null;
  /** Kullanıcı "e-posta adresimle iletişime geçilebilir" kutusunu işaretledi */
  contactConsent: boolean;
};

/**
 * Beyan: AgencySignal TENANT → score 100, status DECLARED, declaredAt; Lead ONBOARDING / topic 'ajans'
 * (hostname varsa ona göre, yoksa tenant bağıyla). E-posta yalnız `contactConsent` ile yazılır. Lead hatası beyanı bozmaz.
 */
export async function declareAgency(input: DeclareAgencyInput): Promise<{ score: number; status: AgencySignalStatus }> {
  const existing = await findSignal('TENANT', input.tenantId);
  const now = new Date();
  const row = existing
    ? await prisma.agencySignal.update({
        where: { id: existing.id },
        data: { score: 100, status: 'DECLARED', declaredAt: now, computedAt: now },
        select: { score: true, status: true },
      })
    : await prisma.agencySignal.create({
        data: {
          subject: 'TENANT',
          subjectId: input.tenantId,
          score: 100,
          status: 'DECLARED',
          declaredAt: now,
          reasons: [],
        },
        select: { score: true, status: true },
      });

  try {
    const hostname = websiteHostOf(input.website);
    const lead = hostname
      ? await prisma.lead.findUnique({ where: { hostname }, select: { id: true, source: true, activity: true } })
      : await prisma.lead.findFirst({
          where: { tenantId: input.tenantId },
          orderBy: { lastSeenAt: 'desc' },
          select: { id: true, source: true, activity: true },
        });
    const activity = Array.isArray(lead?.activity) ? [...(lead.activity as Prisma.JsonArray)] : [];
    activity.push({
      at: now.toISOString(),
      action: 'agency_declared',
      note: 'Ben ajansım beyanı',
      byUserId: input.userId,
    });
    const contact = input.contactConsent ? { contactEmail: input.email.toLowerCase(), consentAt: now } : {};
    if (lead) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          ...(lead.source === 'TOOL' ? { source: 'ONBOARDING' } : {}),
          topic: 'ajans',
          tenantId: input.tenantId,
          lastSeenAt: now,
          activity: activity.slice(-100) as Prisma.InputJsonValue,
          ...contact,
        },
      });
    } else {
      await prisma.lead.create({
        data: {
          hostname,
          source: 'ONBOARDING',
          topic: 'ajans',
          tenantId: input.tenantId,
          scanCount: 0,
          activity: activity as Prisma.InputJsonValue,
          ...contact,
        },
      });
    }
  } catch (err) {
    log.error('lead.persist_failed', { source: 'agency_declare', err });
  }
  return row;
}
