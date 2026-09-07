import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { requireActor } from '@/server/authz';
import { verifyConnection, getOwnedConnection } from '@/server/commerce/connections';
import { publicConnectionView } from '@/server/commerce/credentials';

/** Kimlik bilgilerini sağlayıcıda yeniden doğrular; sonuç + güncel bağlantı görünümü döner. */
export const POST = route('integrations.verify', async (_req, ctx) => {
  const actor = await requireActor({ write: true, brandContext: true });
  const id = await requireParam(ctx, 'id');
  const result = await verifyConnection(actor, id);
  const connection = await getOwnedConnection(actor, id);
  return NextResponse.json({ ...result, connection: publicConnectionView(connection) });
});
