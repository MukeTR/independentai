import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { requireActor } from '@/server/authz';
import { resendInvite } from '@/server/team';
import { absoluteUrl, sendEmail, templates, emailConfigured } from '@/server/mailer';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { isTestEnv } from '@/server/env';

/**
 * Daveti yeniden gönder (ADMIN+): yeni token üretilir, eski link geçersiz olur, süre 7 gün uzar.
 * E-posta altyapısı yoksa yeni link yanıtta döner (`delivery: 'link'`).
 */
export const POST = route('team.invite_resend', async (req, ctx) => {
  const actor = await requireActor({ write: true });
  await enforceRateLimit(req, LIMITS.invite, `tenant:${actor.tenantId}`);
  const id = await requireParam(ctx, 'id');
  const inv = await resendInvite(actor, id, { req });
  const link = absoluteUrl(`/invite?token=${inv.token}`);
  let delivery: 'email' | 'link' = 'link';
  if (emailConfigured() || isTestEnv()) {
    const t = templates.invite(actor.tenant.name, inv.role, link);
    const ok = await sendEmail({
      to: inv.email,
      subject: t.subject,
      html: t.html,
      text: t.text,
      kind: 'invite',
      tenantId: actor.tenantId,
    });
    if (ok) delivery = 'email';
  }
  return NextResponse.json({
    ok: true,
    inviteId: inv.inviteId,
    email: inv.email,
    role: inv.role,
    delivery,
    ...(delivery === 'link' ? { link } : {}),
  });
});
