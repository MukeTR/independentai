import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { requireAgencyActor } from '@/server/authz';
import { resendAgencyInvite } from '@/server/agency';
import { absoluteUrl, sendEmail, emailConfigured } from '@/server/mailer';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { isTestEnv } from '@/server/env';
import { audit } from '@/server/audit';

/** Yeni token üretir (eski davet silinir) ve e-postayı yeniden gönderir. */
export const POST = route('agency.invite_resend', async (req, ctx) => {
  const actor = await requireAgencyActor('ADMIN');
  await enforceRateLimit(req, LIMITS.invite, `agency:${actor.agency.id}`);
  const id = await requireParam(ctx, 'id');
  const inv = await resendAgencyInvite(actor, id);
  const link = absoluteUrl(`/agency/invite/${inv.token}`);
  let delivery: 'email' | 'link' = 'link';
  if (emailConfigured() || isTestEnv()) {
    const ok = await sendEmail({
      to: inv.email,
      subject: `${actor.agency.name} sizi Independent AI ajans ekibine davet etti`,
      html: `<p><b>${actor.agency.name}</b> ajansına davetiniz yenilendi (7 gün geçerli).</p><p><a href="${link}">Daveti kabul et</a></p>`,
      text: `${actor.agency.name} ajansına davetiniz yenilendi (7 gün geçerli): ${link}`,
      kind: 'agency_invite',
      tenantId: actor.agency.homeTenantId,
    });
    if (ok) delivery = 'email';
  }
  await audit({
    action: 'agency.invite_resend',
    agencyId: actor.agency.id,
    actorUserId: actor.userId,
    targetType: 'invite',
    targetId: inv.inviteId,
    req,
  });
  return NextResponse.json({
    ok: true,
    inviteId: inv.inviteId,
    email: inv.email,
    delivery,
    ...(delivery === 'link' ? { link } : {}),
  });
});
