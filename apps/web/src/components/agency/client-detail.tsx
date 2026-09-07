'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Plus, Save, X } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { InlineAlert } from '@/components/ui/inline-alert';
import type { ClientCard } from '@/server/agency';
import { useWorkspaceSwitch } from './use-workspace-switch';
import { AGENCY_ROLE_LABEL, HEALTH_LABEL, WORKSPACE_STATUS_LABEL, fmtAgo, fmtDelta } from './format';

export type AssignedMember = {
  membershipId: string;
  email: string;
  name: string | null;
  role: string;
  viaAllClients: boolean;
  roleOverride: string | null;
};
type MemberOpt = { id: string; email: string; name: string | null };

export function ClientDetail({
  card,
  assigned,
  memberOptions,
  canManage,
}: {
  card: ClientCard;
  assigned: AssignedMember[];
  memberOptions: MemberOpt[];
  canManage: boolean;
}) {
  const hydrated = useHydrated();
  const router = useRouter();
  const ids = { label: useId(), tag: useId(), owner: useId() };
  const [label, setLabel] = useState(card.label ?? '');
  const [tags, setTags] = useState<string[]>(card.tags);
  const [tagInput, setTagInput] = useState('');
  const [owner, setOwner] = useState(card.ownerMemberId ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { switchTo, busy, error: switchError } = useWorkspaceSwitch();

  const dirty =
    label !== (card.label ?? '') || owner !== (card.ownerMemberId ?? '') || tags.join('|') !== card.tags.join('|');

  function addTag() {
    const v = tagInput.trim().slice(0, 30);
    if (!v || tags.includes(v) || tags.length >= 10) return;
    setTags([...tags, v]);
    setTagInput('');
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await apiFetch(`/api/agency/clients/${card.workspaceId}`, {
        method: 'PATCH',
        json: { label: label || null, tags, ownerMemberId: owner || null },
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const h = HEALTH_LABEL[card.health];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <section className="card p-6" aria-labelledby="sum-h">
          <div className="flex items-start justify-between gap-3">
            <h2 id="sum-h" className="font-display text-[16px]">
              Özet · son 30 gün
            </h2>
            <span className={`chip !text-[10.5px] border ${h.cls}`}>{h.label}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
            <Kpi
              label="Görünürlük"
              value={`${card.visibility}%`}
              sub={`7g ${fmtDelta(card.visibilityDelta7)} · 30g ${fmtDelta(card.visibilityDelta30)}`}
            />
            <Kpi label="Share of Voice" value={`${card.sov}%`} />
            <Kpi label="Başarısız (7g)" value={card.failedRuns7d} />
            <Kpi label="Kritik bulgu" value={card.criticalFindings} sub="son denetim" />
          </div>
          <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[12.5px]">
            <Row k="Durum" v={WORKSPACE_STATUS_LABEL[card.status]} />
            <Row k="Web sitesi" v={card.website ?? '—'} />
            <Row k="Son çalıştırma" v={fmtAgo(card.lastRunAt)} />
            <Row
              k="Mağaza"
              v={card.platform ? `${card.platform} · son senkron ${fmtAgo(card.lastSyncAt)}` : 'bağlı değil'}
            />
            {card.syncError && <Row k="Senkron hatası" v={card.syncError} tone="warning" />}
          </dl>
          <div className="mt-6 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => void switchTo(card.tenantId)}
              disabled={!hydrated || busy || card.status === 'ARCHIVED'}
              className="btn-primary !py-2 text-[13px] inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              Panelde aç <ArrowUpRight className="w-4 h-4" aria-hidden />
            </button>
            {card.status === 'PAUSED' && (
              <span className="text-[12px] text-warning">Duraklatılmış: panel salt-okunur, ölçümler durdu.</span>
            )}
            {switchError && <span className="text-[12px] text-danger">{switchError}</span>}
          </div>
        </section>

        <section className="card p-6" aria-labelledby="members-h">
          <h2 id="members-h" className="font-display text-[16px]">
            Erişimi olan ekip üyeleri ({assigned.length})
          </h2>
          <ul className="mt-3 divide-y divide-hairline">
            {assigned.map((m) => (
              <li key={m.membershipId} className="py-2.5 flex items-center justify-between gap-3 flex-wrap text-[13px]">
                <span className="min-w-0 truncate">
                  {m.name ? `${m.name} · ` : ''}
                  <span className="font-mono text-[12px]">{m.email}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="chip !text-[10.5px]">
                    {AGENCY_ROLE_LABEL[m.role as keyof typeof AGENCY_ROLE_LABEL] ?? m.role}
                  </span>
                  {m.roleOverride && (
                    <span className="chip own !text-[10.5px]">
                      bu müşteride: {AGENCY_ROLE_LABEL[m.roleOverride as keyof typeof AGENCY_ROLE_LABEL]}
                    </span>
                  )}
                  <span className="text-[11px] text-ink-faint">{m.viaAllClients ? 'tüm müşteriler' : 'atanmış'}</span>
                </span>
              </li>
            ))}
            {assigned.length === 0 && <li className="py-2 text-[12.5px] text-ink-faint">Henüz atanmış üye yok.</li>}
          </ul>
          <p className="text-[11.5px] text-ink-faint mt-3">Atamalar Ekip sayfasından düzenlenir.</p>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="card p-6" aria-labelledby="meta-h">
          <h2 id="meta-h" className="font-display text-[16px]">
            Ajans içi bilgiler
          </h2>
          <p className="text-[12px] text-ink-faint mt-1">Müşteriye gösterilmez.</p>
          <fieldset disabled={!canManage} className="mt-4 space-y-4 min-w-0">
            <div>
              <label htmlFor={ids.label} className="eyebrow block mb-1.5">
                Etiket
              </label>
              <input
                id={ids.label}
                className="input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={80}
                placeholder="Retainer · Q4"
              />
            </div>
            <div>
              <label htmlFor={ids.tag} className="eyebrow block mb-1.5">
                Tag'ler
              </label>
              <div className="flex gap-2">
                <input
                  id={ids.tag}
                  className="input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="e-ticaret"
                />
                <button type="button" className="btn-secondary !px-3" onClick={addTag} aria-label="Tag ekle">
                  <Plus className="w-4 h-4" aria-hidden />
                </button>
              </div>
              {tags.length > 0 && (
                <ul className="flex flex-wrap gap-1.5 mt-2" aria-label="Tag listesi">
                  {tags.map((t) => (
                    <li key={t} className="chip own">
                      {t}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setTags(tags.filter((x) => x !== t))}
                          aria-label={`${t} kaldır`}
                        >
                          <X className="w-3 h-3" aria-hidden />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label htmlFor={ids.owner} className="eyebrow block mb-1.5">
                Sorumlu üye
              </label>
              <select id={ids.owner} className="input" value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="">— seçilmedi —</option>
                {memberOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ? `${m.name} · ` : ''}
                    {m.email}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
          {error && <InlineAlert className="mt-3">{error}</InlineAlert>}
          {saved && !dirty && (
            <p className="text-[12px] text-positive mt-3" role="status">
              Kaydedildi.
            </p>
          )}
          {canManage && (
            <button
              type="button"
              onClick={save}
              disabled={!hydrated || saving || !dirty}
              className="btn-primary !py-2 text-[13px] inline-flex items-center gap-1.5 mt-4 disabled:opacity-50"
              aria-busy={saving}
            >
              <Save className="w-4 h-4" aria-hidden /> {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          )}
        </section>
      </aside>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="font-display text-[24px] tabular mt-1 leading-none">{value}</div>
      {sub && <div className="text-[11px] text-ink-faint mt-1.5">{sub}</div>}
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: 'warning' }) {
  return (
    <div className="flex justify-between gap-3 border-b border-hairline/60 py-1">
      <dt className="text-ink-faint">{k}</dt>
      <dd
        className={`text-right truncate ${tone === 'warning' ? 'text-warning' : 'text-ink'}`}
        suppressHydrationWarning
      >
        {v}
      </dd>
    </div>
  );
}
