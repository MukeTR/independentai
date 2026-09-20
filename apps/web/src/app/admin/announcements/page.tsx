import { requireSuperAdmin } from '@/server/admin';
import { listAnnouncements } from '@/server/announcements';
import { ScreenGuide } from '@/components/admin/screen-guide';
import { AnnouncementsManager } from './announcement-form';

export const dynamic = 'force-dynamic';

export default async function AdminAnnouncements() {
  await requireSuperAdmin();
  const items = await listAnnouncements();
  const live = items.filter((a) => a.live).length;

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="eyebrow">Super Admin</div>
          <h1 className="font-display text-[30px] sm:text-[36px] tracking-tight mt-2">Duyurular</h1>
          <p className="text-[14px] text-ink-muted mt-2">
            {items.length.toLocaleString('tr-TR')} duyuru · {live.toLocaleString('tr-TR')} yayında. Ana sayfa,
            fiyatlandırma, araç sayfaları ve panelin üstündeki şerit.
          </p>
        </div>
        <ScreenGuide className="mt-1" />
      </div>
      <AnnouncementsManager items={items} />
    </div>
  );
}
