'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { Loader2, UserPlus, Trash2, Copy, Check, Mail } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { InlineAlert } from '@/components/ui/inline-alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type Member = {
  id: string;
  email: string;
  name: string | null;
  role: 'OWNER' | 'ADMIN' | 'VIEWER';
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
};
type Invite = { id: string; email: string; role: string; expiresAt: string };
type Data = { users: Member[]; invites: Invite[]; me: { id: string; role: string }; limit: number };

const ROLE_LABEL: Record<string, string> = { OWNER: 'Sahip', ADMIN: 'Yönetici', VIEWER: 'Görüntüleyici' };

export function TeamManager() {
  const ids = { email: useId(), role: useId() };
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'VIEWER'>('VIEWER');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ text: string; link?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<Data>('/api/team'));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const canManage = data && (data.me.role === 'OWNER' || data.me.role === 'ADMIN');
  const isOwner = data?.me.role === 'OWNER';

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (inviting) return;
    setInviting(true);
    setInviteMsg(null);
    setError(null);
    try {
      const r = await apiFetch<{ delivery: 'email' | 'link'; link?: string; email: string }>('/api/team/invites', {
        method: 'POST',
        json: { email, role },
      });
      setInviteMsg(
        r.delivery === 'email'
          ? { text: `${r.email} adresine davet e-postası gönderildi.` }
          : { text: 'E-posta gönderimi bu ortamda kapalı. Davet bağlantısını kopyalayıp iletin:', link: r.link },
      );
      setEmail('');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setInviting(false);
    }
  }

  async function revokeInvite(id: string) {
    try {
      await apiFetch(`/api/team/invites?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function changeRole(id: string, next: string) {
    try {
      await apiFetch(`/api/team/members/${id}`, { method: 'PATCH', json: { role: next } });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setBusy(true);
    try {
      await apiFetch(`/api/team/members/${removeTarget.id}`, { method: 'DELETE' });
      setRemoveTarget(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
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
    <div className="space-y-5">
      {error && <InlineAlert>{error}</InlineAlert>}
      {data && (
        <>
          <div className="card divide-y divide-hairline">
            {data.users.map((u) => (
              <div key={u.id} className="p-4 sm:p-5 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-[14px] truncate">
                    {u.name ? `${u.name} · ` : ''}
                    <span className="font-mono text-[12.5px]">{u.email}</span>
                    {u.id === data.me.id && <span className="chip !text-[10px] ml-2">siz</span>}
                  </div>
                  <div className="text-[11px] text-ink-faint mt-1">
                    {u.emailVerifiedAt ? 'e-posta doğrulandı' : 'e-posta doğrulanmadı'}
                    {u.lastLoginAt ? ` · son giriş ${new Date(u.lastLoginAt).toLocaleDateString('tr-TR')}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isOwner && u.id !== data.me.id ? (
                    <select
                      aria-label={`${u.email} rolü`}
                      className="input !w-auto !py-1.5 text-[12.5px]"
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                    >
                      <option value="OWNER">Sahip</option>
                      <option value="ADMIN">Yönetici</option>
                      <option value="VIEWER">Görüntüleyici</option>
                    </select>
                  ) : (
                    <span className="chip">{ROLE_LABEL[u.role] ?? u.role}</span>
                  )}
                  {canManage && u.id !== data.me.id && (u.role !== 'OWNER' || isOwner) && (
                    <button
                      type="button"
                      onClick={() => setRemoveTarget(u)}
                      className="text-ink-faint hover:text-danger p-1"
                      aria-label={`${u.email} üyesini çıkar`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {data.invites.map((inv) => (
              <div key={inv.id} className="p-4 sm:p-5 flex items-center justify-between gap-3 flex-wrap bg-paper-2/50">
                <div className="min-w-0">
                  <div className="text-[13px] font-mono truncate flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-ink-faint" aria-hidden /> {inv.email}
                  </div>
                  <div className="text-[11px] text-ink-faint mt-1">
                    Bekleyen davet · {ROLE_LABEL[inv.role] ?? inv.role} ·{' '}
                    {new Date(inv.expiresAt).toLocaleDateString('tr-TR')} tarihine kadar geçerli
                  </div>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => revokeInvite(inv.id)}
                    className="text-[12px] text-ink-muted hover:text-danger underline"
                  >
                    Daveti iptal et
                  </button>
                )}
              </div>
            ))}
          </div>

          {canManage && (
            <form onSubmit={invite} className="card p-5 sm:p-6">
              <div className="text-[14px] font-medium flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-brand" aria-hidden /> Üye davet et
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 mt-3">
                <div>
                  <label htmlFor={ids.email} className="sr-only">
                    E-posta
                  </label>
                  <input
                    id={ids.email}
                    type="email"
                    className="input"
                    placeholder="ekip@sirket.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor={ids.role} className="sr-only">
                    Rol
                  </label>
                  <select
                    id={ids.role}
                    className="input"
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'ADMIN' | 'VIEWER')}
                  >
                    <option value="VIEWER">Görüntüleyici</option>
                    <option value="ADMIN">Yönetici</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={inviting || data.users.length + data.invites.length >= data.limit}
                  className="btn-primary whitespace-nowrap disabled:opacity-50"
                  aria-busy={inviting}
                >
                  {inviting ? 'Gönderiliyor…' : 'Davet gönder'}
                </button>
              </div>
              <p className="text-[11.5px] text-ink-faint mt-2">
                {data.users.length + data.invites.length}/{data.limit} üye. Davet 7 gün geçerlidir.
              </p>
              {inviteMsg && (
                <InlineAlert tone={inviteMsg.link ? 'warning' : 'success'} className="mt-3">
                  {inviteMsg.text}
                  {inviteMsg.link && (
                    <div className="flex items-center gap-2 mt-2">
                      <code className="flex-1 text-[11.5px] break-all bg-paper-1 border border-hairline rounded px-2 py-1">
                        {inviteMsg.link}
                      </code>
                      <button
                        type="button"
                        className="btn-secondary !py-1.5 !px-3 text-[12px] inline-flex items-center gap-1"
                        onClick={() => {
                          void navigator.clipboard?.writeText(inviteMsg.link!);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        }}
                        aria-label="Davet bağlantısını kopyala"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5" aria-hidden />
                        ) : (
                          <Copy className="w-3.5 h-3.5" aria-hidden />
                        )}
                      </button>
                    </div>
                  )}
                </InlineAlert>
              )}
            </form>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        title="Üyeyi çıkar"
        description={
          <>
            <b>{removeTarget?.email}</b> ekipten çıkarılacak. Kullanıcı hesabı silinmez; boş bir hesaba taşınır ve bu
            ekibin verilerine erişemez.
          </>
        }
        confirmLabel="Çıkar"
        destructive
        busy={busy}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
