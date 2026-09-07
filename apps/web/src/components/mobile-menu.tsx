'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useHydrated } from '@/lib/use-hydrated';
import type { MegaPanel } from './mega-menu';

/**
 * Mobil gezinme (lg altı): hamburger → tam ekran panel, gruplar akordeon (native <details>).
 * Rota değişince kapanır; açıkken arka plan kaydırması kilitlenir; Esc kapatır.
 */
export function MobileMenu({ panels }: { panels: MegaPanel[] }) {
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();
  const pathname = usePathname();
  const panelId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!hydrated}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
        className="w-9 h-9 rounded-lg inline-flex items-center justify-center text-ink-muted hover:text-ink hover:bg-paper-3 transition"
      >
        <Menu className="w-5 h-5" aria-hidden />
      </button>

      {/* Portal: header'daki backdrop-filter/transform, fixed diyalogu kendi kutusuna hapseder → body'ye taşı */}
      {open &&
        hydrated &&
        createPortal(
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Site menüsü"
            className="fixed inset-0 z-50 bg-paper overflow-y-auto"
            style={{ animation: 'rise 200ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
          >
            <div className="flex items-center justify-between h-16 px-6 border-b border-hairline sticky top-0 bg-paper/95 backdrop-blur-sm">
              <span className="font-display text-[15px]">Menü</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Menüyü kapat"
                className="w-9 h-9 rounded-lg inline-flex items-center justify-center text-ink-muted hover:text-ink hover:bg-paper-3"
              >
                <X className="w-5 h-5" aria-hidden />
              </button>
            </div>

            <nav className="px-6 py-4 divide-y divide-hairline">
              {panels.map((p) => (
                <details key={p.label} className="group py-2">
                  <summary className="flex items-center justify-between py-2.5 text-[15px] text-ink cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    {p.label}
                    <ChevronDown
                      className="w-4 h-4 text-ink-faint transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <div className="pb-3 space-y-4">
                    {p.sections.map((s) => (
                      <div key={s.heading}>
                        <div className="eyebrow mb-2">{s.heading}</div>
                        <ul className="space-y-1">
                          {s.links.map((l) => (
                            <li key={`${l.href}-${l.title}`}>
                              <Link
                                href={l.href}
                                className="flex items-center gap-2 py-1.5 text-[14px] text-ink-muted hover:text-ink"
                              >
                                {l.title}
                                {l.badge && <span className="chip !py-0.5 !text-[10px]">{l.badge}</span>}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {p.featured && (
                      <Link
                        href={p.featured.href}
                        className="block rounded-xl border border-brand/20 bg-brand-glow/40 p-3"
                      >
                        <div className="eyebrow text-brand-deep">{p.featured.eyebrow}</div>
                        <div className="text-[13.5px] mt-1">{p.featured.title}</div>
                        <div className="inline-flex items-center gap-1 text-[12px] text-brand-deep mt-2">
                          {p.featured.cta} <ArrowRight className="w-3 h-3" aria-hidden />
                        </div>
                      </Link>
                    )}
                  </div>
                </details>
              ))}
              <Link
                href="/pricing"
                className={cn('block py-4 text-[15px]', pathname === '/pricing' ? 'text-brand-deep' : 'text-ink')}
              >
                Fiyatlandırma
              </Link>
            </nav>

            <div className="px-6 pb-10 flex flex-col gap-2">
              <Link
                href="/register"
                className="btn-primary inline-flex items-center justify-center gap-1.5 text-[14px]"
              >
                Ücretsiz başla <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
              <Link href="/login" className="btn-secondary inline-flex items-center justify-center text-[14px]">
                Giriş
              </Link>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
