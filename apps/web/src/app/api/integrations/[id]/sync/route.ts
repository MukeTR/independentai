import { NextResponse, after } from 'next/server';
import { route, requireParam } from '@/server/route';
import { requireActor } from '@/server/authz';
import { triggerSync } from '@/server/commerce/connections';
import { processCatalogSyncs } from '@/server/commerce/catalog-sync';
import { log } from '@/server/logger';

export const maxDuration = 60;

/**
 * Manuel senkron: işi kuyruğa alır (aktif iş varsa onu döndürür) ve yanıt gönderildikten sonra
 * kuyruğu işlemeye başlar — kullanıcı günlük cron'u beklemez. Bütçe dolunca iş RUNNING kalır ve
 * cron imleçten devam eder.
 */
export const POST = route('integrations.sync', async (_req, ctx) => {
  const actor = await requireActor({ write: true, brandContext: true });
  const id = await requireParam(ctx, 'id');
  const { sync, created } = await triggerSync(actor, id);
  after(async () => {
    try {
      await processCatalogSyncs({ deadlineAt: Date.now() + 50_000 });
    } catch (err) {
      log.error('integrations.sync.process_failed', { connectionId: id, err });
    }
  });
  return NextResponse.json(
    {
      created,
      sync: {
        id: sync.id,
        status: sync.status,
        fetched: sync.fetched,
        total: sync.total,
        page: sync.page,
        attempt: sync.attempt,
        triggeredBy: sync.triggeredBy,
        createdAt: sync.createdAt,
      },
    },
    { status: 202 },
  );
});
