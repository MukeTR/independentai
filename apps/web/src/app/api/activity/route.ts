import { NextResponse } from 'next/server';
import type { Prisma } from '@independentai/db';
import { route } from '@/server/route';
import { ClientError } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { maskEmail } from '@/server/logger';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
const CURSOR_RE = /^[A-Za-z0-9_-]{5,64}$/;
/** meta içinde asla dışa verilmeyen anahtarlar (e-posta, IP, sır benzeri) */
const META_DENY = /^(ip|email|recipient|to)$|email|token|secret|password|webhook|hash|apikey|api_key/i;

function safeMeta(meta: unknown): Record<string, unknown> | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
    if (META_DENY.test(k)) continue;
    if (typeof v === 'string') out[k] = v.length > 120 ? `${v.slice(0, 120)}…` : v;
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    else if (Array.isArray(v)) out[k] = v.filter((x) => typeof x === 'string' || typeof x === 'number').slice(0, 10);
  }
  return Object.keys(out).length ? out : null;
}

/**
 * GET /api/activity?cursor=&limit= — tenant kapsamlı aktivite akışı (AuditLog).
 *  - Marka hesabı / seçili çalışma alanı: tenantId = efektif tenant.
 *  - Ajans ev tenant'ı (çalışma alanı seçilmemiş): ajansın kendi olayları (agencyId) + ev tenant'ı.
 *  - Çıktı: action, targetType, targetId, actor {id, name|maskelenmiş e-posta}, güvenli meta, createdAt.
 *    IP ve ham e-posta ASLA dönmez. İmleçli sayfalama (son öğenin id'si).
 */
export const GET = route('activity.list', async (req) => {
  const actor = await requireActor();
  const url = new URL(req.url);
  const rawLimit = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(rawLimit) ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(rawLimit))) : DEFAULT_LIMIT;
  const cursor = url.searchParams.get('cursor');
  if (cursor && !CURSOR_RE.test(cursor)) throw new ClientError('Geçersiz imleç');

  const agencyHome = !!actor.agency && actor.tenant.kind === 'AGENCY' && !actor.agency.workspace;
  const where: Prisma.AuditLogWhereInput = agencyHome
    ? { OR: [{ agencyId: actor.agency!.id }, { tenantId: actor.tenantId }] }
    : { tenantId: actor.tenantId };

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      action: true,
      targetType: true,
      targetId: true,
      actorUserId: true,
      meta: true,
      createdAt: true,
    },
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const actorIds = [...new Set(page.map((r) => r.actorUserId).filter((x): x is string => !!x))];
  const users = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, email: true } })
    : [];
  const nameOf = new Map(users.map((u) => [u.id, u.name?.trim() || maskEmail(u.email) || 'Üye']));

  const items = page.map((r) => ({
    id: r.id,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    actor: r.actorUserId ? { id: r.actorUserId, name: nameOf.get(r.actorUserId) ?? 'Eski üye' } : null,
    meta: safeMeta(r.meta),
    createdAt: r.createdAt,
  }));
  return NextResponse.json({ items, nextCursor: hasMore ? page[page.length - 1]!.id : null });
});
