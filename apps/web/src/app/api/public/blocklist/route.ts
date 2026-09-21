import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { blockedJson, findBlockedSite, normalizeHostname } from '@/server/blocklist';

/**
 * Hero / araç kutusu ipucu: `GET /api/public/blocklist?host=` → `{blocked:false}` ya da `{blocked:true, redirectUrl}`.
 * Kayıt/PII yok; geçersiz host da `{blocked:false}` (200). Eşleşmede hits++ (ziyaretçi yönlendirilecek).
 * IP 60/dk + küresel 5000/dk (`LIMITS.publicBlocklist`).
 */
export const GET = route('public.blocklist', async (req) => {
  const headers = await enforceRateLimit(req, LIMITS.publicBlocklist);
  const hostname = normalizeHostname(new URL(req.url).searchParams.get('host'));
  if (!hostname) return NextResponse.json({ blocked: false }, { headers });
  const hit = await findBlockedSite(hostname);
  if (hit) return blockedJson(hit, headers);
  return NextResponse.json({ blocked: false }, { headers });
});
