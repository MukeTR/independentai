'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { HelpCircle, X } from 'lucide-react';
import { adminGuideForPath } from '@/data/admin-screen-guides';

/**
 * "Bu ekran ne işe yarar?" — aktif admin rotasının rehberini native <dialog> içinde açar.
 * Rehberi olmayan rotada hiçbir şey çizmez. İçerik `data/admin-screen-guides.ts`.
 */
export function ScreenGuide({ className }: { className?: string }) {
  const pathname = usePathname() ?? '';
  const guide = adminGuideForPath(pathname);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  if (!guide) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`btn-secondary !py-2 !px-3.5 text-[12.5px] inline-flex items-center gap-1.5 ${className ?? ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <HelpCircle className="w-4 h-4" aria-hidden="true" />
        Bu ekran ne işe yarar?
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        onClick={(e) => {
          if (e.target === ref.current) setOpen(false);
        }}
        className="rounded-2xl p-0 border border-hairline bg-paper-3 text-ink shadow-2xl w-[min(92vw,560px)] max-h-[85vh] backdrop:bg-ink/40"
      >
        <div className="flex flex-col max-h-[85vh]">
          <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-hairline">
            <h2 id={titleId} className="font-display text-[18px] leading-tight">
              {guide.title}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Rehberi kapat"
              className="p-2 -m-2 rounded-md text-ink-faint hover:text-ink"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <div className="px-6 py-4 overflow-y-auto space-y-3 text-[13.5px] leading-relaxed">
            <p className="text-ink-muted">{guide.intro}</p>
            <ol className="space-y-2">
              {guide.steps.map((s) => (
                <li key={s.title} className="rounded-xl border border-hairline bg-paper-2/60 p-3">
                  <div className="font-medium text-brand-deep text-[13px]">{s.title}</div>
                  <div className="text-ink-muted mt-0.5">{s.body}</div>
                </li>
              ))}
            </ol>
            {guide.terms?.length ? (
              <div className="rounded-xl border border-hairline p-3">
                <div className="text-[11px] uppercase tracking-wider text-ink-faint font-medium mb-2">Terimler</div>
                <dl className="space-y-1.5">
                  {guide.terms.map((t) => (
                    <div key={t.term}>
                      <dt className="inline font-medium">{t.term}</dt>
                      <dd className="inline text-ink-muted"> — {t.def}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>
          <div className="px-6 py-3 border-t border-hairline">
            <button type="button" onClick={() => setOpen(false)} className="btn-primary !py-2 w-full text-[13px]">
              Kapat
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
