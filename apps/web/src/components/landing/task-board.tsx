'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Container } from '@/components/container';
import { Reveal } from '@/components/marketing/reveal';
import { cn } from '@/lib/cn';

type Task = { id: string; t: string; tag: string; tone: 'lift' | 'entity' | 'citation' | 'done'; done: boolean };

const INITIAL: Task[] = [
  {
    id: 'a',
    t: '"Pazaryeri danışmanlığı nedir?" sayfasını güncelle',
    tag: '+8 tahmini görünürlük',
    tone: 'lift',
    done: false,
  },
  { id: 'b', t: '"En iyi pazaryeri ajansları" karşılaştırma içeriği oluştur', tag: '+12', tone: 'lift', done: false },
  { id: 'c', t: 'LinkedIn company description güncelle', tag: 'Entity signal', tone: 'entity', done: false },
  { id: 'd', t: 'Sektörel X yayında mention kazan', tag: 'Citation', tone: 'citation', done: false },
  { id: 'e', t: 'Organization Schema eklendi', tag: 'Tamamlandı', tone: 'done', done: true },
];

const BASE_DONE = 12;
const TOTAL = 31;

const TAG: Record<Task['tone'], string> = {
  lift: 'text-positive',
  entity: 'text-brand-deep',
  citation: 'text-warning',
  done: 'text-ink-faint',
};

export function TaskBoard() {
  const [tasks, setTasks] = useState(INITIAL);
  const extra = tasks.filter((t) => t.done).length - INITIAL.filter((t) => t.done).length;
  const done = BASE_DONE + extra;
  const pct = Math.round((done / TOTAL) * 100);

  const toggle = (id: string) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  return (
    <section className="py-20 lg:py-28 border-t border-hairline">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-5">
            <Reveal>
              <div className="eyebrow text-brand-deep">Adım 4 · 12 görev üretildi</div>
              <h2 className="font-display text-[34px] lg:text-[44px] tracking-tight mt-3 leading-[1.05]">
                Analytics'e bakıp ne yapacağınızı düşünmeyin.{' '}
                <span className="accent-text">Yanıt size sıradaki işi söylesin.</span>
              </h2>
              <p className="text-[16px] text-ink-muted mt-5 leading-relaxed">
                Panelin merkezi bir grafik değil, bu haftanın listesi. Her görev bir etki tahmini taşır; işaretledikçe
                görünürlük skorunuz nereye gideceğini gösterir.
              </p>
              <p className="text-[13px] text-ink-faint mt-4">Kutucukları deneyin, halka anında güncellenir.</p>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal delay={100}>
              <div className="card p-6 sm:p-7 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="eyebrow">Bu hafta</div>
                    <div className="font-display text-[22px] mt-1">Yapılacaklar</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Ring pct={pct} />
                    <div className="text-right">
                      <div className="font-display text-[20px] tabular leading-none" aria-live="polite">
                        {done} <span className="text-ink-faint text-[14px]">/ {TOTAL}</span>
                      </div>
                      <div className="text-[11px] text-ink-faint mt-1">tamamlandı</div>
                    </div>
                  </div>
                </div>

                <ul className="mt-6 space-y-2">
                  {tasks.map((t) => (
                    <li key={t.id}>
                      <label
                        className={cn(
                          'flex items-center gap-3.5 rounded-xl border px-4 py-3 cursor-pointer transition',
                          t.done
                            ? 'border-hairline bg-paper-2/40'
                            : 'border-hairline bg-paper-2/70 hover:border-brand/40',
                        )}
                      >
                        <input type="checkbox" className="sr-only" checked={t.done} onChange={() => toggle(t.id)} />
                        <span
                          className={cn(
                            'w-5 h-5 rounded-md border inline-flex items-center justify-center shrink-0 transition',
                            t.done ? 'accent-grad border-transparent text-white' : 'border-hairline',
                          )}
                          aria-hidden
                        >
                          {t.done && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <span className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                          <span
                            className={cn(
                              'text-[14px] flex-1 leading-snug',
                              t.done ? 'text-ink-faint line-through' : 'text-ink',
                            )}
                          >
                            {t.t}
                          </span>
                          <span className={cn('text-[11.5px] font-mono whitespace-nowrap', TAG[t.tone])}>{t.tag}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90" role="img" aria-label={`Yüzde ${pct} tamamlandı`}>
      <circle cx="24" cy="24" r={r} fill="none" stroke="var(--hairline)" strokeWidth="5" />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        style={{ transition: 'stroke-dashoffset 500ms cubic-bezier(0.22,1,0.36,1)' }}
      />
    </svg>
  );
}
