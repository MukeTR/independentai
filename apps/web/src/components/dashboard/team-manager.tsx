'use client';

/**
 * Ekip yönetimi paneli.
 *  - Üye tablosu: ad/e-posta, rol seçici (OWNER), doğrulama rozeti, son giriş, son aktivite (göreli).
 *  - Çevrimiçi noktası: Presence (`tenant:<id>:presence`) — Realtime kapalıysa hiç gösterilmez.
 *  - Davetler: bekleyen/süresi dolmuş; yeniden gönder (yeni link), iptal, link kopyala.
 *  - Sahiplik devri (OWNER, doğrudan üye): onay diyaloğu; oturum yenilenir → sayfa yeniden yüklenir.
 *  - Limit göstergesi: üyeler + bekleyen davetler / plan sınırı.
 *  - `team.changed` Realtime olayında liste yenilenir; Realtime yoksa yalnızca eylem sonrası yenilenir.
 */
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Loader2, UserPlus, Trash2, Copy, Check, Mail, RefreshCw, Crown, ShieldCheck, ShieldAlert } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { relativeTime, fullDateTime } from '@/lib/relative-time';
import { usePresence } from '@/lib/realtime-client';
import { useRealtimeEvent, useRealtimeStatus } from '@/components/realtime-provider';
import { InlineAlert } from '@/components/ui/inline-alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type Role = 'OWNER' | 'ADMIN' | 'VIEWER';
type Member = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  createdAt: string;
  oauthProvider: string | null;
};
type Invite = {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  createdAt: string;
  status: 'pending' | 'expired';
};
type Data = {
  users: Member[];
  invites: Invite[];
  me: { id: string; role: Role; name: string | null; tenantId: string; viaAgency: boolean };
  limit: number;
  realtime: boolean;
};
type InviteResult = { inviteId: string; delivery: 'email' | 'link'; link?: string; email: string };

const ROLE_LABEL: Record<Role, string> = { OWNER: 'Sahip', ADMIN: 'Yönetici', VIEWER: 'Görüntüleyici' };

function displayName(u: { name: string | null; email: string }): string {
  return u.name?.trim() || u.email;
}

export function TeamManager() {
  const ids = { email: useId(), role: useId(), table: useId() };
  const hydrated = useHydrated();
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'VIEWER'>('VIEWER');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ text: string; link?: string } | null>(null);
  /** Bu oturumda üretilen davet linkleri (token yalnızca oluşturma/yeniden gönderme anında bilinir) */
  const [links, setLinks] = useState<Record<string, string>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [transferTarget, setTransferTarget] = useState<Member | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<Data>('/api/team'));
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useRealtimeEvent('team.changed', () => void load());

  // Presence: yalnızca Realtime yapılandırılmış ve canlı bağlantı varken denenir.
  const { status: rtStatus } = useRealtimeStatus();
  const presenceEnabled = !!data?.realtime && rtStatus === 'live';
  const presenceMeta = useMemo(
    () => (data ? { name: data.me.name?.trim() || 'Üye', role: data.me.role, page: 'team' } : null),
    [data],
  );
  const online = usePresence(data ? `tenant:${data.me.tenantId}` : null, presenceMeta, presenceEnabled);
  const onlineNames = useMemo(() => new Set(online.map((o) => o.name)), [online]);
  const isOnline = (u: Member) => {
    if (!presenceEnabled || online.length === 0) return false;
    if (data && u.id === data.me.id) return true;
    return !!u.name && onlineNames.has(u.name.trim());
  };

  const me = data?.me;
  const isOwner = me?.role === 'OWNER';
  const canManage = me?.role === 'OWNER' || me?.role === 'ADMIN';
  const canTransfer = isOwner && me && !me.viaAgency;
  const pendingInvites = data?.invites.filter((i) => i.status === 'pending') ?? [];
  const used = (data?.users.length ?? 0) + pendingInvites.length;
  const limit = data?.limit ?? 0;
  const full = limit > 0 && used >= limit;

  function flash(text: string) {
    setNotice(text);
    setTimeout(() => setNotice(null), 4000);
  }

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard?.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      setActionError('Kopyalanamadı; bağlantıyı elle seçip kopyalayın.');
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (inviting) return;
    setInviting(true);
    setInviteMsg(null);
    setActionError(null);
    try {
      const r = await apiFetch<InviteResult>('/api/team/invites', { method: 'POST', json: { email, role } });
      if (r.link) setLinks((l) => ({ ...l, [r.inviteId]: r.link! }));
      setInviteMsg(
        r.delivery === 'email'
          ? { text: `${r.email} adresine davet e-postası gönderildi.` }
          : { text: 'E-posta gönderimi bu ortamda kapalı. Davet bağlantısını kopyalayıp iletin:', link: r.link },
      );
      setEmail('');
      await load();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setInviting(false);
    }
  }

  async function resend(inv: Invite) {
    setBusyId(inv.id);
    setActionError(null);
    try {
      const r = await apiFetch<InviteResult>(`/api/team/invites/${encodeURIComponent(inv.id)}/resend`, {
        method: 'POST',
      });
      if (r.link) setLinks((l) => ({ ...l, [r.inviteId]: r.link! }));
      else setLinks((l) => Object.fromEntries(Object.entries(l).filter(([k]) => k !== inv.id)));
      flash(
        r.delivery === 'email'
          ? `${inv.email} adresine davet yeniden gönderildi; eski bağlantı geçersiz.`
          : 'Yeni davet bağlantısı üretildi; eski bağlantı geçersiz.',
      );
      await load();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function cancelInvite(inv: Invite) {
    setBusyId(inv.id);
    setActionError(null);
    try {
      await apiFetch(`/api/team/invites?id=${encodeURIComponent(inv.id)}`, { method: 'DELETE' });
      setLinks((l) => Object.fromEntries(Object.entries(l).filter(([k]) => k !== inv.id)));
      await load();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(u: Member, next: string) {
    setBusyId(u.id);
    setActionError(null);
    try {
      await apiFetch(`/api/team/members/${encodeURIComponent(u.id)}`, { method: 'PATCH', json: { role: next } });
      await load();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setDialogBusy(true);
    setDialogError(null);
    try {
      await apiFetch(`/api/team/members/${encodeURIComponent(removeTarget.id)}`, { method: 'DELETE' });
      setRemoveTarget(null);
      await load();
    } catch (err) {
      setDialogError(errorMessage(err));
    } finally {
      setDialogBusy(false);
    }
  }

  async function confirmTransfer() {
    if (!transferTarget) return;
    setDialogBusy(true);
    setDialogError(null);
    try {
      await apiFetch('/api/team/transfer', { method: 'POST', json: { userId: transferTarget.id } });
      // Oturum çerezi yanıtla yenilendi; rol/menüler değişti → tam yenileme en güvenlisi.
      window.location.reload();
    } catch (err) {
      setDialogError(errorMessage(err));
      setDialogBusy(false);
    }
  }

  // ── Durumlar ──
  if (!data && !loadError)
    return (
      <div className="card p-8 flex justify-center" aria-busy="true">
        <Loader2 className="w-5 h-5 animate-spin text-ink-faint" aria-label="Ekip yükleniyor" />
      </div>
    );
  if (!data)
    return (
      <div className="space-y-3">
        <InlineAlert>{loadError}</InlineAlert>
        <button type="button" className="btn-secondary !py-1.5 !px-3 text-[12.5px]" onClick={() => void load()}>
          Tekrar dene
        </button>
      </div>
    );

  return (
    <div className="space-y-5">
      {actionError && <InlineAlert>{actionError}</InlineAlert>}
      {notice && <InlineAlert tone="success">{notice}</InlineAlert>}

      {/* Limit göstergesi */}
      <div className="flex items-center justify-between gap-3 flex-wrap text-[12px] text-ink-muted">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-1.5 w-32 bg-paper-4 rounded-full overflow-hidden" aria-hidden>
            <div
              className={`h-full transition-all ${full ? 'bg-warning' : 'bg-brand'}`}
              style={{ width: `${limit ? Math.min(100, Math.round((used / limit) * 100)) : 0}%` }}
            />
          </div>
          <span className="font-mono tabular">
            {used}/{limit} üye
          </span>
          <span className="text-ink-faint">
            ({data.users.length} aktif, {pendingInvites.length} bekleyen davet)
          </span>
        </div>
        {presenceEnabled && online.length > 0 && (
          <span className="inline-flex items-center gap-1.5" title={online.map((o) => o.name).join(', ')}>
            <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {online.length} çevrimiçi
          </span>
        )}
      </div>

      {/* Üye tablosu */}
      {/* relative: sr-only <caption> (absolute) kart dışına taşıp sayfada yatay kaydırma yaratmasın */}
      <div className="card relative overflow-x-auto">
        <table className="w-full text-[13px]" aria-describedby={ids.table}>
          <caption id={ids.table} className="sr-only">
            Ekip üyeleri: ad, rol, doğrulama durumu, son giriş ve son aktivite
          </caption>
          <thead>
            <tr className="text-left text-[10.5px] uppercase tracking-wider text-ink-faint font-mono border-b border-hairline">
              <th scope="col" className="px-4 py-2.5 font-normal">
                Üye
              </th>
              <th scope="col" className="px-3 py-2.5 font-normal">
                Rol
              </th>
              <th scope="col" className="px-3 py-2.5 font-normal">
                Doğrulama
              </th>
              <th scope="col" className="px-3 py-2.5 font-normal whitespace-nowrap">
                Son giriş
              </th>
              <th scope="col" className="px-3 py-2.5 font-normal whitespace-nowrap">
                Son aktivite
              </th>
              <th scope="col" className="px-4 py-2.5 font-normal text-right">
                <span className="sr-only">İşlemler</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {data.users.map((u) => {
              const self = u.id === me!.id;
              const rowBusy = busyId === u.id;
              return (
                <tr key={u.id} className={rowBusy ? 'opacity-60' : undefined} aria-busy={rowBusy}>
                  <td className="px-4 py-3 min-w-[200px]">
                    <div className="flex items-center gap-2 min-w-0">
                      {presenceEnabled && (
                        <span
                          aria-label={isOnline(u) ? 'çevrimiçi' : 'çevrimdışı'}
                          title={isOnline(u) ? 'Çevrimiçi' : 'Çevrimdışı'}
                          className={`inline-block w-2 h-2 rounded-full shrink-0 ${isOnline(u) ? 'bg-emerald-500' : 'bg-paper-4 border border-hairline'}`}
                        />
                      )}
                      <div className="min-w-0">
                        <div className="text-[13.5px] text-ink truncate">
                          {u.name?.trim() || <span className="text-ink-muted">(adsız)</span>}
                          {self && <span className="chip !text-[10px] ml-2">siz</span>}
                        </div>
                        <div className="font-mono text-[11.5px] text-ink-faint truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {isOwner && !self ? (
                      <select
                        aria-label={`${displayName(u)} rolü`}
                        className="input !w-auto !py-1.5 text-[12.5px]"
                        value={u.role}
                        disabled={!hydrated || rowBusy}
                        onChange={(e) => void changeRole(u, e.target.value)}
                      >
                        <option value="OWNER">Sahip</option>
                        <option value="ADMIN">Yönetici</option>
                        <option value="VIEWER">Görüntüleyici</option>
                      </select>
                    ) : (
                      <span className={`chip ${u.role === 'OWNER' ? 'own' : ''}`}>{ROLE_LABEL[u.role]}</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {u.emailVerifiedAt ? (
                      <span className="inline-flex items-center gap-1 text-[11.5px] text-positive">
                        <ShieldCheck className="w-3.5 h-3.5" aria-hidden /> doğrulandı
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11.5px] text-warning">
                        <ShieldAlert className="w-3.5 h-3.5" aria-hidden /> doğrulanmadı
                      </span>
                    )}
                  </td>
                  <td
                    className="px-3 py-3 text-[12px] text-ink-muted whitespace-nowrap"
                    title={fullDateTime(u.lastLoginAt)}
                  >
                    {relativeTime(u.lastLoginAt) ?? <span className="text-ink-faint">—</span>}
                  </td>
                  <td
                    className="px-3 py-3 text-[12px] text-ink-muted whitespace-nowrap"
                    title={fullDateTime(u.lastActiveAt)}
                  >
                    {relativeTime(u.lastActiveAt) ?? <span className="text-ink-faint">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canTransfer && !self && u.role !== 'OWNER' && (
                        <button
                          type="button"
                          disabled={!hydrated || rowBusy}
                          onClick={() => {
                            setDialogError(null);
                            setTransferTarget(u);
                          }}
                          className="text-ink-faint hover:text-brand-deep p-1.5 rounded-md hover:bg-paper-4 disabled:opacity-50"
                          aria-label={`Sahipliği ${displayName(u)} üyesine devret`}
                          title="Sahipliği devret"
                        >
                          <Crown className="w-4 h-4" aria-hidden />
                        </button>
                      )}
                      {canManage && !self && (u.role !== 'OWNER' || isOwner) && (
                        <button
                          type="button"
                          disabled={!hydrated || rowBusy}
                          onClick={() => {
                            setDialogError(null);
                            setRemoveTarget(u);
                          }}
                          className="text-ink-faint hover:text-danger p-1.5 rounded-md hover:bg-danger/10 disabled:opacity-50"
                          aria-label={`${displayName(u)} üyesini çıkar`}
                          title="Ekipten çıkar"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data.users.length === 1 && data.invites.length === 0 && (
          <p className="px-4 py-3 text-[12.5px] text-ink-faint border-t border-hairline">
            Henüz başka üye yok. Ekip arkadaşlarınızı aşağıdan davet edin.
          </p>
        )}
      </div>

      {/* Davetler */}
      {data.invites.length > 0 && (
        <section aria-labelledby={`${ids.table}-inv`} className="card divide-y divide-hairline">
          <h3
            id={`${ids.table}-inv`}
            className="px-4 py-2.5 text-[10.5px] uppercase tracking-wider text-ink-faint font-mono"
          >
            Davetler
          </h3>
          {data.invites.map((inv) => {
            const rowBusy = busyId === inv.id;
            const link = links[inv.id];
            return (
              <div key={inv.id} className={`p-4 ${rowBusy ? 'opacity-60' : ''}`} aria-busy={rowBusy}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-[13px] font-mono truncate flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-ink-faint shrink-0" aria-hidden /> {inv.email}
                      <span className={`chip !text-[10px] ${inv.status === 'expired' ? 'comp' : ''}`}>
                        {inv.status === 'expired' ? 'Süresi doldu' : 'Bekliyor'}
                      </span>
                    </div>
                    <div className="text-[11px] text-ink-faint mt-1">
                      {ROLE_LABEL[inv.role]} · gönderildi {relativeTime(inv.createdAt)} ·{' '}
                      {inv.status === 'expired'
                        ? `${new Date(inv.expiresAt).toLocaleDateString('tr-TR')} tarihinde doldu`
                        : `${new Date(inv.expiresAt).toLocaleDateString('tr-TR')} tarihine kadar geçerli`}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={!hydrated || rowBusy}
                        onClick={() => void resend(inv)}
                        className="btn-secondary !py-1.5 !px-3 text-[12px] inline-flex items-center gap-1.5 disabled:opacity-50"
                        aria-label={`${inv.email} davetini yeniden gönder`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${rowBusy ? 'animate-spin' : ''}`} aria-hidden /> Yeniden
                        gönder
                      </button>
                      <button
                        type="button"
                        disabled={!hydrated || rowBusy}
                        onClick={() => void cancelInvite(inv)}
                        className="text-[12px] text-ink-muted hover:text-danger underline px-2 py-1.5 disabled:opacity-50"
                        aria-label={`${inv.email} davetini iptal et`}
                      >
                        İptal
                      </button>
                    </div>
                  )}
                </div>
                {link && (
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 text-[11.5px] break-all bg-paper-1 border border-hairline rounded px-2 py-1">
                      {link}
                    </code>
                    <button
                      type="button"
                      className="btn-secondary !py-1.5 !px-3 text-[12px] inline-flex items-center gap-1"
                      onClick={() => void copy(inv.id, link)}
                      aria-label="Davet bağlantısını kopyala"
                    >
                      {copiedKey === inv.id ? (
                        <Check className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <Copy className="w-3.5 h-3.5" aria-hidden />
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Davet formu */}
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
                disabled={full}
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
                disabled={full}
              >
                <option value="VIEWER">Görüntüleyici</option>
                <option value="ADMIN">Yönetici</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={!hydrated || inviting || full}
              className="btn-primary whitespace-nowrap disabled:opacity-50"
              aria-busy={inviting}
            >
              {inviting ? 'Gönderiliyor…' : 'Davet gönder'}
            </button>
          </div>
          <p className="text-[11.5px] text-ink-faint mt-2">
            {full
              ? `Üye sınırına (${limit}) ulaşıldı; yeni davet için bir üye çıkarın veya bekleyen daveti iptal edin.`
              : 'Davet 7 gün geçerlidir; süresi dolan davetler yeniden gönderilebilir.'}
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
                    onClick={() => void copy('new', inviteMsg.link!)}
                    aria-label="Davet bağlantısını kopyala"
                  >
                    {copiedKey === 'new' ? (
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

      <ConfirmDialog
        open={!!removeTarget}
        title="Üyeyi çıkar"
        description={
          <>
            <b>{removeTarget ? displayName(removeTarget) : ''}</b> ekipten çıkarılacak. Kullanıcı hesabı silinmez; boş
            bir hesaba taşınır ve bu ekibin verilerine erişemez.
          </>
        }
        confirmLabel="Çıkar"
        destructive
        busy={dialogBusy}
        error={dialogError}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />

      <ConfirmDialog
        open={!!transferTarget}
        title="Sahipliği devret"
        description={
          <>
            <b>{transferTarget ? displayName(transferTarget) : ''}</b> hesabın yeni sahibi olacak; siz <b>Yönetici</b>{' '}
            rolüne düşeceksiniz. Oturumunuz yenilenecek; diğer cihazlardaki oturumlarınız ve yeni sahibin mevcut oturumu
            kapanır. Bu işlem yalnızca yeni sahip tarafından geri alınabilir.
          </>
        }
        confirmLabel="Sahipliği devret"
        confirmPhrase="DEVRET"
        busy={dialogBusy}
        error={dialogError}
        onConfirm={confirmTransfer}
        onCancel={() => setTransferTarget(null)}
      />
    </div>
  );
}
