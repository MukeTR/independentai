/**
 * Collector HTTP yardımcıları: gövde okuma, dinamik CORS ve tek biçimli hata cevabı.
 *
 * CORS: yalnızca sitenin kayıtlı origin'i yansıtılır (`*` yok, credential yok) ve `Vary: Origin`
 * eklenir. SDK, önden yoklamayı (preflight) tetiklememek için `text/plain` gövdeyle gönderir;
 * yine de `application/json` kullanan entegrasyonlar için OPTIONS desteklenir.
 */
import { NextResponse } from 'next/server';
import type { TrackedSite } from '@independentai/db';
import { IngestError } from './ingest';

export const COLLECTOR_MAX_BODY = 16 * 1024;

export async function readRawBody(req: Request, max = COLLECTOR_MAX_BODY): Promise<string> {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (Number.isFinite(len) && len > max) throw new IngestError(413, 'payload_too_large', 'Gövde çok büyük');
  const text = await req.text();
  if (text.length > max) throw new IngestError(413, 'payload_too_large', 'Gövde çok büyük');
  return text;
}

export function parseJson<T = unknown>(raw: string): T {
  if (!raw.trim()) throw new IngestError(400, 'empty_body', 'Boş gövde');
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new IngestError(400, 'invalid_json', 'Geçersiz JSON');
  }
}

export function corsHeaders(origin: string | null, allowed: boolean): Record<string, string> {
  const h: Record<string, string> = { Vary: 'Origin' };
  if (origin && allowed) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Max-Age'] = '600';
  }
  return h;
}

/** Site bilinmeden önce hata dönerken bile iç detay sızdırmaz. */
export function collectorError(err: unknown, origin: string | null): NextResponse {
  if (err instanceof IngestError) {
    const res = NextResponse.json(
      { ok: false, code: err.code },
      { status: err.status, headers: corsHeaders(origin, false) },
    );
    if (err.retryAfterSec) res.headers.set('Retry-After', String(err.retryAfterSec));
    return res;
  }
  return NextResponse.json({ ok: false, code: 'internal' }, { status: 500, headers: corsHeaders(origin, false) });
}

export function collectorOk(
  body: Record<string, unknown>,
  site: TrackedSite | null,
  origin: string | null,
): NextResponse {
  const allowed = !!site && !!origin;
  return NextResponse.json({ ok: true, ...body }, { status: 202, headers: corsHeaders(origin, allowed) });
}
