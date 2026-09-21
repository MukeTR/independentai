/**
 * Yapılandırılmış (JSON satırı) log + gizli veri maskeleme.
 * Vercel log drain'lerinde tek satır JSON en kolay sorgulanan biçimdir.
 */
import { randomBytes } from 'node:crypto';

type Level = 'debug' | 'info' | 'warn' | 'error';

const SECRET_KEY_RE = /(secret|token|password|passwd|apikey|api_key|authorization|cookie|webhook|hash)/i;
const EMAIL_RE = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const BEARER_RE = /(Bearer\s+)[A-Za-z0-9._-]+/gi;
const KEYLIKE_RE =
  /\b(sk-[A-Za-z0-9_-]{8,}|AIza[0-9A-Za-z_-]{10,}|iai_live_[A-Za-z0-9_-]{6,}|xox[abp]-[A-Za-z0-9-]{10,})\b/g;
const SLACK_HOOK_RE = /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]+/g;

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.replace(EMAIL_RE, (_m, first, domain) => `${first}***${domain}`);
}

/** Serbest metindeki sırları/kişisel veriyi maskeler. */
export function sanitizeText(input: string): string {
  return input
    .replace(BEARER_RE, '$1[redacted]')
    .replace(KEYLIKE_RE, '[redacted-key]')
    .replace(SLACK_HOOK_RE, 'https://hooks.slack.com/services/[redacted]')
    .replace(EMAIL_RE, (_m, first, domain) => `${first}***${domain}`);
}

export function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[depth]';
  if (value == null) return value;
  if (typeof value === 'string') return sanitizeText(value.length > 2000 ? value.slice(0, 2000) + '…' : value);
  if (typeof value !== 'object') return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeText(value.message),
      stack: value.stack?.split('\n').slice(0, 6).join('\n'),
    };
  }
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitize(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SECRET_KEY_RE.test(k) ? '[redacted]' : sanitize(v, depth + 1);
  }
  return out;
}

function emit(level: Level, event: string, fields: Record<string, unknown>) {
  if (process.env.IAI_LOG_SILENT === '1') return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...(sanitize(fields) as Record<string, unknown>),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (event: string, fields: Record<string, unknown> = {}) => {
    if (process.env.NODE_ENV !== 'production') emit('debug', event, fields);
  },
  info: (event: string, fields: Record<string, unknown> = {}) => emit('info', event, fields),
  warn: (event: string, fields: Record<string, unknown> = {}) => emit('warn', event, fields),
  error: (event: string, fields: Record<string, unknown> = {}) => emit('error', event, fields),
};

export function newRequestId(): string {
  return randomBytes(8).toString('hex');
}
