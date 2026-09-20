/**
 * Referans logoları — admin CRUD + landing şeridinin okuma katmanı.
 *
 *  - Dosya yükleme YOKTUR. `logoUrl` iki biçimden biri olabilir: `https://…` dış bağlantı ya da
 *    repoda duran `/img/…` yerel yolu. Dış bağlantı sunucuda **hiç fetch edilmez** (SSRF yüzeyi
 *    açmamak için) — yalnız doğrulanıp kaydedilir, tarayıcı çeker.
 *  - Doğrulama zod ile; route'lar yalnız yetki (`requireSuperAdmin`) + audit ekler. ZodError
 *    `handleRouteError` tarafından 400'e çevrilir.
 *  - Sıra: `order` küçükten büyüğe, eşitlikte `createdAt`. `moveReferenceLogo` komşuyla yer
 *    değiştirir ve tüm listeyi 0..n-1 olarak yeniden numaralar (boşluk/çakışma birikmez).
 *  - Public okuma (`publishedReferenceLogos`) DB hatasında boş liste döner: şerit sessizce görünmez,
 *    landing çökmez.
 */
import { z } from 'zod';
import type { Prisma } from '@independentai/db';
import { prisma } from './prisma';
import { NotFoundError } from './errors';
import { log } from './logger';

export const NAME_MAX = 80;
export const URL_MAX = 500;
export const SECTOR_MAX = 60;

export const LOGO_URL_MESSAGE = 'Logo bağlantısı https:// ile başlamalı ya da /img/ ile başlayan yerel bir yol olmalı';
export const SITE_URL_MESSAGE = 'Site bağlantısı https:// ile başlamalı';

/** https bağlantı mı (şema + nokta içeren ana makine)? */
export function isHttpsUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && u.hostname.includes('.');
  } catch {
    return false;
  }
}

/** Kabul edilen logo kaynağı: https dış bağlantı ya da `/img/…` yerel yolu (dizin dışına çıkamaz). */
export function isAllowedLogoUrl(raw: string): boolean {
  const v = raw.trim();
  if (!v) return false;
  if (v.startsWith('/img/')) return !v.startsWith('/img//') && !v.includes('..') && !v.includes('\\');
  return isHttpsUrl(v);
}

/** Boş/boşluk → null; doldurulmuşsa kırpılmış metin. */
const optionalText = (max: number) =>
  z
    .string()
    .max(max, `En fazla ${max} karakter olabilir`)
    .nullish()
    .transform((v) => {
      const s = (v ?? '').trim();
      return s.length ? s : null;
    });

export const referenceLogoCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Referans adı boş olamaz')
    .max(NAME_MAX, `Referans adı en fazla ${NAME_MAX} karakter olabilir`),
  logoUrl: z
    .string()
    .trim()
    .min(1, 'Logo bağlantısı boş olamaz')
    .max(URL_MAX, `Logo bağlantısı en fazla ${URL_MAX} karakter olabilir`)
    .refine(isAllowedLogoUrl, LOGO_URL_MESSAGE),
  siteUrl: optionalText(URL_MAX).refine((v) => v === null || isHttpsUrl(v), SITE_URL_MESSAGE),
  sector: optionalText(SECTOR_MAX),
  published: z.boolean().optional(),
});

export const referenceLogoPatchSchema = referenceLogoCreateSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Güncellenecek alan yok');

export const referenceLogoMoveSchema = z.object({
  direction: z.enum(['up', 'down'], { errorMap: () => ({ message: 'Yön “up” ya da “down” olmalı' }) }),
});

export type ReferenceLogoInput = z.infer<typeof referenceLogoCreateSchema>;
export type ReferenceLogoPatch = z.infer<typeof referenceLogoPatchSchema>;

export const REFERENCE_LOGO_SELECT = {
  id: true,
  name: true,
  logoUrl: true,
  siteUrl: true,
  sector: true,
  order: true,
  published: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ReferenceLogoSelect;

export type ReferenceLogoRow = Prisma.ReferenceLogoGetPayload<{ select: typeof REFERENCE_LOGO_SELECT }>;

/** Şeritte gösterilen alanlar (landing). */
export type ReferenceLogoPublicDto = {
  id: string;
  name: string;
  logoUrl: string;
  siteUrl: string | null;
  sector: string | null;
};

const ORDER_BY = [{ order: 'asc' as const }, { createdAt: 'asc' as const }];

// ── Okuma ──

/** Admin listesi: yayında olmayanlar dahil. */
export async function listReferenceLogos(take = 200): Promise<ReferenceLogoRow[]> {
  return prisma.referenceLogo.findMany({ orderBy: ORDER_BY, take, select: REFERENCE_LOGO_SELECT });
}

/** Landing şeridi: yalnız yayındakiler. DB hatasında boş liste (şerit hiç render edilmez). */
export async function publishedReferenceLogos(take = 60): Promise<ReferenceLogoPublicDto[]> {
  try {
    return await prisma.referenceLogo.findMany({
      where: { published: true },
      orderBy: ORDER_BY,
      take,
      select: { id: true, name: true, logoUrl: true, siteUrl: true, sector: true },
    });
  } catch (err) {
    log.warn('reference_logos.lookup_failed', { err });
    return [];
  }
}

// ── Yazma ──

/** Yeni kayıt listenin sonuna eklenir (mevcut en büyük order + 1). */
export async function createReferenceLogo(input: ReferenceLogoInput): Promise<ReferenceLogoRow> {
  const last = await prisma.referenceLogo.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
  return prisma.referenceLogo.create({
    data: {
      name: input.name,
      logoUrl: input.logoUrl,
      siteUrl: input.siteUrl,
      sector: input.sector,
      published: input.published ?? true,
      order: (last?.order ?? -1) + 1,
    },
    select: REFERENCE_LOGO_SELECT,
  });
}

export async function updateReferenceLogo(id: string, patch: ReferenceLogoPatch): Promise<ReferenceLogoRow> {
  const exists = await prisma.referenceLogo.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new NotFoundError('Kayıt bulunamadı');

  const data: Prisma.ReferenceLogoUpdateInput = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.logoUrl !== undefined) data.logoUrl = patch.logoUrl;
  if (patch.siteUrl !== undefined) data.siteUrl = patch.siteUrl;
  if (patch.sector !== undefined) data.sector = patch.sector;
  if (patch.published !== undefined) data.published = patch.published;

  return prisma.referenceLogo.update({ where: { id }, data, select: REFERENCE_LOGO_SELECT });
}

/** Yayından kaldır / yayına al — tablo satırındaki anahtar bunu çağırır. */
export async function setReferenceLogoPublished(id: string, published: boolean): Promise<ReferenceLogoRow> {
  return updateReferenceLogo(id, { published });
}

export async function deleteReferenceLogo(id: string): Promise<ReferenceLogoRow> {
  const row = await prisma.referenceLogo.findUnique({ where: { id }, select: REFERENCE_LOGO_SELECT });
  if (!row) throw new NotFoundError('Kayıt bulunamadı');
  await prisma.referenceLogo.delete({ where: { id } });
  return row;
}

/**
 * Bir kaydı komşusuyla takas eder, ardından tüm listeyi 0..n-1 olarak yeniden numaralar.
 * Uçtaki kayıt için (yukarıdaki ilk / aşağıdaki son) hiçbir şey değişmez.
 */
export async function moveReferenceLogo(id: string, direction: 'up' | 'down'): Promise<ReferenceLogoRow[]> {
  const rows = await prisma.referenceLogo.findMany({ orderBy: ORDER_BY, select: { id: true } });
  const i = rows.findIndex((r) => r.id === id);
  if (i < 0) throw new NotFoundError('Kayıt bulunamadı');

  const j = direction === 'up' ? i - 1 : i + 1;
  const ids = rows.map((r) => r.id);
  const a = ids[i];
  const b = ids[j];
  if (a === undefined || b === undefined) return listReferenceLogos();
  ids[i] = b;
  ids[j] = a;

  await prisma.$transaction(
    ids.map((rowId, idx) => prisma.referenceLogo.update({ where: { id: rowId }, data: { order: idx } })),
  );
  return listReferenceLogos();
}
