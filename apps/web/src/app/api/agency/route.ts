import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson } from '@/server/errors';
import { requireActor, requireAgencyActor } from '@/server/authz';
import { convertTenantToAgency, getAgencySummary, updateAgencyProfile } from '@/server/agency';
import { audit } from '@/server/audit';

/** Ajans özeti: profil, entitlement (limit/kullanım), üye ve müşteri sayıları. */
export const GET = route('agency.summary', async () => {
  const actor = await requireAgencyActor();
  return NextResponse.json(await getAgencySummary(actor));
});

/**
 * Marka tenant'ını ajans hesabına dönüştür (onboarding "ajans" seçimi). Yalnızca hesabın KENDİ
 * OWNER'ı; ajans üzerinden erişimde yasak. Marka verisi/başka üye varsa 409 (agency.ts).
 */
export const POST = route('agency.convert', async (req) => {
  const actor = await requireActor({ role: 'OWNER', directOnly: true });
  const body = await readJson<{ name?: unknown; website?: unknown }>(req);
  const result = await convertTenantToAgency(actor.userId, { name: body.name, website: body.website });
  if (!result.alreadyAgency) {
    await audit({
      action: 'agency.convert',
      tenantId: actor.tenantId,
      agencyId: result.agencyId,
      actorUserId: actor.userId,
      req,
    });
  }
  return NextResponse.json(
    { ok: true, agencyId: result.agencyId, alreadyAgency: result.alreadyAgency, next: '/agency' },
    { status: result.alreadyAgency ? 200 : 201 },
  );
});

/** Ajans adı / web sitesi (OWNER/ADMIN). */
export const PATCH = route('agency.update', async (req) => {
  const actor = await requireAgencyActor('ADMIN');
  const body = await readJson<{ name?: unknown; website?: unknown }>(req);
  const agency = await updateAgencyProfile(actor, body);
  await audit({
    action: 'agency.update',
    agencyId: actor.agency.id,
    actorUserId: actor.userId,
    meta: { fields: Object.keys(body) },
    req,
  });
  return NextResponse.json({ ok: true, agency });
});
