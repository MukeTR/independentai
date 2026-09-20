/**
 * Site aracı çekirdeği — 11 gece programı aracının (W1/W2/W3) ortak omurgası.
 *
 *   const tool = defineSiteTool({ kind:'ONPAGE_SEO', axes, collect, analyze });
 *   route: handlePublicScan(req, tool.kind, tool.run)         // run(url, input) → SiteScanResult
 *   test:  tool.analyze(artifacts)                            // SAF, ağ yok; fixture ile birim test
 *
 *  - `collect(url, budget, input)` ağ işini ScanBudget üzerinden yapar (safe-fetch dışında yol yok);
 *    bütçe dolduktan sonra reddedilen istek varsa (`stats.skipped > 0`) sonuç `partial:true` olur.
 *  - `analyze(artifacts, s, ctx)` Scorer'a kontrol ekler ve `{page?, finalUrl?, hostname?, platform?, waf?,
 *    legacyCharset?, partial?, extra?, onlyAxes?}` döner. `page` (PageArtifact) verilirse finalUrl/hostname/platform/
 *    waf/legacyCharset otomatik türetilir.
 *  - Çıktı `handlePublicScan` ScanResultLike ile uyumludur: recommendations `recommendationsFrom` + `guideFor`,
 *    `verdict` {fail,warn,pass}, `stats` {requests,bytes,ms}. WAF'ta skor yerine hüküm "taranamadı" (verdictLine).
 *  - Varsayılan bütçe: `TOOL_REGISTRY.budgetRequests` (kind'a göre) + BUDGET_MS tablosu; `def.budget` ile ezilir.
 */
import type { ScanInput, PublicScanKind } from '../commerce/public-scan';
import {
  detectPlatform,
  PLATFORM_LABELS,
  type DetectedPlatform,
  type PlatformDetection,
} from '../commerce/platform-detect';
import { guideFor } from '../commerce/guides';
import { hostnameOf } from '../commerce/html-analysis';
import {
  assertWeights,
  recommendationsFrom,
  Scorer,
  type AxisSpec,
  type CommerceFinding,
  type Recommendation,
} from '../commerce/scoring';
import { toolByKind } from '@/lib/tool-registry';
import { verdictLine, verdictOf, type Verdict } from '@/lib/verdict';
import { ScanBudget, type BudgetOptions, type BudgetStats } from './budget';
import type { PageArtifact } from './fetch-page';

export { verdictLine, verdictOf };
export type { Verdict };

export type SiteScanStats = { requests: number; bytes: number; ms: number };

export type SiteScanResult<K extends string = string, X = unknown> = {
  kind: PublicScanKind;
  url: string;
  finalUrl: string;
  hostname: string;
  platform: PlatformDetection & { label: string };
  score: number;
  breakdown: Record<K, number>;
  axes: AxisSpec<K>[];
  findings: CommerceFinding[];
  recommendations: Recommendation[];
  fetchedAt: string;
  partial: boolean;
  waf: boolean;
  legacyCharset: boolean;
  stats: SiteScanStats;
  verdict: Verdict;
  /** Araca özel ek veri (bot matrisi, kıyas tablosu, mockup alanları …) */
  extra?: X;
  /** Tarama girdisi (sektör/rakip) — rapor sayfası gösterir */
  input?: ScanInput;
};

export type AnalyzeContext = {
  url: string;
  input: ScanInput;
  budget: BudgetStats | null;
};

export type AnalyzeOutput<X> = {
  /** Verilirse finalUrl/hostname/platform/waf/legacyCharset buradan türetilir */
  page?: PageArtifact | null;
  finalUrl?: string;
  hostname?: string;
  platform?: PlatformDetection;
  waf?: boolean;
  legacyCharset?: boolean;
  partial?: boolean;
  extra?: X;
  /** Skor yalnız bu eksenler üzerinden yeniden normalize edilir (ör. TLS ölçülemedi) */
  onlyAxes?: string[];
  fetchedAt?: string;
};

export type SiteToolDef<K extends string, A, X> = {
  kind: PublicScanKind;
  axes: AxisSpec<K>[];
  /** Bütçe (varsayılan: registry budgetRequests + BUDGET_MS[kind]) */
  budget?: Partial<BudgetOptions> & { ms?: number };
  collect: (url: string, budget: ScanBudget, input: ScanInput) => Promise<A>;
  analyze: (artifacts: A, s: Scorer<K>, ctx: AnalyzeContext) => AnalyzeOutput<X>;
};

export type SiteTool<K extends string, A, X> = {
  kind: PublicScanKind;
  axes: AxisSpec<K>[];
  /** Tam akış: bütçe → collect → analyze */
  run: (url: string, input?: ScanInput) => Promise<SiteScanResult<K, X>>;
  /** Yalnız toplama (bütçe dışarıdan) */
  collect: (url: string, budget: ScanBudget, input?: ScanInput) => Promise<A>;
  /** SAF analiz (birim test): artefakt → tam sonuç */
  analyze: (
    artifacts: A,
    opts?: { url?: string; input?: ScanInput; budget?: BudgetStats | null },
  ) => SiteScanResult<K, X>;
  /** Varsayılan bütçe seçenekleri (ms göreli) */
  budgetDefaults: { maxRequests: number; maxBytes: number; ms: number; perHost: number };
};

/** Toplam zaman bütçesi (ms) — spec §4 tablosu; Vercel 60 s sınırının altında. */
export const BUDGET_MS: Record<PublicScanKind, number> = {
  COMMERCE: 25_000,
  PRODUCT_PAGE: 20_000,
  CRAWLER: 20_000,
  ONPAGE_SEO: 15_000,
  SOCIAL_PREVIEW: 12_000,
  SECURITY_HEADERS: 10_000,
  REDIRECTS: 12_000,
  BROKEN_LINKS: 25_000,
  ROBOTS_SITEMAP: 20_000,
  HREFLANG: 20_000,
  SCHEMA_AUDIT: 10_000,
  QUESTION_COVERAGE: 25_000,
  TRUST_SIGNALS: 15_000,
  COMPARE: 15_000,
};

export const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

export function budgetDefaultsFor(kind: PublicScanKind): SiteTool<string, unknown, unknown>['budgetDefaults'] {
  return {
    maxRequests: toolByKind(kind)?.budgetRequests ?? 8,
    maxBytes: DEFAULT_MAX_BYTES,
    ms: BUDGET_MS[kind],
    perHost: 4,
  };
}

/** Yeni bütçe (deadline şimdi + ms). */
export function newBudget(kind: PublicScanKind, override: Partial<BudgetOptions> & { ms?: number } = {}): ScanBudget {
  const d = budgetDefaultsFor(kind);
  return new ScanBudget({
    maxRequests: override.maxRequests ?? d.maxRequests,
    maxBytes: override.maxBytes ?? d.maxBytes,
    deadlineAt: override.deadlineAt ?? Date.now() + (override.ms ?? d.ms),
    perHost: override.perHost ?? d.perHost,
  });
}

/** Sayfadan platform tespiti (UNKNOWN da etiketli döner). */
export function platformOfPage(page: PageArtifact | null | undefined): PlatformDetection & { label: string } {
  const p = page ? detectPlatform(page.html, page.page.headers, page.finalUrl) : unknownPlatform();
  return { ...p, label: PLATFORM_LABELS[p.platform] };
}

function unknownPlatform(): PlatformDetection {
  return { platform: 'UNKNOWN', confidence: 0, evidence: [], connectorAvailable: false };
}

export function defineSiteTool<K extends string, A, X = undefined>(def: SiteToolDef<K, A, X>): SiteTool<K, A, X> {
  const axes = assertWeights(def.axes);
  const d = budgetDefaultsFor(def.kind);
  const budgetDefaults = {
    maxRequests: def.budget?.maxRequests ?? d.maxRequests,
    maxBytes: def.budget?.maxBytes ?? d.maxBytes,
    ms: def.budget?.ms ?? d.ms,
    perHost: def.budget?.perHost ?? d.perHost,
  };

  const analyze: SiteTool<K, A, X>['analyze'] = (artifacts, opts = {}) => {
    const url = opts.url ?? '';
    const input = opts.input ?? {};
    const s = new Scorer<K>(axes);
    const out = def.analyze(artifacts, s, { url, input, budget: opts.budget ?? null });
    const page = out.page ?? null;
    const finalUrl = out.finalUrl ?? page?.finalUrl ?? url;
    const hostname = out.hostname ?? page?.hostname ?? hostnameOf(finalUrl) ?? '';
    const platformRaw = out.platform ?? (page ? platformOfPage(page) : unknownPlatform());
    const platform = { ...platformRaw, label: PLATFORM_LABELS[platformRaw.platform as DetectedPlatform] };
    const waf = out.waf ?? page?.waf ?? false;
    const legacyCharset = out.legacyCharset ?? page?.legacyCharset ?? false;
    const stats = opts.budget ?? null;
    // partial = bir şey atlandı (bütçe nedeniyle reddedilen istek); bütçenin tam kullanılması tek başına partial değildir
    const partial = (out.partial ?? false) || (stats?.skipped ?? 0) > 0;
    const findings = s.findings;
    const recommendations = recommendationsFrom(findings, axes, (topic) => {
      const g = guideFor(platform.platform, topic);
      return g ? { steps: g.steps, difficulty: g.difficulty } : null;
    });
    const only = out.onlyAxes?.filter((k): k is K => axes.some((a) => a.key === k));
    return {
      kind: def.kind,
      url: url || finalUrl,
      finalUrl,
      hostname,
      platform,
      score: only && only.length ? s.total(only) : s.total(),
      breakdown: s.breakdown(),
      axes,
      findings,
      recommendations,
      fetchedAt: out.fetchedAt ?? page?.fetchedAt ?? new Date().toISOString(),
      partial,
      waf,
      legacyCharset,
      stats: stats ? { requests: stats.requests, bytes: stats.bytes, ms: stats.ms } : { requests: 0, bytes: 0, ms: 0 },
      verdict: verdictOf(findings),
      ...(out.extra !== undefined ? { extra: out.extra } : {}),
      ...(input.sector || input.competitorUrl ? { input } : {}),
    };
  };

  const collect: SiteTool<K, A, X>['collect'] = (url, budget, input = {}) => def.collect(url, budget, input);

  const run: SiteTool<K, A, X>['run'] = async (url, input = {}) => {
    const budget = newBudget(def.kind, { ...def.budget, ms: budgetDefaults.ms });
    const artifacts = await def.collect(url, budget, input);
    return analyze(artifacts, { url, input, budget: budget.stats() });
  };

  return { kind: def.kind, axes, run, collect, analyze, budgetDefaults };
}
