'use client';

import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/container';
import { useStory } from './story';

/** Kapanış: canlı tarama + teklif satırı (OFFER, sayfa getOffer() ile geçer) + Yanıt Agency yolu. */
export function FinalCta({ trialDays, saasMonthlyTry }: { trialDays: number; saasMonthlyTry: string }) {
  const { startScan } = useStory();
  const [input, setInput] = useState('');
  const id = useId();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    startScan(input);
  };

  return (
    <section className="relative py-24 lg:py-32 overflow-hidden border-t border-hairline">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(60% 70% at 50% 100%, rgba(37,99,235,0.10), transparent 70%), radial-gradient(40% 50% at 80% 0%, rgba(37,99,235,0.05), transparent 70%)',
        }}
        aria-hidden
      />
      <Container className="relative">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-[40px] lg:text-[60px] tracking-tight leading-[1.02]">
            Önce nerede olduğunuzu görelim.
          </h2>
          <p className="text-[17px] lg:text-[19px] text-ink-muted mt-6 leading-relaxed">
            URL’nizi girin. Yanıt markanızı, rakiplerinizi ve AI görünürlüğünüzü analiz etsin.
          </p>
          <form onSubmit={onSubmit} className="mt-9 max-w-xl mx-auto" aria-label="Analizi başlat">
            <label htmlFor={id} className="sr-only">
              Web sitenizin adresi
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5 p-1.5 rounded-2xl bg-paper-3/80 border border-hairline glow-ring">
              <input
                id={id}
                type="text"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                placeholder="şirketiniz.com"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="input !bg-transparent !border-0 !rounded-xl flex-1 !text-[15px] font-mono"
              />
              <button
                type="submit"
                className="btn-primary inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                Analizi başlat <ArrowRight className="w-4 h-4" aria-hidden />
              </button>
            </div>
          </form>
          <p className="mt-4 text-[12px] text-ink-faint font-mono">
            Tarama ücretsiz · hesap yok · sürekli ölçüm {saasMonthlyTry}/ay, {trialDays} gün deneme, kart yok
          </p>
          <p className="mt-6 text-[14px] text-ink-muted">
            Uygulamak istemiyor musunuz?{' '}
            <Link href="/yanit-agency" className="text-brand-deep hover:text-brand">
              Yanıt Agency sizin için yapabilir.
            </Link>{' '}
            <span className="text-ink-faint">(teklifle)</span>
          </p>
        </div>
      </Container>
    </section>
  );
}
