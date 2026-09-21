/**
 * Zaman aşımı + sınırlı retry/backoff + hata sınıflandırma — tüm adapter'lar ortak kullanır.
 */
import { AiProviderError, type AiErrorCode, type ProviderId } from './types';

export const DEFAULT_TIMEOUT_MS = 40_000;
const MAX_ATTEMPTS = 2; // 1 deneme + 1 retry (yalnızca retryable hatalarda)

export function classifyError(provider: ProviderId, err: unknown): AiProviderError {
  if (err instanceof AiProviderError) return err;
  const e = err as { status?: number; code?: string; name?: string; message?: string; error?: { code?: string } };
  const status = typeof e?.status === 'number' ? e.status : undefined;
  const msg = (e?.message ?? String(err)).slice(0, 300);
  let code: AiErrorCode = 'unknown';
  if (e?.name === 'AbortError' || /timeout|timed out|aborted/i.test(msg)) code = 'timeout';
  else if (status === 401 || status === 403 || /api key|unauthori|permission/i.test(msg)) code = 'auth';
  else if (status === 429 || /rate limit|quota|resource_exhausted|overloaded/i.test(msg)) code = 'rate_limit';
  else if (status && status >= 500) code = 'server';
  else if (
    status === 400 ||
    status === 404 ||
    status === 422 ||
    /invalid|not found|unsupported|does not exist/i.test(msg)
  )
    code = 'invalid';
  else if (/ECONNRESET|ENOTFOUND|EAI_AGAIN|fetch failed|network/i.test(msg)) code = 'server';
  return new AiProviderError(provider, code, `${provider} ${code}: ${msg}`, { status, cause: err });
}

export async function withTimeout<T>(ms: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error(`timeout after ${ms}ms`)), ms);
  try {
    return await fn(ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
}

/** retryable hatalarda 1 kez, jitter'lı backoff ile yeniden dener. */
export async function withRetry<T>(provider: ProviderId, fn: (attempt: number) => Promise<T>): Promise<T> {
  let last: AiProviderError | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      last = classifyError(provider, err);
      if (!last.retryable || attempt === MAX_ATTEMPTS) throw last;
      const backoff = 800 * attempt + Math.random() * 400;
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw last ?? new AiProviderError(provider, 'unknown', 'unknown');
}
