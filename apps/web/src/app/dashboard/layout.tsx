import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActor } from '@/server/authz';
import { DockNav } from '@/components/dock-nav';
import { TopBar } from '@/components/top-bar';
import { VerifyEmailBanner } from '@/components/dashboard/verify-email-banner';

export const metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect('/login?error=session_expired');
  // Kurulum tamamlanmamış OWNER → onboarding (üyeler kurulum yapamaz, panel açılır).
  if (!actor.tenant.onboardingCompletedAt && actor.role === 'OWNER') redirect('/onboarding');

  const ent = actor.entitlement;
  const user = {
    email: actor.email,
    role: actor.role,
    isSuperAdmin: actor.isSuperAdmin,
    tenant: { name: actor.tenant.name, trialDaysLeft: ent.trialDaysLeft, plan: ent.plan, active: ent.active },
  };

  return (
    <div className="min-h-screen">
      <TopBar user={user} />
      {!ent.active && (
        <div
          role="status"
          className="bg-warning/10 border-b border-warning/30 text-[13px] text-ink px-6 py-2.5 text-center"
        >
          Deneme süreniz doldu. Hesabınız <b>salt-okunur</b> modda: verileriniz korunuyor, ancak yeni soru/rakip
          eklenemez ve ölçümler durdu.{' '}
          <Link href="/pricing" className="underline">
            Planlar
          </Link>{' '}
          duyurulduğunda buradan devam edebilirsiniz.
        </div>
      )}
      {ent.active && ent.plan === 'LAUNCH' && ent.trialDaysLeft <= 14 && (
        <div
          role="status"
          className="bg-brand-glow border-b border-brand/20 text-[13px] text-ink px-6 py-2.5 text-center"
        >
          Ücretsiz lansman döneminiz {ent.trialDaysLeft} gün sonra bitiyor. Süre sonunda hesap salt-okunur moda geçer;
          veriler silinmez.
        </div>
      )}
      {!actor.emailVerified && !actor.email.endsWith('@users.independentai.space') && <VerifyEmailBanner />}
      <main id="main" className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10 pt-7 pb-28">
        {children}
      </main>
      <DockNav user={user} />
    </div>
  );
}
