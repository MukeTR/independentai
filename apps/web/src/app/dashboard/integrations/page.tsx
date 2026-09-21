import { Plug } from 'lucide-react';
import { requirePageActor } from '@/server/authz';
import { listConnections } from '@/server/commerce/connections';
import { listProviderInfos } from '@/server/commerce/providers';
import { IntegrationsManager, type IntegrationsNotice } from '@/components/dashboard/integrations-manager';
import type { ConnectionDto, IntegrationsResponse, ProviderDto } from '@/components/dashboard/integrations-types';

export const metadata = { title: 'Entegrasyonlar' };

function first(v: string | string[] | undefined): string | null {
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' && s.length > 0 ? s.slice(0, 64) : null;
}

/**
 * Mağaza entegrasyonları — marka bağlamı zorunlu; ajans ev tenant'ında çalışma alanı seçimine yönlendirir.
 * İlk veri sunucuda üretilir (yükleme titremesi yok); istemci Realtime/polling ile tazeler.
 */
export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requirePageActor({ brandContext: true });
  const sp = await searchParams;
  const connected = first(sp.connected);
  const error = first(sp.error);
  const notice: IntegrationsNotice = connected
    ? { kind: 'connected', code: connected }
    : error
      ? { kind: 'error', code: error }
      : null;

  const [connections, providers] = await Promise.all([listConnections(actor.tenantId), listProviderInfos()]);
  const readOnlyReason = actor.role === 'VIEWER' ? 'viewer' : !actor.entitlement.active ? 'inactive' : null;
  const initial: IntegrationsResponse = {
    // Date → ISO string (istemci DTO'su string bekler)
    connections: JSON.parse(JSON.stringify(connections)) as ConnectionDto[],
    providers: providers as ProviderDto[],
    limits: {
      storeConnections: actor.entitlement.limits.storeConnections,
      catalogProducts: actor.entitlement.limits.catalogProducts,
      used: connections.filter((c) => c.status !== 'DISCONNECTED').length,
    },
    canWrite: !readOnlyReason,
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-2">
        <Plug className="w-5 h-5 text-brand" aria-hidden />
        <div className="eyebrow">Entegrasyonlar</div>
      </div>
      <h1 className="font-display text-[30px] sm:text-[36px] tracking-tight">Mağaza bağlantıları</h1>
      <p className="text-[15px] text-ink-muted mt-3 max-w-2xl mb-8">
        Shopify, ikas veya Ticimax mağazanızı bağlayın; ürün kataloğunuz salt-okunur senkronlanır ve AI asistanlarında
        ürünlerinizin nasıl göründüğünü ölçmek için kullanılır. Sipariş, müşteri ve ödeme verisi çekilmez.
      </p>
      <IntegrationsManager initial={initial} notice={notice} readOnlyReason={readOnlyReason} />
    </div>
  );
}
