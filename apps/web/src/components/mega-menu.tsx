'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef } from 'react';
import { ChevronDown, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export type MegaSection = {
  heading: string;
  links: { href: string; title: string; description?: string; badge?: string }[];
};

export type MegaPanel = {
  label: string;
  sections: MegaSection[];
  /** Panelin geniş (2 kolonlu içerik + görselli vitrin) varyantı. */
  wide?: boolean;
  featured?: {
    eyebrow: string;
    title: string;
    body: string;
    href: string;
    cta: string;
    /** public/ altındaki panel görseli; verilirse vitrinin üstünde gösterilir. */
    image?: string;
    imageAlt?: string;
  };
};

export function MegaMenu({ panels }: { panels: MegaPanel[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openPanel(label: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(label);
  }
  function schedulePanelClose() {
    closeTimer.current = setTimeout(() => setOpen(null), 100);
  }

  return (
    <nav className="hidden lg:flex items-center gap-1">
      {panels.map((p) => (
        <div
          key={p.label}
          className="relative"
          onMouseEnter={() => openPanel(p.label)}
          onMouseLeave={schedulePanelClose}
        >
          <button
            type="button"
            aria-haspopup="true"
            aria-expanded={open === p.label}
            onClick={() => (open === p.label ? setOpen(null) : openPanel(p.label))}
            onFocus={() => openPanel(p.label)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-2 text-[14px] rounded-full transition outline-none',
              'focus-visible:ring-2 focus-visible:ring-brand/30',
              open === p.label ? 'text-ink bg-paper-2' : 'text-ink-muted hover:text-ink hover:bg-paper-2/70',
            )}
          >
            {p.label}
            <ChevronDown
              aria-hidden
              className={cn('w-3.5 h-3.5 transition-transform', open === p.label && 'rotate-180')}
            />
          </button>

          {open === p.label && (
            <div
              className={cn(
                'absolute top-full pt-3 z-50',
                // Geniş panel ortalanırsa ekranın solundan taşar; trigger'ın soluna hizala.
                p.wide ? 'left-0' : 'left-1/2 -translate-x-1/2',
              )}
              onMouseEnter={() => openPanel(p.label)}
              onMouseLeave={schedulePanelClose}
            >
              <div
                className={cn(
                  'bg-paper-3 rounded-2xl border border-hairline p-7 max-w-[calc(100vw-2rem)] grid grid-cols-12 gap-7 shadow-[0_2px_4px_rgba(20,22,28,0.04),0_24px_56px_-28px_rgba(20,22,28,0.28)]',
                  p.wide ? 'w-[min(94vw,880px)]' : 'w-[min(92vw,720px)]',
                )}
                style={{ animation: 'rise 220ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
              >
                <div
                  className={cn(
                    'grid gap-6',
                    p.featured ? 'col-span-8' : 'col-span-12',
                    p.featured ? (p.sections.length >= 3 ? 'grid-cols-3' : 'grid-cols-2') : 'grid-cols-3',
                  )}
                >
                  {p.sections.map((s) => (
                    <div key={s.heading}>
                      <div className="eyebrow mb-3.5">{s.heading}</div>
                      <ul
                        className={cn(
                          'space-y-2.5',
                          s.links.length > 6 && 'grid grid-cols-2 gap-x-6 gap-y-1 space-y-0',
                        )}
                      >
                        {s.links.map((l) => (
                          <li key={l.href}>
                            <Link
                              href={l.href}
                              className="group block -mx-2 px-2 py-1.5 rounded-lg hover:bg-paper-2 transition"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[13.5px] text-ink group-hover:text-brand-deep transition">
                                  {l.title}
                                </span>
                                {l.badge && <span className="chip !py-0.5 !text-[10px]">{l.badge}</span>}
                              </div>
                              {l.description && (
                                <span className="text-[12px] text-ink-faint mt-0.5 block">{l.description}</span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {p.featured && (
                  <Link
                    href={p.featured.href}
                    className="col-span-4 relative rounded-xl overflow-hidden group bg-paper-2 border border-hairline hover:border-brand/40 transition"
                  >
                    {p.featured.image && (
                      <span className="block border-b border-hairline bg-paper-3">
                        <Image
                          src={p.featured.image}
                          alt={p.featured.imageAlt ?? ''}
                          width={900}
                          height={260}
                          className="w-full h-[128px] object-cover object-top"
                          unoptimized
                        />
                      </span>
                    )}
                    <span className="block p-5">
                      <span className="eyebrow text-brand-deep block">{p.featured.eyebrow}</span>
                      <span className="font-display text-[18px] mt-2 leading-snug block">{p.featured.title}</span>
                      <span className="text-[12.5px] text-ink-muted mt-2 leading-relaxed block">{p.featured.body}</span>
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-brand-deep mt-4 font-medium">
                        {p.featured.cta}
                        <ArrowUpRight
                          aria-hidden
                          className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition"
                        />
                      </span>
                    </span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
