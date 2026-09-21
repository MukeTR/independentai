'use client';

import { useEffect, useRef, useState } from 'react';
import { Container } from '@/components/container';
import { Reveal } from '@/components/marketing/reveal';
import { cn } from '@/lib/cn';

const QUESTION = "Türkiye'deki iyi pazaryeri danışmanlık ajansları hangileri?";
const ANSWER =
  'Türkiye’de pazaryeri danışmanlığı için öne çıkan birkaç ajans var. Rakip A, Trendyol ve Hepsiburada mağaza yönetiminde deneyimli; Rakip B özellikle reklam optimizasyonuyla biliniyor; Rakip C ise küçük satıcılara yönelik paketleriyle dikkat çekiyor. Seçim yaparken referanslarına ve raporlama düzenine bakmanızı öneririm.';
const BRANDS = ['Rakip A', 'Rakip B', 'Rakip C'];

function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function AiChatDemo() {
  // SSR: tam cevap görünür (crawler). Hydration sonrası görünür alana girince yazma animasyonu oynar.
  const [typed, setTyped] = useState(ANSWER.length);
  const [ran, setRan] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || ran) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setRan(true);
        setTyped(0);
        let i = 0;
        const iv = setInterval(() => {
          i += 2;
          setTyped(Math.min(i, ANSWER.length));
          if (i >= ANSWER.length) clearInterval(iv);
        }, 18);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ran]);

  const visible = ANSWER.slice(0, typed);
  const done = typed >= ANSWER.length;

  return (
    <section className="py-20 lg:py-28 border-t border-hairline bg-paper-2">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-5 order-2 lg:order-1">
            <Reveal>
              <div className="eyebrow text-brand-deep">Adım 8 · Görünmüyorsunuz</div>
              <h2 className="font-display text-[34px] lg:text-[44px] tracking-tight mt-3 leading-[1.05]">
                Yapay zekâ sizin hakkınızda <span className="accent-text">ne biliyor?</span>
              </h2>
              <p className="text-[16px] text-ink-muted mt-5 leading-relaxed">
                Bu soru satın alma niyetli. Cevapta üç isim geçiyor, müşteri yalnızca onları araştırıyor. Sizinki yoksa
                o talep rakibe gidiyor.
              </p>
              <p className="font-display text-[20px] mt-6">Yanıt size bunun nedenini gösterir.</p>
            </Reveal>
          </div>

          <div className="lg:col-span-7 order-1 lg:order-2">
            <Reveal delay={80}>
              <div ref={ref} className="card p-5 sm:p-6 card-raised" aria-label="Örnek yapay zekâ sohbeti (temsili)">
                <div className="flex items-center justify-between border-b border-hairline pb-3">
                  <span className="text-[11.5px] font-mono text-ink-faint">sohbet · temsili</span>
                  <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-ink-faint">
                    gpt · gemini · claude
                  </span>
                </div>

                <div className="mt-5 flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-paper-4 px-4 py-3 text-[14px] leading-relaxed">
                    {QUESTION}
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <span className="w-7 h-7 rounded-full accent-grad shrink-0 mt-1" aria-hidden />
                  <div className="max-w-[90%] text-[14px] leading-relaxed text-ink-muted">
                    <p className={cn(!done && 'caret')} aria-live="off">
                      <Highlighted text={visible} />
                    </p>
                    <p className="sr-only">{ANSWER}</p>
                  </div>
                </div>

                <div
                  className={cn(
                    'mt-6 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 flex items-center gap-3 transition-opacity duration-500',
                    done ? 'opacity-100' : 'opacity-0',
                  )}
                  aria-hidden={!done}
                >
                  <span className="w-2 h-2 rounded-full bg-danger" />
                  <span className="text-[14px] text-ink">Siz bu yanıtta yoksunuz.</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}

/** Rakip adlarını cevap içinde vurgular. */
function Highlighted({ text }: { text: string }) {
  const re = new RegExp(`(${BRANDS.join('|')})`, 'g');
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        BRANDS.includes(p) ? (
          <span key={i} className="text-ink font-medium border-b border-brand/50">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
