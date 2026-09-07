import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { requireActor } from '@/server/authz';
import { listAccessibleWorkspaces } from '@/server/agency';

/**
 * TopBar çalışma alanı değiştiricisi için: erişilebilir müşteriler + seçili alan.
 * Ajans üyesi değilse 200 { agency:null } döner (marka panelinde sessizce gizlenir; 403 gürültüsü yok).
 */
export const GET = route('agency.workspaces', async () => {
  const actor = await requireActor();
  if (!actor.agency) return NextResponse.json({ agency: null, current: null, workspaces: [] });
  const workspaces = await listAccessibleWorkspaces(actor.agency);
  return NextResponse.json({
    agency: { id: actor.agency.id, name: actor.agency.name, role: actor.agency.role },
    current: actor.agency.workspace?.tenantId ?? null,
    workspaces,
  });
});
