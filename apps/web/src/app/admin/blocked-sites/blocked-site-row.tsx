'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InlineAlert } from '@/components/ui/inline-alert';

export type BlockedSiteView = {
  id: string;
  hostname: string;
  redirectUrl: string;
  note: string | null;
  hits: number;
  createdAt: string;
};

/** Tablo satırı (md+) ya da kart (mobil): düzenle (PATCH) + sil (ConfirmDialog, alan adı yazılarak). */
export function BlockedSiteRow({ site, variant }: { site: BlockedSiteView; variant: 'row' | 'card' }) {
  const router = useRouter();
  const ids = { url: useId(), note: useId() };
  const [editing, setEditing] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState(site.redirectUrl);
  const [note, setNote] = useState(site.note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/blocked-sites/${site.id}`, { method: 'PATCH', json: { redirectUrl, note } });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, 'Güncellenemedi'));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/blocked-sites/${site.id}`, { method: 'DELETE' });
      setConfirm(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, 'Silinemedi'));
    } finally {
      setBusy(false);
    }
  }

  const editForm = (
    <form onSubmit={save} className="flex flex-col gap-2">
      <label htmlFor={ids.url} className="sr-only">
        Yönlendirme bağlantısı
      </label>
      <input
        id={ids.url}
        className="input !py-1.5 text-[12.5px]"
        type="url"
        value={redirectUrl}
        onChange={(e) => setRedirectUrl(e.target.value)}
        required
      />
      <label htmlFor={ids.note} className="sr-only">
        Not
      </label>
      <input
        id={ids.note}
        className="input !py-1.5 text-[12.5px]"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={300}
        placeholder="Not"
      />
      {error && <InlineAlert>{error}</InlineAlert>}
      <div className="flex gap-2 justify-end">
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
        aria-label={`${site.hostname} kaydını düzenle`}
        aria-expanded={editing}
      >
        <Pencil className="w-4 h-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="p-2 rounded-lg hover:bg-danger/10 text-ink-muted hover:text-danger"
        aria-label={`${site.hostname} kaydını sil`}
      >
        <Trash2 className="w-4 h-4" aria-hidden />
      </button>
      <ConfirmDialog
        open={confirm}
        title="Yasaklı siteyi sil"
        description={
          <>
            <span className="font-mono">{site.hostname}</span> listeden çıkarılacak; alan adı yeniden taranabilir hâle
            gelir. Bu işlem geri alınamaz.
          </>
        }
        confirmLabel="Sil"
        destructive
        confirmPhrase={site.hostname}
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
            <div className="font-mono text-[13px] truncate">{site.hostname}</div>
            <div className="text-[11.5px] text-ink-muted mt-0.5 break-all">{site.redirectUrl}</div>
            {site.note && <div className="text-[12px] text-ink-muted mt-1">{site.note}</div>}
            <div className="text-[10.5px] text-ink-faint font-mono mt-1">
              {site.hits} isabet · {site.createdAt}
            </div>
          </div>
          {actions}
        </div>
        {editing && <div className="mt-3">{editForm}</div>}
      </li>
    );
  }

  return (
    <>
      <tr className="hover:bg-paper-2/50 transition align-top">
        <td className="px-5 py-3 font-mono text-[12.5px]">{site.hostname}</td>
        <td className="px-5 py-3 text-[12px] text-ink-muted break-all max-w-[260px]">{site.redirectUrl}</td>
        <td className="px-5 py-3 text-[12px] text-ink-muted">{site.note ?? '—'}</td>
        <td className="px-5 py-3 text-right tabular">{site.hits}</td>
        <td className="px-5 py-3 text-ink-faint text-[11px] whitespace-nowrap">{site.createdAt}</td>
        <td className="px-5 py-2">{actions}</td>
      </tr>
      {editing && (
        <tr className="bg-paper-2/40">
          <td colSpan={6} className="px-5 py-3">
            {editForm}
          </td>
        </tr>
      )}
    </>
  );
}
