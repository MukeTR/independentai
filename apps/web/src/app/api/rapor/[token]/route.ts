import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { AppError } from '@/server/errors';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { publicReportJson, resolveReport } from '@/server/public-report';

/**
 * GET /api/rapor/[token] — kalıcı rapor JSON'u (kayıtlı sonuçtan; ağ/LLM yok).
 * 404 bilinmeyen/bozuk token · 410 süresi dolmuş · 200 {blocked, redirectUrl} yasaklı host.
 * IP 60/sa + küresel tavan; `no-store`; gövdede ham IP, visitorHash, tenantId, urlHash YOK.
 */
export const GET = route('report.view', async (req, ctx) => {
  const headers = await enforceRateLimit(req, LIMITS.publicReport);
  const token = await requireParam(ctx, 'token');
  const resolved = await resolveReport(token);
  if (resolved.status === 'missing') throw new AppError(404, 'not_found', 'Rapor bulunamadı');
  if (resolved.status === 'gone')
    throw new AppError(410, 'not_found', 'Raporun süresi doldu — yeniden tarayın', {
      details: { rescanPath: resolved.rescanPath },
    });
  if (resolved.status === 'blocked')
    return NextResponse.json({ blocked: true, redirectUrl: resolved.redirectUrl }, { headers });
  const res = NextResponse.json(publicReportJson(resolved.report), { headers });
  res.headers.set('cache-control', 'no-store');
  res.headers.set('X-Robots-Tag', 'noindex, follow');
  return res;
});
