import { redirect } from 'next/navigation';
import { getActor } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { AuthCentered } from '@/components/auth/auth-centered';
import { OnboardingForm } from './onboarding-form';

export const metadata = { title: 'Kurulum — Independent AI', robots: { index: false, follow: false } };

/**
 * Sunucu tarafı guard: giriş yoksa /login; onboarding tamamlandıysa /dashboard;
 * OWNER olmayan üye (davetle gelen) kurulumu yapamaz → /dashboard.
 */
export default async function OnboardingPage() {
  const actor = await getActor();
  if (!actor) redirect('/login?next=/onboarding');
  if (actor.tenant.onboardingCompletedAt) redirect('/dashboard');
  if (actor.role !== 'OWNER') redirect('/dashboard');

  // Yarım kalmış kurulum (eski akıştan) varsa formu doldurarak devam ettir.
  const [brand, competitors, prompts] = await Promise.all([
    prisma.brand.findFirst({ where: { tenantId: actor.tenantId, isOwn: true }, orderBy: { createdAt: 'asc' } }),
    prisma.competitor.findMany({ where: { tenantId: actor.tenantId }, select: { name: true } }),
    prisma.prompt.findMany({ where: { tenantId: actor.tenantId }, select: { text: true } }),
  ]);

  return (
    <AuthCentered>
      <OnboardingForm
        initial={{
          brandName: brand?.name ?? actor.tenant.name,
          aliases: brand?.aliases ?? [],
          website: brand?.website ?? actor.tenant.website ?? '',
          competitors: competitors.map((c) => c.name),
          prompts: prompts.map((p) => p.text),
        }}
        limits={{ competitors: actor.entitlement.limits.competitors, prompts: actor.entitlement.limits.prompts }}
      />
    </AuthCentered>
  );
}
