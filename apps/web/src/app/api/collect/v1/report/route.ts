import { type NextRequest } from 'next/server';
import { clientIp, consume } from '@/server/rate-limit';
import { log } from '@/server/logger';
import { recordUserReported } from '@/server/discovery/attribution';
import { authorizeSite, IngestError } from '@/server/discovery/ingest';
import { collectorError, collectorOk, parseJson, readRawBody } from '@/server/discovery/http';
import { handleCollectPreflight } from '@/server/discovery/collect-handler';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

/** Ziyaretçi bildirimi küçük bir gövdedir; olay ucundan çok daha dar tutulur. */
const MAX_REPORT_BODY = 2 * 1024;
/** Aynı IP saatte 5, aynı site saatte 100 bildirim. Form gönüllüdür, hacim beklenmez. */
const IP_LIMIT = 5;
const SITE_LIMIT = 100;
const WINDOW_MS = 3_600_000;

/**
 * POST /api/collect/v1/report — ziyaretçinin GÖNÜLLÜ prompt bildirimi.
 *
 * Gövde: `{ k: "<public site key>", sid: "<oturum anahtarı>", provider?, intent?, text? }`.
 * SDK önden yoklama (preflight) tetiklememek için `text/plain` ile gönderir; `application/json`
 * kullanan entegrasyonlar için OPTIONS de desteklenir.
 *
 * Bu uç **tahmin üretmez**: gelen kayıt `USER_REPORTED` kaynağıyla ve tam güvenle saklanır.
 * Serbest metin sunucuda PII'dan temizlenip 300 karaktere kırpılır (bkz. `cleanReportText`).
 * Yanıt her zaman 202'dir; ziyaretçiye site içi hata gösterilmez.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  try {
    const raw = await readRawBody(req, MAX_REPORT_BODY);
    const body = parseJson<{ k?: unknown; sid?: unknown; provider?: unknown; intent?: unknown; text?: unknown }>(raw);

    const key = typeof body.k === 'string' ? body.k : '';
    const sid = typeof body.sid === 'string' ? body.sid.trim() : '';
    if (!key) throw new IngestError(400, 'invalid_payload', 'Site anahtarı eksik');
    if (sid.length < 8 || sid.length > 64) throw new IngestError(400, 'invalid_payload', 'Geçersiz oturum anahtarı');

    // Anahtar + origin doğrulaması (kayıtlı olmayan origin → 403).
    const site = await authorizeSite(key, origin);

    const perIp = await consume(`report:ip:${clientIp(req)}`, IP_LIMIT, WINDOW_MS);
    if (!perIp.allowed) {
      throw new IngestError(
        429,
        'rate_limited',
        'Çok fazla bildirim',
        Math.ceil((perIp.resetAt.getTime() - Date.now()) / 1000),
      );
    }
    const perSite = await consume(`report:site:${site.id}`, SITE_LIMIT, WINDOW_MS);
    if (!perSite.allowed) {
      throw new IngestError(
        429,
        'rate_limited',
        'Çok fazla bildirim',
        Math.ceil((perSite.resetAt.getTime() - Date.now()) / 1000),
      );
    }

    const result = await recordUserReported({
      site: { id: site.id, tenantId: site.tenantId },
      sessionKey: sid,
      provider: body.provider,
      intent: body.intent,
      text: body.text,
    });

    return collectorOk({ stored: result.stored, sessionMatched: result.sessionMatched }, site, origin);
  } catch (err) {
    if (!(err instanceof IngestError)) log.error('collect.report_failed', { err });
    return collectorError(err, origin);
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCollectPreflight(req);
}
