'use client';

import { useId, useState } from 'react';
import { ArrowRight, Clock, Zap } from 'lucide-react';
import { Container } from '@/components/container';
import { Reveal } from '@/components/marketing/reveal';
import { useStory } from './story';

/** Temsili örnek: bulgular ve öneriler gerçek panelde araç bazında gelir; tek "iş listesi" ekranı yakında. */
const TASKS = [
  { n: '01', t: 'Hizmet sayfasını soruya cevap verecek biçimde yeniden yapılandır', meta: '15 dk', icon: Clock },
  { n: '02', t: 'Karşılaştırma içeriği oluştur', meta: 'Yüksek öncelik', icon: Zap },
  { n: '03', t: 'Marka entity sinyallerini güçlendir', meta: 'Yüksek öncelik', icon: Zap },
  { n: '04', t: '4 kaynakta (dizin, karşılaştırma) yer edinin', meta: 'Orta öncelik', icon: Zap },
];

function Found({ domain }: { domain: string }) {
  return (
    <div className="p-7 lg:p-9 h-full md:w-1/2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="chip comp !text-[10.5px]">Bulduk</div>
        <span className="chip !text-[10px]">temsili</span>
      </div>
      <p className="font-display text-[20px] lg:text-[24px] mt-4 leading-snug max-w-lg">
        “En iyi pazaryeri yönetim ajansı” sorgusunda markanız görünmüyor.
      </p>
      <div className="mt-6 text-[14px]">
        <div className="eyebrow">Sebep</div>
        <p className="mt-1 text-ink-muted max-w-md">
          <span className="font-mono text-ink">{domain}/pazaryeri-yonetimi</span> sayfasının konu otoritesi yetersiz.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-6 max-w-md">
        <div className="rounded-xl border border-hairline p-4">
          <div className="eyebrow">Rakip</div>
          <div className="font-display text-[32px] tabular text-positive mt-1">%72</div>
          <div className="text-[12px] text-ink-faint">görünürlük</div>
        </div>
        <div className="rounded-xl border border-danger/30 p-4">
          <div className="eyebrow">Siz</div>
          <div className="font-display text-[32px] tabular text-danger mt-1">%18</div>
          <div className="text-[12px] text-ink-faint">görünürlük</div>
        </div>
      </div>
    </div>
  );
}

function Todo() {
  return (
    <div className="p-7 lg:p-9 h-full md:w-1/2 md:ml-auto">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="chip own !text-[10.5px]">Yapılacaklar</div>
        <span className="chip !text-[10px]">yakında · temsili</span>
      </div>
      <ol className="mt-5 space-y-2.5 max-w-xl">
        {TASKS.map((t) => (
          <li key={t.n} className="flex items-center gap-4 rounded-xl border border-hairline bg-paper-2/70 px-4 py-3">
            <span className="font-mono text-[11px] text-brand-deep">{t.n}</span>
            <span className="text-[14px] text-ink flex-1 leading-snug">{t.t}</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-ink-faint font-mono whitespace-nowrap">
              <t.icon className="w-3 h-3" aria-hidden /> {t.meta}
            </span>
            <span className="inline-flex items-center gap-1 text-[12px] text-brand-deep whitespace-nowrap">
              Nasıl yapılır <ArrowRight className="w-3 h-3" aria-hidden />
            </span>
          </li>
        ))}
      </ol>
      <p className="text-[12.5px] text-ink-faint mt-5">
        Bugün öneriler araç bazında gelir; tek “iş listesi” ekranı yol haritasında.
      </p>
    </div>
  );
}

export function ProblemAction() {
  const { domain } = useStory();
  const [pos, setPos] = useState(50);
  const id = useId();

  return (
    <section className="py-20 lg:py-28 border-t border-hairline bg-paper-2/40">
      <Container>
        <Reveal>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="eyebrow text-brand-deep">Adım 3 · Sorun → Aksiyon</div>
            <span className="chip !text-[10.5px]">Yapılacaklar · yakında</span>
          </div>
          <h2 className="font-display text-[34px] lg:text-[48px] tracking-tight mt-3 max-w-3xl leading-[1.05]">
            Yanıt sadece skor vermez. <span className="accent-text">Nedenini ve ne yapılacağını söyler.</span>
          </h2>
          <p className="text-[16px] lg:text-[18px] text-ink-muted mt-5 max-w-2xl leading-relaxed">
            Kaydırıcıyı çekin: solda ne bulduk, sağda ne yapılacak. Her önerinin yanında “nasıl yapılır” var. Örnek
            temsilidir; gerçek bulgular sitenizin taramasından gelir.
          </p>
        </Reveal>

        <Reveal delay={120}>
          {/* Mobil: iki panel alt alta */}
          <div className="mt-12 md:hidden card overflow-hidden divide-y divide-hairline">
            <Found domain={domain} />
            <Todo />
          </div>

          {/* md+: katmanlı before/after */}
          <div className="mt-12 hidden md:block card relative overflow-hidden select-none">
            <div className="relative">
              <Found domain={domain} />
              <div className="absolute inset-0 bg-paper-3" style={{ clipPath: `inset(0 0 0 ${pos}%)` }} aria-hidden>
                <Todo />
              </div>
              <div
                className="absolute inset-y-0 w-px bg-brand/80 pointer-events-none"
                style={{ left: `${pos}%` }}
                aria-hidden
              >
                <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full accent-grad text-white text-[13px] flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(139,92,246,0.9)]">
                  ⇆
                </span>
              </div>
            </div>
            <label htmlFor={id} className="sr-only">
              Bulduk ve yapılacaklar arasında geçiş
            </label>
            <input
              id={id}
              type="range"
              min={20}
              max={80}
              value={pos}
              onChange={(e) => setPos(Number(e.target.value))}
              className="ba-handle absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
              aria-valuetext={pos < 50 ? 'Yapılacaklar ağırlıklı' : 'Bulduk ağırlıklı'}
            />
            {/* Ekran okuyucu: örtülü panel de okunsun */}
            <div className="sr-only">
              <Todo />
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
