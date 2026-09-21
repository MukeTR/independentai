import { timingSafeEqual } from 'node:crypto';
import { cronSecret } from './env';

/** Vercel Cron `Authorization: Bearer <CRON_SECRET>` — sabit zamanlı karşılaştırma. */
export function cronAuthorized(req: Request): boolean {
  const expected = cronSecret();
  const auth = req.headers.get('authorization') ?? '';
  if (!expected || !auth.startsWith('Bearer ')) return false;
  const given = Buffer.from(auth.slice(7));
  const want = Buffer.from(expected);
  return given.length === want.length && timingSafeEqual(given, want);
}
