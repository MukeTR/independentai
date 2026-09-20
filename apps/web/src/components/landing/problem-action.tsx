'use client';

import { ArrowDown, ArrowRight, Clock, Zap } from 'lucide-react';
import { Container } from '@/components/container';
import { Reveal } from '@/components/marketing/reveal';
import { useStory } from './story';

/**
 * Adım 3 · Bir bulgu, iş listesine nasıl dönüşür.
 * Kaydırıcı yerine doğrudan iki kolon: solda taramanın bulduğu sorun, sağda ondan çıkan sıralı işler.
 * Öneriler bugün araç bazında gelir; tek "iş listesi" ekranı yol haritasındadır.
 */
const TASKS = [
  { n: '01', t: 'Hizmet sayfasını soruya cevap verecek biçimde yeniden yapılandır', meta: '15 dk', icon: Clock },
  { n: '02', t: 'Karşılaştırma içeriği oluştur', meta: 'Yüksek öncelik', icon: Zap },
  { n: '03', t: 'Marka entity sinyallerini güçlendir', meta: 'Yüksek öncelik', icon: Zap },
  { n: '04', t: '4 kaynakta (dizin, karşılaştırma) yer edinin', meta: 'Orta öncelik', icon: Zap },
];

export function ProblemAction() {
  const { domain } = useStory();

  return (
    <section className="py-20 lg:py-28 border-t border-hairline bg-paper-2">
      <Container>
        <Reveal>
          <div className="eyebrow text-brand-deep">Adım 3 · Sorun → iş listesi</div>
          <h2 className="font-display text-[34px] lg:text-[48px] tracking-tight mt-3 max-w-3xl leading-[1.05]">
            Yanıt sadece skor vermez. <span className="text-brand">Nedenini ve ne yapılacağını söyler.</span>
          </h2>
          <p className="text-[16px] lg:text-[18px] text-ink-muted mt-5 max-w-2xl leading-relaxed">
            Taramada çıkan tek bir bulgunun, sıralı işlere nasıl döndüğü aşağıda. Aşağıdaki örnek temsilidir; sizin
            listeniz kendi taramanızdan çıkar.
          </p>
        </Reveal>

        <Reveal delay={110}>
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-[1fr_auto_1.1fr] gap-6 items-stretch">
            {/* Sol: bulgu */}
            <div className="card p-7 lg:p-8 h-full">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="chip comp !text-[10.5px]">Bulduk</span>
                <span className="chip !text-[10px]">temsili</span>
              </div>
              <p className="font-display text-[21px] lg:text-[23px] mt-4 leading-snug">
                “En iyi pazaryeri yönetim ajansı” sorgusunda markanız görünmüyor.
              </p>
              <div className="mt-6">
                <div className="eyebrow">Sebep</div>
                <p className="mt-1.5 text-[14px] text-ink-muted leading-relaxed">
                  <span className="font-mono text-ink">{domain}/pazaryeri-yonetimi</span> sayfasının konu otoritesi
                  yetersiz; soruya doğrudan cevap veren bir bölüm yok.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
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

            {/* Ok — masaüstünde yatay, mobilde dikey */}
            <div className="flex lg:flex-col items-center justify-center gap-3" aria-hidden>
              <span className="hidden lg:block w-px flex-1 bg-hairline" />
              <span className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center shrink-0">
                <ArrowRight className="w-4 h-4 hidden lg:block" />
                <ArrowDown className="w-4 h-4 lg:hidden" />
              </span>
              <span className="hidden lg:block w-px flex-1 bg-hairline" />
            </div>

            {/* Sağ: işler */}
            <div className="card p-7 lg:p-8 h-full">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="chip own !text-[10.5px]">Yapılacaklar</span>
                <span className="chip !text-[10px]">temsili</span>
                <span className="chip !text-[10px]">tek ekran: yakında</span>
              </div>
              <ol className="mt-5 space-y-2.5">
                {TASKS.map((t) => (
                  <li
                    key={t.n}
                    className="flex items-center gap-4 rounded-xl border border-hairline bg-paper-2 px-4 py-3"
                  >
                    <span className="font-mono text-[11px] text-brand-deep shrink-0">{t.n}</span>
                    <span className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <span className="text-[14px] text-ink flex-1 leading-snug">{t.t}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-ink-faint font-mono whitespace-nowrap">
                        <t.icon className="w-3 h-3" aria-hidden /> {t.meta}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="text-[12.5px] text-ink-faint mt-5 leading-relaxed">
                Her maddede “nasıl yapılır” rehberi vardır. Bugün öneriler araç bazında gelir; tek “iş listesi” ekranı
                yol haritasındadır.
              </p>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
