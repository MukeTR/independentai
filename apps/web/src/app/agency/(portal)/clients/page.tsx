import { Suspense } from 'react';
import { requirePageActor } from '@/server/authz';
import { listClientCards, summarizePortfolio } from '@/server/agency';
import { ClientsManager } from '@/components/agency/clients-manager';

export const metadata = { title: 'Müşteriler — Independent AI' };

export default async function AgencyClientsPage() {
  const actor = await requirePageActor();
  const agency = actor.agency!;
  const cards = await listClientCards(agency);
  const initial = {
    cards,
    summary: summarizePortfolio(cards),
    entitlement: agency.entitlement,
    me: { membershipId: agency.membershipId, role: agency.role, allClients: agency.allClients },
  };
  return (
    <div>
      <div className="eyebrow">Müşteriler</div>
      <h1 className="font-display text-[30px] sm:text-[36px] tracking-tight mt-1">Çalışma alanları</h1>
      <p className="text-[14px] text-ink-muted mt-2 mb-6 max-w-2xl">
        Her müşteri ayrı bir çalışma alanıdır: kendi markası, soruları ve ölçümleri. Duraklatılan alanda ölçüm ve yazma
        durur; arşivlenen alan listeden kalkar; bağlantı kesildiğinde veri müşteride kalır.
      </p>
      <Suspense fallback={<div className="card h-40 animate-pulse bg-paper-2" aria-busy="true" />}>
        <ClientsManager initial={initial} />
      </Suspense>
    </div>
  );
}
