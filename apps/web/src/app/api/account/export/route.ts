import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { requireActor } from '@/server/authz';
import { exportTenantData } from '@/server/accounts';
import { enforceRateLimit } from '@/server/rate-limit';
import { audit } from '@/server/audit';

/** KVKK veri taşınabilirliği: hesabın tüm verisi JSON olarak (OWNER). */
export const GET = route('account.export', async (req) => {
  const actor = await requireActor({ role: 'OWNER' });
  await enforceRateLimit(req, { name: 'export', limit: 5, windowMs: 3_600_000 }, `tenant:${actor.tenantId}`);
  const data = await exportTenantData(actor.tenantId);
  await audit({ action: 'account.export', tenantId: actor.tenantId, actorUserId: actor.userId, req });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="independentai-export-${new Date().toISOString().slice(0, 10)}.json"`,
      'cache-control': 'no-store',
    },
  });
});
