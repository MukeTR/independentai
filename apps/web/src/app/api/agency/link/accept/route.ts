import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { acceptLinkRequest } from '@/server/agency';
import { audit } from '@/server/audit';

/** Marka hesabının OWNER'ı bağlama isteğini onaylar (ajans üzerinden veya VIEWER/ADMIN → 403). */
export const POST = route('agency.link_accept', async (req) => {
  const actor = await requireActor({ directOnly: true });
  const body = await readJson<{ token?: unknown }>(req);
  const token = typeof body.token === 'string' ? body.token : '';
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(token)) throw new ClientError('token gerekli');
  const { agencyId } = await acceptLinkRequest(actor, token);
  await audit({ action: 'agency.link_accept', agencyId, tenantId: actor.tenantId, actorUserId: actor.userId, req });
  return NextResponse.json({ ok: true, agencyId, next: '/dashboard' });
});
