import { MessageSquareText } from 'lucide-react';
import type { Sector } from '@/data/sectors';

/**
 * "Müşteriniz bunu soruyor" — sektörün 5 satın alma sorusu (RESEARCH_BRIFING §C.3), sohbet balonu görünümünde.
 * Bu sorular FaqJsonLd'ye KONMAZ: sitenin SSS'si değil, müşterinin asistana sorduğu örnek sorulardır.
 */
export function SectorQuestionsList({ sector, id = 'sorular' }: { sector: Sector; id?: string }) {
  return (
    <ol id={id} className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-label={`${sector.name} müşterisinin sorduğu sorular`}>
      {sector.showcaseQuestions.map((q, i) => (
        <li
          key={q}
          className={`card p-5 flex gap-4 items-start rise-${Math.min(i + 1, 5)} ${i === 4 ? 'md:col-span-2' : ''}`}
        >
          <span
            className="shrink-0 w-9 h-9 rounded-full bg-paper-2 border border-hairline flex items-center justify-center font-mono text-[11px] text-ink-faint tabular"
            aria-hidden
          >
            {String(i + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <p className="font-display text-[16px] sm:text-[17px] tracking-tight leading-snug">“{q}”</p>
            <p className="text-[12px] text-ink-faint mt-2 inline-flex items-center gap-1.5">
              <MessageSquareText className="w-3.5 h-3.5" aria-hidden />
              ChatGPT, Gemini veya Claude’a yazılan örnek soru
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
