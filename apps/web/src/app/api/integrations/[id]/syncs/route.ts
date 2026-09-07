import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { prisma } from '@/server/prisma';
import { requireActor } from '@/server/authz';
import { getOwnedConnection } from '@/server/commerce/connections';
import { syncErrorMessage } from '@/server/commerce/catalog-sync';

/** Son 10 senkron işi (ilerleme çubuğu polling fallback'i + geçmiş). */
export const GET = route('integrations.syncs', async (_req, ctx) => {
  const actor = await requireActor({ brandContext: true });
  const id = await requireParam(ctx, 'id');
  const conn = await getOwnedConnection(actor, id);
  const syncs = await prisma.catalogSync.findMany({
    where: { connectionId: conn.id, tenantId: actor.tenantId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      status: true,
      page: true,
      fetched: true,
      upserted: true,
      unchanged: true,
      deleted: true,
      total: true,
      startedAt: true,
      finishedAt: true,
      errorCode: true,
      triggeredBy: true,
      attempt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({
    connectionStatus: conn.status,
    syncs: syncs.map((s) => ({
      ...s,
      // Tetikleyici "manual:<userId>" biçiminde; kullanıcı kimliğini istemciye taşımayız.
      triggeredBy: s.triggeredBy ? s.triggeredBy.split(':')[0] : null,
      errorMessage: syncErrorMessage(s.errorCode),
      progress:
        s.status === 'SUCCESS'
          ? 100
          : s.total
            ? Math.min(99, Math.round((s.fetched / Math.max(s.total, 1)) * 100))
            : Math.min(95, s.page * 5),
    })),
  });
});
