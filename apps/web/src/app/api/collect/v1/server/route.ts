import { NextResponse, after, type NextRequest } from 'next/server';
import { log } from '@/server/logger';
import { collectorError, parseJson, readRawBody } from '@/server/discovery/http';
import { IngestError } from '@/server/discovery/ingest';
import { resolveSiteByPublicKey } from '@/server/discovery/sites';
import {
  ServerBatchSchema,
  enforceServerLimits,
  ingestServerHits,
  verifyServerRequest,
} from '@/server/discovery/crawler-ingest';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
/** Sunucu/edge partisi tarayıcı gövdesinden büyüktür (200 hit). */
const MAX_SERVER_BODY = 256 * 1024;

/**
 * POST /api/collect/v1/server — sunucu/edge crawler telemetrisi (imzalı).
 *
 * Başlıklar:
 *   X-IAI-Key        public site key (siteyi tanımlar)
 *   X-IAI-Timestamp  ms epoch (±5 dk)
 *   X-IAI-Signature  hex HMAC-SHA256(ingest secret, `${timestamp}.${rawBody}`)
 *
 * Gövde: `{ hits: [{ id, ua, path, status?, ct?, ts?, src?, verified?, ip? }] }`.
 * `ip` yalnızca ters DNS doğrulaması için opsiyoneldir ve **saklanmaz**. Ham log, Cookie,
 * Authorization, query string veya kalıcı IP kabul edilmez. Tarayıcıdan çağrılmaz: CORS yok.
 */
export async function POST(req: NextRequest) {
  try {
    const key = req.headers.get('x-iai-key');
    if (!key) throw new IngestError(401, 'missing_key', 'Site anahtarı eksik');

    const raw = await readRawBody(req, MAX_SERVER_BODY);
    const site = await resolveSiteByPublicKey(key);
    if (!site) throw new IngestError(401, 'invalid_key', 'Geçersiz site anahtarı');
    if (site.status === 'REVOKED') throw new IngestError(403, 'revoked', 'Site anahtarı iptal edilmiş');
    if (site.status === 'PAUSED') throw new IngestError(403, 'paused', 'Ölçüm duraklatılmış');

    verifyServerRequest(site, raw, req.headers);

    const parsed = ServerBatchSchema.safeParse(parseJson(raw));
    if (!parsed.success) throw new IngestError(400, 'invalid_payload', 'Geçersiz gövde');
    await enforceServerLimits(site, parsed.data.hits.length);

    after(async () => {
      try {
        await ingestServerHits(site, parsed.data.hits);
      } catch (err) {
        log.error('collect.server_ingest_failed', { siteId: site.id, err });
      }
    });

    return NextResponse.json({ ok: true, received: parsed.data.hits.length }, { status: 202 });
  } catch (err) {
    return collectorError(err, null);
  }
}
