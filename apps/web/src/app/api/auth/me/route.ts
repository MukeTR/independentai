import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { requireActor } from '@/server/authz';

export const GET = route('auth.me', async () => {
  const a = await requireActor();
  return NextResponse.json({
    id: a.userId,
    email: a.email,
    name: a.name,
    role: a.role,
    isSuperAdmin: a.isSuperAdmin,
    emailVerified: a.emailVerified,
    tenant: {
      id: a.tenant.id,
      name: a.tenant.name,
      website: a.tenant.website,
      plan: a.tenant.plan,
      trialEndsAt: a.tenant.trialEndsAt,
      trialDaysLeft: a.entitlement.trialDaysLeft,
      onboardingCompleted: !!a.tenant.onboardingCompletedAt,
    },
    entitlement: a.entitlement,
  });
});
