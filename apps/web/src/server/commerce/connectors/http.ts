/**
 * Bağlayıcı HTTP yardımcıları: sağlayıcı yanıt gövdesini sınırlı okuma (devasa yanıt/sıkıştırma bombası
 * koruması) ve ortak istek başlıkları.
 */
import type { CommerceProvider } from '@independentai/db';
import { CommerceError } from '../errors';

export const USER_AGENT = 'IndependentAI-Commerce/1.0 (+https://independentai.space)';
/** Sağlayıcı yanıtı için üst sınır (brief: 5 MB). */
export const MAX_PROVIDER_BODY_BYTES = 5 * 1024 * 1024;

export class BodyTooLargeError extends CommerceError {
  constructor(provider: CommerceProvider, limit: number) {
    super('UPSTREAM_ERROR', `Sağlayıcı yanıtı çok büyük (>${Math.round(limit / 1024 / 1024)} MB)`, { provider });
    this.name = 'BodyTooLargeError';
  }
}

/** Gövdeyi akış halinde okur; sınır aşılırsa okuma iptal edilir ve BodyTooLargeError fırlatılır. */
export async function readBodyCapped(
  res: Response,
  provider: CommerceProvider,
  maxBytes = MAX_PROVIDER_BODY_BYTES,
): Promise<string> {
  const declared = Number(res.headers.get('content-length') ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    try {
      await res.body?.cancel();
    } catch {
      /* yoksay */
    }
    throw new BodyTooLargeError(provider, maxBytes);
  }
  const body = res.body;
  if (!body) return '';
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) throw new BodyTooLargeError(provider, maxBytes);
      chunks.push(value);
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* yoksay */
    }
  }
  const merged = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    merged.set(c, off);
    off += c.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(merged);
}
