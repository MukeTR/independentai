/**
 * Ajans tespiti — tenant veya pseudonim ziyaretçi (visitorHash) için ağırlıklı skor (0–100).
 * Saf `scoreAgencySignals` burada tam gövdeli ve birim testlidir; veri toplayan fonksiyonlar (touch/compute/run)
 * PREP'te imza + no-op gövdedir, W5 doldurur. DECLARED/DISMISSED kayıtlar hesaplamayla ezilmez.
 * KVKK: visitorHash pseudonim, ham IP/UA yok; hiçbir alan LLM'e gitmez.
 */
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
};

export type TouchAgencySignalInput = {
  visitorHash?: string | null;
  tenantId?: string | null;
  hostname: string;
};

/** Her public taramada `after()` içinde çağrılır (tek groupBy + upsert). PREP: no-op; W5 doldurur. */
export async function touchAgencySignal(_input: TouchAgencySignalInput): Promise<void> {
  return;
}

/** Ziyaretçi (visitorHash) sinyalini hesaplar ve kaydeder. PREP: no-op; W5 doldurur. */
export async function computeVisitorSignal(_visitorHash: string): Promise<AgencySignalSummary | null> {
  return null;
}

/** Tenant sinyalini hesaplar ve kaydeder (oturumlu tarama, onboarding sonu). PREP: no-op; W5 doldurur. */
export async function computeTenantSignal(_tenantId: string): Promise<AgencySignalSummary | null> {
  return null;
}

export type AgencySignalRunStats = { tenants: number; visitors: number; skipped: boolean };

/** Günlük bakım (daily-run hop 0, ≤500 tenant/gece). PREP: no-op; W5 doldurur. */
export async function runAgencySignals(_opts: { deadlineAt: number }): Promise<AgencySignalRunStats> {
  return { tenants: 0, visitors: 0, skipped: true };
}
