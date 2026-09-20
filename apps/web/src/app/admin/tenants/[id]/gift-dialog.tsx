'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gift } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { InlineAlert } from '@/components/ui/inline-alert';
import { useHydrated } from '@/lib/use-hydrated';
import { cn } from '@/lib/cn';

/**
 * Hediye süre (Kârmatik grantPeriod deseni): [7, 14, 30, 90, 365] gün ön ayarı → mevcut
 * `PATCH /api/admin/tenants/[id] {trialEndsAt}`. Yeni bitiş = max(şimdi, mevcut bitiş) + gün (audit: admin.tenant_update).
 */
export const GIFT_PRESETS = [7, 14, 30, 90, 365] as const;

const DAY = 86_400_000;

export function giftedTrialEnd(currentTrialEndsAt: string, days: number, now: Date = new Date()): Date {
  const cur = new Date(currentTrialEndsAt).getTime();
  const base = Number.isFinite(cur) && cur > now.getTime() ? cur : now.getTime();
  return new Date(base + days * DAY);
}

export function GiftDialog({ tenantId, trialEndsAt }: { tenantId: string; trialEndsAt: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const groupId = useId();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<number>(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      setError(null);
      el.showModal();
    } else if (!open && el.open) el.close();
  }, [open]);

  const preview = giftedTrialEnd(trialEndsAt, days);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const end = giftedTrialEnd(trialEndsAt, days);
      await apiFetch(`/api/admin/tenants/${tenantId}`, { method: 'PATCH', json: { trialEndsAt: end.toISOString() } });
      setDone(
        `${days} gün tanımlandı · yeni bitiş ${end.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}`,
      );
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="hediye" className="scroll-mt-6">
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!hydrated}
        className="btn-secondary !py-2 !px-3.5 text-[12.5px] inline-flex items-center gap-1.5 disabled:opacity-50"
        aria-haspopup="dialog"
      >
        <Gift className="w-4 h-4" aria-hidden="true" />
        Hediye süre
      </button>
      {done && (
        <InlineAlert tone="success" className="mt-3">
          {done}
        </InlineAlert>
      )}
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onCancel={(e) => {
          e.preventDefault();
          if (!busy) setOpen(false);
        }}
        onClick={(e) => {
          if (e.target === ref.current && !busy) setOpen(false);
        }}
        className="rounded-2xl p-0 border border-hairline bg-paper-3 text-ink shadow-2xl w-[min(92vw,440px)] backdrop:bg-ink/40"
      >
        <form onSubmit={submit} className="p-6">
          <h2 id={titleId} className="font-display text-[18px]">
            Hediye süre tanımla
          </h2>
          <p className="text-[13px] text-ink-muted mt-1.5">
            Deneme bitişi ileri alınır (mevcut bitiş geçmişse bugünden başlar). Plan değişmez; işlem denetim kaydına
            yazılır.
          </p>
          <fieldset className="mt-4">
            <legend id={groupId} className="text-[11px] uppercase tracking-wider text-ink-faint font-medium mb-2">
              Süre
            </legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={groupId}>
              {GIFT_PRESETS.map((d) => (
                <label
                  key={d}
                  className={cn(
                    'cursor-pointer rounded-full border px-3.5 py-2 text-[13px] min-h-[40px] inline-flex items-center',
                    days === d ? 'bg-brand text-white border-brand' : 'border-hairline bg-paper-2 hover:border-ink/40',
                  )}
                >
                  <input
                    type="radio"
                    name="gift-days"
                    value={d}
                    checked={days === d}
                    onChange={() => setDays(d)}
                    className="sr-only"
                  />
                  {d} gün
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-[12.5px] mt-4" aria-live="polite">
            Yeni bitiş:{' '}
            <span className="font-medium tabular">
              {preview.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}
            </span>
          </p>
          {error && (
            <InlineAlert className="mt-3" tone="error">
              {error}
            </InlineAlert>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="btn-secondary !py-2 !px-4 text-[13px] disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={busy}
              aria-busy={busy}
              className="btn-primary !py-2 !px-4 text-[13px] disabled:opacity-50"
            >
              {busy ? 'Tanımlanıyor…' : `${days} gün tanımla`}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
