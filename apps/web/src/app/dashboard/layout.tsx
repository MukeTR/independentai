import Link from 'next/link';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { getActor, allowedRealtimeTopics } from '@/server/authz';
import { tenantTopic, agencyTopic } from '@/server/realtime';
import { touchLastActive } from '@/server/team';
import { DockNav } from '@/components/dock-nav';
import { TopBar } from '@/components/top-bar';
import { VerifyEmailBanner } from '@/components/dashboard/verify-email-banner';
import { RealtimeProvider, RealtimeBadge } from '@/components/realtime-provider';

export const metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect('/login?error=session_expired');
  // Ajans ev tenant'ında marka paneli anlamsız (marka verisi yok) → portföy. Çalışma alanı seçilince panel açılır.
  if (actor.tenant.kind === 'AGENCY' && !actor.agency?.workspace) redirect('/agency');
  // Kurulum tamamlanmamış OWNER → onboarding (üyeler kurulum yapamaz, panel açılır).
  if (!actor.tenant.onboardingCompletedAt && actor.role === 'OWNER') redirect('/onboarding');

  // Son aktivite damgası — yanıt gönderildikten sonra, isteği bekletmeden (10 dk'da en fazla bir yazım).
  after(() => touchLastActive(actor.userId));

  // Realtime topic'leri: istenen küme ∩ sunucunun izin verdiği küme (RLS ile aynı kural).
  const wanted = new Set<string>();
  if (actor.tenant.kind === 'BRAND') wanted.add(tenantTopic(actor.tenantId));
  if (actor.agency) wanted.add(agencyTopic(actor.agency.id));
  const allowed = new Set(await allowedRealtimeTopics(actor));
  const topics = [...wanted].filter((t) => allowed.has(t));

  const ent = actor.entitlement;
  const user = {
    email: actor.email,
    role: actor.role,
    isSuperAdmin: actor.isSuperAdmin,
    agency: !!actor.agency,
    tenant: { name: actor.tenant.name, trialDaysLeft: ent.trialDaysLeft, plan: ent.plan, active: ent.active },
  };

  return (
    <RealtimeProvider topics={topics}>
      <div className="min-h-screen">
        <TopBar user={user} />
        {/* Canlı bağlantı rozeti: yalnızca Realtime yapılandırılmışsa görünür (disabled/idle → null) */}
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10 flex justify-end">
          <RealtimeBadge className="mt-1.5" />
        </div>
        {!ent.active && (
          <div
            role="status"
            className="bg-warning/10 border-b border-warning/30 text-[13px] text-ink px-6 py-2.5 text-center"
          >
            {ent.reason === 'workspace_paused' ? (
              <>
                Bu müşteri çalışma alanı <b>duraklatılmış</b>: veriler korunuyor, ancak yazma ve ölçüm kapalı.
              </>
            ) : (
              <>
                Deneme süreniz doldu. Hesabınız <b>salt-okunur</b> modda: verileriniz korunuyor, ancak yeni soru/rakip
                eklenemez ve ölçümler durdu.{' '}
                <Link href="/pricing" className="underline">
                  Planlar
                </Link>{' '}
                duyurulduğunda buradan devam edebilirsiniz.
              </>
            )}
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
    </RealtimeProvider>
  );
}
