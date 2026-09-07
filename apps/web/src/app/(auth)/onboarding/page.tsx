import { redirect } from 'next/navigation';
import { getActor } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { AuthCentered } from '@/components/auth/auth-centered';
import { OnboardingForm } from './onboarding-form';

export const metadata = { title: 'Kurulum — Independent AI', robots: { index: false, follow: false } };

/**
 * Sunucu tarafı guard: giriş yoksa /login; ajans üyesi → /agency; onboarding tamamlandıysa /dashboard;
 * OWNER olmayan üye (davetle gelen) kurulumu yapamaz → /dashboard.
 */
export default async function OnboardingPage() {
  const actor = await getActor();
  if (!actor) redirect('/login?next=/onboarding');
  if (actor.agency) redirect('/agency');
  if (actor.tenant.onboardingCompletedAt) redirect('/dashboard');
  if (actor.role !== 'OWNER') redirect('/dashboard');

  // Yarım kalmış kurulum (eski akıştan) varsa formu doldurarak devam ettir.
  const [brand, competitors, prompts, others] = await Promise.all([
    prisma.brand.findFirst({ where: { tenantId: actor.tenantId, isOwn: true }, orderBy: { createdAt: 'asc' } }),
    prisma.competitor.findMany({ where: { tenantId: actor.tenantId }, select: { name: true } }),
    prisma.prompt.findMany({ where: { tenantId: actor.tenantId }, select: { text: true } }),
    prisma.user.count({ where: { tenantId: actor.tenantId, id: { not: actor.userId } } }),
  ]);
  // Ajansa dönüşüm yalnızca verisiz, tek kişilik hesapta mümkündür (agency.ts aynı kuralı sunucuda uygular).
  const allowAgency = !brand && prompts.length === 0 && others === 0;

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
        allowAgency={allowAgency}
      />
    </AuthCentered>
  );
}
