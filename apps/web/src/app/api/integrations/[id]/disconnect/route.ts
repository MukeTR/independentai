import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { requireActor } from '@/server/authz';
import { disconnectConnection } from '@/server/commerce/connections';

/** Bağlantıyı keser: kimlik bilgisi silinir, katalog soft-delete; satır denetim izi için kalır. */
export const POST = route('integrations.disconnect', async (req, ctx) => {
  const actor = await requireActor({ write: true, brandContext: true });
  const id = await requireParam(ctx, 'id');
  await disconnectConnection(actor, id, req);
  return NextResponse.json({ ok: true });
});
