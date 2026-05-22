import { api } from '@/lib/api';
import { CompetitorsManager } from './competitors-manager';

type Competitor = { id: string; name: string; aliases: string[]; website: string | null };

export default async function CompetitorsPage() {
  const competitors = await api<Competitor[]>('/competitors');

  return (
    <div className="max-w-4xl">
      <div className="eyebrow">Rakipler</div>
      <h1 className="font-display text-[36px] tracking-tight mt-2">Rakip takibi</h1>
      <p className="text-[14px] text-ink-muted mt-2">
        Rakiplerinizin AI cevaplarında nasıl yer aldığını görmek için ekleyin.
      </p>

      <div className="mt-8">
        <CompetitorsManager initial={competitors} />
      </div>
    </div>
  );
}
