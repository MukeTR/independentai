import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/container';
import { Reveal } from '@/components/marketing/reveal';
import { cn } from '@/lib/cn';
import { CEO_SCREEN } from './demo';

const TONE: Record<string, string> = { danger: 'text-danger', brand: 'text-brand-deep', positive: 'text-positive' };

const PIPE = [
  'Satın alma niyetli sorular',
  'ChatGPT · Gemini · Claude',
  'Siz mi, rakibiniz mi?',
  'Neden + yapılacaklar',
];

/** GEO/AEO/LLMO değil: yöneticinin ekranında dört sayı. */
export function CeoScreen() {
  return (
    <section className="py-16 lg:py-20 border-b border-hairline bg-paper-2/40">
      <Container>
        <Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-5">
              <div className="eyebrow text-brand-deep">GEO, AEO, LLMO değil</div>
              <h2 className="font-display text-[30px] lg:text-[38px] tracking-tight mt-3 leading-[1.05]">
                Ekranınızda dört sayı olsun.
              </h2>
              <p className="text-[15px] text-ink-muted mt-4 leading-relaxed">
                Markanızı rastgele promptlarda değil, müşterilerinizin satın almadan önce sorduğu ticari niyetli
                sorularda ölçeriz. Sektörünüze göre soru önerileri + kendi eklediğiniz gerçek müşteri soruları.
              </p>
              <ol className="mt-5 flex flex-wrap items-center gap-2 text-[12px] font-mono text-ink-faint">
                {PIPE.map((p, i) => (
                  <li key={p} className="inline-flex items-center gap-2">
                    <span className="text-ink-muted">{p}</span>
                    {i < PIPE.length - 1 && <ArrowRight className="w-3 h-3" aria-hidden />}
                  </li>
                ))}
              </ol>
            </div>
            <div
              className="lg:col-span-7 grid grid-cols-2 lg:grid-cols-4 gap-3"
              aria-label="Örnek yönetici ekranı (temsili)"
            >
              {CEO_SCREEN.map((c) => (
                <div key={c.l} className="card p-5">
                  <div
                    className={cn(
                      'font-display text-[40px] lg:text-[46px] tabular leading-none',
                      TONE[(c as { tone?: string }).tone ?? ''] ?? 'text-ink',
                    )}
                  >
                    {c.v}
                  </div>
                  <div className="text-[12.5px] text-ink-muted mt-2 leading-snug">{c.l}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
