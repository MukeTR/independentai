import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { requireActor } from '@/server/authz';
import { deleteConnection } from '@/server/commerce/connections';

/** Bağlantıyı ve tüm katalog verisini kalıcı siler (CatalogProduct/CatalogSync cascade). */
export const DELETE = route('integrations.delete', async (req, ctx) => {
  const actor = await requireActor({ write: true, brandContext: true });
  const id = await requireParam(ctx, 'id');
  await deleteConnection(actor, id, req);
  return NextResponse.json({ ok: true });
});
