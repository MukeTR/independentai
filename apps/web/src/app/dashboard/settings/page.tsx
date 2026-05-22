import { requireSession } from '@/server/session';
import { listOwnBrands } from '@/server/repo';
import { BrandSettingsForm } from './brand-settings-form';

export default async function SettingsPage() {
  const session = await requireSession();
  const brands = await listOwnBrands(session.tenantId);

  return (
    <div className="max-w-3xl">
      <div className="eyebrow">Markam</div>
      <h1 className="font-display text-[36px] tracking-tight mt-2">Marka ayarları</h1>
      <p className="text-[14px] text-ink-muted mt-2">
        AI cevaplarında markanızı doğru tespit edebilmemiz için kullanabileceği tüm yazımları ekleyin.
      </p>

      <div className="mt-8">
        <BrandSettingsForm brands={brands} />
      </div>
    </div>
  );
}
