import { Radar } from 'lucide-react';
import { requirePageActor } from '@/server/authz';
import { getDiscoveryOverview } from '@/server/discovery/analytics';
import { listSites } from '@/server/discovery/sites';
import { DiscoveryDashboard } from '@/components/discovery/discovery-dashboard';

export const metadata = { title: 'AI Trafiği' };

/**
 * AI Trafiği (Discovery) — ana ürün modülü.
 *
 * Marka bağlamı zorunlu (ajans ev tenant'ında çalışma alanı seçimine yönlendirir). İlk özet
 * sunucuda üretilir; istemci Realtime/polling ile tazeler. Tek site varsa doğrudan o site seçilir,
 * birden fazla site varsa "Tüm siteler" görünümüyle açılır.
 */
export default async function DiscoveryPage() {
  const actor = await requirePageActor({ brandContext: true });
  const sites = await listSites(actor.tenantId);
  const initialSiteId = sites.length === 1 ? (sites[0]?.id ?? null) : null;
  const overview = await getDiscoveryOverview(actor.tenantId, { siteId: initialSiteId, days: 30 });
  const canWrite = actor.role !== 'VIEWER' && actor.entitlement.active;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-3 mb-2">
        <Radar className="w-5 h-5 text-brand" aria-hidden />
        <div className="eyebrow">AI Discovery</div>
      </div>
      <h1 className="font-display text-[30px] sm:text-[36px] tracking-tight">AI Trafiği</h1>
      <p className="text-[15px] text-ink-muted mt-3 max-w-3xl mb-8">
        AI ürünlerinden sitenize gelen <b>gerçek ziyaretleri</b>, AI crawler’larının içeriğinizi çekme{' '}
        <b>isteklerini</b> ve bizim çalıştırdığımız <b>sentetik görünürlük ölçümlerini</b> ayrı ayrı gösteririz. Bu üç
        sayı birbirinin yerine geçmez ve hiçbir yerde toplanmaz.
      </p>
      <DiscoveryDashboard initial={overview} canWrite={canWrite} />
    </div>
  );
}
