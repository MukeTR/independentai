import { api } from '@/lib/api';
import { BrandSettingsForm } from './brand-settings-form';

type Brand = { id: string; name: string; aliases: string[]; website: string | null };

export default async function SettingsPage() {
  const brands = await api<Brand[]>('/brands');

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
