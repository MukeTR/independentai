import { requirePageActor } from '@/server/authz';
import { listClientCards, summarizePortfolio } from '@/server/agency';
import { Portfolio } from '@/components/agency/portfolio';

export const metadata = { title: 'Ajans portföyü — Independent AI' };

export default async function AgencyPortfolioPage() {
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
      <div className="eyebrow">Portföy</div>
      <h1 className="font-display text-[30px] sm:text-[36px] tracking-tight mt-1 mb-6">{agency.name}</h1>
      <Portfolio initial={initial} />
    </div>
  );
}
