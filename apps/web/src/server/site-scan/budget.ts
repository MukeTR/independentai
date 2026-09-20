/**
 * Tarama bütçesi — bir site aracının tek taramada yapabileceği ağ işini sınırlar:
 *  - `maxRequests` (istek sayısı), `maxBytes` (indirilen metin), `deadlineAt` (mutlak zaman) ve host başına
 *    eşzamanlılık (`perHost`, varsayılan 4) — siteyi taramaya boğmayı ve Vercel 60 s sınırını aşmayı engeller.
 *  - Bütçe dolduğunda `fetch()` ağa çıkmadan `error:'budget'` Artifact döner; çağıran `partial:true` işaretler.
 *  - Tüm istekler SSRF-güvenli yoldan geçer (`fetchArtifact` → `safeFetch`); düz fetch YOK.
 *  - `head()` yalnız başlık okur (`safeFetch method:'HEAD'`): content-type izinli olmasa da `status/headers` döner
 *    (görsel og:image, .gz sitemap için ham gövde gerekmez — MF-1).
 *  - Tek istek gövdesi her zaman ≤ `MAX_BODY_BYTES` (safe-fetch, 2 MB): paralel istekler kalan bütçenin tamamını
 *    ayrı ayrı alamaz (perHost × maxBytes şişmesi yok); toplam `maxBytes` ayrıca sayılır.
 */
import { MAX_BODY_BYTES, safeFetch, UnsafeUrlError } from '../safe-fetch';
import { fetchArtifact, type Artifact, type ArtifactInit } from '../commerce/scoring';

export type BudgetOptions = {
  maxRequests: number;
  maxBytes: number;
  /** Mutlak epoch ms; geçildiğinde bütçe dolu sayılır */
  deadlineAt: number;
  /** Aynı host'a eşzamanlı istek tavanı */
  perHost?: number;
};

export type BudgetExhaustReason = 'requests' | 'bytes' | 'deadline';

export type BudgetStats = {
  requests: number;
  bytes: number;
  /** Bütçe yaratıldığından beri geçen süre */
  ms: number;
  exhausted: boolean;
  reason: BudgetExhaustReason | null;
  /** Bütçe nedeniyle ağa çıkmadan reddedilen istek sayısı */
  skipped: number;
};

export type HeadResult = {
  status: number;
  ok: boolean;
  url: string;
  headers: Headers;
  contentType: string | null;
  contentLength: number | null;
  latencyMs: number;
  redirects: Artifact['redirects'];
  error?: Artifact['error'];
};

type HostSlot = { active: number; queue: (() => void)[] };

export class ScanBudget {
  readonly maxRequests: number;
  readonly maxBytes: number;
  readonly deadlineAt: number;
  readonly perHost: number;
  private requests = 0;
  private bytes = 0;
  private skipped = 0;
  private readonly startedAt = Date.now();
  private readonly hosts = new Map<string, HostSlot>();

  constructor(opts: BudgetOptions) {
    this.maxRequests = Math.max(1, Math.floor(opts.maxRequests));
    this.maxBytes = Math.max(1, Math.floor(opts.maxBytes));
    this.deadlineAt = opts.deadlineAt;
    this.perHost = Math.max(1, Math.floor(opts.perHost ?? 4));
  }

  get exhaustReason(): BudgetExhaustReason | null {
    if (Date.now() >= this.deadlineAt) return 'deadline';
    if (this.requests >= this.maxRequests) return 'requests';
    if (this.bytes >= this.maxBytes) return 'bytes';
    return null;
  }

  get exhausted(): boolean {
    return this.exhaustReason !== null;
  }

  /** Kalan süre (ms), en az 0 */
  get remainingMs(): number {
    return Math.max(0, this.deadlineAt - Date.now());
  }

  get remainingRequests(): number {
    return Math.max(0, this.maxRequests - this.requests);
  }

  stats(): BudgetStats {
    return {
      requests: this.requests,
      bytes: this.bytes,
      ms: Date.now() - this.startedAt,
      exhausted: this.exhausted,
      reason: this.exhaustReason,
      skipped: this.skipped,
    };
  }

  /**
   * SSRF-güvenli GET (fetchArtifact üzerinden). Bütçe doluysa ağa çıkmadan `error:'budget'` döner.
   * Zaman aşımı `ms` ile kalan süreden küçük olanıdır. Host başına semafor uygulanır.
   * Gövde sınırı: `min(MAX_BODY_BYTES, init.maxBytes ?? kalan bütçe)`.
   */
  async fetch(url: string, ms: number, init: ArtifactInit = {}): Promise<Artifact> {
    if (this.exhausted) return this.budgetArtifact(url);
    const host = hostOf(url);
    await this.acquire(host);
    try {
      if (this.exhausted) return this.budgetArtifact(url);
      this.requests += 1;
      const timeout = Math.max(250, Math.min(ms, this.remainingMs || 250));
      const maxBytes = Math.min(MAX_BODY_BYTES, init.maxBytes ?? Math.max(1024, this.maxBytes - this.bytes));
      const a = await fetchArtifact(url, timeout, { ...init, maxBytes });
      this.bytes += Buffer.byteLength(a.text, 'utf8');
      return a;
    } finally {
      this.release(host);
    }
  }

  /** Yalnız başlıklar (HEAD). Content-type izinli olmasa da status/headers döner. Bütçe doluysa `error:'budget'`. */
  async head(url: string, ms: number, init: ArtifactInit = {}): Promise<HeadResult> {
    const start = Date.now();
    const empty = (error: Artifact['error'], status = 0): HeadResult => ({
      status,
      ok: false,
      url,
      headers: new Headers(),
      contentType: null,
      contentLength: null,
      latencyMs: Date.now() - start,
      redirects: [],
      error,
    });
    if (this.exhausted) {
      this.skipped += 1;
      return empty('budget');
    }
    const host = hostOf(url);
    await this.acquire(host);
    try {
      if (this.exhausted) {
        this.skipped += 1;
        return empty('budget');
      }
      this.requests += 1;
      const timeout = Math.max(250, Math.min(ms, this.remainingMs || 250));
      let timer: ReturnType<typeof setTimeout> | undefined;
      const res = await Promise.race([
        safeFetch(url, { method: 'HEAD', timeout, ...(init.headers ? { headers: init.headers } : {}) }),
        new Promise<'timeout'>((r) => {
          timer = setTimeout(() => r('timeout'), timeout + 500);
        }),
      ]).finally(() => clearTimeout(timer));
      if (res === 'timeout') return empty('timeout');
      if (!res) return empty('network');
      const lenRaw = res.headers.get('content-length');
      const len = lenRaw != null && lenRaw !== '' ? Number(lenRaw) : NaN;
      return {
        status: res.status,
        ok: res.status > 0 && res.status < 400,
        url: res.url,
        headers: res.headers,
        contentType: res.headers.get('content-type'),
        contentLength: Number.isFinite(len) && len >= 0 ? len : null,
        latencyMs: Date.now() - start,
        redirects: res.redirects ?? [],
      };
    } catch (err) {
      return empty(err instanceof UnsafeUrlError ? 'unsafe' : 'network');
    } finally {
      this.release(host);
    }
  }

  private budgetArtifact(url: string): Artifact {
    this.skipped += 1;
    return {
      ok: false,
      status: 0,
      text: '',
      url,
      headers: new Headers(),
      latencyMs: 0,
      truncated: false,
      redirects: [],
      error: 'budget',
    };
  }

  private acquire(host: string): Promise<void> {
    let slot = this.hosts.get(host);
    if (!slot) {
      slot = { active: 0, queue: [] };
      this.hosts.set(host, slot);
    }
    if (slot.active < this.perHost) {
      slot.active += 1;
      return Promise.resolve();
    }
    const s = slot;
    return new Promise<void>((resolve) => {
      s.queue.push(() => {
        s.active += 1;
        resolve();
      });
    });
  }

  private release(host: string): void {
    const slot = this.hosts.get(host);
    if (!slot) return;
    slot.active = Math.max(0, slot.active - 1);
    const next = slot.queue.shift();
    if (next) next();
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return url;
  }
}
