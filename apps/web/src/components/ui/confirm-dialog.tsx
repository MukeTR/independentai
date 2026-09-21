'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { InlineAlert } from './inline-alert';
import { useHydrated } from '@/lib/use-hydrated';

/**
 * Erişilebilir onay diyaloğu (native <dialog>): odak tuzağı, Esc ile kapanma, başlık/açıklama
 * ilişkilendirme, opsiyonel yazılı onay ifadesi (geri dönüşsüz silmeler için).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Onayla',
  cancelLabel = 'Vazgeç',
  destructive = false,
  confirmPhrase,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Girilmesi gereken ifade (örn. "HESABIMI SİL") */
  confirmPhrase?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  const [typed, setTyped] = useState('');
  const hydrated = useHydrated();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      setTyped('');
      el.showModal();
    } else if (!open && el.open) el.close();
  }, [open]);

  const canConfirm = hydrated && !busy && (!confirmPhrase || typed === confirmPhrase);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onCancel();
      }}
      className="rounded-2xl p-0 border border-hairline bg-paper-3 text-ink shadow-2xl w-[min(92vw,440px)] backdrop:bg-ink/40"
    >
      <form
        method="dialog"
        className="p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (canConfirm) onConfirm();
        }}
      >
        <h2 id={titleId} className="font-display text-[18px]">
          {title}
        </h2>
        {description && (
          <div id={descId} className="text-[13.5px] text-ink-muted mt-2 leading-relaxed">
            {description}
          </div>
        )}
        {confirmPhrase && (
          <div className="mt-4">
            <label htmlFor={`${titleId}-phrase`} className="text-[12px] text-ink-muted block mb-1.5">
              Onaylamak için <span className="font-mono text-ink">{confirmPhrase}</span> yazın
            </label>
            <input
              id={`${titleId}-phrase`}
              className="input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
            />
          </div>
        )}
        {error && <InlineAlert className="mt-4">{error}</InlineAlert>}
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn-secondary !py-2 !px-4 text-[13px] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={!canConfirm}
            className={`!py-2 !px-4 text-[13px] rounded-full font-medium disabled:opacity-50 ${destructive ? 'bg-danger text-white hover:bg-danger/90' : 'btn-primary'}`}
          >
            {busy ? 'İşleniyor…' : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
