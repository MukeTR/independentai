import { Marquee } from '@/components/marketing/marquee';
import { Container } from '@/components/container';
import { BUYER_QUESTIONS } from './demo';

/** Müşterilerin satın almadan önce yapay zekâya sorduğu türden sorular — sektör kapsamı, FOMO. */
export function BuyerQuestions() {
  return (
    <div className="py-8 border-b border-hairline">
      <Container>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-5">
          <p className="text-[14px] text-ink-muted">
            <span className="text-ink">Müşterileriniz bunları soruyor.</span> Cevapta kim var?
          </p>
          <p className="text-[12px] text-ink-faint">TÜİK 2025: bireylerin %19,2’si üretken yapay zekâ kullandı.</p>
        </div>
      </Container>
      <Marquee>
        {BUYER_QUESTIONS.map((q) => (
          <span
            key={q}
            className="mx-3 inline-flex items-center gap-2 rounded-full border border-hairline bg-paper-3/60 px-4 py-2 text-[13.5px] text-ink-muted whitespace-nowrap"
          >
            <span className="w-1.5 h-1.5 rounded-full accent-grad" /> {q}
          </span>
        ))}
      </Marquee>
    </div>
  );
}
