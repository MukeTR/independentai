/**
 * Pseudonim ziyaretçi kimliği — ham IP ve tam User-Agent SAKLANMAZ.
 * visitorHash = sha256(VISITOR_SALT ?? JWT_SECRET | clientIp | uaFamily). Tuz olmadan hash üretilmez.
 */
import { createHash } from 'node:crypto';
import { jwtSecret } from './env';
import { clientIp } from './rate-limit';

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

function salt(): string {
  const dedicated = process.env.VISITOR_SALT;
  if (dedicated && dedicated.length >= 16) return dedicated;
  return jwtSecret();
}

export function visitorHashFor(req: Request): string {
  const ip = clientIp(req);
  const family = uaFamily(req.headers.get('user-agent'));
  return createHash('sha256').update(`${salt()}|${ip}|${family}`).digest('hex');
}
