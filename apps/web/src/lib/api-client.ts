'use client';

/**
 * İstemci tarafı API yardımcıları — her istekte res.ok kontrolü, sunucu hata mesajı,
 * zaman aşımı ve ağ hatası için tek biçimli ApiError.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  constructor(status: number, code: string, message: string, requestId?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export async function apiFetch<T = unknown>(
  url: string,
  init: RequestInit & { timeoutMs?: number; json?: unknown } = {},
): Promise<T> {
  const { timeoutMs = 60_000, json, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...rest,
      headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(rest.headers ?? {}) },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      signal: ctrl.signal,
      credentials: 'same-origin',
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
      throw new ApiError(
        res.status,
        d.code ?? 'error',
        d.message ??
          (res.status === 429 ? 'Çok fazla istek, biraz sonra tekrar deneyin.' : `İstek başarısız (${res.status})`),
        d.requestId,
      );
    }
    return data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError')
      throw new ApiError(0, 'timeout', 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.');
    throw new ApiError(0, 'network', 'Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.');
  } finally {
    clearTimeout(timer);
  }
}

export function errorMessage(err: unknown, fallback = 'Bir hata oluştu'): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}
