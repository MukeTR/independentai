/**
 * Görünürlük metrikleri — TEK kaynak (UI, API v1, raporlar ve uyarılar aynı fonksiyonları kullanır).
 *
 * Tanımlar (docs/METRICS.md ile birebir):
 *  - Geçerli run: status = SUCCESS (hata/mock dışı). Hatalı run'lar HİÇBİR paydaya girmez.
 *    Mock run'lar yalnızca mock modda (yerel) sayılır; production'da üretilmez.
 *  - Visibility (görünürlük) = kendi markanın en az bir kez geçtiği geçerli run sayısı / geçerli run sayısı × 100
 *  - Share of Voice (SoV) = kendi marka bahis sayısı / (kendi + rakip bahis sayısı) × 100
 *    (bahis = run başına marka başına EN FAZLA 1; yani "kaç run'da geçti" sayımı)
 *  - Ortalama pozisyon = kendi markanın geçtiği run'lardaki pozisyonların ortalaması (düşük = iyi)
 *  - Öneri oranı = kendi bahislerinin % kaçı RECOMMENDED
 */

export type MetricRun = {
  status?: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR' | string;
  errorMessage?: string | null;
  isMocked?: boolean;
  mentions: {
    isOwnBrand: boolean;
    isCompetitor: boolean;
    position?: number;
    mentionType?: string;
    sentiment?: string;
    mentionName?: string;
  }[];
};

export function isValidRun(r: MetricRun): boolean {
  if (r.status) return r.status === 'SUCCESS';
  return !r.errorMessage;
}

export function pct(num: number, den: number): number {
  return den > 0 ? Math.round((num / den) * 100) : 0;
}

export function visibilityOf(runs: MetricRun[]): number {
  const valid = runs.filter(isValidRun);
  const withOwn = valid.filter((r) => r.mentions.some((m) => m.isOwnBrand)).length;
  return pct(withOwn, valid.length);
}

export function shareOfVoiceOf(runs: MetricRun[]): number {
  const valid = runs.filter(isValidRun);
  let own = 0;
  let comp = 0;
  for (const r of valid) {
    if (r.mentions.some((m) => m.isOwnBrand)) own += 1;
    // rakip bahisleri: run içinde farklı rakip adları
    const names = new Set(r.mentions.filter((m) => m.isCompetitor).map((m) => m.mentionName ?? ''));
    comp += names.size;
  }
  return pct(own, own + comp);
}

export function avgOwnPosition(runs: MetricRun[]): number | null {
  const positions: number[] = [];
  for (const r of runs.filter(isValidRun)) {
    const own = r.mentions.find((m) => m.isOwnBrand);
    if (own?.position) positions.push(own.position);
  }
  if (!positions.length) return null;
  return Math.round((positions.reduce((s, x) => s + x, 0) / positions.length) * 10) / 10;
}

export function recommendRate(runs: MetricRun[]): number {
  const own = runs.filter(isValidRun).flatMap((r) => r.mentions.filter((m) => m.isOwnBrand));
  return pct(own.filter((m) => m.mentionType === 'RECOMMENDED').length, own.length);
}

export const SENTIMENT_SCORE = { POSITIVE: 100, NEUTRAL: 50, NEGATIVE: 0 } as const;
