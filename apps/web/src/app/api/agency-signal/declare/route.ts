import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { audit } from '@/server/audit';
import { declareAgency } from '@/server/agency-signal';

/**
 * "Ben ajansım" beyanı — giriş yapmış ADMIN/OWNER (VIEWER 403). Gövde `{contactConsent?: boolean}`:
 * e-posta Lead'e yalnız kutu işaretliyse yazılır. Ajans ev tenant'ında anlamsız → 400.
 * Tenant başına 5/saat (`LIMITS.agencyDeclare`).
 */
export const POST = route('agency_signal.declare', async (req) => {
  const actor = await requireActor({ role: 'ADMIN' });
  if (actor.tenant.kind === 'AGENCY') throw new ClientError('Bu hesap zaten bir ajans hesabı');
  await enforceRateLimit(req, LIMITS.agencyDeclare, `tenant:${actor.tenantId}`);
  let contactConsent = false;
  try {
    const body = await readJson<{ contactConsent?: unknown }>(req);
    contactConsent = body.contactConsent === true;
  } catch {
    // gövdesiz istek de geçerli (yalnız beyan)
  }
  const result = await declareAgency({
    tenantId: actor.tenantId,
    userId: actor.userId,
    email: actor.email,
    website: actor.tenant.website,
    contactConsent,
  });
  await audit({
    action: 'agency.declared',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'agency_signal',
    targetId: actor.tenantId,
    meta: { contactConsent },
    req,
  });
  return NextResponse.json({ ok: true, score: result.score, status: result.status });
});
