/**
 * Rakip kıyası (`/arac/rakip-kiyas`, COMPARE) — iki site, aynı 14 hızlı kontrol (quick-checks.ts), aynı formül:
 * kimlik 25 · AI erişimi 25 · teknik 25 · paylaşılabilirlik 25. W1/W2 motorlarına import YOK.
 *  - `competitorUrl` zorunlu (yoksa ClientError → 400); handlePublicScan rakibi de normalize + SSRF + blocklist'ten
 *    geçirir ve `urlHash = sha256(url|kind|sector|competitorUrl)` ile önbellekler.
 *  - Her site: sayfa + robots + llms + og:image HEAD = 4 istek → toplam 8 (registry budgetRequests).
 *  - Çıktı: 14 satırlık matris (kim önde), "rakibinizin sizden iyi olduğu N madde", her iki skor; rakip WAF/erişilemez
 *    ise satırlar "—" ve bilgi notu. "ChatGPT kimi öneriyor?" LLM'li ölçüm panelde → istemci CTA.
 */
import { ClientError } from '../errors';
import { Scorer } from '../commerce/scoring';
import type { HeadResult, ScanBudget } from './budget';
import { defineSiteTool } from './core';
import { collectPageArtifact, headResource, type PageArtifact } from './fetch-page';
import { quickChecks, QUICK_CHECK_KEYS, type QuickCheck, type QuickCheckKey, type QuickCheckStatus } from './quick-checks';

export type CompareAxis = 'identity' | 'aiAccess' | 'technical' | 'shareability';

export const COMPARE_AXES = [
  { key: 'identity' as const, label: 'Kimlik', weight: 25, description: 'Organization şeması, JSON-LD tipleri, title, meta açıklama' },
  { key: 'aiAccess' as const, label: 'AI erişimi', weight: 25, description: 'GPTBot izni, llms.txt, canonical' },
  { key: 'technical' as const, label: 'Teknik temel', weight: 25, description: 'HTTPS, HSTS, viewport, lang' },
  { key: 'shareability' as const, label: 'Paylaşılabilirlik', weight: 25, description: 'og:image, görsel erişilebilirliği, H1' },
];

export type SiteSnapshot = { page: PageArtifact; ogHead: HeadResult | null };
export type CompareArtifacts = { own: SiteSnapshot; competitor: SiteSnapshot | null; competitorUrl: string };

export type CompareSide = { status: QuickCheckStatus | null; value: string };
export type CompareRow = {
  key: QuickCheckKey;
  label: string;
  group: CompareAxis;
  own: CompareSide;
  competitor: CompareSide;
  leader: 'own' | 'competitor' | 'tie' | 'unknown';
};

export type CompareSite = {
  hostname: string;
  url: string;
  score: number | null;
  breakdown: Record<CompareAxis, number> | null;
  waf: boolean;
  reachable: boolean;
};

export type CompareExtra = {
  own: CompareSite;
  competitor: CompareSite;
  rows: CompareRow[];
  competitorAhead: number;
  ownAhead: number;
  ties: number;
  summary: string;
};

const RANK: Record<QuickCheckStatus, number> = { pass: 2, warn: 1, fail: 0 };

async function snapshot(url: string, budget: ScanBudget): Promise<SiteSnapshot> {
  const page = await collectPageArtifact(url, budget, { robots: true, llms: true });
  const og = page.og['image'] ?? page.og['image:url'] ?? page.og['image:secure_url'] ?? '';
  const ogHead = page.reachable && /^https?:\/\//i.test(og) && !budget.exhausted ? await headResource(og, 4_000, budget) : null;
  return { page, ogHead };
}

/** Aynı formül: her hızlı kontrol grubunun ekseninde ağırlık 1. */
function scoreChecks(checks: QuickCheck[]): { score: number; breakdown: Record<CompareAxis, number> } {
  const sc = new Scorer<CompareAxis>(COMPARE_AXES);
  for (const c of checks) sc.check(c.group, 1, c.status, c.label, { pass: c.value, fail: c.value, warn: c.value });
  return { score: sc.total(), breakdown: sc.breakdown() };
}

export function compareRows(own: QuickCheck[], comp: QuickCheck[] | null): CompareRow[] {
  return QUICK_CHECK_KEYS.map((key) => {
    const o = own.find((c) => c.key === key)!;
    const c = comp?.find((x) => x.key === key) ?? null;
    const leader: CompareRow['leader'] = !c
      ? 'unknown'
      : RANK[o.status] > RANK[c.status]
        ? 'own'
        : RANK[o.status] < RANK[c.status]
          ? 'competitor'
          : 'tie';
    return {
      key,
      label: o.label,
      group: o.group,
      own: { status: o.status, value: o.value },
      competitor: c ? { status: c.status, value: c.value } : { status: null, value: '—' },
      leader,
    };
  });
}

function requireCompetitor(url: string | undefined): string {
  if (!url) throw new ClientError('Rakip site adresi girin');
  return url;
}

export const compareTool = defineSiteTool<CompareAxis, CompareArtifacts, CompareExtra>({
  kind: 'COMPARE',
  axes: COMPARE_AXES,
  collect: async (url, budget, input) => {
    const competitorUrl = requireCompetitor(input.competitorUrl);
    const [own, competitor] = await Promise.all([snapshot(url, budget), snapshot(competitorUrl, budget)]);
    return { own, competitor, competitorUrl };
  },
  analyze: ({ own, competitor, competitorUrl }, s) => {
    const ownChecks = quickChecks(own.page, { ogHead: own.ogHead });
    const compUsable = !!competitor && competitor.page.reachable;
    const compChecks = compUsable ? quickChecks(competitor!.page, { ogHead: competitor!.ogHead }) : null;

    for (const c of ownChecks) {
      const rival = compChecks?.find((x) => x.key === c.key) ?? null;
      const behind = rival ? RANK[rival.status] > RANK[c.status] : false;
      s.check(
        c.group,
        1,
        c.status,
        c.label,
        {
          pass: `Sizde: ${c.value}${rival ? ` · Rakipte: ${rival.value}` : ''}`,
          warn: `Sizde: ${c.value}${rival ? ` · Rakipte: ${rival.value}` : ''}`,
          fail: `Sizde: ${c.value}${rival ? ` · Rakipte: ${rival.value}` : ''}`,
        },
        {
          fix: behind ? `${c.label}: rakibiniz bu maddede önde — sizde de düzeltin` : `${c.label} düzeltin`,
          evidence: rival ? `rakip: ${rival.status}` : undefined,
          topic: TOPIC[c.key],
        },
      );
    }

    const ownScore = scoreChecks(ownChecks);
    const compScore = compChecks ? scoreChecks(compChecks) : null;
    const rows = compareRows(ownChecks, compChecks);
    const competitorAhead = rows.filter((r) => r.leader === 'competitor').length;
    const ownAhead = rows.filter((r) => r.leader === 'own').length;
    const ties = rows.filter((r) => r.leader === 'tie').length;

    if (competitor?.page.waf) s.note('identity', 'Rakip site bot koruması nedeniyle taranamadı', 'Rakip sütunu boş; yalnız sizin siteniz puanlandı.', 'warn');
    else if (!compUsable) s.note('identity', 'Rakip site okunamadı', 'Rakip adres yanıt vermedi ya da gövde boş; rakip sütunu boş.', 'warn');

    const summary = compUsable
      ? `14 maddenin ${competitorAhead}’inde rakibiniz önde, ${ownAhead}’inde siz öndesiniz, ${ties} madde eşit`
      : 'Rakip site okunamadı; yalnız sizin siteniz puanlandı';

    return {
      page: own.page,
      extra: {
        own: {
          hostname: own.page.hostname,
          url: own.page.finalUrl,
          score: ownScore.score,
          breakdown: ownScore.breakdown,
          waf: own.page.waf,
          reachable: own.page.reachable,
        },
        competitor: {
          hostname: competitor?.page.hostname ?? new URL(competitorUrl).hostname,
          url: competitor?.page.finalUrl ?? competitorUrl,
          score: compScore?.score ?? null,
          breakdown: compScore?.breakdown ?? null,
          waf: competitor?.page.waf ?? false,
          reachable: compUsable,
        },
        rows,
        competitorAhead,
        ownAhead,
        ties,
        summary,
      },
    };
  },
});

const TOPIC: Record<QuickCheckKey, string> = {
  title: 'title',
  description: 'metaDescription',
  h1: 'h1',
  canonical: 'canonical',
  viewport: 'performance',
  lang: 'languageSignals',
  ogImage: 'ogImage',
  ogImageAbsolute: 'ogImage',
  jsonLdTypes: 'organizationSchema',
  organizationSchema: 'organizationSchema',
  https: 'https',
  hsts: 'securityHeaders',
  gptBotAllowed: 'robots',
  llmsTxt: 'llmsTxt',
};
