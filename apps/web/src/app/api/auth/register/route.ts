import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/prisma';
import { hashPassword } from '@/server/password';
import { setSessionCookie, jsonError, handleRouteError } from '@/server/session';
import { FREE_TRIAL_MONTHS } from '@independentai/shared';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2),
  website: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) return jsonError('Bu e-posta zaten kayıtlı', 409);

    const trialEndsAt = new Date();
    trialEndsAt.setMonth(trialEndsAt.getMonth() + FREE_TRIAL_MONTHS);

    const tenant = await prisma.tenant.create({
      data: { name: body.companyName, website: body.website, trialEndsAt },
    });
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: body.email,
        passwordHash: hashPassword(body.password),
        role: 'OWNER',
      },
    });

    const res = NextResponse.json({ ok: true });
    await setSessionCookie(res, { userId: user.id, tenantId: tenant.id, email: user.email });
    return res;
  } catch (err) {
    return handleRouteError(err);
  }
}
