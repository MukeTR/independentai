/**
 * Rapor paylaşım linkleri (ReportShare) — marka bağlamında, süreli, iptal edilebilir, salt-okunur.
 *
 *  - Token: 32 byte rastgele (base64url), DB'de yalnızca sha256 hash. Düz metin token yalnızca
 *    oluşturma yanıtında BİR KEZ döner.
 *  - Süre: en fazla 90 gün; iptal (`revokedAt`) anında geçersiz.
 *  - Limit: ajans üzerinden erişimde ajans planının `shareLinks` tavanı; doğrudan marka için 10.
 *  - Public rapor içeriği: yalnızca toplulaştırılmış görünürlük/SoV/trend/soru/rakip verisi.
 *    E-posta, AI yanıt metni, aday/kişisel veri, API token vb. ASLA dahil edilmez.
 *  - Beyaz etiket lansmanda yok: rapor "Independent AI ile hazırlandı" imzasıyla sunulur (dürüst).
 */
import { prisma } from './prisma';
import { ClientError, NotFoundError, PlanLimitError } from './errors';
import { hashToken, randomToken } from './auth-tokens';
import { siteUrl } from './env';
import type { Actor } from './authz';
import { getComprehensiveAnalytics } from './dashboard-analytics';
import { publishForTenant } from './realtime';

export const SHARE_MAX_DAYS = 90;
export const SHARE_RANGES = [7, 30, 90] as const;
export type ShareRange = (typeof SHARE_RANGES)[number];
const BRAND_SHARE_LIMIT = 10;
const TOKEN_RE = /^[A-Za-z0-9_-]{20,128}$/;

export type ShareDto = {
  id: string;
  label: string | null;
  rangeDays: number;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastViewedAt: string | null;
  views: number;
  /** Aktif = iptal edilmemiş ve süresi dolmamış */
  active: boolean;
};

function toDto(s: {
  id: string;
  label: string | null;
  rangeDays: number;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  lastViewedAt: Date | null;
  views: number;
}): ShareDto {
  const now = Date.now();
  return {
    id: s.id,
    label: s.label,
    rangeDays: s.rangeDays,
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    revokedAt: s.revokedAt ? s.revokedAt.toISOString() : null,
    lastViewedAt: s.lastViewedAt ? s.lastViewedAt.toISOString() : null,
    views: s.views,
    active: !s.revokedAt && s.expiresAt.getTime() > now,
  };
}

export function shareLimitFor(actor: Actor): number {
  return actor.viaAgency && actor.agency ? actor.agency.entitlement.limits.shareLinks : BRAND_SHARE_LIMIT;
}

export function shareLink(token: string): string {
  return `${siteUrl()}/share/${token}`;
}

export async function listShares(tenantId: string): Promise<ShareDto[]> {
  const rows = await prisma.reportShare.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 200 });
  return rows.map(toDto);
}

export async function createShare(
  actor: Actor,
  input: { rangeDays?: unknown; label?: unknown; expiresAt?: unknown; expiresInDays?: unknown },
): Promise<{ share: ShareDto; token: string; link: string }> {
  const rangeDays = Number(input.rangeDays ?? 30);
  if (!(SHARE_RANGES as readonly number[]).includes(rangeDays))
    throw new ClientError('Aralık 7, 30 veya 90 gün olmalı');
  const label = typeof input.label === 'string' && input.label.trim() ? input.label.trim().slice(0, 80) : null;
  if (label && /[<>]/.test(label)) throw new ClientError('Etiket geçersiz karakter içeriyor');

  const now = Date.now();
  const maxMs = SHARE_MAX_DAYS * 86_400_000;
  let expiresAt: Date;
  if (input.expiresAt !== undefined && input.expiresAt !== null && input.expiresAt !== '') {
    const d = new Date(String(input.expiresAt));
    if (Number.isNaN(d.getTime())) throw new ClientError('Geçersiz bitiş tarihi');
    expiresAt = d;
  } else {
    const days = Number(input.expiresInDays ?? 30);
    if (!Number.isFinite(days) || days < 1) throw new ClientError('Geçersiz süre');
    if (days > SHARE_MAX_DAYS) throw new ClientError(`Paylaşım linki en fazla ${SHARE_MAX_DAYS} gün geçerli olabilir`);
    expiresAt = new Date(now + days * 86_400_000);
  }
  if (expiresAt.getTime() <= now + 60_000) throw new ClientError('Bitiş tarihi gelecekte olmalı');
  if (expiresAt.getTime() - now > maxMs)
    throw new ClientError(`Paylaşım linki en fazla ${SHARE_MAX_DAYS} gün geçerli olabilir`);

  const limit = shareLimitFor(actor);
  const active = await prisma.reportShare.count({
    where: { tenantId: actor.tenantId, revokedAt: null, expiresAt: { gt: new Date() } },
  });
  if (active >= limit) throw new PlanLimitError(`Aktif paylaşım linki sınırı (${limit}) doldu; önce birini iptal edin`);

  const token = randomToken(32);
  const row = await prisma.reportShare.create({
    data: {
      tenantId: actor.tenantId,
      tokenHash: hashToken(token),
      label,
      rangeDays,
      createdById: actor.userId,
      expiresAt,
    },
  });
  await publishForTenant(actor.tenantId, { event: 'team.changed', entityId: row.id, status: 'share_created' });
  return { share: toDto(row), token, link: shareLink(token) };
}

export async function revokeShare(actor: Actor, id: string): Promise<void> {
  const res = await prisma.reportShare.updateMany({
    where: { id, tenantId: actor.tenantId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (res.count === 0) throw new NotFoundError('Paylaşım linki bulunamadı');
  await publishForTenant(actor.tenantId, { event: 'team.changed', entityId: id, status: 'share_revoked' });
}

export type ResolvedShare =
  | { status: 'ok'; share: { id: string; tenantId: string; rangeDays: number; label: string | null; expiresAt: Date } }
  | { status: 'gone' }
  | { status: 'missing' };

/** Token → paylaşım. `gone`: iptal/süresi dolmuş (410), `missing`: yok (404). */
export async function resolveShare(token: string): Promise<ResolvedShare> {
  if (!TOKEN_RE.test(token)) return { status: 'missing' };
  const s = await prisma.reportShare.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!s) return { status: 'missing' };
  if (s.revokedAt || s.expiresAt.getTime() <= Date.now()) return { status: 'gone' };
  return {
    status: 'ok',
    share: { id: s.id, tenantId: s.tenantId, rangeDays: s.rangeDays, label: s.label, expiresAt: s.expiresAt },
  };
}

/** Görüntülenme sayacı (best effort; ana akışı bozmaz). */
export async function recordShareView(id: string): Promise<void> {
  try {
    await prisma.reportShare.update({ where: { id }, data: { views: { increment: 1 }, lastViewedAt: new Date() } });
  } catch {
    /* yoksay */
  }
}

export type SharedReport = {
  tenantName: string;
  brandName: string | null;
  label: string | null;
  rangeDays: number;
  generatedAt: string;
  expiresAt: string;
  hasData: boolean;
  kpis: {
    visibility: number;
    visibilityPrev: number;
    sov: number;
    sovPrev: number;
    totalRuns: number;
    avgPosition: number;
    recommendRate: number;
  };
  trend: { date: string; visibility: number; sov: number }[];
  byProvider: { provider: string; visibility: number; runs: number }[];
  topPrompts: { text: string; visibility: number; runs: number }[];
  competitors: { name: string; sov: number; mentions: number }[];
  /** Dürüst imza — beyaz etiket lansmanda yok */
  poweredBy: 'Independent AI';
};

/**
 * Public rapor gövdesi. Kişisel veri yok: yalnızca marka adı, toplulaştırılmış metrikler, soru
 * metinleri (kullanıcı tarafından izlenen sorular) ve rakip adları.
 */
export async function buildSharedReport(share: {
  tenantId: string;
  rangeDays: number;
  label: string | null;
  expiresAt: Date;
}): Promise<SharedReport> {
  const [tenant, brand, analytics] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({ where: { id: share.tenantId }, select: { name: true } }),
    prisma.brand.findFirst({
      where: { tenantId: share.tenantId, isOwn: true },
      orderBy: { createdAt: 'asc' },
      select: { name: true },
    }),
    getComprehensiveAnalytics(share.tenantId, share.rangeDays),
  ]);
  return {
    tenantName: tenant.name,
    brandName: brand?.name ?? null,
    label: share.label,
    rangeDays: share.rangeDays,
    generatedAt: new Date().toISOString(),
    expiresAt: share.expiresAt.toISOString(),
    hasData: analytics.hasData,
    kpis: {
      visibility: analytics.kpis.visibility,
      visibilityPrev: analytics.kpis.visibilityPrev,
      sov: analytics.kpis.sov,
      sovPrev: analytics.kpis.sovPrev,
      totalRuns: analytics.kpis.totalRuns,
      avgPosition: analytics.kpis.avgPosition,
      recommendRate: analytics.kpis.recommendRate,
    },
    trend: analytics.trend,
    byProvider: analytics.byProvider.map((p) => ({ provider: p.provider, visibility: p.visibility, runs: p.runs })),
    topPrompts: analytics.promptPerformance
      .slice(0, 10)
      .map((p) => ({ text: p.text, visibility: p.visibility, runs: p.runs })),
    competitors: analytics.competitors.slice(0, 8).map((c) => ({ name: c.name, sov: c.sov, mentions: c.mentions })),
    poweredBy: 'Independent AI',
  };
}
