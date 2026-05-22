'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

export type FaqItem = { question: string; answer: string };

export function Faq({ items, defaultOpen = 0 }: { items: FaqItem[]; defaultOpen?: number | null }) {
  const [open, setOpen] = useState<number | null>(defaultOpen);

  return (
    <div className="card divide-y divide-hairline overflow-hidden">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <button
            key={i}
            type="button"
            onClick={() => setOpen(isOpen ? null : i)}
            className="w-full text-left p-6 hover:bg-paper-2 transition group"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="font-display text-[17px] tracking-tight">{item.question}</span>
              <span className="shrink-0 mt-1 text-ink-faint group-hover:text-brand transition">
                {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </span>
            </div>
            {isOpen && (
              <p className="text-[14px] text-ink-muted mt-3 leading-relaxed whitespace-pre-line">
                {item.answer}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
