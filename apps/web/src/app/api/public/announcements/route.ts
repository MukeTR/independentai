import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { ClientError } from '@/server/errors';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { activeAnnouncements, isAnnouncementPlacement } from '@/server/announcements';

/**
 * Herkese açık: yayındaki duyurular — `?placement=LANDING|PRICING|TOOLS|APP` (varsayılan LANDING), en çok 3.
 * Kimlik yok, yazma yok; IP başına LIMITS.publicAnnouncements. Yanıtta yalnız DTO alanları (createdById yok).
 */
export const GET = route('public.announcements', async (req) => {
  const headers = await enforceRateLimit(req, LIMITS.publicAnnouncements);
  const placement = new URL(req.url).searchParams.get('placement') ?? 'LANDING';
  if (!isAnnouncementPlacement(placement)) throw new ClientError('Geçersiz yerleşim');
  const items = await activeAnnouncements(placement);
  return NextResponse.json({ items }, { headers });
});
