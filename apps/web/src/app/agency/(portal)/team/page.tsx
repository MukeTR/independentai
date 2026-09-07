import { requirePageActor } from '@/server/authz';
import { AgencyTeamManager } from '@/components/agency/agency-team-manager';

export const metadata = { title: 'Ajans ekibi — Independent AI' };

export default async function AgencyTeamPage() {
  const actor = await requirePageActor();
  const ent = actor.agency!.entitlement;
  return (
    <div>
      <div className="eyebrow">Ekip</div>
      <h1 className="font-display text-[30px] sm:text-[36px] tracking-tight mt-1">Üyeler, roller ve atamalar</h1>
      <p className="text-[14px] text-ink-muted mt-2 mb-6 max-w-2xl">
        Sahip her şeyi yapar; Yönetici müşteri ve ekip yönetir (tüm müşteriler); Stratejist atandığı müşterilerde
        yazabilir; Analist yalnızca görür. Lansman planında {ent.limits.seats} koltuk ve {ent.limits.clients} müşteri.
      </p>
      <AgencyTeamManager />
    </div>
  );
}
