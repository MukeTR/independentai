import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson } from '@/server/errors';
import { requireAgencyActor } from '@/server/authz';
import { resolveAccessibleWorkspace } from '@/server/agency';
import { setWorkspaceCookie, clearWorkspaceCookie } from '@/server/session';

/**
 * Aktif müşteri çalışma alanını seç: { tenantId } → erişim DB'de doğrulanır → `iai_ws` çerezi.
 * { tenantId: null } → çerez silinir (ajans portföyüne dönüş). Çerez yalnızca ipucudur; her
 * istekte `getActor()` yeniden doğrular (başkasının müşterisi → sessizce ev tenant'ına düşer).
 */
export const POST = route('agency.workspace', async (req) => {
  const actor = await requireAgencyActor();
  const body = await readJson<{ tenantId?: unknown }>(req);
  if (body.tenantId === null || body.tenantId === undefined || body.tenantId === '') {
    const res = NextResponse.json({ ok: true, tenantId: null });
    clearWorkspaceCookie(res);
    return res;
  }
  const ws = await resolveAccessibleWorkspace(actor.agency, body.tenantId);
  const res = NextResponse.json({ ok: true, tenantId: ws.tenantId, name: ws.name, status: ws.status });
  setWorkspaceCookie(res, ws.tenantId);
  return res;
});
