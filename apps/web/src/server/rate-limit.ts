/**
 * Basit IP bazlı rate limit. Serverless'te instance-local olduğu için best-effort'tur
 * (kötüye kullanımı yavaşlatır, garanti vermez). Sert sınır gerekirse Upstash/Redis'e taşınır.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const rec = buckets.get(key);
  if (!rec || now > rec.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false; // limit aşılmadı
  }
  rec.count += 1;
  return rec.count > limit;
}

/** NextRequest'ten istemci IP'sini çıkarır. */
export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
