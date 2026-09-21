'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PhoneCall,
  Send,
  FileText,
  CheckCircle2,
  XCircle,
  RotateCcw,
  StickyNote,
  Trash2,
  Eye,
  UserRound,
} from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InlineAlert } from '@/components/ui/inline-alert';
import { useHydrated } from '@/lib/use-hydrated';
import { cn } from '@/lib/cn';

/**
 * LeadCard aksiyon satırı (Kârmatik "Act" düğmeleri): Arandı · Mail atıldı · Teklif · Kazanıldı · Kaybedildi ·
 * Yeniden aç · Not · Sahip ata · e-postayı göster (audit'li) · Sil (ConfirmDialog, alan adı / ad / şirket yazılır).
 * Her mutasyon PATCH/DELETE /api/admin/leads/[id] → router.refresh().
 */
export type LeadActionsLead = {
  id: string;
  hostname: string | null;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'WON' | 'LOST';
  ownerUserId: string | null;
  /** Maskeli (yalnız gösterim; onay ifadesi olarak asla kullanılmaz) */
  contactEmail: string | null;
  /** Alan adı olmayan lead'de silme onay ifadesi için */
  contactName?: string | null;
  company?: string | null;
  /** Maskeli */
  contactPhone: string | null;
  notes: string | null;
};

type ActionKey = 'called' | 'emailed' | 'proposal' | 'won' | 'lost' | 'reopen';

const ACTIONS: {
  key: ActionKey;
  label: string;
  icon: typeof PhoneCall;
  tone?: 'positive' | 'danger';
  show?: (s: string) => boolean;
}[] = [
  { key: 'called', label: 'Arandı', icon: PhoneCall },
  { key: 'emailed', label: 'Mail atıldı', icon: Send },
  { key: 'proposal', label: 'Teklif iletildi', icon: FileText },
  { key: 'won', label: 'Kazanıldı', icon: CheckCircle2, tone: 'positive' },
  { key: 'lost', label: 'Kaybedildi', icon: XCircle, tone: 'danger' },
  { key: 'reopen', label: 'Yeniden aç', icon: RotateCcw, show: (s) => s === 'WON' || s === 'LOST' },
];

export function LeadActions({
  lead,
  owners,
  afterDelete,
}: {
  lead: LeadActionsLead;
  owners: { id: string; email: string }[];
  /** Silme sonrası yönlendirilecek yol (detay sayfası); listede boş bırakılır */
  afterDelete?: string;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const ids = { note: useId(), owner: useId(), notes: useId() };
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [revealed, setRevealed] = useState<{ email: string | null; phone: string | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasContact = !!(lead.contactEmail || lead.contactPhone);

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const patch = (body: Record<string, unknown>) =>
    apiFetch(`/api/admin/leads/${lead.id}`, { method: 'PATCH', json: body });

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Lead aksiyonları">
        {ACTIONS.filter((a) => !a.show || a.show(lead.status)).map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.key}
              type="button"
              disabled={!hydrated || !!busy}
              aria-busy={busy === a.key}
              onClick={() => run(a.key, () => patch({ action: a.key }))}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[12px] font-medium transition disabled:opacity-50 min-h-[36px]',
                'border-hairline bg-paper-3 text-ink-muted hover:text-ink',
                a.tone === 'positive' && 'hover:border-positive hover:text-positive',
                a.tone === 'danger' && 'hover:border-danger hover:text-danger',
              )}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              {busy === a.key ? '…' : a.label}
            </button>
          );
        })}
        {hasContact && !revealed && (
          <button
            type="button"
            disabled={!hydrated || !!busy}
            onClick={() =>
              run('reveal', async () => {
                const r = await apiFetch<{ contactEmail: string | null; contactPhone: string | null }>(
                  `/api/admin/leads/${lead.id}?reveal=1`,
                );
                setRevealed({ email: r.contactEmail, phone: r.contactPhone });
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-paper-3 px-2.5 py-2 text-[12px] font-medium text-ink-muted hover:text-ink min-h-[36px] disabled:opacity-50"
            title="Tam e-posta/telefonu göster (denetim kaydına yazılır)"
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            E-postayı göster
          </button>
        )}
        <button
          type="button"
          disabled={!hydrated || !!busy}
          onClick={() => setConfirmDelete(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[12px] text-ink-faint hover:text-danger min-h-[36px] disabled:opacity-50"
          aria-label="Lead’i sil"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          Sil
        </button>
      </div>

      {revealed && (
        <p className="mt-2 text-[13px] font-mono break-all" role="status">
          {revealed.email && (
            <a href={`mailto:${revealed.email}`} className="text-brand-deep hover:underline">
              {revealed.email}
            </a>
          )}
          {revealed.email && revealed.phone && <span className="text-ink-faint"> · </span>}
          {revealed.phone && (
            <a href={`tel:${revealed.phone}`} className="text-brand-deep hover:underline">
              {revealed.phone}
            </a>
          )}
        </p>
      )}

      <details className="mt-3 group">
        <summary className="cursor-pointer text-[12px] text-ink-muted hover:text-ink inline-flex items-center gap-1.5 min-h-[36px]">
          <StickyNote className="w-3.5 h-3.5" aria-hidden="true" />
          Not ekle · sahip ata
        </summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <form
            className="flex gap-2 items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (!note.trim()) return;
              run('note', async () => {
                await patch({ action: 'note', note: note.trim() });
                setNote('');
              });
            }}
          >
            <div className="flex-1">
              <label htmlFor={ids.note} className="text-[11px] uppercase tracking-wider text-ink-faint block mb-1">
                Aktivite notu
              </label>
              <input
                id={ids.note}
                className="input"
                value={note}
                maxLength={2000}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Örn. fiyat gönderildi, Salı geri arayacak…"
              />
            </div>
            <button
              type="submit"
              className="btn-secondary !py-2.5 text-[12.5px]"
              disabled={!hydrated || !!busy || !note.trim()}
            >
              Ekle
            </button>
          </form>
          <div>
            <label htmlFor={ids.owner} className="text-[11px] uppercase tracking-wider text-ink-faint block mb-1">
              Sahip
            </label>
            <div className="flex gap-2 items-center">
              <UserRound className="w-4 h-4 text-ink-faint shrink-0" aria-hidden="true" />
              <select
                id={ids.owner}
                className="input"
                value={lead.ownerUserId ?? ''}
                disabled={!hydrated || !!busy}
                onChange={(e) => run('owner', () => patch({ ownerUserId: e.target.value || null }))}
              >
                <option value="">Sahipsiz</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <form
            className="sm:col-span-2"
            onSubmit={(e) => {
              e.preventDefault();
              run('notes', () => patch({ notes: notes.trim() || null }));
            }}
          >
            <label htmlFor={ids.notes} className="text-[11px] uppercase tracking-wider text-ink-faint block mb-1">
              Kalıcı not
            </label>
            <textarea
              id={ids.notes}
              className="input min-h-[72px]"
              value={notes}
              maxLength={5000}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button
              type="submit"
              className="btn-secondary !py-2 text-[12.5px] mt-2"
              disabled={!hydrated || !!busy || notes === (lead.notes ?? '')}
            >
              Notu kaydet
            </button>
          </form>
        </div>
      </details>

      {error && (
        <InlineAlert className="mt-3" tone="error">
          {error}
        </InlineAlert>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Lead silinsin mi?"
        description={
          <>
            Bu kayıt ve aktivite günlüğü geri dönüşsüz silinir; denetim kaydına yalnız alan adı yazılır. KVKK silme
            talebi için bu yolu kullanın.
          </>
        }
        confirmLabel="Sil"
        destructive
        confirmPhrase={lead.hostname ?? lead.contactName ?? lead.company ?? 'SİL'}
        busy={busy === 'delete'}
        error={error}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          run('delete', async () => {
            await apiFetch(`/api/admin/leads/${lead.id}`, { method: 'DELETE' });
            setConfirmDelete(false);
            if (afterDelete) router.push(afterDelete);
          })
        }
      />
    </div>
  );
}
