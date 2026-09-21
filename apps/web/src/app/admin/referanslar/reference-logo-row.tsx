'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InlineAlert } from '@/components/ui/inline-alert';

export type ReferenceLogoView = {
  id: string;
  name: string;
  logoUrl: string;
  siteUrl: string | null;
  sector: string | null;
  order: number;
  published: boolean;
  createdAt: string;
  /** Sıra düğmelerini uçlarda kapatmak için */
  isFirst: boolean;
  isLast: boolean;
};

/**
 * Tablo satırı (md+) ya da kart (mobil): düzenle (PATCH), yayında/gizli anahtarı (PATCH published),
 * yukarı/aşağı taşı (POST …/move) ve sil (ConfirmDialog, referans adı yazılarak).
 */
export function ReferenceLogoRow({ item, variant }: { item: ReferenceLogoView; variant: 'row' | 'card' }) {
  const router = useRouter();
  const ids = { name: useId(), logo: useId(), site: useId(), sector: useId() };
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [logoUrl, setLogoUrl] = useState(item.logoUrl);
  const [siteUrl, setSiteUrl] = useState(item.siteUrl ?? '');
  const [sector, setSector] = useState(item.sector ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  async function run(fn: () => Promise<unknown>, fallback: string, done?: () => void) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
      done?.();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    void run(
      () =>
        apiFetch(`/api/admin/reference-logos/${item.id}`, {
          method: 'PATCH',
          json: { name, logoUrl, siteUrl: siteUrl || null, sector: sector || null },
        }),
      'Güncellenemedi',
      () => setEditing(false),
    );
  };

  const togglePublished = () =>
    void run(
      () =>
        apiFetch(`/api/admin/reference-logos/${item.id}`, {
          method: 'PATCH',
          json: { published: !item.published },
        }),
      'Durum değiştirilemedi',
    );

  const move = (direction: 'up' | 'down') =>
    void run(
      () => apiFetch(`/api/admin/reference-logos/${item.id}/move`, { method: 'POST', json: { direction } }),
      'Sıra değiştirilemedi',
    );

  const remove = () =>
    void run(
      () => apiFetch(`/api/admin/reference-logos/${item.id}`, { method: 'DELETE' }),
      'Silinemedi',
      () => setConfirm(false),
    );

  const logo = (
    /* eslint-disable-next-line @next/next/no-img-element -- referans logoları serbest alan adlarından gelir; next/image remotePatterns tanımlı değil */
    <img
      src={item.logoUrl}
      alt={item.name}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className="h-8 w-auto max-w-[120px] object-contain"
    />
  );

  const publishSwitch = (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        className="accent-brand"
        checked={item.published}
        onChange={togglePublished}
        disabled={busy}
        aria-label={`${item.name} sitede yayında`}
      />
      <span className={item.published ? 'chip own' : 'chip'}>{item.published ? 'Yayında' : 'Gizli'}</span>
    </label>
  );

  const orderButtons = (
    <div className="inline-flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => move('up')}
        disabled={busy || item.isFirst}
        className="p-1.5 rounded-lg hover:bg-paper-3 text-ink-muted hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label={`${item.name} bir sıra yukarı`}
      >
        <ArrowUp className="w-4 h-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => move('down')}
        disabled={busy || item.isLast}
        className="p-1.5 rounded-lg hover:bg-paper-3 text-ink-muted hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label={`${item.name} bir sıra aşağı`}
      >
        <ArrowDown className="w-4 h-4" aria-hidden />
      </button>
    </div>
  );

  const editForm = (
    <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <div>
        <label htmlFor={ids.name} className="sr-only">
          Referans adı
        </label>
        <input
          id={ids.name}
          className="input !py-1.5 text-[12.5px]"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Referans adı"
          required
        />
      </div>
      <div>
        <label htmlFor={ids.logo} className="sr-only">
          Logo bağlantısı
        </label>
        <input
          id={ids.logo}
          className="input !py-1.5 text-[12.5px]"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          maxLength={500}
          placeholder="https://… veya /img/…"
          required
        />
      </div>
      <div>
        <label htmlFor={ids.site} className="sr-only">
          Site bağlantısı
        </label>
        <input
          id={ids.site}
          className="input !py-1.5 text-[12.5px]"
          type="url"
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
          maxLength={500}
          placeholder="https://firma.com (opsiyonel)"
        />
      </div>
      <div>
        <label htmlFor={ids.sector} className="sr-only">
          Sektör
        </label>
        <input
          id={ids.sector}
          className="input !py-1.5 text-[12.5px]"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          maxLength={60}
          placeholder="Sektör (opsiyonel)"
        />
      </div>
      {error && <InlineAlert className="sm:col-span-2">{error}</InlineAlert>}
      <div className="sm:col-span-2 flex gap-2 justify-end">
        <button
          type="button"
          className="btn-secondary !py-1.5 !px-3 text-[12px]"
          onClick={() => setEditing(false)}
          disabled={busy}
        >
          Vazgeç
        </button>
        <button
          type="submit"
          className="btn-primary !py-1.5 !px-3 text-[12px] disabled:opacity-50"
          disabled={busy}
          aria-busy={busy}
        >
          {busy ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </form>
  );

  const actions = (
    <div className="flex items-center gap-1 justify-end">
      <button
        type="button"
        onClick={() => setEditing((v) => !v)}
        className="p-2 rounded-lg hover:bg-paper-3 text-ink-muted hover:text-ink"
        aria-label={`${item.name} kaydını düzenle`}
        aria-expanded={editing}
      >
        <Pencil className="w-4 h-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="p-2 rounded-lg hover:bg-danger/10 text-ink-muted hover:text-danger"
        aria-label={`${item.name} kaydını sil`}
      >
        <Trash2 className="w-4 h-4" aria-hidden />
      </button>
      <ConfirmDialog
        open={confirm}
        title="Referansı sil"
        description={
          <>
            <b>{item.name}</b> kaydı tamamen silinecek. Yalnızca siteden kaldırmak istiyorsanız “Yayında” anahtarını
            kapatmanız yeterli. Bu işlem geri alınamaz.
          </>
        }
        confirmLabel="Sil"
        destructive
        confirmPhrase={item.name}
        busy={busy}
        error={error}
        onConfirm={remove}
        onCancel={() => !busy && setConfirm(false)}
      />
    </div>
  );

  if (variant === 'card') {
    return (
      <li className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              {logo}
              <span className="text-[13px] truncate">{item.name}</span>
            </div>
            <div className="text-[11.5px] text-ink-muted mt-1.5 break-all">{item.siteUrl ?? '—'}</div>
            <div className="text-[10.5px] text-ink-faint font-mono mt-1">
              {item.sector ?? 'sektör yok'} · sıra {item.order} · {item.createdAt}
            </div>
            <div className="mt-2 flex items-center gap-3">
              {publishSwitch}
              {orderButtons}
            </div>
          </div>
          {actions}
        </div>
        {!editing && error && <InlineAlert className="mt-3">{error}</InlineAlert>}
        {editing && <div className="mt-3">{editForm}</div>}
      </li>
    );
  }

  return (
    <>
      <tr className="hover:bg-paper-2/50 transition align-middle">
        <td className="px-5 py-3">{logo}</td>
        <td className="px-5 py-3 text-[13px]">{item.name}</td>
        <td className="px-5 py-3 text-[12px] text-ink-muted">{item.sector ?? '—'}</td>
        <td className="px-5 py-3 text-[12px] text-ink-muted break-all max-w-[220px]">{item.siteUrl ?? '—'}</td>
        <td className="px-5 py-3">{publishSwitch}</td>
        <td className="px-5 py-3 text-right">{orderButtons}</td>
        <td className="px-5 py-2">{actions}</td>
      </tr>
      {(editing || error) && (
        <tr className="bg-paper-2/40">
          <td colSpan={7} className="px-5 py-3">
            {editing ? editForm : <InlineAlert>{error}</InlineAlert>}
          </td>
        </tr>
      )}
    </>
  );
}
