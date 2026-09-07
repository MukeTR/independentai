import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requirePageActor, allowedRealtimeTopics } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { computeEntitlement } from '@/server/entitlement';
import { TopBar } from '@/components/top-bar';
import { DockNav } from '@/components/dock-nav';
import { RealtimeProvider } from '@/components/realtime-provider';
import { AgencyNav } from '@/components/agency/agency-nav';
import { VerifyEmailBanner } from '@/components/dashboard/verify-email-banner';

export const metadata = { robots: { index: false, follow: false } };

/**
 * Ajans portalı: ajans üyesi olmayan → /dashboard. Ajans ev tenant'ında ana ekran burasıdır.
 * Realtime: agency:<id> + erişilebilir tenant topic'leri (RLS ile aynı liste); sayfalar apiFetch ile
 * kendini yeniler, bu yüzden otomatik router.refresh kapalı.
 */
export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  const actor = await requirePageActor();
  if (!actor.agency) redirect('/dashboard');
  const [topics, home] = await Promise.all([
    allowedRealtimeTopics(actor),
    prisma.tenant.findUnique({ where: { id: actor.agency.homeTenantId }, select: { trialEndsAt: true, plan: true } }),
  ]);
  const ent = actor.agency.entitlement;
  const homeEnt = home ? computeEntitlement({ plan: home.plan, trialEndsAt: home.trialEndsAt }) : null;
  const user = {
    email: actor.email,
    role: actor.agency.role,
    isSuperAdmin: actor.isSuperAdmin,
    agency: true,
    tenant: { name: actor.agency.name, trialDaysLeft: homeEnt?.trialDaysLeft ?? 0, plan: ent.plan, active: ent.active },
  };

  return (
    <RealtimeProvider topics={topics} autoRefresh={false}>
      <div className="min-h-screen">
        <TopBar user={user} />
        {!ent.active && (
          <div
            role="status"
            className="bg-warning/10 border-b border-warning/30 text-[13px] text-ink px-6 py-2.5 text-center"
          >
            Ajans deneme süreniz doldu. Portföy <b>salt-okunur</b>: yeni müşteri, davet ve ölçüm kapalı; veriler
            korunuyor.{' '}
            <Link href="/pricing" className="underline">
              Planlar
            </Link>{' '}
            duyurulduğunda buradan devam edebilirsiniz.
          </div>
        )}
        {ent.active && ent.plan === 'LAUNCH' && homeEnt && homeEnt.trialDaysLeft <= 14 && (
          <div
            role="status"
            className="bg-brand-glow border-b border-brand/20 text-[13px] text-ink px-6 py-2.5 text-center"
          >
            Ücretsiz lansman döneminiz {homeEnt.trialDaysLeft} gün sonra bitiyor. Süre sonunda portföy salt-okunur moda
            geçer; veriler silinmez.
          </div>
        )}
        {!actor.emailVerified && !actor.email.endsWith('@users.independentai.space') && <VerifyEmailBanner />}
        <main id="main" className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10 pt-7 pb-28">
          <AgencyNav />
          {children}
        </main>
        <DockNav user={user} />
      </div>
    </RealtimeProvider>
  );
}
