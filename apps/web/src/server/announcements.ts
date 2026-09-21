/**
 * Duyuru şeridi — admin'den yönetilir; yerleşim + etkin + tarih aralığı filtresiyle okunur.
 *  - Public okuma (`activeAnnouncements`): DB hatasında boş liste (şerit sessizce görünmez).
 *  - Admin CRUD (`listAnnouncements`, `createAnnouncement`, `updateAnnouncement`, `deleteAnnouncement`) + gövde
 *    doğrulama (`parseAnnouncementInput`) — route'lar yalnız yetki + audit ekler.
 *  - `updatedAt` istemcide kapatma anahtarıdır: Prisma `@updatedAt` her düzenlemede (metin/link, tarih, aç/kapa dahil)
 *    yenilenir → şerit kapatanlara yeniden görünür; dokunulmamış duyuru gizli kalır.
 */
import type { AnnouncementPlacement, AnnouncementTone, Prisma } from '@independentai/db';
import { prisma } from './prisma';
import { log } from './logger';
import { ClientError } from './errors';

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

export type AnnouncementAdminDto = AnnouncementDto & {
  enabled: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  /** Şu an yayında mı (enabled + tarih aralığı) */
  live: boolean;
};

export const ANNOUNCEMENT_TONES = ['INFO', 'PROMO', 'WARN'] as const satisfies readonly AnnouncementTone[];
export const ANNOUNCEMENT_PLACEMENTS = [
  'LANDING',
  'PRICING',
  'TOOLS',
  'APP',
] as const satisfies readonly AnnouncementPlacement[];

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

export const ANNOUNCEMENT_TEXT_MAX = 300;
export const ANNOUNCEMENT_CTA_MAX = 40;
export const ANNOUNCEMENT_HREF_MAX = 500;

export function isAnnouncementPlacement(x: unknown): x is AnnouncementPlacement {
  return typeof x === 'string' && (ANNOUNCEMENT_PLACEMENTS as readonly string[]).includes(x);
}

export function isAnnouncementTone(x: unknown): x is AnnouncementTone {
  return typeof x === 'string' && (ANNOUNCEMENT_TONES as readonly string[]).includes(x);
}

/** Yayın penceresi: enabled + (startsAt yok | geçti) + (endsAt yok | gelmedi). */
export function isAnnouncementLive(
  a: { enabled: boolean; startsAt: Date | null; endsAt: Date | null },
  now: Date = new Date(),
): boolean {
  if (!a.enabled) return false;
  if (a.startsAt && a.startsAt.getTime() > now.getTime()) return false;
  if (a.endsAt && a.endsAt.getTime() <= now.getTime()) return false;
  return true;
}

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

// ── Admin ──

export type AnnouncementInput = {
  tone: AnnouncementTone;
  placement: AnnouncementPlacement;
  text: string;
  href: string | null;
  ctaLabel: string | null;
  enabled: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};

/** Yalnız site içi yol (`/…`) ya da https bağlantı; javascript:/data: vb. reddedilir. */
export function isAllowedAnnouncementHref(href: string): boolean {
  if (href.length > ANNOUNCEMENT_HREF_MAX) return false;
  if (/^\/(?!\/)/.test(href)) return true;
  try {
    const u = new URL(href);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

function optionalString(v: unknown, field: string, max: number): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v !== 'string') throw new ClientError(`${field} metin olmalı`);
  const s = v.trim();
  if (!s) return null;
  if (s.length > max) throw new ClientError(`${field} en fazla ${max} karakter olabilir`);
  return s;
}

function optionalDate(v: unknown, field: string): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new ClientError(`${field} geçerli bir tarih olmalı`);
  return d;
}

/**
 * Gövdeyi doğrular. `partial:false` → tam giriş (text zorunlu, varsayılanlar uygulanır);
 * `partial:true` → yalnız verilen alanlar (PATCH). Geçersizde ClientError (400).
 */
export function parseAnnouncementInput(body: unknown, opts: { partial: false }): AnnouncementInput;
export function parseAnnouncementInput(body: unknown, opts: { partial: true }): Partial<AnnouncementInput>;
export function parseAnnouncementInput(body: unknown, opts: { partial: boolean }): Partial<AnnouncementInput> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ClientError('Geçersiz gövde');
  const b = body as Record<string, unknown>;
  const out: Partial<AnnouncementInput> = {};

  if (b.text !== undefined || !opts.partial) {
    if (typeof b.text !== 'string' || !b.text.trim()) throw new ClientError('Duyuru metni zorunlu');
    const text = b.text.trim();
    if (text.length > ANNOUNCEMENT_TEXT_MAX)
      throw new ClientError(`Duyuru metni en fazla ${ANNOUNCEMENT_TEXT_MAX} karakter olabilir`);
    out.text = text;
  }
  if (b.tone !== undefined) {
    if (!isAnnouncementTone(b.tone)) throw new ClientError('Geçersiz ton (INFO, PROMO, WARN)');
    out.tone = b.tone;
  } else if (!opts.partial) out.tone = 'INFO';
  if (b.placement !== undefined) {
    if (!isAnnouncementPlacement(b.placement))
      throw new ClientError('Geçersiz yerleşim (LANDING, PRICING, TOOLS, APP)');
    out.placement = b.placement;
  } else if (!opts.partial) out.placement = 'LANDING';

  const href = optionalString(b.href, 'Bağlantı', ANNOUNCEMENT_HREF_MAX);
  if (href !== undefined) {
    if (href && !isAllowedAnnouncementHref(href))
      throw new ClientError('Bağlantı site içi yol (/…) ya da https adres olmalı');
    out.href = href;
  } else if (!opts.partial) out.href = null;

  const cta = optionalString(b.ctaLabel, 'Düğme etiketi', ANNOUNCEMENT_CTA_MAX);
  if (cta !== undefined) out.ctaLabel = cta;
  else if (!opts.partial) out.ctaLabel = null;

  if (b.enabled !== undefined) {
    if (typeof b.enabled !== 'boolean') throw new ClientError('enabled doğru/yanlış olmalı');
    out.enabled = b.enabled;
  } else if (!opts.partial) out.enabled = false;

  const startsAt = optionalDate(b.startsAt, 'Başlangıç');
  if (startsAt !== undefined) out.startsAt = startsAt;
  else if (!opts.partial) out.startsAt = null;
  const endsAt = optionalDate(b.endsAt, 'Bitiş');
  if (endsAt !== undefined) out.endsAt = endsAt;
  else if (!opts.partial) out.endsAt = null;

  if (out.startsAt && out.endsAt && out.endsAt.getTime() <= out.startsAt.getTime())
    throw new ClientError('Bitiş, başlangıçtan sonra olmalı');

  if (opts.partial && Object.keys(out).length === 0) throw new ClientError('Güncellenecek alan yok');
  return out;
}

const ADMIN_SELECT = {
  id: true,
  tone: true,
  placement: true,
  text: true,
  href: true,
  ctaLabel: true,
  enabled: true,
  startsAt: true,
  endsAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AnnouncementSelect;

type AdminRow = Prisma.AnnouncementGetPayload<{ select: typeof ADMIN_SELECT }>;

export function toAdminDto(r: AdminRow, now: Date = new Date()): AnnouncementAdminDto {
  return {
    id: r.id,
    tone: r.tone,
    placement: r.placement,
    text: r.text,
    href: r.href,
    ctaLabel: r.ctaLabel,
    enabled: r.enabled,
    startsAt: r.startsAt ? r.startsAt.toISOString() : null,
    endsAt: r.endsAt ? r.endsAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    live: isAnnouncementLive(r, now),
  };
}

export async function listAnnouncements(take = 100): Promise<AnnouncementAdminDto[]> {
  const now = new Date();
  const rows = await prisma.announcement.findMany({ orderBy: { updatedAt: 'desc' }, take, select: ADMIN_SELECT });
  return rows.map((r) => toAdminDto(r, now));
}

export async function createAnnouncement(input: AnnouncementInput, byUserId: string): Promise<AnnouncementAdminDto> {
  const row = await prisma.announcement.create({ data: { ...input, createdById: byUserId }, select: ADMIN_SELECT });
  return toAdminDto(row);
}

/** Yoksa null. */
export async function updateAnnouncement(
  id: string,
  patch: Partial<AnnouncementInput>,
): Promise<AnnouncementAdminDto | null> {
  const cur = await prisma.announcement.findUnique({ where: { id }, select: { startsAt: true, endsAt: true } });
  if (!cur) return null;
  const startsAt = patch.startsAt !== undefined ? patch.startsAt : cur.startsAt;
  const endsAt = patch.endsAt !== undefined ? patch.endsAt : cur.endsAt;
  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime())
    throw new ClientError('Bitiş, başlangıçtan sonra olmalı');
  const row = await prisma.announcement.update({ where: { id }, data: patch, select: ADMIN_SELECT });
  return toAdminDto(row);
}

/** Silindi mi (yoksa false). */
export async function deleteAnnouncement(id: string): Promise<boolean> {
  const res = await prisma.announcement.deleteMany({ where: { id } });
  return res.count > 0;
}
