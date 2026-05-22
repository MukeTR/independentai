'use client';

import Link from 'next/link';
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
  featured?: {
    eyebrow: string;
    title: string;
    body: string;
    href: string;
    cta: string;
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
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-2 text-[14px] rounded-lg transition',
              open === p.label ? 'text-ink bg-paper-3' : 'text-ink-muted hover:text-ink',
            )}
          >
            {p.label}
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open === p.label && 'rotate-180')} />
          </button>

          {open === p.label && (
            <div
              className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50"
              onMouseEnter={() => openPanel(p.label)}
              onMouseLeave={schedulePanelClose}
            >
              <div
                className="card bg-paper-3 p-7 w-[720px] grid grid-cols-12 gap-6 shadow-[0_24px_60px_-20px_rgba(20,17,13,0.18)]"
                style={{ animation: 'rise 220ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
              >
                <div className={cn('grid gap-6', p.featured ? 'col-span-8 grid-cols-2' : 'col-span-12 grid-cols-3')}>
                  {p.sections.map((s) => (
                    <div key={s.heading}>
                      <div className="eyebrow mb-3">{s.heading}</div>
                      <ul className="space-y-3">
                        {s.links.map((l) => (
                          <li key={l.href}>
                            <Link href={l.href} className="group block">
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
                    className="col-span-4 relative rounded-xl p-5 overflow-hidden group"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(79,70,229,0.08), rgba(79,70,229,0.02))',
                      border: '0.5px solid rgba(79,70,229,0.18)',
                    }}
                  >
                    <div className="eyebrow text-brand-deep">{p.featured.eyebrow}</div>
                    <div className="font-display text-[18px] mt-2 leading-snug">{p.featured.title}</div>
                    <p className="text-[12.5px] text-ink-muted mt-2 leading-relaxed">{p.featured.body}</p>
                    <div className="inline-flex items-center gap-1.5 text-[12px] text-brand-deep mt-4 font-medium">
                      {p.featured.cta}
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                    </div>
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
