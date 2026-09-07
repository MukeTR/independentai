import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { listShares, createShare, shareLimitFor, SHARE_MAX_DAYS, SHARE_RANGES } from '@/server/report-share';
import { audit } from '@/server/audit';

/** Marka bağlamı şart (ajans ev tenant'ında 403). Listede token yok — sadece meta. */
export const GET = route('shares.list', async () => {
  const actor = await requireActor({ brandContext: true });
  const shares = await listShares(actor.tenantId);
  return NextResponse.json({
    shares,
    limit: shareLimitFor(actor),
    activeCount: shares.filter((s) => s.active).length,
    maxDays: SHARE_MAX_DAYS,
    ranges: SHARE_RANGES,
    canManage: actor.role !== 'VIEWER' && actor.entitlement.active,
  });
});

/** Oluştur (ADMIN+, aktif entitlement). Tam link yalnızca bu yanıtta döner. */
export const POST = route('shares.create', async (req) => {
  const actor = await requireActor({ write: true, brandContext: true });
  const body = await readJson<{ rangeDays?: unknown; label?: unknown; expiresAt?: unknown; expiresInDays?: unknown }>(
    req,
  );
  const result = await createShare(actor, body);
  await audit({
    action: 'share.create',
    tenantId: actor.tenantId,
    agencyId: actor.agency?.id ?? null,
    actorUserId: actor.userId,
    targetType: 'report_share',
    targetId: result.share.id,
    meta: { rangeDays: result.share.rangeDays },
    req,
  });
  return NextResponse.json({ ok: true, ...result }, { status: 201 });
});
