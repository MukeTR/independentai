'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, PauseCircle, PlayCircle, Archive, ArchiveRestore, Unlink, ArrowUpRight, X } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { useRealtimeEvent } from '@/components/realtime-provider';
import { InlineAlert } from '@/components/ui/inline-alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import type { ClientCard } from '@/server/agency';
import type { PortfolioData } from './portfolio';
import { useWorkspaceSwitch } from './use-workspace-switch';
import { HEALTH_LABEL, WORKSPACE_STATUS_LABEL, fmtAgo } from './format';

type Member = { id: string; role: string; status: string; user: { email: string; name: string | null } };

export function ClientsManager({ initial }: { initial: PortfolioData }) {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const [data, setData] = useState<PortfolioData>(initial);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(params.get('new') === '1');
  const [unlinkTarget, setUnlinkTarget] = useState<ClientCard | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const { switchTo, busy: switching, error: switchError } = useWorkspaceSwitch();
  const canManage = data.me.role === 'OWNER' || data.me.role === 'ADMIN';
  const isOwner = data.me.role === 'OWNER';
  const selectHint = params.get('select') === '1';

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<PortfolioData>(`/api/agency/clients${showArchived ? '?includeArchived=1' : ''}`));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [showArchived]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!canManage) return;
    apiFetch<{ members: Member[] }>('/api/agency/members')
      .then((r) => setMembers(r.members.filter((m) => m.status === 'ACTIVE')))
      .catch(() => undefined);
  }, [canManage]);
  useRealtimeEvent('agency.changed', () => void load());
  useEffect(() => {
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  async function patch(card: ClientCard, body: Record<string, unknown>) {
    setBusyId(card.workspaceId);
    setError(null);
    try {
      await apiFetch(`/api/agency/clients/${card.workspaceId}`, { method: 'PATCH', json: body });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmUnlink() {
    if (!unlinkTarget) return;
    setBusyId(unlinkTarget.workspaceId);
    try {
      await apiFetch(`/api/agency/clients/${unlinkTarget.workspaceId}`, { method: 'DELETE' });
      setUnlinkTarget(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const ent = data.entitlement;

  return (
    <div className="space-y-5">
      {selectHint && (
        <InlineAlert tone="info">
          Panel bir müşteri bağlamı gerektirir. Aşağıdan bir müşteriyi "Aç" ile seçin.
        </InlineAlert>
      )}
      {(error || switchError) && <InlineAlert>{error ?? switchError}</InlineAlert>}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[12.5px] text-ink-muted">
          {ent.usage.clients}/{ent.limits.clients} müşteri · {ent.clientsLeft} boş yer
          <label className="ml-4 inline-flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> arşivi
            göster
          </label>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={!hydrated || ent.clientsLeft <= 0 || !ent.active}
            className="btn-primary !py-2 text-[13px] inline-flex items-center gap-1.5 disabled:opacity-50"
            title={ent.clientsLeft <= 0 ? 'Müşteri sınırı doldu' : undefined}
          >
            <Plus className="w-4 h-4" aria-hidden /> Yeni müşteri
          </button>
        )}
      </div>

      {data.cards.length === 0 ? (
        <div className="card p-10 text-center">
          <h2 className="font-display text-[20px]">Henüz müşteri yok</h2>
          <p className="text-[14px] text-ink-muted mt-2">İlk müşterinizi oluşturarak başlayın.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="text-left text-[10.5px] uppercase tracking-wider text-ink-faint font-mono">
              <tr className="border-b border-hairline">
                <th className="px-4 py-3 font-medium">Müşteri</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">Sağlık</th>
                <th className="px-4 py-3 font-medium tabular">Görünürlük</th>
                <th className="px-4 py-3 font-medium">Son çalıştırma</th>
                <th className="px-4 py-3 font-medium">Sorumlu</th>
                <th className="px-4 py-3 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {data.cards.map((c) => {
                const rowBusy = busyId === c.workspaceId || switching;
                return (
                  <tr key={c.workspaceId} className={c.status === 'ARCHIVED' ? 'opacity-60' : ''}>
                    <td className="px-4 py-3">
                      <Link href={`/agency/clients/${c.workspaceId}`} className="font-medium hover:text-brand-deep">
                        {c.name}
                      </Link>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.label && <span className="chip !text-[10px]">{c.label}</span>}
                        {c.tags.map((t) => (
                          <span key={t} className="chip own !text-[10px]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{WORKSPACE_STATUS_LABEL[c.status]}</td>
                    <td className="px-4 py-3">
                      <span className={`chip !text-[10.5px] border ${HEALTH_LABEL[c.health].cls}`}>
                        {HEALTH_LABEL[c.health].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular">
                      {c.visibility}%{' '}
                      <span className="text-ink-faint text-[11px]">
                        ({c.visibilityDelta7 >= 0 ? '+' : ''}
                        {c.visibilityDelta7})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted" suppressHydrationWarning>
                      {fmtAgo(c.lastRunAt)}
                    </td>
                    <td className="px-4 py-3 text-ink-muted font-mono text-[11.5px] truncate max-w-[160px]">
                      {c.ownerEmail ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn
                          label={`${c.name} panelde aç`}
                          onClick={() => void switchTo(c.tenantId)}
                          disabled={rowBusy || c.status === 'ARCHIVED'}
                        >
                          <ArrowUpRight className="w-4 h-4" aria-hidden />
                        </IconBtn>
                        {canManage && c.status !== 'ARCHIVED' && (
                          <IconBtn
                            label={c.status === 'PAUSED' ? `${c.name} devam ettir` : `${c.name} duraklat`}
                            onClick={() => void patch(c, { status: c.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED' })}
                            disabled={rowBusy}
                          >
                            {c.status === 'PAUSED' ? (
                              <PlayCircle className="w-4 h-4" aria-hidden />
                            ) : (
                              <PauseCircle className="w-4 h-4" aria-hidden />
                            )}
                          </IconBtn>
                        )}
                        {canManage && (
                          <IconBtn
                            label={c.status === 'ARCHIVED' ? `${c.name} arşivden çıkar` : `${c.name} arşivle`}
                            onClick={() => void patch(c, { status: c.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED' })}
                            disabled={rowBusy}
                          >
                            {c.status === 'ARCHIVED' ? (
                              <ArchiveRestore className="w-4 h-4" aria-hidden />
                            ) : (
                              <Archive className="w-4 h-4" aria-hidden />
                            )}
                          </IconBtn>
                        )}
                        {isOwner && (
                          <IconBtn
                            label={`${c.name} bağlantısını kes`}
                            onClick={() => setUnlinkTarget(c)}
                            disabled={rowBusy}
                            danger
                          >
                            <Unlink className="w-4 h-4" aria-hidden />
                          </IconBtn>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CreateClientModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        members={members}
        onCreated={async () => {
          setCreateOpen(false);
          await load();
        }}
      />

      <ConfirmDialog
        open={!!unlinkTarget}
        title="Bağlantıyı kes"
        description={
          <>
            <b>{unlinkTarget?.name}</b> portföyden çıkarılacak. <b>Veri silinmez</b>: müşteri hesabı ve tüm ölçümleri
            kendi hesabında kalır; ekibiniz artık erişemez. Bağlantı yeniden istenebilir.
          </>
        }
        confirmLabel="Bağlantıyı kes"
        destructive
        busy={busyId === unlinkTarget?.workspaceId}
        onConfirm={confirmUnlink}
        onCancel={() => setUnlinkTarget(null)}
      />
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`w-8 h-8 rounded-lg inline-flex items-center justify-center text-ink-faint hover:bg-paper-4 disabled:opacity-40 ${danger ? 'hover:text-danger' : 'hover:text-ink'}`}
    >
      {children}
    </button>
  );
}

export function CreateClientModal({
  open,
  onClose,
  members,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  members: Member[];
  onCreated: () => void | Promise<void>;
}) {
  const hydrated = useHydrated();
  const ids = { name: useId(), site: useId(), tag: useId(), owner: useId(), label: useId() };
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [label, setLabel] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [ownerMemberId, setOwnerMemberId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addTag() {
    const v = tagInput.trim().slice(0, 30);
    if (!v || tags.includes(v) || tags.length >= 10) return;
    setTags([...tags, v]);
    setTagInput('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/agency/clients', {
        method: 'POST',
        json: {
          name,
          website: website || undefined,
          label: label || undefined,
          tags,
          ownerMemberId: ownerMemberId || undefined,
        },
      });
      setName('');
      setWebsite('');
      setLabel('');
      setTags([]);
      setOwnerMemberId('');
      await onCreated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Yeni müşteri"
      description="Müşteri için ayrı bir çalışma alanı açılır; marka, rakipler ve sorular o alanın panelinden eklenir."
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor={ids.name} className="eyebrow block mb-1.5">
            Müşteri adı
          </label>
          <input
            id={ids.name}
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            placeholder="Acme Mağazacılık"
            autoFocus
          />
        </div>
        <div>
          <label htmlFor={ids.site} className="eyebrow block mb-1.5">
            Web sitesi <span className="text-ink-faint normal-case tracking-normal">(opsiyonel)</span>
          </label>
          <input
            id={ids.site}
            className="input"
            type="text"
            inputMode="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="acme.com"
          />
        </div>
        <div>
          <label htmlFor={ids.label} className="eyebrow block mb-1.5">
            Ajans içi etiket <span className="text-ink-faint normal-case tracking-normal">(müşteriye gösterilmez)</span>
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
            Etiketler
          </label>
          <div className="flex gap-2">
            <input
              id={ids.tag}
              className="input"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e-ticaret"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <button type="button" className="btn-secondary !px-4" onClick={addTag} aria-label="Etiket ekle">
              <Plus className="w-4 h-4" aria-hidden />
            </button>
          </div>
          {tags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 mt-2" aria-label="Etiketler">
              {tags.map((t) => (
                <li key={t} className="chip own">
                  {t}
                  <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`${t} kaldır`}>
                    <X className="w-3 h-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {members.length > 0 && (
          <div>
            <label htmlFor={ids.owner} className="eyebrow block mb-1.5">
              Sorumlu üye
            </label>
            <select
              id={ids.owner}
              className="input"
              value={ownerMemberId}
              onChange={(e) => setOwnerMemberId(e.target.value)}
            >
              <option value="">— seçilmedi —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.user.name ? `${m.user.name} · ` : ''}
                  {m.user.email}
                </option>
              ))}
            </select>
          </div>
        )}
        {error && <InlineAlert>{error}</InlineAlert>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary !py-2 !px-4 text-[13px]" disabled={busy}>
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={!hydrated || busy || !name.trim()}
            className="btn-primary !py-2 !px-4 text-[13px] disabled:opacity-50"
            aria-busy={busy}
          >
            {busy ? 'Oluşturuluyor…' : 'Müşteriyi oluştur'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
