/**
 * Bağlayıcı hataları — tek biçim. Kullanıcıya gösterilen mesajlar kısa ve eyleme dönük;
 * ham sağlayıcı cevabı/secret asla mesaja girmez (loglara sanitize edilerek yazılır).
 * Kod listesi ve kullanıcı metinleri `messages.ts`'te (istemci de aynı sabiti kullanır).
 */
import type { CommerceProvider } from '@independentai/db';

import { USER_MESSAGES, type CommerceErrorCode } from './messages';
export { USER_MESSAGES, CALLBACK_MESSAGES, commerceMessage, isCommerceErrorCode } from './messages';
export type { CommerceErrorCode } from './messages';

const RETRYABLE: ReadonlySet<CommerceErrorCode> = new Set(['RATE_LIMITED', 'UPSTREAM_ERROR', 'NETWORK']);

export class CommerceError extends Error {
  readonly code: CommerceErrorCode;
  readonly provider: CommerceProvider | null;
  readonly retryable: boolean;
  readonly retryAfterMs: number | null;
  readonly status: number | null;
  constructor(
    code: CommerceErrorCode,
    message: string,
    opts: {
      provider?: CommerceProvider | null;
      retryAfterMs?: number | null;
      status?: number | null;
      cause?: unknown;
    } = {},
  ) {
    super(message, opts.cause ? { cause: opts.cause } : undefined);
    this.name = 'CommerceError';
    this.code = code;
    this.provider = opts.provider ?? null;
    this.retryable = RETRYABLE.has(code);
    this.retryAfterMs = opts.retryAfterMs ?? null;
    this.status = opts.status ?? null;
  }
}

/** HTTP durumundan sağlayıcı-bağımsız hata */
export function fromHttpStatus(
  status: number,
  provider: CommerceProvider,
  retryAfterHeader?: string | null,
): CommerceError {
  if (status === 401) return new CommerceError('AUTH_INVALID', USER_MESSAGES.AUTH_INVALID, { provider, status });
  if (status === 403) return new CommerceError('SCOPE_MISSING', USER_MESSAGES.SCOPE_MISSING, { provider, status });
  if (status === 404) return new CommerceError('NOT_FOUND', USER_MESSAGES.NOT_FOUND, { provider, status });
  if (status === 429) {
    const sec = Number(retryAfterHeader ?? 0);
    return new CommerceError('RATE_LIMITED', USER_MESSAGES.RATE_LIMITED, {
      provider,
      status,
      retryAfterMs: Number.isFinite(sec) && sec > 0 ? sec * 1000 : 5000,
    });
  }
  if (status >= 500) return new CommerceError('UPSTREAM_ERROR', USER_MESSAGES.UPSTREAM_ERROR, { provider, status });
  return new CommerceError('UPSTREAM_ERROR', `Sağlayıcı beklenmeyen durum döndürdü (${status})`, { provider, status });
}

/** Bilinmeyen hatayı CommerceError'a çevirir (mesaj sızıntısız). */
export function normalizeCommerceError(err: unknown, provider: CommerceProvider): CommerceError {
  if (err instanceof CommerceError) return err;
  const name = err instanceof Error ? err.name : '';
  const msg = err instanceof Error ? err.message : String(err);
  if (name === 'AbortError' || name === 'TimeoutError' || /timeout|ECONN|ENOTFOUND|EAI_AGAIN|fetch failed/i.test(msg)) {
    return new CommerceError('NETWORK', USER_MESSAGES.NETWORK, { provider, cause: err });
  }
  if (name === 'UnsafeUrlError')
    return new CommerceError('INVALID_STORE', USER_MESSAGES.INVALID_STORE, { provider, cause: err });
  return new CommerceError('UPSTREAM_ERROR', USER_MESSAGES.UPSTREAM_ERROR, { provider, cause: err });
}
