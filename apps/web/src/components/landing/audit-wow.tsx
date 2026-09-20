'use client';

import { Container } from '@/components/container';
import { Reveal } from '@/components/marketing/reveal';
import { cn } from '@/lib/cn';
import type { AuditFinding } from '@/server/geo-audit';
import { useStory } from './story';

type Mark = { status: AuditFinding['status']; title: string; detail: string; fix?: string };

const DEMO_MARKS: Mark[] = [
  {
    status: 'fail',
    title: 'Marka açıklaması belirsiz',
    detail: 'ChatGPT şirketinizin ne yaptığını doğru anlamıyor.',
    fix: 'İlk 100 kelimede "ne yapar, kim için, neden farklı" cümlesi.',
  },
  {
    status: 'warn',
    title: 'Karşılaştırma içeriği eksik',
    detail: 'Rakipleriniz bu sorgularda kaynak gösteriliyor.',
    fix: '"X vs Y" ve "en iyi …" formatında karşılaştırma sayfaları.',
  },
  { status: 'pass', title: 'Schema doğru', detail: 'Organization ve Service şemaları geçerli.' },
  {
    status: 'fail',
    title: '3 kritik satın alma sorusunda görünmüyorsunuz',
    detail: '"En iyi …", "… fiyatları", "… önerir misin" sorularında marka yok.',
    fix: 'Her soru için cevap-önce (answer-first) sayfa.',
  },
];

const DOT: Record<AuditFinding['status'], string> = {
  fail: 'bg-danger',
  warn: 'bg-warning',
  pass: 'bg-positive',
};
const TONE: Record<AuditFinding['status'], string> = {
  fail: 'border-danger/40',
  warn: 'border-warning/40',
  pass: 'border-positive/40',
};

/** Canlı bulguları işarete çevir: 3 fail/warn + 1 pass (varsa) → sayfada dört rozet. */
function toMarks(findings: AuditFinding[]): Mark[] {
  const bad = findings.filter((f) => f.status !== 'pass').slice(0, 3);
  const good = findings.find((f) => f.status === 'pass');
  return [...bad, ...(good ? [good] : [])].map((f) => ({
    status: f.status,
    title: f.title,
    detail: f.detail,
    fix: f.fix,
  }));
}

export function AuditWow() {
  const { live, domain, findings, opportunities } = useStory();
  const marks = live && findings ? toMarks(findings) : DEMO_MARKS;

  return (
    <section id="analiz" className="py-20 lg:py-28 border-t border-hairline">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-7">
            <Reveal>
              <BrowserMock domain={domain} marks={marks} live={live} />
            </Reveal>
          </div>
          <div className="lg:col-span-5">
            <Reveal delay={100}>
              <div className="eyebrow text-brand-deep">Adım 2 · {opportunities} fırsat bulundu</div>
              <h2 className="font-display text-[34px] lg:text-[44px] tracking-tight mt-3 leading-[1.05]">
                Biz sadece problemi bulmuyoruz.{' '}
                <span className="accent-text">Nasıl düzelteceğinizi de gösteriyoruz.</span>
              </h2>
              <p className="text-[16px] text-ink-muted mt-5 leading-relaxed">
                Her bulgu sayfanızın üzerinde, yerinde işaretlenir. Ne eksik, yapay zekâ bunu neden yanlış okuyor ve ilk
                hamle ne olmalı, hepsi tek kartta.
              </p>
              <ul className="mt-7 space-y-3">
                {marks.slice(0, 3).map((m) => (
                  <li key={m.title} className="flex gap-3 text-[14px]">
                    <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', DOT[m.status])} />
                    <span>
                      <span className="text-ink">{m.title}.</span>{' '}
                      <span className="text-ink-muted">{m.fix ?? m.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}

function BrowserMock({ domain, marks, live }: { domain: string; marks: Mark[]; live: boolean }) {
  // Rozet konumları — sayfa iskeletinin üzerine dağılır (yüzde).
  const spots: React.CSSProperties[] = [
    { top: '14%', left: '6%' },
    { top: '42%', right: '4%' },
    { top: '64%', left: '8%' },
    { bottom: '6%', right: '6%' },
  ];

  return (
    <div className="card relative overflow-hidden card-raised" aria-label={`${domain} üzerinde işaretlenmiş bulgular`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-hairline">
        <span className="w-2 h-2 rounded-full bg-paper-4" />
        <span className="w-2 h-2 rounded-full bg-paper-4" />
        <span className="w-2 h-2 rounded-full bg-paper-4" />
        <span className="ml-3 text-[11.5px] font-mono text-ink-faint truncate">
          {domain} <span className="text-ink-faint/60">· analiz ediliyor…</span>
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-[0.08em] font-semibold text-ink-faint">
          {live ? 'canlı' : 'temsili'}
        </span>
      </div>

      {/* Sayfa iskeleti */}
      <div className="relative p-6 sm:p-8 min-h-[300px] sm:min-h-[420px]" aria-hidden>
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 rounded bg-paper-4" />
          <div className="flex gap-3">
            <div className="h-2.5 w-12 rounded bg-paper-4" />
            <div className="h-2.5 w-12 rounded bg-paper-4" />
            <div className="h-2.5 w-12 rounded bg-paper-4" />
          </div>
        </div>
        <div className="mt-10 h-7 w-3/4 rounded bg-paper-4" />
        <div className="mt-3 h-7 w-1/2 rounded bg-paper-4" />
        <div className="mt-5 space-y-2">
          <div className="h-2.5 w-11/12 rounded bg-paper-4" />
          <div className="h-2.5 w-10/12 rounded bg-paper-4" />
          <div className="h-2.5 w-7/12 rounded bg-paper-4" />
        </div>
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="h-24 rounded-lg bg-paper-4" />
          <div className="h-24 rounded-lg bg-paper-4" />
          <div className="h-24 rounded-lg bg-paper-4" />
        </div>
        <div className="mt-8 space-y-2">
          <div className="h-2.5 w-9/12 rounded bg-paper-4" />
          <div className="h-2.5 w-10/12 rounded bg-paper-4" />
          <div className="h-2.5 w-6/12 rounded bg-paper-4" />
        </div>

        {/* İşaretler — sm+ sayfa üzerinde konumlu */}
        {marks.map((m, i) => (
          <div
            key={m.title}
            className={cn(
              'pop-mark hidden sm:block absolute max-w-[268px] rounded-xl border bg-paper-3 px-4 py-3 shadow-[0_8px_24px_-12px_rgba(20,22,28,0.35)]',
              TONE[m.status],
            )}
            style={
              { ...spots[i % spots.length], ['--pop-delay' as string]: `${250 + i * 220}ms` } as React.CSSProperties
            }
          >
            <MarkBody m={m} />
          </div>
        ))}
      </div>

      {/* Mobil: işaretler iskeletin altında yığılır */}
      <div className="sm:hidden px-4 pb-4 -mt-24 space-y-2.5 relative" aria-hidden>
        {marks.map((m, i) => (
          <div
            key={m.title}
            className={cn('pop-mark rounded-xl border bg-paper-3 px-4 py-3', TONE[m.status])}
            style={{ ['--pop-delay' as string]: `${250 + i * 220}ms` } as React.CSSProperties}
          >
            <MarkBody m={m} />
          </div>
        ))}
      </div>

      {/* Ekran okuyucu için liste */}
      <ul className="sr-only">
        {marks.map((m) => (
          <li key={m.title}>
            {m.status === 'fail' ? 'Kritik' : m.status === 'warn' ? 'Uyarı' : 'Tamam'}: {m.title}. {m.detail}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MarkBody({ m }: { m: Mark }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <span className={cn('w-2 h-2 rounded-full shrink-0', DOT[m.status])} />
        <span className="text-[13px] font-medium text-ink leading-snug">{m.title}</span>
      </div>
      <p className="text-[12px] text-ink-muted mt-1.5 leading-relaxed">{m.detail}</p>
    </>
  );
}
