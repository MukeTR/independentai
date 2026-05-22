import { requireSession } from '@/server/session';
import { listCompetitors } from '@/server/repo';
import { CompetitorsManager } from './competitors-manager';

export default async function CompetitorsPage() {
  const session = await requireSession();
  const competitors = await listCompetitors(session.tenantId);

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
