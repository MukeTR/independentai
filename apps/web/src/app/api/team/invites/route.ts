import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { createInvite, revokeInvite, previewInvite } from '@/server/team';
import { absoluteUrl, sendEmail, templates, emailConfigured } from '@/server/mailer';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { audit } from '@/server/audit';
import { isTestEnv } from '@/server/env';

/** Davet önizleme (giriş şart değil): ?token= → e-posta/rol/ekip adı. */
export const GET = route('team.invite_preview', async (req) => {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  const inv = await previewInvite(token);
  if (!inv) throw new ClientError('Davet geçersiz veya süresi dolmuş');
  return NextResponse.json(inv);
});

/**
 * Davet oluştur (ADMIN+). E-posta altyapısı yoksa davet linki yanıtta döner ve kullanıcı
 * elle paylaşır (`delivery: 'link'`).
 */
export const POST = route('team.invite', async (req) => {
  const actor = await requireActor({ write: true });
  await enforceRateLimit(req, LIMITS.invite, `tenant:${actor.tenantId}`);
  const body = await readJson<{ email?: unknown; role?: unknown }>(req);
  const inv = await createInvite(actor, body);
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
  await audit({
    action: 'member.invite',
    tenantId: actor.tenantId,
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

export const DELETE = route('team.invite_revoke', async (req) => {
  const actor = await requireActor({ write: true });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw new ClientError('id gerekli');
  await revokeInvite(actor, id);
  await audit({
    action: 'member.invite_revoke',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'invite',
    targetId: id,
    req,
  });
  return NextResponse.json({ ok: true });
});
