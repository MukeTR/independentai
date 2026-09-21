/**
 * Pseudonim ziyaretçi kimliği — ham IP ve tam User-Agent SAKLANMAZ.
 * visitorHash = sha256(VISITOR_SALT ?? JWT_SECRET | clientIp | uaFamily). Tuz olmadan hash üretilmez.
 */
import { createHash } from 'node:crypto';
import { jwtSecret } from './env';
import { clientIp } from './rate-limit';
import { log } from './logger';

const MIN_SALT = 16;
let warnedShort = false;

/** Kaba tarayıcı ailesi (sürüm yok): edge | opera | samsung | chrome | firefox | safari | bot | other (+ "-mobil"). */
export function uaFamily(ua: string | null | undefined): string {
  const s = (ua ?? '').toLowerCase();
  if (!s) return 'other';
  let family = 'other';
  if (/bot|crawl|spider|slurp|fetch|headless|curl|wget|python-requests/.test(s)) family = 'bot';
  else if (/edg\//.test(s)) family = 'edge';
  else if (/opr\/|opera/.test(s)) family = 'opera';
  else if (/samsungbrowser/.test(s)) family = 'samsung';
  else if (/firefox|fxios/.test(s)) family = 'firefox';
  else if (/chrome|crios/.test(s)) family = 'chrome';
  else if (/safari/.test(s)) family = 'safari';
  const mobile = /mobile|android|iphone|ipad/.test(s);
  return mobile && family !== 'bot' ? `${family}-mobil` : family;
}

/** VISITOR_SALT (≥16 karakter) yoksa JWT_SECRET; kısa tuz yok sayılır ve bir kez uyarılır. */
function salt(): string {
  const dedicated = process.env.VISITOR_SALT;
  if (dedicated && dedicated.length >= MIN_SALT) return dedicated;
  if (dedicated && !warnedShort) {
    warnedShort = true;
    log.warn('visitor.salt_too_short', { minLength: MIN_SALT, fallback: 'JWT_SECRET' });
  }
  return jwtSecret();
}

export function visitorHashFor(req: Request): string {
  const ip = clientIp(req);
  const family = uaFamily(req.headers.get('user-agent'));
  return createHash('sha256').update(`${salt()}|${ip}|${family}`).digest('hex');
}
