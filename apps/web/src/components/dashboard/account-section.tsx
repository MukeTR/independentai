'use client';

import { useId, useState } from 'react';
import { Download, KeyRound, LogOut, ShieldAlert } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { InlineAlert } from '@/components/ui/inline-alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function AccountSection({
  role,
  hasPassword,
  oauthProvider,
  emailVerified,
  email,
  tenantName,
}: {
  role: string;
  hasPassword: boolean;
  oauthProvider: string | null;
  emailVerified: boolean;
  email: string;
  tenantName: string;
}) {
  const ids = { cur: useId(), n1: useId(), n2: useId() };
  const [cur, setCur] = useState('');
  const [n1, setN1] = useState('');
  const [n2, setN2] = useState('');
  const [pwState, setPwState] = useState<{ busy: boolean; msg?: string; err?: string }>({ busy: false });
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);
  const [logoutAllMsg, setLogoutAllMsg] = useState<string | null>(null);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwState.busy) return;
    if (n1 !== n2) {
      setPwState({ busy: false, err: 'Yeni şifreler eşleşmiyor' });
      return;
    }
    setPwState({ busy: true });
    try {
      await apiFetch('/api/auth/change-password', { method: 'POST', json: { currentPassword: cur, newPassword: n1 } });
      setCur('');
      setN1('');
      setN2('');
      setPwState({ busy: false, msg: 'Şifreniz güncellendi. Diğer cihazlardaki oturumlar kapatıldı.' });
    } catch (err) {
      setPwState({ busy: false, err: errorMessage(err) });
    }
  }

  async function logoutAll() {
    try {
      await apiFetch('/api/auth/logout-all', { method: 'POST' });
      window.location.href = '/login';
    } catch (err) {
      setLogoutAllMsg(errorMessage(err));
    }
  }

  async function deleteAccount() {
    setDelBusy(true);
    setDelErr(null);
    try {
      await apiFetch('/api/account/delete', { method: 'POST', json: { confirm: 'HESABIMI SİL' } });
      window.location.href = '/?deleted=1';
    } catch (err) {
      setDelErr(errorMessage(err));
      setDelBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="card p-5 sm:p-6">
        <div className="text-[14px] font-medium flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-brand" aria-hidden /> Şifre
        </div>
        <p className="text-[12.5px] text-ink-muted mt-1">
          {hasPassword
            ? 'Şifrenizi değiştirin. Diğer tüm oturumlar kapatılır.'
            : `Hesabınız ${oauthProvider === 'google' ? 'Google' : 'LinkedIn'} ile açıldı. Şifre belirleyerek e-posta ile de giriş yapabilirsiniz.`}
        </p>
        <form onSubmit={changePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4" noValidate>
          {hasPassword && (
            <div>
              <label htmlFor={ids.cur} className="eyebrow block mb-1.5">
                Mevcut şifre
              </label>
              <input
                id={ids.cur}
                type="password"
                autoComplete="current-password"
                className="input"
                value={cur}
                onChange={(e) => setCur(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <label htmlFor={ids.n1} className="eyebrow block mb-1.5">
              Yeni şifre
            </label>
            <input
              id={ids.n1}
              type="password"
              autoComplete="new-password"
              className="input"
              value={n1}
              onChange={(e) => setN1(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div>
            <label htmlFor={ids.n2} className="eyebrow block mb-1.5">
              Yeni şifre (tekrar)
            </label>
            <input
              id={ids.n2}
              type="password"
              autoComplete="new-password"
              className="input"
              value={n2}
              onChange={(e) => setN2(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="sm:col-span-3 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-[11.5px] text-ink-faint">En az 8 karakter, bir harf ve bir rakam.</span>
            <button
              type="submit"
              className="btn-primary !py-2 !px-4 text-[13px] disabled:opacity-50"
              disabled={pwState.busy}
              aria-busy={pwState.busy}
            >
              {pwState.busy ? 'Kaydediliyor…' : hasPassword ? 'Şifreyi değiştir' : 'Şifre belirle'}
            </button>
          </div>
        </form>
        {pwState.err && <InlineAlert className="mt-3">{pwState.err}</InlineAlert>}
        {pwState.msg && (
          <InlineAlert tone="success" className="mt-3">
            {pwState.msg}
          </InlineAlert>
        )}
      </div>

      <div className="card p-5 sm:p-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[14px] font-medium flex items-center gap-2">
            <LogOut className="w-4 h-4 text-brand" aria-hidden /> Tüm cihazlardan çıkış
          </div>
          <p className="text-[12.5px] text-ink-muted mt-1">
            {email} · {emailVerified ? 'e-posta doğrulandı' : 'e-posta doğrulanmadı'}. Tüm aktif oturumları sonlandırır.
          </p>
          {logoutAllMsg && <InlineAlert className="mt-2">{logoutAllMsg}</InlineAlert>}
        </div>
        <button type="button" onClick={logoutAll} className="btn-secondary !py-2 !px-4 text-[13px]">
          Oturumları kapat
        </button>
      </div>

      {role === 'OWNER' && (
        <>
          <div className="card p-5 sm:p-6 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[14px] font-medium flex items-center gap-2">
                <Download className="w-4 h-4 text-brand" aria-hidden /> Verilerimi dışa aktar
              </div>
              <p className="text-[12.5px] text-ink-muted mt-1">
                Marka, rakip, soru ve son ölçümleriniz JSON olarak indirilir (KVKK veri taşınabilirliği).
              </p>
            </div>
            <a href="/api/account/export" className="btn-secondary !py-2 !px-4 text-[13px]" download>
              JSON indir
            </a>
          </div>

          <div className="card p-5 sm:p-6 border-danger/30 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[14px] font-medium flex items-center gap-2 text-danger">
                <ShieldAlert className="w-4 h-4" aria-hidden /> Hesabı sil
              </div>
              <p className="text-[12.5px] text-ink-muted mt-1">
                <b>{tenantName}</b> hesabı, tüm üyeleri ve verileri geri dönüşsüz silinir.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDelOpen(true)}
              className="rounded-full border border-danger/40 text-danger px-4 py-2 text-[13px] hover:bg-danger/5"
            >
              Hesabı sil
            </button>
          </div>
          <ConfirmDialog
            open={delOpen}
            title="Hesabı kalıcı olarak sil"
            description="Bu işlem geri alınamaz. Tüm markalar, sorular, ölçüm geçmişi, ekip üyeleri ve API tokenları silinir."
            confirmPhrase="HESABIMI SİL"
            confirmLabel="Kalıcı olarak sil"
            destructive
            busy={delBusy}
            error={delErr}
            onConfirm={deleteAccount}
            onCancel={() => !delBusy && setDelOpen(false)}
          />
        </>
      )}
    </div>
  );
}
