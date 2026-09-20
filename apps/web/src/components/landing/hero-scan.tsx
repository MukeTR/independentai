'use client';

import Link from 'next/link';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { ArrowRight, Check, Loader2, Lock, AlertCircle } from 'lucide-react';
import { Container } from '@/components/container';
import { cn } from '@/lib/cn';
import { DEMO } from './demo';
import { BlockedSiteHintSlot, useStory } from './story';

/** Gerçek denetimin (geo-audit) ölçtüğü beş boyut — hem demo hem canlı taramada aynı sırayla akar. */
const STEPS = [
  { key: 'technical', label: 'Site yapısı' },
  { key: 'answerFirst', label: 'İçerik' },
  { key: 'aiComprehension', label: 'Marka sinyalleri' },
  { key: 'citationAuthority', label: 'Kaynaklar' },
  { key: 'freshness', label: 'Güncellik' },
] as const;

/** Yalnızca kayıtlı panelde çalışan iki adım: demo'da ✓, canlı taramada kilitli görünür. */
const PANEL_STEPS = ['Satın alma soruları', 'Rakipler'] as const;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function HeroScan() {
  const { scan, startScan, heroRef, live, domain, score, opportunities } = useStory();
  const [input, setInput] = useState('');
  const inputId = useId();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    startScan(input);
  };

  return (
    <section ref={heroRef} className="relative pt-20 lg:pt-28 pb-16 lg:pb-24 overflow-hidden scroll-mt-16">
      <div className="aurora-bg" aria-hidden />
      <Container className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Sol — sonucu sat */}
          <div className="lg:col-span-6">
            <div className="rise-1 inline-flex items-center gap-2 chip own">
              <span className="w-1.5 h-1.5 rounded-full bg-brand pulse-dot" />
              <span className="font-mono tracking-eyebrow">Analiz → Düzelt → Ölç</span>
            </div>
            <h1 className="rise-2 font-display text-[42px] sm:text-[56px] lg:text-[68px] leading-[0.98] tracking-tight mt-7">
              Müşteriniz yapay zekâya soruyor. <span className="text-shimmer">Sizi mi öneriyor, rakibinizi mi?</span>
            </h1>
            <p className="rise-3 text-[17px] lg:text-[19px] text-ink-muted mt-7 max-w-xl leading-relaxed">
              Satın almadan önce sorduğu sorularda ChatGPT, Gemini ve Claude kimi öneriyor? Yanıt ölçer.{' '}
              <span className="text-ink">Rakibiniz öneriliyorsa nedenini gösterir.</span>{' '}
              <span className="text-ink">Nasıl düzelteceğinizi verir.</span> Yapmak istemezseniz biz yaparız.
            </p>

            <form onSubmit={onSubmit} className="rise-4 mt-9 max-w-xl" aria-label="Sitenizi analiz edin">
              <label htmlFor={inputId} className="sr-only">
                Web sitenizin adresi
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5 p-1.5 rounded-2xl bg-paper-3/70 border border-hairline glow-ring">
                <input
                  id={inputId}
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  spellCheck={false}
                  placeholder="https://sirketiniz.com"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="input !bg-transparent !border-0 !rounded-xl flex-1 !text-[15px] font-mono"
                  disabled={scan.status === 'running'}
                />
                <button
                  type="submit"
                  disabled={scan.status === 'running'}
                  className="btn-primary inline-flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60"
                >
                  {scan.status === 'running' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Analiz ediliyor
                    </>
                  ) : (
                    <>
                      Sitemi analiz et <ArrowRight className="w-4 h-4" aria-hidden />
                    </>
                  )}
                </button>
              </div>
              {scan.status === 'error' && scan.error && (
                <p role="alert" className="mt-3 flex items-start gap-2 text-[13px] text-danger">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden /> {scan.error}
                </p>
              )}
              <BlockedSiteHintSlot domain={scan.domain} />
              <p className="mt-3 text-[12.5px] text-ink-faint">
                Kayıt gerekmez · sonuç 10–20 saniyede · sayfanız yalnızca okunur
              </p>
            </form>

            <p className="rise-5 mt-6 text-[14px] text-ink-muted">
              Ya da bizim yapmamızı ister misiniz?{' '}
              <Link href="/yanit-agency" className="text-brand-deep hover:text-brand inline-flex items-center gap-1">
                Yanıt Agency <ArrowRight className="w-3.5 h-3.5" aria-hidden />
              </Link>{' '}
              <span className="text-ink-faint">· teklifle</span>
            </p>
          </div>

          {/* Sağ — canlı analiz animasyonu */}
          <div className="lg:col-span-6 rise-5">
            <Scanner
              key={scan.run}
              mode={scan.status}
              domain={domain}
              score={score}
              opportunities={opportunities}
              live={live}
            />
          </div>
        </div>
      </Container>
    </section>
  );
}

function Scanner({
  mode,
  domain,
  score,
  opportunities,
  live,
}: {
  mode: 'demo' | 'running' | 'done' | 'error';
  domain: string;
  score: number;
  opportunities: number;
  live: boolean;
}) {
  const total = STEPS.length;
  // SSR/no-JS: nihai demo durumu görünür (crawler ve ekran okuyucu gerçek içeriği görür).
  const [progress, setProgress] = useState<number>(total);
  const [showResult, setShowResult] = useState(mode !== 'running');

  useEffect(() => {
    if (mode === 'error') return;
    if (mode === 'done') {
      setProgress(total);
      const t = setTimeout(() => setShowResult(true), 250);
      return () => clearTimeout(t);
    }
    if (prefersReducedMotion()) {
      setProgress(mode === 'running' ? total - 1 : total);
      setShowResult(mode !== 'running');
      return;
    }
    // demo: 0 → 5 adım, sonra sonuç; running: 0 → 4, son adım cevap gelene dek bekler
    setProgress(0);
    setShowResult(false);
    const cap = mode === 'running' ? total - 1 : total;
    const every = mode === 'running' ? 700 : 430;
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setProgress(Math.min(i, cap));
      if (i >= cap) clearInterval(iv);
    }, every);
    let done: ReturnType<typeof setTimeout> | undefined;
    if (mode === 'demo') done = setTimeout(() => setShowResult(true), every * total + 350);
    return () => {
      clearInterval(iv);
      if (done) clearTimeout(done);
    };
  }, [mode, total]);

  const scanning = !showResult;
  const tone = score < 40 ? 'text-danger' : score < 70 ? 'text-warning' : 'text-positive';

  return (
    <div
      className="card relative overflow-hidden p-5 sm:p-6 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)]"
      aria-live="polite"
      aria-label={live ? `${domain} analiz sonucu` : 'Örnek analiz akışı (temsili veri)'}
    >
      {scanning && <span className="scanline" aria-hidden />}

      {/* Tarayıcı çubuğu */}
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-paper-4" />
          <span className="w-2 h-2 rounded-full bg-paper-4" />
          <span className="w-2 h-2 rounded-full bg-paper-4" />
          <span className="text-[11.5px] text-ink-faint font-mono ml-3 truncate">{domain}</span>
        </div>
        <span
          className={cn('text-[10px] font-mono tracking-wider uppercase', live ? 'text-brand-deep' : 'text-ink-faint')}
        >
          {live ? 'canlı sonuç' : mode === 'running' ? 'taranıyor' : 'temsili'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
        {/* Adımlar */}
        <ol className="space-y-2.5" aria-label="Tarama adımları">
          <li className="text-[11px] font-mono text-ink-faint tracking-wider uppercase mb-3">
            {scanning ? 'tarama başladı' : 'tarama tamamlandı'}
          </li>
          {STEPS.map((s, i) => {
            const state = i < progress ? 'done' : i === progress && scanning ? 'active' : 'pending';
            return (
              <li
                key={s.key}
                className={cn('flex items-center gap-2.5 text-[14px]', state !== 'pending' && 'step-in')}
                style={{ opacity: state === 'pending' ? 0.35 : 1 }}
              >
                <span
                  className={cn(
                    'w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0 border',
                    state === 'done' && 'bg-brand-glow border-brand/50 text-brand-deep',
                    state === 'active' && 'border-brand/60 text-brand',
                    state === 'pending' && 'border-hairline text-ink-faint',
                  )}
                >
                  {state === 'done' ? (
                    <Check className="w-3 h-3" aria-hidden />
                  ) : state === 'active' ? (
                    <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-current" />
                  )}
                </span>
                <span className={state === 'done' ? 'text-ink' : 'text-ink-muted'}>{s.label}</span>
                <span className="sr-only">
                  {state === 'done' ? ' tamamlandı' : state === 'active' ? ' devam ediyor' : ''}
                </span>
              </li>
            );
          })}
          {PANEL_STEPS.map((label) => (
            <li
              key={label}
              className="flex items-center gap-2.5 text-[14px]"
              style={{ opacity: live ? 0.7 : progress >= total ? 1 : 0.35 }}
            >
              <span
                className={cn(
                  'w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0 border',
                  live
                    ? 'border-hairline text-ink-faint'
                    : progress >= total
                      ? 'bg-brand-glow border-brand/50 text-brand-deep'
                      : 'border-hairline text-ink-faint',
                )}
              >
                {live ? (
                  <Lock className="w-2.5 h-2.5" aria-hidden />
                ) : progress >= total ? (
                  <Check className="w-3 h-3" aria-hidden />
                ) : (
                  <span className="w-1 h-1 rounded-full bg-current" />
                )}
              </span>
              <span className={live ? 'text-ink-faint' : 'text-ink-muted'}>{label}</span>
              {live && <span className="text-[10.5px] font-mono text-ink-faint ml-auto">panelde</span>}
            </li>
          ))}
        </ol>

        {/* Sonuç */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-hairline bg-paper-2/60 p-5 min-h-[220px]">
          {showResult ? (
            <>
              <ScoreRing score={score} tone={tone} />
              <div className="text-[11px] font-mono tracking-wider uppercase text-ink-faint mt-3">
                {live ? 'AI hazırlık skoru' : 'AI görünürlüğü'}
              </div>
              <div
                className="pop-mark mt-4 inline-flex items-center gap-2 chip comp !text-[12.5px] !py-1.5 !px-3"
                style={{ '--pop-delay': '300ms' } as React.CSSProperties}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                {opportunities} fırsat bulundu
              </div>
              {!live && (
                <dl
                  className="pop-mark mt-4 w-full text-[12px] space-y-1.5"
                  style={{ '--pop-delay': '520ms' } as React.CSSProperties}
                >
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-faint">Rakibiniz</dt>
                    <dd className="font-mono text-positive">{DEMO.competitor} / 100</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-faint">{DEMO.questions} satın alma sorusu</dt>
                    <dd className="font-mono text-danger">{DEMO.missing}’inde yoksunuz</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-faint">Kaçırılan fırsat</dt>
                    <dd className="font-mono text-warning">{DEMO.highIntent} yüksek niyetli soru</dd>
                  </div>
                </dl>
              )}
              {live && (
                <Link
                  href="/register"
                  className="mt-4 text-[12.5px] text-brand-deep hover:text-brand inline-flex items-center gap-1 text-center"
                >
                  AI cevapları ve rakipler için ücretsiz deneme hesabı{' '}
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden />
                </Link>
              )}
            </>
          ) : (
            <div className="text-center">
              <div className="font-display text-[40px] tabular text-ink-faint/60">
                <span className="pulse-dot">··</span>
              </div>
              <div className="text-[11px] font-mono tracking-wider uppercase text-ink-faint mt-2">
                {mode === 'running' ? `${domain} okunuyor` : 'hesaplanıyor'}
              </div>
              {mode === 'running' && (
                <p className="text-[12px] text-ink-faint mt-3 max-w-[200px] leading-relaxed">
                  Sayfa yapısı, içerik netliği, şema ve atıf sinyalleri kontrol ediliyor.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {mode === 'demo' && (
        <p className="mt-4 text-[11px] text-ink-faint">
          Temsili akış · {DEMO.domain} örnek şirkettir. Kendi adresinizi girin, gerçek sonucu görün.
        </p>
      )}
    </div>
  );
}

function ScoreRing({ score, tone }: { score: number; tone: string }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const target = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <div className="relative w-[120px] h-[120px]">
      <svg viewBox="0 0 110 110" className="w-full h-full -rotate-90" role="img" aria-label={`Skor ${score} / 100`}>
        <circle cx="55" cy="55" r={r} fill="none" stroke="var(--hairline)" strokeWidth="8" />
        <circle
          cx="55"
          cy="55"
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c}
          className="ring-draw"
          style={{ '--ring-target': `${target}` } as React.CSSProperties}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-display text-[34px] tabular leading-none', tone)}>{score}</span>
        <span className="text-[10.5px] font-mono text-ink-faint mt-1">/ 100</span>
      </div>
    </div>
  );
}
