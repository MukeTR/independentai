/**
 * Kalıcı rapor bağlantısı token'ı — /rapor/<token>. HMAC-SHA256 ile imzalı, DB'de saklanmaz.
 * token = base64url(`${scanId}.${hmac(REPORT_TOKEN_SECRET ?? JWT_SECRET, scanId).slice(0, 24)}`)
 * Sır rotasyonu eski bağlantıları geçersiz kılar (sabah kararı: ayrı REPORT_TOKEN_SECRET).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { jwtSecret } from './env';

const SIG_LEN = 24;
const ID_RE = /^[a-z0-9_-]{8,64}$/i;

function secret(): string {
  const dedicated = process.env.REPORT_TOKEN_SECRET;
  if (dedicated && dedicated.length >= 16) return dedicated;
  return jwtSecret();
}

function sig(scanId: string): string {
  return createHmac('sha256', secret()).update(scanId).digest('hex').slice(0, SIG_LEN);
}

export function signReportToken(scanId: string): string {
  if (!ID_RE.test(scanId)) throw new Error('Geçersiz tarama kimliği');
  return Buffer.from(`${scanId}.${sig(scanId)}`, 'utf8').toString('base64url');
}

/** Geçerli imzada scanId; aksi hâlde null (sabit zamanlı karşılaştırma). */
export function verifyReportToken(token: unknown): string | null {
  if (typeof token !== 'string' || token.length < 12 || token.length > 200) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(token)) return null;
  let decoded: string;
  try {
    decoded = Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const dot = decoded.lastIndexOf('.');
  if (dot <= 0) return null;
  const scanId = decoded.slice(0, dot);
  const given = decoded.slice(dot + 1);
  if (!ID_RE.test(scanId) || given.length !== SIG_LEN) return null;
  const a = Buffer.from(given, 'utf8');
  const b = Buffer.from(sig(scanId), 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return scanId;
}
