import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { createInvite, cancelInvite, previewInvite } from '@/server/team';
import { absoluteUrl, sendEmail, templates, emailConfigured } from '@/server/mailer';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
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
 * elle paylaşır (`delivery: 'link'`). Audit + Realtime yayını `createInvite` içinde.
 */
export const POST = route('team.invite', async (req) => {
  const actor = await requireActor({ write: true });
  await enforceRateLimit(req, LIMITS.invite, `tenant:${actor.tenantId}`);
  const body = await readJson<{ email?: unknown; role?: unknown }>(req);
  const inv = await createInvite(actor, body, { req });
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

/** Daveti iptal et: ?id= (ADMIN+). */
export const DELETE = route('team.invite_cancel', async (req) => {
  const actor = await requireActor({ write: true });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw new ClientError('id gerekli');
  await cancelInvite(actor, id, { req });
  return NextResponse.json({ ok: true });
});
