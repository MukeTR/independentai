import { NextResponse, type NextRequest } from 'next/server';
import { SENSOR_ETAG, SENSOR_SOURCE, SENSOR_VERSION } from '@/generated/sensor-v1';

/**
 * GET /sensor/v1.js — Universal AI Discovery Sensor (tarayıcı SDK'sı).
 *
 * İçerik build zamanında `sdk/sensor.ts` dosyasından esbuild ile üretilir
 * (`pnpm --filter @independentai/web build:sensor`) ve `src/generated/sensor-v1.ts` içine gömülür (ham paket: `sensor-v1.bundle.js`).
 * Böylece çalışma zamanında dosya sistemi okuması yoktur (serverless'ta güvenli).
 *
 * Önbellek: 5 dakika taze, 1 gün "stale-while-revalidate" → sürüm çıkınca en geç 5 dk içinde yayılır,
 * bu sürede de müşteri sayfası beklemez. `ETag` ile 304 desteklenir.
 * `Access-Control-Allow-Origin: *` yalnızca bu genel statik dosya içindir (kimlik bilgisi taşımaz).
 */
export const dynamic = 'force-dynamic';

const HEADERS: Record<string, string> = {
  'Content-Type': 'application/javascript; charset=utf-8',
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
  ETag: SENSOR_ETAG,
  'X-Content-Type-Options': 'nosniff',
  'X-Sensor-Version': SENSOR_VERSION,
  'Access-Control-Allow-Origin': '*',
  'Timing-Allow-Origin': '*',
  Vary: 'Accept-Encoding',
};

function notModified(req: NextRequest): boolean {
  const inm = req.headers.get('if-none-match');
  return !!inm && inm.split(',').some((tag) => tag.trim().replace(/^W\//, '') === SENSOR_ETAG);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (notModified(req)) return new NextResponse(null, { status: 304, headers: HEADERS });
  return new NextResponse(SENSOR_SOURCE, { status: 200, headers: HEADERS });
}

export async function HEAD(req: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, { status: notModified(req) ? 304 : 200, headers: HEADERS });
}

/** Script etiketi CORS istemez; yine de `fetch` ile alıp self-host edenler için OPTIONS açıktır. */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
}
