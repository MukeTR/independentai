import { Bell, Link2 } from 'lucide-react';
import { requirePageActor } from '@/server/authz';
import { AlertSettingsForm } from '@/components/dashboard/alert-settings-form';
import { ShareLinks } from '@/components/dashboard/share-links';

export const metadata = { title: 'Uyarılar & Raporlar' };

export default async function AlertsPage() {
  const actor = await requirePageActor();
  const readOnly = actor.role === 'VIEWER' || !actor.entitlement.active;
  const brandContext = actor.tenant.kind === 'BRAND';
  return (
    <div className="max-w-3xl space-y-12">
      <section aria-labelledby="alerts-h">
        <div className="flex items-center gap-3 mb-2">
          <Bell className="w-5 h-5 text-brand" aria-hidden />
          <div className="eyebrow">Bildirimler</div>
        </div>
        <h1 id="alerts-h" className="font-display text-[30px] sm:text-[36px] tracking-tight">
          Uyarılar & Raporlar
        </h1>
        <p className="text-[15px] text-ink-muted mt-3 max-w-2xl mb-8">
          Haftalık görünürlük raporlarını ve ani düşüş uyarılarını e-posta veya Slack&apos;e alın.
        </p>
        {readOnly && (
          <p className="text-[12.5px] text-warning mb-4" role="status">
            {actor.role === 'VIEWER'
              ? 'Görüntüleyici rolü ayarları değiştiremez.'
              : actor.entitlement.reason === 'workspace_paused'
                ? 'Bu müşteri çalışma alanı duraklatılmış; ayarlar salt-okunur.'
                : 'Deneme süresi dolduğu için ayarlar salt-okunur.'}
          </p>
        )}
        <AlertSettingsForm readOnly={readOnly} />
      </section>

      {brandContext && (
        <section aria-labelledby="share-h">
          <div className="flex items-center gap-3 mb-2">
            <Link2 className="w-5 h-5 text-brand" aria-hidden />
            <div className="eyebrow">Paylaşım</div>
          </div>
          <h2 id="share-h" className="font-display text-[24px] tracking-tight">
            Rapor paylaşım linkleri
          </h2>
          <p className="text-[14px] text-ink-muted mt-2 mb-6 max-w-2xl">
            Görünürlük özetini giriş gerektirmeyen, salt-okunur bir sayfa olarak paylaşın (müşteri, yönetim, ajans
            raporu). Linkler en fazla 90 gün geçerlidir ve istediğiniz an iptal edilir; içerikte e-posta, AI yanıt metni
            veya kişisel veri bulunmaz.
          </p>
          <ShareLinks readOnly={readOnly} />
        </section>
      )}
    </div>
  );
}
