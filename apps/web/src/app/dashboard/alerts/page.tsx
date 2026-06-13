import { Bell } from 'lucide-react';
import { AlertSettingsForm } from '@/components/dashboard/alert-settings-form';

export const metadata = { title: 'Uyarılar & Raporlar' };

export default function AlertsPage() {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <Bell className="w-5 h-5 text-brand" />
        <div className="eyebrow">Bildirimler</div>
      </div>
      <h1 className="font-display text-[36px] tracking-tight">Uyarılar & Raporlar</h1>
      <p className="text-[15px] text-ink-muted mt-3 max-w-2xl mb-8">
        Haftalık görünürlük raporlarını ve ani düşüş uyarılarını e-posta veya Slack'e alın. AI görünürlüğünüzdeki
        değişiklikleri kaçırmayın.
      </p>

      <AlertSettingsForm />
    </div>
  );
}
