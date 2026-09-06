import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson } from '@/server/errors';
import { prisma } from '@/server/prisma';
import { normalizeEmail } from '@/server/normalize';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { issueAuthToken } from '@/server/auth-tokens';
import { absoluteUrl, sendEmail, templates, emailConfigured } from '@/server/mailer';
import { isTestEnv } from '@/server/env';

/**
 * Şifre sıfırlama isteği. Hesap var mı yok mu sızdırmaz (her durumda aynı cevap).
 * E-posta altyapısı yoksa `delivery: 'unavailable'` ile dürüstçe bildirir.
 */
export const POST = route('auth.forgot', async (req) => {
  await enforceRateLimit(req, LIMITS.forgot);
  const body = await readJson<{ email?: unknown }>(req);
  const email = normalizeEmail(body.email);
  await enforceRateLimit(req, { name: 'forgot-email', limit: 3, windowMs: 3_600_000 }, `email:${email}`);

  const delivery = emailConfigured() || isTestEnv() ? 'email' : 'unavailable';
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = await issueAuthToken(user.id, 'PASSWORD_RESET');
    const t = templates.passwordReset(absoluteUrl(`/reset-password?token=${token}`));
    await sendEmail({
      to: user.email,
      subject: t.subject,
      html: t.html,
      text: t.text,
      kind: 'password_reset',
      tenantId: user.tenantId,
    });
  }
  return NextResponse.json({ ok: true, delivery });
});
