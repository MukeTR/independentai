import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { prisma } from '@/server/prisma';
import { requireActor } from '@/server/authz';
import { consumeAuthToken, issueAuthToken } from '@/server/auth-tokens';
import { absoluteUrl, sendEmail, templates, emailConfigured } from '@/server/mailer';
import { enforceRateLimit } from '@/server/rate-limit';
import { isTestEnv } from '@/server/env';

/** Doğrulama e-postasını (yeniden) gönderir. */
export const POST = route('auth.verify_send', async (req) => {
  const actor = await requireActor();
  if (actor.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });
  await enforceRateLimit(req, { name: 'verify-send', limit: 3, windowMs: 3_600_000 }, `user:${actor.userId}`);
  const token = await issueAuthToken(actor.userId, 'EMAIL_VERIFY');
  const t = templates.emailVerify(absoluteUrl(`/verify-email?token=${token}`));
  const sent = await sendEmail({
    to: actor.email,
    subject: t.subject,
    html: t.html,
    text: t.text,
    kind: 'email_verify',
    tenantId: actor.tenantId,
  });
  return NextResponse.json({
    ok: true,
    delivery: sent ? 'email' : emailConfigured() || isTestEnv() ? 'failed' : 'unavailable',
  });
});

/** Token ile doğrulama (giriş şart değil — link e-postadan gelir). */
export const PUT = route('auth.verify_confirm', async (req) => {
  const body = await readJson<{ token?: unknown }>(req);
  const token = typeof body.token === 'string' ? body.token : '';
  const userId = await consumeAuthToken(token, 'EMAIL_VERIFY');
  if (!userId) throw new ClientError('Doğrulama bağlantısı geçersiz veya süresi dolmuş');
  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return NextResponse.json({ ok: true });
});
