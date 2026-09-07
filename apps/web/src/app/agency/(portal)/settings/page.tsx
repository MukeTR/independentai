import Link from 'next/link';
import { requirePageActor, hasAgencyRole } from '@/server/authz';
import { getAgencySummary } from '@/server/agency';
import { AgencySettingsForm } from '@/components/agency/agency-settings-form';

export const metadata = { title: 'Ajans ayarları — Independent AI' };

export default async function AgencySettingsPage() {
  const actor = await requirePageActor();
  const summary = await getAgencySummary(actor as typeof actor & { agency: NonNullable<typeof actor.agency> });
  const canEdit = hasAgencyRole(actor, 'ADMIN') && summary.entitlement.active;
  const ent = summary.entitlement;

  return (
    <div className="max-w-3xl space-y-12">
      <section aria-labelledby="profile-h">
        <div className="eyebrow">Ajans</div>
        <h1 id="profile-h" className="font-display text-[30px] sm:text-[36px] tracking-tight mt-1">
          Ajans ayarları
        </h1>
        <p className="text-[14px] text-ink-muted mt-2">
          Ad ve web sitesi davet e-postalarında ve bağlama onay ekranında görünür.
        </p>
        {!canEdit && (
          <p className="text-[12.5px] text-warning mt-3" role="status">
            {hasAgencyRole(actor, 'ADMIN')
              ? 'Deneme süresi dolduğu için ayarlar salt-okunur.'
              : 'Ajans ayarlarını yalnızca Sahip veya Yönetici değiştirebilir.'}
          </p>
        )}
        <div className="mt-6">
          <AgencySettingsForm
            initial={{ name: summary.agency.name, website: summary.agency.website ?? '' }}
            readOnly={!canEdit}
          />
        </div>
      </section>

      <section aria-labelledby="plan-h">
        <div className="eyebrow">Plan</div>
        <h2 id="plan-h" className="font-display text-[24px] tracking-tight mt-1">
          Limitler ve kullanım
        </h2>
        <p className="text-[14px] text-ink-muted mt-2">
          Lansman döneminde ajans hesabı ücretsizdir; fiyatlar henüz açıklanmadı. Süre sonunda portföy salt-okunur olur,
          veri silinmez.
        </p>
        <div className="card mt-5 divide-y divide-hairline text-[13.5px]">
          <Row k="Plan" v={ent.plan === 'LAUNCH' ? 'Lansman (ücretsiz)' : ent.plan} />
          <Row k="Koltuk" v={`${ent.usage.seats} / ${ent.limits.seats}`} />
          <Row k="Müşteri çalışma alanı" v={`${ent.usage.clients} / ${ent.limits.clients}`} />
          <Row k="Paylaşım linki (müşteri başına aktif)" v={`${ent.limits.shareLinks}`} />
          <Row
            k="Beyaz etiket"
            v={ent.whiteLabel ? 'Var' : 'Lansmanda yok — raporlar "Independent AI ile hazırlandı" imzası taşır'}
          />
          <Row k="Durum" v={ent.active ? 'Aktif' : 'Salt-okunur (deneme süresi doldu)'} />
        </div>
      </section>

      <section aria-labelledby="share-h">
        <div className="eyebrow">Raporlar</div>
        <h2 id="share-h" className="font-display text-[24px] tracking-tight mt-1">
          Paylaşım linkleri
        </h2>
        <p className="text-[14px] text-ink-muted mt-2">
          Paylaşım linkleri müşteri bağlamında yönetilir: bir müşteriyi panelde açın, ardından{' '}
          <b>Uyarılar & Raporlar</b> sayfasındaki "Rapor paylaşım linkleri" bölümünü kullanın. Linkler salt-okunurdur,
          en fazla 90 gün geçerlidir ve istediğiniz an iptal edilir.
        </p>
        <Link href="/agency/clients" className="btn-secondary !py-2 text-[13px] inline-flex mt-4">
          Müşteri seç
        </Link>
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3">
      <span className="text-ink-muted">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
