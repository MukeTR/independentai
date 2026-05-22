import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireSession, handleRouteError } from '@/server/session';

export async function GET() {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { tenant: true },
    });
    if (!user) return NextResponse.json({ message: 'Kullanıcı bulunamadı' }, { status: 404 });

    const trialDaysLeft = Math.max(
      0,
      Math.ceil((user.tenant.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    );

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        website: user.tenant.website,
        trialEndsAt: user.tenant.trialEndsAt,
        trialDaysLeft,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
