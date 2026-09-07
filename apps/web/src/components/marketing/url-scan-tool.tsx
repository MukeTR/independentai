'use client';

/**
 * URL tabanlı tarama araçlarının ortak kabuğu: form, ?url= ile otomatik başlatma, paylaşım linki,
 * yükleniyor/boş/hata/429 (Retry-After geri sayımı) durumları, erişilebilirlik (label, aria-live).
 * Sonucun nasıl çizileceği `renderResult` ile araca bırakılır.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Link2, Loader2, Search } from 'lucide-react';
import { InlineAlert } from '@/components/ui/inline-alert';
import { ApiError } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';

export type ScanState<T> =
  | { status: 'idle' }
  | { status: 'loading'; url: string }
  | { status: 'done'; url: string; result: T }
  | { status: 'error'; url: string; message: string; code: string; retryAfter?: number };

export class ScanError extends ApiError {
  readonly retryAfter?: number;
  constructor(status: number, code: string, message: string, requestId?: string, retryAfter?: number) {
    super(status, code, message, requestId);
    this.retryAfter = retryAfter;
  }
}

/** apiFetch ile aynı sözleşme; ek olarak 429'da Retry-After başlığını okur. */
export async function scanFetch<T>(endpoint: string, json: unknown, timeoutMs = 60_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(json),
      credentials: 'same-origin',
      signal: ctrl.signal,
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      const d = (data ?? {}) as { message?: string; code?: string; requestId?: string };
      const ra = Number(res.headers.get('retry-after'));
      throw new ScanError(
        res.status,
        d.code ?? 'error',
        d.message ??
          (res.status === 429 ? 'Çok fazla istek, biraz sonra tekrar deneyin.' : `İstek başarısız (${res.status})`),
        d.requestId,
        Number.isFinite(ra) && ra > 0 ? ra : undefined,
      );
    }
    return data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError')
      throw new ScanError(0, 'timeout', 'İstek zaman aşımına uğradı. Sayfa çok yavaş olabilir; tekrar deneyin.');
    throw new ScanError(0, 'network', 'Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.');
  } finally {
    clearTimeout(timer);
  }
}

export function UrlScanTool<T>({
  endpoint,
  path,
  inputLabel,
  placeholder,
  submitLabel,
  loadingLabel,
  loadingHint,
  renderResult,
  autoRun = true,
}: {
  endpoint: string;
  /** Paylaşım linki için sayfa yolu (örn. /arac/ai-crawler-testi) */
  path: string;
  inputLabel: string;
  placeholder: string;
  submitLabel: string;
  loadingLabel: string;
  loadingHint?: string;
  renderResult: (result: T, ctx: { url: string; shareUrl: string }) => ReactNode;
  /** ?url= parametresi varsa otomatik başlat */
  autoRun?: boolean;
}) {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const [url, setUrl] = useState(() => params.get('url') ?? '');
  const [state, setState] = useState<ScanState<T>>({ status: 'idle' });
  const [countdown, setCountdown] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  const run = useCallback(
    async (target: string) => {
      const value = target.trim();
      if (!value) return;
      setState({ status: 'loading', url: value });
      setCountdown(null);
      try {
        const result = await scanFetch<T>(endpoint, { url: value });
        setState({ status: 'done', url: value, result });
      } catch (err) {
        const e =
          err instanceof ScanError
            ? err
            : err instanceof ApiError
              ? new ScanError(err.status, err.code, err.message)
              : null;
        setState({
          status: 'error',
          url: value,
          message: e?.message ?? 'Bir hata oluştu',
          code: e?.code ?? 'error',
          retryAfter: e?.retryAfter,
        });
        if (e?.status === 429) setCountdown(e.retryAfter ?? 60);
      }
    },
    [endpoint],
  );

  // ?url= ile gelen ziyaretçi için otomatik tarama (tek sefer)
  useEffect(() => {
    if (!autoRun || started.current) return;
    const q = params.get('url');
    if (q && q.trim().length >= 3) {
      started.current = true;
      void run(q);
    }
  }, [autoRun, params, run]);

  useEffect(() => {
    if (countdown == null || countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => (c == null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const busy = state.status === 'loading';
  const blocked = countdown != null && countdown > 0;
  const shareUrl = (() => {
    const target = state.status === 'done' ? state.url : url;
    if (typeof window === 'undefined' || !target) return '';
    return `${window.location.origin}${path}?url=${encodeURIComponent(target)}`;
  })();

  async function copyShare() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* pano erişimi yok */
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(url);
        }}
        className="card p-4 sm:p-5"
        aria-busy={busy}
      >
        <label htmlFor="scan-url" className="text-[13px] text-ink-muted">
          {inputLabel}
        </label>
        <div className="flex flex-col sm:flex-row gap-3 mt-1.5">
          <input
            id="scan-url"
            name="url"
            type="text"
            inputMode="url"
            autoComplete="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={placeholder}
            className="input flex-1"
            required
            minLength={3}
            maxLength={300}
            aria-describedby="scan-help"
          />
          <button
            type="submit"
            disabled={!hydrated || busy || blocked || url.trim().length < 3}
            className="btn-primary inline-flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Search className="w-4 h-4" aria-hidden />
            )}
            {busy ? loadingLabel : blocked ? `Bekleyin (${countdown}s)` : submitLabel}
          </button>
        </div>
        <p id="scan-help" className="text-[11.5px] text-ink-faint mt-2">
          Yalnızca herkese açık sayfalar taranır; giriş, e-posta veya kayıt gerekmez. Sonuç anlık bir fotoğraftır.
        </p>
      </form>

      <div aria-live="polite" className="mt-4">
        {state.status === 'loading' && (
          <div className="card p-5 flex items-center gap-3" role="status">
            <Loader2 className="w-5 h-5 animate-spin text-ink-faint" aria-hidden />
            <div>
              <div className="text-[13.5px]">{loadingLabel}</div>
              {loadingHint && <div className="text-[12px] text-ink-faint mt-0.5">{loadingHint}</div>}
            </div>
          </div>
        )}
        {state.status === 'error' && (
          <InlineAlert tone={state.code === 'rate_limited' ? 'warning' : 'error'}>
            {state.message}
            {state.code === 'rate_limited' && blocked && <> Yeniden deneme: {countdown} sn.</>}
          </InlineAlert>
        )}
      </div>

      {state.status === 'done' && (
        <div className="mt-6 space-y-6">
          {renderResult(state.result, { url: state.url, shareUrl })}
          {shareUrl && (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={copyShare}
                className="btn-secondary !py-2 !px-4 inline-flex items-center gap-2 text-[13px]"
              >
                {copied ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Link2 className="w-3.5 h-3.5" aria-hidden />}
                {copied ? 'Bağlantı kopyalandı' : 'Sonuç bağlantısını kopyala'}
              </button>
              <span className="text-[11.5px] text-ink-faint break-all">{shareUrl}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
