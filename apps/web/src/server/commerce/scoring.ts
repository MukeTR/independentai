/**
 * Commerce denetimlerinin ortak skor çerçevesi.
 *
 *  - Her eksen 0-100 arası puanlanır: eksen içindeki kontrollerin ağırlıklı toplamı
 *    (pass = tam puan, warn = yarım puan, fail = 0) eksenin toplam ağırlığına normalize edilir.
 *  - Genel skor = Σ(eksen skoru × eksen ağırlığı); ağırlıklar her denetimde belgelidir
 *    (docs/COMMERCE_SCORING.md) ve sonuçla birlikte istemciye de döner (şeffaflık).
 *  - Deterministik: aynı girdi → aynı skor ve aynı bulgu sırası. LLM yok.
 *  - `packages/shared/src/metrics.ts` (görünürlük/SoV) ile ilişkisi yoktur; oradaki formüller
 *    burada kopyalanmaz.
 */
import { safeFetch, UnsafeUrlError, type SafeFetchResult } from '../safe-fetch';

export type FindingStatus = 'pass' | 'warn' | 'fail';

export type CommerceFinding = {
  /** Eksen anahtarı (breakdown ile aynı) */
  category: string;
  status: FindingStatus;
  title: string;
  detail: string;
  fix?: string;
  /** Kanıt: bulunan değer, kural satırı, URL vb. (kısa) */
  evidence?: string;
  /** Rehber konusu (guides.ts) */
  topic?: string;
  /** Kontrolün eksen içindeki ağırlığı */
  weight: number;
};

export type Difficulty = 'Kolay' | 'Orta' | 'Zor';
export type Impact = 'Yüksek' | 'Orta' | 'Düşük';

export type Recommendation = {
  title: string;
  difficulty: Difficulty;
  impact: Impact;
  detail: string;
  /** Eksen anahtarı */
  category: string;
  /** Platforma özel adımlar (guides.ts) */
  steps?: string[];
};

export type AxisSpec<K extends string> = { key: K; label: string; weight: number; description: string };

/** Eksen tanımlarını doğrular (ağırlık toplamı 100 olmalı — belge ile kodun uyuşması). */
export function assertWeights<K extends string>(axes: AxisSpec<K>[]): AxisSpec<K>[] {
  const total = axes.reduce((s, a) => s + a.weight, 0);
  if (total !== 100) throw new Error(`Eksen ağırlıkları 100 olmalı (şu an ${total})`);
  return axes;
}

export class Scorer<K extends string> {
  readonly findings: CommerceFinding[] = [];
  private readonly earned = new Map<K, number>();
  private readonly possible = new Map<K, number>();

  constructor(private readonly axes: AxisSpec<K>[]) {
    for (const a of axes) {
      this.earned.set(a.key, 0);
      this.possible.set(a.key, 0);
    }
  }

  /**
   * Bir kontrol ekler. `status` boolean verilirse pass/fail; 'warn' yarım puan.
   * `weight` eksen içindeki göreli ağırlıktır (eksen 100'e normalize edilir).
   */
  check(
    axis: K,
    weight: number,
    status: FindingStatus | boolean,
    title: string,
    detail: { pass: string; fail: string; warn?: string },
    opts: { fix?: string; evidence?: string; topic?: string } = {},
  ): FindingStatus {
    const st: FindingStatus = typeof status === 'boolean' ? (status ? 'pass' : 'fail') : status;
    const factor = st === 'pass' ? 1 : st === 'warn' ? 0.5 : 0;
    this.earned.set(axis, (this.earned.get(axis) ?? 0) + weight * factor);
    this.possible.set(axis, (this.possible.get(axis) ?? 0) + weight);
    this.findings.push({
      category: axis,
      status: st,
      title,
      detail: st === 'pass' ? detail.pass : st === 'warn' ? (detail.warn ?? detail.fail) : detail.fail,
      ...(st !== 'pass' && opts.fix ? { fix: opts.fix } : {}),
      ...(opts.evidence ? { evidence: opts.evidence } : {}),
      ...(opts.topic ? { topic: opts.topic } : {}),
      weight,
    });
    return st;
  }

  /** Bilgi notu (puanı etkilemez). */
  note(axis: K, title: string, detail: string, status: FindingStatus = 'warn', evidence?: string) {
    this.findings.push({ category: axis, status, title, detail, weight: 0, ...(evidence ? { evidence } : {}) });
  }

  axisScore(axis: K): number {
    const p = this.possible.get(axis) ?? 0;
    if (p === 0) return 0;
    return Math.round(((this.earned.get(axis) ?? 0) / p) * 100);
  }

  breakdown(): Record<K, number> {
    const out = {} as Record<K, number>;
    for (const a of this.axes) out[a.key] = this.axisScore(a.key);
    return out;
  }

  /** Genel skor; `only` verilirse yalnızca o eksenler üzerinden ağırlıklar yeniden normalize edilir. */
  total(only?: K[]): number {
    const axes = only ? this.axes.filter((a) => only.includes(a.key)) : this.axes;
    const wsum = axes.reduce((s, a) => s + a.weight, 0);
    if (wsum === 0) return 0;
    const sum = axes.reduce((s, a) => s + this.axisScore(a.key) * a.weight, 0);
    return Math.round(sum / wsum);
  }
}

/** Bulgulardan öneri listesi türetir: fail > warn; etki eksen ağırlığı × kontrol ağırlığına göre. */
export function recommendationsFrom<K extends string>(
  findings: CommerceFinding[],
  axes: AxisSpec<K>[],
  guide: (topic: string | undefined, axis: string) => { steps: string[]; difficulty: Difficulty } | null,
  max = 8,
): Recommendation[] {
  const axisWeight = new Map<string, number>(axes.map((a) => [a.key, a.weight]));
  const scored = findings
    .filter((f) => f.status !== 'pass' && f.weight > 0 && f.fix)
    .map((f) => {
      const w = (axisWeight.get(f.category) ?? 0) * f.weight * (f.status === 'fail' ? 1 : 0.5);
      return { f, w };
    })
    .sort((a, b) => b.w - a.w || a.f.title.localeCompare(b.f.title, 'tr'));
  const out: Recommendation[] = [];
  for (const { f, w } of scored.slice(0, max)) {
    const g = guide(f.topic, f.category);
    const impact: Impact = w >= 200 ? 'Yüksek' : w >= 80 ? 'Orta' : 'Düşük';
    out.push({
      title: f.fix ?? f.title,
      difficulty: g?.difficulty ?? 'Orta',
      impact,
      detail: f.detail,
      category: f.category,
      ...(g?.steps.length ? { steps: g.steps } : {}),
    });
  }
  return out;
}

// ───────────── ağ yardımcıları (zaman bütçeli) ─────────────

export type Artifact = {
  ok: boolean;
  status: number;
  text: string;
  url: string;
  headers: Headers;
  latencyMs: number;
  truncated: boolean;
  redirects: SafeFetchResult['redirects'];
  /** Ağ hatası / zaman aşımı / güvensiz URL: metin yok */
  error?: 'network' | 'timeout' | 'unsafe';
};

/**
 * SSRF-güvenli ve zaman bütçeli tek kaynak çekimi. Hata fırlatmaz; `error` alanı doldurur.
 * Güvensiz URL (özel ağ vb.) → error:'unsafe' (çağıran ana URL için önceden parsePublicUrl uygular).
 */
export async function fetchArtifact(url: string, timeoutMs: number): Promise<Artifact> {
  const start = Date.now();
  const empty = (error: Artifact['error']): Artifact => ({
    ok: false,
    status: 0,
    text: '',
    url,
    headers: new Headers(),
    latencyMs: Date.now() - start,
    truncated: false,
    redirects: [],
    error,
  });
  try {
    const res = await Promise.race([
      safeFetch(url, { timeout: timeoutMs }),
      new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), timeoutMs + 500)),
    ]);
    if (res === 'timeout') return empty('timeout');
    if (!res) return empty('network');
    return {
      ok: res.ok,
      status: res.status,
      text: res.text,
      url: res.url,
      headers: res.headers,
      latencyMs: Date.now() - start,
      truncated: res.truncated,
      redirects: res.redirects ?? [],
    };
  } catch (err) {
    if (err instanceof UnsafeUrlError) return empty('unsafe');
    return empty('network');
  }
}

/** Toplam bütçe koruması: süre dolarsa `fallback` döner (kısmi sonuç). */
export async function withBudget<T>(p: Promise<T>, ms: number, fallback: () => T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      p,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback()), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function ms(n: number): string {
  return `${Math.round(n)} ms`;
}
