import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson } from '@/server/errors';
import { requireAgencyActor } from '@/server/authz';
import { createAgencyInvite } from '@/server/agency';
import { absoluteUrl, sendEmail, emailConfigured } from '@/server/mailer';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { isTestEnv } from '@/server/env';
import { audit } from '@/server/audit';

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Yönetici', STRATEGIST: 'Stratejist', ANALYST: 'Analist' };

function inviteMail(agencyName: string, role: string, link: string) {
  const r = ROLE_LABEL[role] ?? role;
  return {
    subject: `${agencyName} sizi Independent AI ajans ekibine davet etti`,
    html: `
  <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#14110D;line-height:1.6">
    <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#9A968B;margin-bottom:8px">Independent AI</div>
    <h2 style="font-size:20px;margin:0 0 12px">${agencyName} ajans ekibine davet</h2>
    <div style="font-size:14px;color:#444"><p><b>${agencyName}</b> ajansına <b>${r}</b> rolüyle davet edildiniz. Davet 7 gün geçerlidir.</p></div>
    <p style="margin-top:20px"><a href="${link}" style="display:inline-block;background:#4F46E5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px">Daveti kabul et</a></p>
    <p style="font-size:12px;color:#9A968B;margin-top:24px">Bu e-postayı siz talep etmediyseniz yok sayabilirsiniz.</p>
  </div>`,
    text: `${agencyName} ajansına ${r} rolüyle davet edildiniz (7 gün geçerli): ${link}`,
  };
}

/**
 * Ajans daveti (OWNER/ADMIN). E-posta altyapısı yoksa link yanıtta döner (`delivery: 'link'`).
 * Koltuk limiti ve mevcut üyelik kontrolü agency.ts içinde.
 */
export const POST = route('agency.invite', async (req) => {
  const actor = await requireAgencyActor('ADMIN');
  await enforceRateLimit(req, LIMITS.invite, `agency:${actor.agency.id}`);
  const body = await readJson<{ email?: unknown; role?: unknown; allClients?: unknown; workspaceIds?: unknown }>(req);
  const inv = await createAgencyInvite(actor, {
    email: body.email,
    role: body.role,
    allClients: body.allClients,
    workspaceIds: body.workspaceIds,
  });
  const link = absoluteUrl(`/agency/invite/${inv.token}`);
  let delivery: 'email' | 'link' = 'link';
  if (emailConfigured() || isTestEnv()) {
    const t = inviteMail(actor.agency.name, inv.role, link);
    const ok = await sendEmail({
      to: inv.email,
      subject: t.subject,
      html: t.html,
      text: t.text,
      kind: 'agency_invite',
      tenantId: actor.agency.homeTenantId,
    });
    if (ok) delivery = 'email';
  }
  await audit({
    action: 'agency.invite',
    agencyId: actor.agency.id,
    actorUserId: actor.userId,
    targetType: 'invite',
    targetId: inv.inviteId,
    meta: { role: inv.role },
    req,
  });
  return NextResponse.json(
    {
      ok: true,
      inviteId: inv.inviteId,
      email: inv.email,
      role: inv.role,
      delivery,
      ...(delivery === 'link' ? { link } : {}),
    },
    { status: 201 },
  );
});
