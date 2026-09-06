import { Bell } from 'lucide-react';
import { requirePageActor } from '@/server/authz';
import { AlertSettingsForm } from '@/components/dashboard/alert-settings-form';

export const metadata = { title: 'Uyarılar & Raporlar' };

export default async function AlertsPage() {
  const actor = await requirePageActor();
  const readOnly = actor.role === 'VIEWER' || !actor.entitlement.active;
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <Bell className="w-5 h-5 text-brand" aria-hidden />
        <div className="eyebrow">Bildirimler</div>
      </div>
      <h1 className="font-display text-[30px] sm:text-[36px] tracking-tight">Uyarılar & Raporlar</h1>
      <p className="text-[15px] text-ink-muted mt-3 max-w-2xl mb-8">
        Haftalık görünürlük raporlarını ve ani düşüş uyarılarını e-posta veya Slack&apos;e alın.
      </p>
      {readOnly && (
        <p className="text-[12.5px] text-warning mb-4" role="status">
          {actor.role === 'VIEWER'
            ? 'Görüntüleyici rolü ayarları değiştiremez.'
            : 'Deneme süresi dolduğu için ayarlar salt-okunur.'}
        </p>
      )}
      <AlertSettingsForm readOnly={readOnly} />
    </div>
  );
}
