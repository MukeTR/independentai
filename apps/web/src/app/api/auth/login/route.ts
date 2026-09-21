import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, UnauthorizedError } from '@/server/errors';
import { prisma } from '@/server/prisma';
import { verifyPassword } from '@/server/password';
import { setSessionCookie } from '@/server/session';
import { enforceRateLimit, LIMITS, clientIp } from '@/server/rate-limit';
import { normalizeEmail } from '@/server/normalize';
import { audit } from '@/server/audit';

export const POST = route('auth.login', async (req) => {
  const body = await readJson<{ email?: unknown; password?: unknown }>(req);
  const email = normalizeEmail(body.email);
  // Hem IP hem e-posta bazlı limit (credential stuffing + tek hesaba brute force)
  await enforceRateLimit(req, LIMITS.login);
  await enforceRateLimit(req, { name: 'login-email', limit: 8, windowMs: 900_000 }, `email:${email}`);

  const password = typeof body.password === 'string' ? body.password : '';
  const user = await prisma.user.findUnique({ where: { email } });

  if (user && !user.passwordHash && user.oauthProvider) {
    const label = user.oauthProvider === 'google' ? 'Google' : 'LinkedIn';
    throw new UnauthorizedError(
      `Bu hesap ${label} ile oluşturulmuş. ${label} ile giriş yapın veya "şifremi unuttum" ile şifre belirleyin.`,
    );
  }
  if (!user || !user.passwordHash || !password || !verifyPassword(password, user.passwordHash)) {
    await audit({
      action: 'auth.login_failed',
      actorUserId: user?.id ?? null,
      tenantId: user?.tenantId ?? null,
      meta: { ip: clientIp(req) },
    });
    throw new UnauthorizedError('E-posta veya şifre hatalı');
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const res = NextResponse.json({ ok: true, next: '/dashboard' });
  await setSessionCookie(res, { userId: user.id, tenantId: user.tenantId, email: user.email, sv: user.sessionVersion });
  return res;
});
