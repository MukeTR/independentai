import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/prisma';
import { verifyPassword } from '@/server/password';
import { setSessionCookie, jsonError, handleRouteError } from '@/server/session';

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    // OAuth ile oluşturulmuş, şifresi olmayan hesap → uygun yöntemi öner.
    if (user && !user.passwordHash && user.oauthProvider) {
      const label = user.oauthProvider === 'google' ? 'Google' : 'LinkedIn';
      return jsonError(`Bu hesap ${label} ile oluşturulmuş. ${label} ile giriş yapın.`, 401);
    }
    if (!user || !user.passwordHash || !verifyPassword(body.password, user.passwordHash)) {
      return jsonError('E-posta veya şifre hatalı', 401);
    }
    const res = NextResponse.json({ ok: true });
    await setSessionCookie(res, { userId: user.id, tenantId: user.tenantId, email: user.email });
    return res;
  } catch (err) {
    return handleRouteError(err);
  }
}
