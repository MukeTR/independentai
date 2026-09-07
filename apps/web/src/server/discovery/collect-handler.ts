/**
 * Tarayıcı collector'ının ortak akışı — `/event` ve `/batch` uçları bunu kullanır.
 * Tek fark parti boyutu üst sınırıdır.
 */
import { after, NextResponse, type NextRequest } from 'next/server';
import { clientIp } from '../rate-limit';
import { log } from '../logger';
import { BatchSchema, IncomingEventSchema } from './events';
import { authorizeSite, enforceCollectorLimits, ingestBatch, IngestError } from './ingest';
import { collectorError, collectorOk, parseJson, readRawBody } from './http';
import { originAllowed, resolveSiteByPublicKey } from './sites';

export async function handleBrowserCollect(req: NextRequest, maxEvents: number): Promise<NextResponse> {
  const origin = req.headers.get('origin');
  try {
    const raw = await readRawBody(req);
    const body = parseJson<{ k?: unknown; e?: unknown }>(raw);
    // Tek olay da kabul edilir: { k, e: {...} } → { k, e: [{...}] }
    const events = Array.isArray(body.e) ? body.e : body.e ? [body.e] : [];
    const parsed = BatchSchema.safeParse({ k: body.k, e: events });
    if (!parsed.success) throw new IngestError(400, 'invalid_payload', 'Geçersiz olay gövdesi');
    if (parsed.data.e.length > maxEvents) throw new IngestError(413, 'too_many_events', 'Parti çok büyük');

    const site = await authorizeSite(parsed.data.k, origin);
    await enforceCollectorLimits(site, clientIp(req), parsed.data.e.length);

    // Yanıt hemen döner (202); yazma ve sınıflandırma yanıt sonrası yapılır.
    after(async () => {
      try {
        await ingestBatch(site, parsed.data.e);
      } catch (err) {
        log.error('collect.ingest_failed', { siteId: site.id, err });
      }
    });

    return collectorOk({ received: parsed.data.e.length }, site, origin);
  } catch (err) {
    return collectorError(err, origin);
  }
}

/** Önden yoklama: yalnızca `?k=<public key>` ve kayıtlı origin için izin verilir. */
export async function handleCollectPreflight(req: NextRequest): Promise<NextResponse> {
  const origin = req.headers.get('origin');
  const key = req.nextUrl.searchParams.get('k');
  if (!origin || !key) return new NextResponse(null, { status: 403, headers: { Vary: 'Origin' } });
  const site = await resolveSiteByPublicKey(key);
  if (!site || site.status === 'REVOKED' || !originAllowed(site, origin)) {
    return new NextResponse(null, { status: 403, headers: { Vary: 'Origin' } });
  }
  return new NextResponse(null, {
    status: 204,
    headers: {
      Vary: 'Origin',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
    },
  });
}

export { IncomingEventSchema };
