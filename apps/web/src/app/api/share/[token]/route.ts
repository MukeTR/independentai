import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { AppError } from '@/server/errors';
import { enforceRateLimit } from '@/server/rate-limit';
import { resolveShare, buildSharedReport, recordShareView } from '@/server/report-share';

/**
 * Public rapor JSON'u: token → ReportShare → toplulaştırılmış rapor. Kişisel veri yok.
 * 404: yok · 410: iptal/süresi dolmuş. IP başına 60/saat + küresel tavan.
 */
export const GET = route('share.view', async (req, ctx) => {
  await enforceRateLimit(req, {
    name: 'share-view',
    limit: 60,
    windowMs: 3_600_000,
    global: { limit: 5_000, windowMs: 3_600_000 },
  });
  const token = await requireParam(ctx, 'token');
  const resolved = await resolveShare(token);
  if (resolved.status === 'missing') throw new AppError(404, 'not_found', 'Paylaşım linki bulunamadı');
  if (resolved.status === 'gone')
    throw new AppError(410, 'not_found', 'Bu paylaşım linki iptal edilmiş veya süresi dolmuş');
  const report = await buildSharedReport(resolved.share);
  await recordShareView(resolved.share.id);
  const res = NextResponse.json(report);
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return res;
});
