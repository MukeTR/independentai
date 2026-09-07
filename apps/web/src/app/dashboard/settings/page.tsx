import { requirePageActor } from '@/server/authz';
import { listOwnBrands } from '@/server/repo';
import { prisma } from '@/server/prisma';
import { BrandSettingsForm } from './brand-settings-form';
import { TeamManager } from '@/components/dashboard/team-manager';
import { AccountSection } from '@/components/dashboard/account-section';
import { ActivityFeed } from '@/components/dashboard/activity-feed';

export const metadata = { title: 'Ayarlar' };

export default async function SettingsPage() {
  const actor = await requirePageActor();
  const [brands, user] = await Promise.all([
    listOwnBrands(actor.tenantId),
    prisma.user.findUnique({ where: { id: actor.userId }, select: { passwordHash: true, oauthProvider: true } }),
  ]);
  const canWrite = actor.role !== 'VIEWER' && actor.entitlement.active;

  return (
    <div className="max-w-3xl space-y-12">
      <section aria-labelledby="brand-h">
        <div className="eyebrow">Markam</div>
        <h1 id="brand-h" className="font-display text-[30px] sm:text-[36px] tracking-tight mt-2">
          Marka ayarları
        </h1>
        <p className="text-[14px] text-ink-muted mt-2">
          AI cevaplarında markanızı doğru tespit edebilmemiz için kullanılabilecek tüm yazımları ekleyin. Lansmanda
          hesap başına bir kendi markası tanımlanır; çoklu marka planlanıyor.
        </p>
        {!canWrite && (
          <p className="text-[12.5px] text-warning mt-3" role="status">
            {actor.role === 'VIEWER'
              ? 'Görüntüleyici rolündesiniz; ayarları yalnızca yönetici veya sahip değiştirebilir.'
              : 'Deneme süresi dolduğu için ayarlar salt-okunur.'}
          </p>
        )}
        <div className="mt-8">
          <BrandSettingsForm brands={brands} readOnly={!canWrite} />
        </div>
      </section>

      <section aria-labelledby="team-h">
        <div className="eyebrow">Ekip</div>
        <h2 id="team-h" className="font-display text-[24px] tracking-tight mt-2">
          Üyeler ve davetler
        </h2>
        <p className="text-[14px] text-ink-muted mt-2">
          Sahip her şeyi yapar (sahipliği devredebilir), Yönetici içerik ekler/siler ve davet gönderir, Görüntüleyici
          yalnızca görür. Bu planda en fazla {actor.entitlement.limits.members} üye.
        </p>
        <div className="mt-6">
          <TeamManager />
        </div>
      </section>

      <section aria-labelledby="activity-h">
        <div className="eyebrow">Aktivite</div>
        <h2 id="activity-h" className="font-display text-[24px] tracking-tight mt-2">
          Hesap hareketleri
        </h2>
        <p className="text-[14px] text-ink-muted mt-2">
          Ekip, ayar ve güvenlik işlemlerinin kaydı. Kim, ne zaman, ne yaptı — e-posta ve IP gösterilmez.
        </p>
        <div className="mt-6">
          <ActivityFeed />
        </div>
      </section>

      <section aria-labelledby="account-h">
        <div className="eyebrow">Hesap</div>
        <h2 id="account-h" className="font-display text-[24px] tracking-tight mt-2">
          Güvenlik ve veri
        </h2>
        <div className="mt-6">
          <AccountSection
            role={actor.role}
            hasPassword={!!user?.passwordHash}
            oauthProvider={user?.oauthProvider ?? null}
            emailVerified={actor.emailVerified}
            email={actor.email}
            tenantName={actor.tenant.name}
          />
        </div>
      </section>
    </div>
  );
}
