'use client';

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Erişilebilir genel diyalog (native <dialog>): odak tuzağı, Esc/arka plan ile kapanma,
 * başlık ilişkilendirme. Formlu içerikler için (ConfirmDialog yalnızca onay içindir).
 */
export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`rounded-2xl p-0 border border-hairline bg-paper-3 text-ink shadow-2xl backdrop:bg-ink/40 ${wide ? 'w-[min(94vw,720px)]' : 'w-[min(92vw,520px)]'}`}
    >
      {open && (
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="font-display text-[18px]">
                {title}
              </h2>
              {description && (
                <div id={descId} className="text-[13px] text-ink-muted mt-1 leading-relaxed">
                  {description}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="w-8 h-8 rounded-full flex items-center justify-center text-ink-faint hover:bg-paper-4 hover:text-ink shrink-0"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>
          <div className="mt-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
