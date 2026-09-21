import type { NextRequest } from 'next/server';
import { handleBrowserCollect, handleCollectPreflight } from '@/server/discovery/collect-handler';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

/**
 * POST /api/collect/v1/event — tarayıcı SDK'sı olay girişi (tek olay veya küçük parti).
 *
 * Gövde: `{ k: "<public site key>", e: {…} | [ {…} ] }`. SDK `text/plain` ile gönderir
 * (önden yoklama yok, `sendBeacon` uyumlu). Yanıt 202; yazma `after()` ile yapılır.
 * Public key yalnızca YAZAR; kayıtlı olmayan origin reddedilir.
 */
export async function POST(req: NextRequest) {
  return handleBrowserCollect(req, 5);
}

export async function OPTIONS(req: NextRequest) {
  return handleCollectPreflight(req);
}
