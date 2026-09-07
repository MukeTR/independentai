import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { requireActor } from '@/server/authz';
import { runCommerceAuditFromCatalog } from '@/server/commerce/commerce-audit';

/** Bağlı katalog veri kalitesi skoru — GET (oturumlu, marka bağlamı). */
export const GET = route('tools.catalog_readiness', async () => {
  const actor = await requireActor({ brandContext: true });
  return NextResponse.json(await runCommerceAuditFromCatalog(actor.tenantId));
});
