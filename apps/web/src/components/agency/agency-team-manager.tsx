'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import {
  Loader2,
  UserPlus,
  Trash2,
  Copy,
  Check,
  Mail,
  RefreshCw,
  Crown,
  ListChecks,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import type { AgencyRole } from '@independentai/db';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { useRealtimeEvent } from '@/components/realtime-provider';
import { InlineAlert } from '@/components/ui/inline-alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import type { AgencyEntitlement } from '@/server/entitlement';
import { AGENCY_ROLE_LABEL, fmtAgo, fmtDate } from './format';

type Member = {
  id: string;
  role: AgencyRole;
  status: 'ACTIVE' | 'SUSPENDED';
  allClients: boolean;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    lastActiveAt: string | null;
    lastLoginAt: string | null;
    emailVerified: boolean;
  };
  access: { workspaceId: string; roleOverride: AgencyRole | null }[];
};
type Invite = {
  id: string;
  email: string;
  role: AgencyRole;
  allClients: boolean;
  workspaceIds: string[];
  expiresAt: string;
};
type Ws = { id: string; name: string; status: string };
type Data = {
  members: Member[];
  invites: Invite[];
  workspaces: Ws[];
  me: { membershipId: string; userId: string; role: AgencyRole };
  entitlement: AgencyEntitlement;
};

const INVITE_ROLES: AgencyRole[] = ['ADMIN', 'STRATEGIST', 'ANALYST'];

export function AgencyTeamManager() {
  const hydrated = useHydrated();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; link?: string } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [transferTarget, setTransferTarget] = useState<Member | null>(null);
  const [assignTarget, setAssignTarget] = useState<Member | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<Data>('/api/agency/members'));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useRealtimeEvent('team.changed', () => void load());
  useRealtimeEvent('agency.changed', () => void load());
  useEffect(() => {
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  const canManage = data ? data.me.role === 'OWNER' || data.me.role === 'ADMIN' : false;
  const isOwner = data?.me.role === 'OWNER';

  async function act(fn: () => Promise<unknown>, okText?: string) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      if (okText) setNotice({ text: okText });
      await load();
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!data && !error)
    return (
      <div className="card p-8 flex justify-center" aria-busy="true">
        <Loader2 className="w-5 h-5 animate-spin text-ink-faint" aria-label="Yükleniyor" />
      </div>
    );

  return (
    <div className="space-y-6">
      {error && <InlineAlert>{error}</InlineAlert>}
      {notice && (
        <InlineAlert tone={notice.link ? 'warning' : 'success'}>
          {notice.text}
          {notice.link && <CopyLine value={notice.link} />}
        </InlineAlert>
      )}
      {data && (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap text-[12.5px] text-ink-muted">
            <span>
              Koltuk: <b className="text-ink tabular">{data.entitlement.usage.seats + data.invites.length}</b>/
              {data.entitlement.limits.seats} (bekleyen davetler dahil) · Müşteri:{' '}
              <b className="text-ink tabular">{data.entitlement.usage.clients}</b>/{data.entitlement.limits.clients}
            </span>
            {!data.entitlement.active && (
              <span className="text-warning">Deneme süresi doldu: ekip değişiklikleri kapalı.</span>
            )}
          </div>

          {/* Üyeler */}
          <div className="card overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="text-left text-[10.5px] uppercase tracking-wider text-ink-faint font-mono">
                <tr className="border-b border-hairline">
                  <th className="px-4 py-3 font-medium">Üye</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Kapsam</th>
                  <th className="px-4 py-3 font-medium">Son aktivite</th>
                  <th className="px-4 py-3 font-medium text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {data.members.map((m) => {
                  const me = m.user.id === data.me.userId;
                  const canEdit = canManage && !me && (m.role !== 'OWNER' || isOwner);
                  return (
                    <tr key={m.id} className={m.status === 'SUSPENDED' ? 'opacity-60' : ''}>
                      <td className="px-4 py-3">
                        <div className="truncate max-w-[260px]">
                          {m.user.name ? `${m.user.name} · ` : ''}
                          <span className="font-mono text-[12px]">{m.user.email}</span>
                          {me && <span className="chip !text-[10px] ml-2">siz</span>}
                          {m.status === 'SUSPENDED' && (
                            <span className="chip !text-[10px] ml-2 text-warning">askıda</span>
                          )}
                        </div>
                        <div className="text-[11px] text-ink-faint mt-0.5">
                          {m.user.emailVerified ? 'e-posta doğrulandı' : 'e-posta doğrulanmadı'} · katıldı{' '}
                          {fmtDate(m.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {canEdit ? (
                          <select
                            aria-label={`${m.user.email} rolü`}
                            className="input !w-auto !py-1.5 text-[12.5px]"
                            value={m.role}
                            disabled={busy}
                            onChange={(e) =>
                              void act(() =>
                                apiFetch(`/api/agency/members/${m.id}`, {
                                  method: 'PATCH',
                                  json: { role: e.target.value },
                                }),
                              )
                            }
                          >
                            {isOwner && <option value="OWNER">Sahip</option>}
                            <option value="ADMIN">Yönetici</option>
                            <option value="STRATEGIST">Stratejist</option>
                            <option value="ANALYST">Analist</option>
                          </select>
                        ) : (
                          <span className="chip">{AGENCY_ROLE_LABEL[m.role]}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">
                        {m.allClients ? (
                          'Tüm müşteriler'
                        ) : (
                          <>
                            {m.access.length} müşteri
                            {m.access.some((a) => a.roleOverride) && (
                              <span className="text-[11px] text-ink-faint"> · rol geçersiz kılma</span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-muted" suppressHydrationWarning>
                        {fmtAgo(m.user.lastActiveAt ?? m.user.lastLoginAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && m.role !== 'OWNER' && m.role !== 'ADMIN' && (
                            <IconBtn
                              label={`${m.user.email} atamalarını düzenle`}
                              onClick={() => setAssignTarget(m)}
                              disabled={busy}
                            >
                              <ListChecks className="w-4 h-4" aria-hidden />
                            </IconBtn>
                          )}
                          {canEdit && m.role !== 'OWNER' && (
                            <IconBtn
                              label={
                                m.status === 'SUSPENDED' ? `${m.user.email} askıyı kaldır` : `${m.user.email} askıya al`
                              }
                              onClick={() =>
                                void act(() =>
                                  apiFetch(`/api/agency/members/${m.id}`, {
                                    method: 'PATCH',
                                    json: { status: m.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED' },
                                  }),
                                )
                              }
                              disabled={busy}
                            >
                              {m.status === 'SUSPENDED' ? (
                                <PlayCircle className="w-4 h-4" aria-hidden />
                              ) : (
                                <PauseCircle className="w-4 h-4" aria-hidden />
                              )}
                            </IconBtn>
                          )}
                          {isOwner && !me && m.status === 'ACTIVE' && m.role !== 'OWNER' && (
                            <IconBtn
                              label={`Sahipliği ${m.user.email} kullanıcısına devret`}
                              onClick={() => setTransferTarget(m)}
                              disabled={busy}
                            >
                              <Crown className="w-4 h-4" aria-hidden />
                            </IconBtn>
                          )}
                          {canEdit && (
                            <IconBtn
                              label={`${m.user.email} üyesini çıkar`}
                              onClick={() => setRemoveTarget(m)}
                              disabled={busy}
                              danger
                            >
                              <Trash2 className="w-4 h-4" aria-hidden />
                            </IconBtn>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {data.invites.map((inv) => (
                  <tr key={inv.id} className="bg-paper-2/50">
                    <td className="px-4 py-3">
                      <div className="font-mono text-[12px] inline-flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-ink-faint" aria-hidden /> {inv.email}
                      </div>
                      <div className="text-[11px] text-ink-faint mt-0.5">
                        Bekleyen davet · {fmtDate(inv.expiresAt)} tarihine kadar
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="chip">{AGENCY_ROLE_LABEL[inv.role]}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {inv.allClients ? 'Tüm müşteriler' : `${inv.workspaceIds.length} müşteri`}
                    </td>
                    <td className="px-4 py-3 text-ink-faint">—</td>
                    <td className="px-4 py-3">
                      {canManage && (
                        <div className="flex items-center justify-end gap-1">
                          <IconBtn
                            label={`${inv.email} davetini yeniden gönder`}
                            disabled={busy}
                            onClick={() =>
                              void act(async () => {
                                const r = await apiFetch<{ delivery: 'email' | 'link'; link?: string; email: string }>(
                                  `/api/agency/invites/${inv.id}/resend`,
                                  { method: 'POST' },
                                );
                                setNotice(
                                  r.delivery === 'email'
                                    ? { text: `${r.email} adresine davet yeniden gönderildi.` }
                                    : { text: 'E-posta kapalı; yeni davet bağlantısı:', link: r.link },
                                );
                              })
                            }
                          >
                            <RefreshCw className="w-4 h-4" aria-hidden />
                          </IconBtn>
                          <IconBtn
                            label={`${inv.email} davetini iptal et`}
                            disabled={busy}
                            danger
                            onClick={() =>
                              void act(
                                () => apiFetch(`/api/agency/invites/${inv.id}`, { method: 'DELETE' }),
                                'Davet iptal edildi.',
                              )
                            }
                          >
                            <Trash2 className="w-4 h-4" aria-hidden />
                          </IconBtn>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canManage && (
            <InviteForm
              workspaces={data.workspaces}
              disabled={
                !hydrated ||
                !data.entitlement.active ||
                data.entitlement.usage.seats + data.invites.length >= data.entitlement.limits.seats
              }
              onSent={(r) => {
                setNotice(
                  r.delivery === 'email'
                    ? { text: `${r.email} adresine davet e-postası gönderildi.` }
                    : {
                        text: 'E-posta gönderimi bu ortamda kapalı. Davet bağlantısını kopyalayıp iletin:',
                        link: r.link,
                      },
                );
                void load();
              }}
              onError={setError}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        title="Üyeyi ajanstan çıkar"
        description={
          <>
            <b>{removeTarget?.user.email}</b> ajanstan çıkarılacak. Kullanıcı hesabı silinmez; boş bir marka hesabına
            taşınır ve müşteri verilerine erişemez.
          </>
        }
        confirmLabel="Çıkar"
        destructive
        busy={busy}
        onConfirm={() =>
          void act(() => apiFetch(`/api/agency/members/${removeTarget!.id}`, { method: 'DELETE' })).then(
            (ok) => ok && setRemoveTarget(null),
          )
        }
        onCancel={() => setRemoveTarget(null)}
      />
      <ConfirmDialog
        open={!!transferTarget}
        title="Sahipliği devret"
        description={
          <>
            Ajans sahipliği <b>{transferTarget?.user.email}</b> kullanıcısına geçer; siz <b>Yönetici</b> olursunuz. Bu
            işlem yalnızca yeni sahip tarafından geri alınabilir.
          </>
        }
        confirmLabel="Devret"
        confirmPhrase="DEVRET"
        destructive
        busy={busy}
        onConfirm={() =>
          void act(
            () => apiFetch(`/api/agency/members/${transferTarget!.id}/transfer`, { method: 'POST' }),
            'Sahiplik devredildi.',
          ).then((ok) => ok && setTransferTarget(null))
        }
        onCancel={() => setTransferTarget(null)}
      />
      {data && (
        <AssignmentsModal
          member={assignTarget}
          workspaces={data.workspaces}
          onClose={() => setAssignTarget(null)}
          onSaved={async () => {
            setAssignTarget(null);
            await load();
          }}
        />
      )}
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

function CopyLine({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 mt-2">
      <code className="flex-1 text-[11.5px] break-all bg-paper-1 border border-hairline rounded px-2 py-1">
        {value}
      </code>
      <button
        type="button"
        className="btn-secondary !py-1.5 !px-3 text-[12px] inline-flex items-center gap-1"
        onClick={() => {
          void navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        aria-label="Bağlantıyı kopyala"
      >
        {copied ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Copy className="w-3.5 h-3.5" aria-hidden />}
      </button>
    </div>
  );
}

function InviteForm({
  workspaces,
  disabled,
  onSent,
  onError,
}: {
  workspaces: Ws[];
  disabled: boolean;
  onSent: (r: { delivery: 'email' | 'link'; link?: string; email: string }) => void;
  onError: (msg: string) => void;
}) {
  const ids = { email: useId(), role: useId(), scope: useId() };
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AgencyRole>('ANALYST');
  const [allClients, setAllClients] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const scopeLocked = role === 'ADMIN';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      const r = await apiFetch<{ delivery: 'email' | 'link'; link?: string; email: string }>('/api/agency/invites', {
        method: 'POST',
        json: {
          email,
          role,
          allClients: scopeLocked ? true : allClients,
          workspaceIds: scopeLocked || allClients ? [] : selected,
        },
      });
      setEmail('');
      setSelected([]);
      onSent(r);
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 sm:p-6">
      <div className="text-[14px] font-medium flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-brand" aria-hidden /> Ekip üyesi davet et
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 mt-3">
        <div>
          <label htmlFor={ids.email} className="sr-only">
            E-posta
          </label>
          <input
            id={ids.email}
            type="email"
            className="input"
            placeholder="ekip@ajans.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor={ids.role} className="sr-only">
            Rol
          </label>
          <select id={ids.role} className="input" value={role} onChange={(e) => setRole(e.target.value as AgencyRole)}>
            {INVITE_ROLES.map((r) => (
              <option key={r} value={r}>
                {AGENCY_ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <fieldset className="mt-3">
        <legend className="eyebrow mb-1.5" id={ids.scope}>
          Müşteri kapsamı
        </legend>
        <div className="flex flex-wrap gap-4 text-[13px]">
          <label className="inline-flex items-center gap-1.5">
            <input
              type="radio"
              name="scope"
              checked={scopeLocked || allClients}
              disabled={scopeLocked}
              onChange={() => setAllClients(true)}
            />{' '}
            Tüm müşteriler
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="radio"
              name="scope"
              checked={!scopeLocked && !allClients}
              disabled={scopeLocked}
              onChange={() => setAllClients(false)}
            />{' '}
            Seçili müşteriler
          </label>
          {scopeLocked && (
            <span className="text-[11.5px] text-ink-faint">Yönetici her zaman tüm müşterilere erişir.</span>
          )}
        </div>
        {!scopeLocked && !allClients && (
          <div className="mt-2 max-h-40 overflow-y-auto border border-hairline rounded-lg p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
            {workspaces.map((w) => (
              <label key={w.id} className="inline-flex items-center gap-1.5 text-[12.5px] truncate">
                <input
                  type="checkbox"
                  checked={selected.includes(w.id)}
                  onChange={(e) =>
                    setSelected(e.target.checked ? [...selected, w.id] : selected.filter((x) => x !== w.id))
                  }
                />
                <span className="truncate">{w.name}</span>
              </label>
            ))}
            {workspaces.length === 0 && (
              <span className="text-[12px] text-ink-faint">
                Henüz müşteri yok; daveti "tüm müşteriler" ile gönderebilir veya sonra atayabilirsiniz.
              </span>
            )}
          </div>
        )}
      </fieldset>
      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11.5px] text-ink-faint">
          Davet 7 gün geçerlidir. Davetli, marka verisi olmayan tek kişilik bir hesapla kabul etmelidir.
        </p>
        <button
          type="submit"
          disabled={disabled || sending}
          className="btn-primary !py-2 text-[13px] whitespace-nowrap disabled:opacity-50"
          aria-busy={sending}
        >
          {sending ? 'Gönderiliyor…' : 'Davet gönder'}
        </button>
      </div>
    </form>
  );
}

function AssignmentsModal({
  member,
  workspaces,
  onClose,
  onSaved,
}: {
  member: Member | null;
  workspaces: Ws[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const hydrated = useHydrated();
  const [selected, setSelected] = useState<string[]>([]);
  const [override, setOverride] = useState<'' | 'STRATEGIST' | 'ANALYST' | 'ADMIN'>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = member?.id ?? '';

  useEffect(() => {
    if (!member) return;
    setSelected(member.access.map((a) => a.workspaceId));
    setOverride((member.access.find((a) => a.roleOverride)?.roleOverride as typeof override) ?? '');
    setError(null);
  }, [key, member]);

  async function save() {
    if (!member) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/agency/members/${member.id}/assignments`, {
        method: 'PUT',
        json: { workspaceIds: selected, roleOverride: override || null },
      });
      await onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={!!member}
      onClose={onClose}
      title={`Müşteri atamaları — ${member?.user.email ?? ''}`}
      description={
        member?.allClients
          ? 'Bu üye "tüm müşteriler" kapsamında; seçimler kapsam daraltıldığında geçerli olur.'
          : 'Üye yalnızca seçili müşterilerin çalışma alanlarına erişir.'
      }
      wide
    >
      <div className="max-h-72 overflow-y-auto border border-hairline rounded-lg p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
        {workspaces.map((w) => (
          <label key={w.id} className="inline-flex items-center gap-1.5 text-[13px] truncate">
            <input
              type="checkbox"
              checked={selected.includes(w.id)}
              onChange={(e) => setSelected(e.target.checked ? [...selected, w.id] : selected.filter((x) => x !== w.id))}
            />
            <span className="truncate">{w.name}</span>
            {w.status === 'PAUSED' && <span className="chip !text-[9.5px] !py-0 !px-1.5">duraklatıldı</span>}
          </label>
        ))}
        {workspaces.length === 0 && <span className="text-[12.5px] text-ink-faint p-2">Henüz müşteri yok.</span>}
      </div>
      <div className="mt-4">
        <label className="eyebrow block mb-1.5" htmlFor="ov">
          Bu müşterilerde rol (opsiyonel)
        </label>
        <select
          id="ov"
          className="input !w-auto"
          value={override}
          onChange={(e) => setOverride(e.target.value as typeof override)}
        >
          <option value="">Ajans rolü geçerli</option>
          <option value="ANALYST">Analist (salt-okunur)</option>
          <option value="STRATEGIST">Stratejist</option>
          <option value="ADMIN">Yönetici</option>
        </select>
      </div>
      {error && <InlineAlert className="mt-3">{error}</InlineAlert>}
      <div className="flex justify-end gap-2 mt-5">
        <button type="button" onClick={onClose} className="btn-secondary !py-2 !px-4 text-[13px]" disabled={busy}>
          Vazgeç
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!hydrated || busy}
          className="btn-primary !py-2 !px-4 text-[13px] disabled:opacity-50"
          aria-busy={busy}
        >
          {busy ? 'Kaydediliyor…' : `Kaydet (${selected.length})`}
        </button>
      </div>
    </Modal>
  );
}
