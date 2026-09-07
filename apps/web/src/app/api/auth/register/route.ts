import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson } from '@/server/errors';
import { setSessionCookie } from '@/server/session';
import { registerWithPassword } from '@/server/accounts';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { audit } from '@/server/audit';
import { issueAuthToken } from '@/server/auth-tokens';
import { absoluteUrl, sendEmail, templates } from '@/server/mailer';
import { launchOfferOpen } from '@independentai/shared';
import { ClientError } from '@/server/errors';

export const POST = route('auth.register', async (req) => {
  await enforceRateLimit(req, LIMITS.register);
  if (!launchOfferOpen()) throw new ClientError('Yeni kayıtlar şu an kapalı');
  const body = await readJson<{ email?: unknown; password?: unknown; companyName?: unknown; website?: unknown }>(req);
  const { user, tenant } = await registerWithPassword(body);

  // E-posta doğrulama bağlantısı (RESEND yoksa NotificationLog'a "skipped" düşer, kayıt engellenmez).
  const token = await issueAuthToken(user.id, 'EMAIL_VERIFY');
  const t = templates.emailVerify(absoluteUrl(`/verify-email?token=${token}`));
  void sendEmail({
    to: user.email,
    subject: t.subject,
    html: t.html,
    text: t.text,
    kind: 'email_verify',
    tenantId: tenant.id,
  });

  await audit({ action: 'auth.register', tenantId: tenant.id, actorUserId: user.id, req });
  const res = NextResponse.json({ ok: true, next: '/onboarding' }, { status: 201 });
  await setSessionCookie(res, { userId: user.id, tenantId: tenant.id, email: user.email, sv: user.sessionVersion });
  return res;
});
