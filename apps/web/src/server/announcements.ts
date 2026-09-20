/**
 * Duyuru şeridi — admin'den yönetilir; yerleşim + etkin + tarih aralığı filtresiyle okunur.
 * DB hatasında boş liste (şerit sessizce görünmez).
 */
import type { AnnouncementPlacement, AnnouncementTone } from '@independentai/db';
import { prisma } from './prisma';
import { log } from './logger';

export type AnnouncementDto = {
  id: string;
  tone: AnnouncementTone;
  placement: AnnouncementPlacement;
  text: string;
  href: string | null;
  ctaLabel: string | null;
  /** Kapatma anahtarı (localStorage) için */
  updatedAt: string;
};

export const ANNOUNCEMENT_TONE_LABELS: Record<AnnouncementTone, string> = {
  INFO: 'Bilgi',
  PROMO: 'Kampanya',
  WARN: 'Uyarı',
};

export const ANNOUNCEMENT_PLACEMENT_LABELS: Record<AnnouncementPlacement, string> = {
  LANDING: 'Ana sayfa',
  PRICING: 'Fiyatlandırma',
  TOOLS: 'Araç sayfaları',
  APP: 'Panel',
};

export async function activeAnnouncements(
  placement: AnnouncementPlacement,
  now: Date = new Date(),
  take = 3,
): Promise<AnnouncementDto[]> {
  try {
    const rows = await prisma.announcement.findMany({
      where: {
        placement,
        enabled: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
      },
      orderBy: { updatedAt: 'desc' },
      take,
      select: { id: true, tone: true, placement: true, text: true, href: true, ctaLabel: true, updatedAt: true },
    });
    return rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }));
  } catch (err) {
    log.warn('announcements.lookup_failed', { placement, err });
    return [];
  }
}
