import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { deleteTenantCascade } from '@/server/accounts';
import { clearSessionCookie } from '@/server/session';
import { audit } from '@/server/audit';

/**
 * Hesabı ve tüm verisini geri dönüşsüz siler (OWNER). Onay ifadesi: "HESABIMI SİL".
 * Diğer üyeler de silinir; UI bunu açıkça uyarır.
 */
export const POST = route('account.delete', async (req) => {
  const actor = await requireActor({ role: 'OWNER' });
  const body = await readJson<{ confirm?: unknown }>(req);
  if (body.confirm !== 'HESABIMI SİL') throw new ClientError('Onay ifadesi eşleşmiyor');
  await audit({
    action: 'tenant.delete',
    tenantId: null,
    actorUserId: actor.userId,
    meta: { tenantId: actor.tenantId, tenantName: actor.tenant.name },
    req,
  });
  await deleteTenantCascade(actor.tenantId);
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
});
