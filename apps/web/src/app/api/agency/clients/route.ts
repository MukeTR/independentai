import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, TrialExpiredError } from '@/server/errors';
import { requireAgencyActor } from '@/server/authz';
import { listClientCards, summarizePortfolio, createClientWorkspace } from '@/server/agency';
import { audit } from '@/server/audit';

/** Portföy: erişilebilir müşteri kartları + özet (?includeArchived=1 arşivi de getirir). */
export const GET = route('agency.clients', async (req) => {
  const actor = await requireAgencyActor();
  const includeArchived = new URL(req.url).searchParams.get('includeArchived') === '1';
  const cards = await listClientCards(actor.agency, { includeArchived });
  return NextResponse.json({
    cards,
    summary: summarizePortfolio(cards.filter((c) => c.status !== 'ARCHIVED')),
    entitlement: actor.agency.entitlement,
    me: { membershipId: actor.agency.membershipId, role: actor.agency.role, allClients: actor.agency.allClients },
  });
});

/** Yeni müşteri çalışma alanı (ADMIN+; plan limiti sunucuda). */
export const POST = route('agency.client_create', async (req) => {
  const actor = await requireAgencyActor('ADMIN');
  if (!actor.agency.entitlement.active)
    throw new TrialExpiredError('Ajans deneme süresi doldu; yeni müşteri eklenemez.');
  const body = await readJson<{
    name?: unknown;
    website?: unknown;
    label?: unknown;
    tags?: unknown;
    ownerMemberId?: unknown;
  }>(req);
  const result = await createClientWorkspace(actor, {
    name: body.name,
    website: body.website,
    label: body.label,
    tags: body.tags,
    ownerMemberId: body.ownerMemberId,
  });
  await audit({
    action: 'agency.client_create',
    agencyId: actor.agency.id,
    tenantId: result.tenantId,
    actorUserId: actor.userId,
    targetType: 'workspace',
    targetId: result.workspaceId,
    req,
  });
  return NextResponse.json({ ok: true, ...result }, { status: 201 });
});
