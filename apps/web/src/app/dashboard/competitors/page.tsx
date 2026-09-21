import { requirePageActor } from '@/server/authz';
import { listCompetitors } from '@/server/repo';
import { CompetitorsManager } from './competitors-manager';

export const metadata = { title: 'Rakipler' };

export default async function CompetitorsPage() {
  const actor = await requirePageActor();
  const competitors = await listCompetitors(actor.tenantId);
  const readOnly = actor.role === 'VIEWER' || !actor.entitlement.active;

  return (
    <div className="max-w-4xl">
      <div className="eyebrow">Rakipler</div>
      <h1 className="font-display text-[30px] sm:text-[36px] tracking-tight mt-2">Rakip takibi</h1>
      <p className="text-[14px] text-ink-muted mt-2">
        Rakiplerinizin AI cevaplarında nasıl yer aldığını görmek için ekleyin.
      </p>
      {readOnly && (
        <p className="text-[12.5px] text-warning mt-3" role="status">
          {actor.role === 'VIEWER'
            ? 'Görüntüleyici rolündesiniz; rakip ekleme/silme yönetici veya sahip yetkisi gerektirir.'
            : 'Deneme süresi dolduğu için bu sayfa salt-okunur.'}
        </p>
      )}
      <div className="mt-8">
        <CompetitorsManager initial={competitors} readOnly={readOnly} limit={actor.entitlement.limits.competitors} />
      </div>
    </div>
  );
}
