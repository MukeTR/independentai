/**
 * Merkezi hata modeli. Route handler'lar yalnızca bu sınıfları fırlatır;
 * `handleRouteError` bunları tek biçimli, sızıntısız JSON'a çevirir:
 *   { message, code, requestId, details? }
 * `message` alanı geriye dönük uyumluluk için korunur (istemciler onu okur).
 */
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { log, newRequestId } from './logger';

export type ErrorCode =
  | 'bad_request'
  | 'validation_error'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'trial_expired'
  | 'plan_limit'
  | 'provider_unavailable'
  | 'internal';

export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;
  readonly headers?: Record<string, string>;
  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    opts: { details?: Record<string, unknown>; headers?: Record<string, string> } = {},
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = opts.details;
    this.headers = opts.headers;
  }
}

/** Kullanıcıya gösterilmesi güvenli, kasıtlı doğrulama/iş kuralı hataları (400). */
export class ClientError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, 'bad_request', message, { details });
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Yetkisiz') {
    super(401, 'unauthorized', message);
  }
}
export class ForbiddenError extends AppError {
  constructor(message = 'Bu işlem için yetkiniz yok') {
    super(403, 'forbidden', message);
  }
}
export class NotFoundError extends AppError {
  constructor(message = 'Bulunamadı') {
    super(404, 'not_found', message);
  }
}
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'conflict', message);
  }
}
export class RateLimitedError extends AppError {
  constructor(message: string, retryAfterSec: number, extra: Record<string, string> = {}) {
    super(429, 'rate_limited', message, {
      headers: { 'Retry-After': String(Math.max(1, Math.ceil(retryAfterSec))), ...extra },
    });
  }
}
export class TrialExpiredError extends AppError {
  constructor(message = 'Deneme süreniz doldu. Hesabınız salt-okunur modda; verileriniz korunuyor.') {
    super(403, 'trial_expired', message);
  }
}
export class PlanLimitError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(403, 'plan_limit', message, { details });
  }
}
export class ProviderUnavailableError extends AppError {
  constructor(message = 'AI sağlayıcı yapılandırılmamış') {
    super(503, 'provider_unavailable', message);
  }
}

export function jsonError(message: string, status = 400, code?: ErrorCode) {
  return NextResponse.json(
    {
      message,
      code:
        code ??
        (status === 401 ? 'unauthorized' : status === 404 ? 'not_found' : status === 409 ? 'conflict' : 'bad_request'),
    },
    { status },
  );
}

export function handleRouteError(err: unknown, ctx: { requestId?: string; route?: string } = {}): NextResponse {
  const requestId = ctx.requestId ?? newRequestId();

  if (err instanceof AppError) {
    if (err.status >= 500) log.error('route.error', { requestId, route: ctx.route, code: err.code, err });
    const res = NextResponse.json(
      { message: err.message, code: err.code, requestId, ...(err.details ? { details: err.details } : {}) },
      { status: err.status },
    );
    for (const [k, v] of Object.entries(err.headers ?? {})) res.headers.set(k, v);
    res.headers.set('x-request-id', requestId);
    return res;
  }

  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const msg = issue?.message || 'Geçersiz giriş';
    const res = NextResponse.json(
      { message: msg, code: 'validation_error', requestId, details: { path: issue?.path?.join('.') ?? '' } },
      { status: 400 },
    );
    res.headers.set('x-request-id', requestId);
    return res;
  }

  // Body parse hataları (geçersiz JSON) → 400
  if (err instanceof SyntaxError) {
    const res = NextResponse.json(
      { message: 'Geçersiz JSON gövdesi', code: 'bad_request', requestId },
      { status: 400 },
    );
    res.headers.set('x-request-id', requestId);
    return res;
  }

  // Beklenmeyen: iç detay loglanır, istemciye generic mesaj + requestId döner.
  log.error('route.unhandled', { requestId, route: ctx.route, err });
  const res = NextResponse.json(
    { message: 'İşlem sırasında bir hata oluştu', code: 'internal', requestId },
    { status: 500 },
  );
  res.headers.set('x-request-id', requestId);
  return res;
}

/** JSON gövdeyi güvenli okur (boş/geçersiz gövde → ClientError). */
export async function readJson<T = unknown>(req: Request, maxBytes = 64 * 1024): Promise<T> {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > maxBytes) throw new ClientError('İstek gövdesi çok büyük');
  const text = await req.text();
  if (text.length > maxBytes) throw new ClientError('İstek gövdesi çok büyük');
  if (!text.trim()) throw new ClientError('İstek gövdesi boş');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ClientError('Geçersiz JSON gövdesi');
  }
}
