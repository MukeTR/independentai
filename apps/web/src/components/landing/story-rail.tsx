'use client';

import { Container } from '@/components/container';
import { DEMO } from './demo';
import { useStory } from './story';

/**
 * Sayfa boyunca tek örnek şirketin yolculuğu: taranıyor → skor → sorun → görev → tamamlandı → yeni skor → sıra.
 * Canlı taramada ilk iki durak ziyaretçinin verisiyle dolar; gerisi temsili senaryodur.
 */
export function StoryRail() {
  const { domain, score, opportunities, live } = useStory();
  const stops = [
    { k: 'scan', v: domain, l: 'taranıyor' },
    {
      k: 'score',
      v: live ? String(score) : `${DEMO.score} vs ${DEMO.competitor}`,
      l: live ? 'AI hazırlık' : 'siz vs rakip',
    },
    { k: 'issues', v: String(opportunities), l: 'sorun bulundu' },
    { k: 'tasks', v: String(DEMO.tasks), l: 'görev üretildi' },
    { k: 'done', v: String(DEMO.done), l: 'tamamlandı' },
    { k: 'after', v: `${DEMO.score} → ${DEMO.after}`, l: 'görünürlük' },
    { k: 'rank', v: `${DEMO.rankBefore} → ${DEMO.rankAfter}.`, l: 'sıra' },
  ];
  return (
    <div className="border-y border-hairline bg-paper-2/50">
      <Container>
        <ol
          className="flex items-center gap-6 lg:gap-8 py-4 overflow-x-auto text-[12px] whitespace-nowrap [scrollbar-width:none]"
          aria-label="Örnek şirketin yolculuğu"
        >
          {stops.map((s, i) => (
            <li key={s.k} className="flex items-center gap-6 lg:gap-8 shrink-0">
              <span className="flex items-baseline gap-2">
                <span className="font-display text-[15px] tabular text-ink">{s.v}</span>
                <span className="text-ink-faint">{s.l}</span>
              </span>
              {i < stops.length - 1 && (
                <span className="text-brand/60" aria-hidden>
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </Container>
    </div>
  );
}
