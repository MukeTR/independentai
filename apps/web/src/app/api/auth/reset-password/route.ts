import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { prisma } from '@/server/prisma';
import { consumeAuthToken } from '@/server/auth-tokens';
import { hashPassword } from '@/server/password';
import { validatePassword } from '@/server/normalize';
import { enforceRateLimit } from '@/server/rate-limit';
import { audit } from '@/server/audit';

/** Token + yeni şifre → şifre güncellenir, tüm oturumlar düşürülür. */
export const POST = route('auth.reset', async (req) => {
  await enforceRateLimit(req, { name: 'reset', limit: 10, windowMs: 3_600_000 });
  const body = await readJson<{ token?: unknown; password?: unknown }>(req);
  const token = typeof body.token === 'string' ? body.token : '';
  const password = validatePassword(body.password);
  const userId = await consumeAuthToken(token, 'PASSWORD_RESET');
  if (!userId) throw new ClientError('Bağlantı geçersiz veya süresi dolmuş. Yeni bir sıfırlama isteyin.');
  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(password), sessionVersion: { increment: 1 }, emailVerifiedAt: new Date() },
  });
  await audit({ action: 'auth.password_reset', tenantId: user.tenantId, actorUserId: user.id, req });
  return NextResponse.json({ ok: true });
});
