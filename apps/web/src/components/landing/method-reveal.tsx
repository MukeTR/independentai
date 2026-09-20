import Link from 'next/link';
import { ArrowDown, ArrowRight, ExternalLink } from 'lucide-react';
import { Container } from '@/components/container';
import { Reveal } from '@/components/marketing/reveal';

const SOURCES = [
  { url: 'ecommercedergisi.com', auth: 78, how: 'Editör e-postası', content: 'Uzman görüşü / röportaj' },
  { url: 'pazaryeriblog.net', auth: 64, how: 'Konuk yazı formu', content: 'Vaka analizi' },
  { url: 'girisimciyiz.org', auth: 59, how: 'LinkedIn DM', content: 'Kurucu profili + liste girişi' },
];

export function MethodReveal() {
  return (
    <section className="py-20 lg:py-28 border-t border-hairline bg-paper-2/40">
      <Container>
        <Reveal>
          <div className="eyebrow text-brand-deep">Adım 6 · Yöntem açık</div>
          <h2 className="font-display text-[34px] lg:text-[48px] tracking-tight mt-3 max-w-3xl leading-[1.05]">
            Sırrımız yok. <span className="accent-text">Sistemimiz var.</span>
          </h2>
          <p className="text-[16px] lg:text-[18px] text-ink-muted mt-5 max-w-2xl leading-relaxed">
            Nasıl yaptığımızı saklamıyoruz. Ne bulduğumuzu, nedenini ve tam olarak nasıl düzeltileceğini görürsünüz.
            Sonra kimin uğraşacağına siz karar verirsiniz.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-4 items-stretch">
          <Reveal>
            <div className="card p-7 h-full">
              <div className="font-mono text-[11px] tracking-eyebrow text-brand">01 — Ne bulduk?</div>
              <p className="font-display text-[20px] mt-4 leading-snug">
                AI cevaplarında rakipleriniz şu kaynaklar nedeniyle sizden daha görünür.
              </p>
              <div className="mt-6 space-y-2">
                {['Rakip A', 'Rakip B', 'Siz'].map((n, i) => (
                  <div key={n} className="flex items-center gap-3 text-[13px]">
                    <span className={`w-16 shrink-0 ${i === 2 ? 'text-ink' : 'text-ink-muted'}`}>{n}</span>
                    <span className="flex-1 h-2 rounded-full bg-paper-4 overflow-hidden">
                      <span
                        className={`block h-full rounded-full ${i === 2 ? 'bg-danger' : 'accent-grad'}`}
                        style={{ width: i === 0 ? '82%' : i === 1 ? '61%' : '18%' }}
                      />
                    </span>
                    <span className="font-mono text-[11px] text-ink-faint w-8 text-right">
                      {i === 0 ? '82' : i === 1 ? '61' : '18'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="lg:hidden mt-6 text-ink-faint">
                <ArrowDown className="w-4 h-4" aria-hidden />
              </div>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div className="card p-7 h-full">
              <div className="font-mono text-[11px] tracking-eyebrow text-brand">02 — Neden?</div>
              <p className="font-display text-[20px] mt-4 leading-snug">
                Rakibiniz 14 güçlü citation'a sahip. Sizde 3 tane var.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-hairline p-4">
                  <div className="eyebrow">Rakip</div>
                  <div className="font-display text-[36px] tabular mt-1">14</div>
                  <div className="text-[12px] text-ink-faint">güçlü kaynak</div>
                </div>
                <div className="rounded-xl border border-danger/30 p-4">
                  <div className="eyebrow">Siz</div>
                  <div className="font-display text-[36px] tabular text-danger mt-1">3</div>
                  <div className="text-[12px] text-ink-faint">güçlü kaynak</div>
                </div>
              </div>
              <p className="text-[13px] text-ink-muted mt-5 leading-relaxed">
                Modeller cevap üretirken güvendiği sitelere bakar. O sitelerde yoksanız, cevapta da yoksunuz.
              </p>
              <div className="lg:hidden mt-6 text-ink-faint">
                <ArrowDown className="w-4 h-4" aria-hidden />
              </div>
            </div>
          </Reveal>

          <Reveal delay={180}>
            <div className="card grad-border p-7 h-full">
              <div className="font-mono text-[11px] tracking-eyebrow text-brand">03 — Nasıl düzeltilir?</div>
              <p className="font-display text-[20px] mt-4 leading-snug">Bu 11 kaynağa girin. Her biri için:</p>
              <ul className="mt-5 space-y-2.5">
                {SOURCES.map((s) => (
                  <li key={s.url} className="rounded-xl border border-hairline bg-paper-2/70 p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[12.5px] text-ink inline-flex items-center gap-1.5">
                        <ExternalLink className="w-3 h-3 text-ink-faint" aria-hidden /> {s.url}
                      </span>
                      <span className="chip own !text-[10px]">otorite {s.auth}</span>
                    </div>
                    <div className="mt-2 text-[12px] text-ink-muted">
                      {s.how} · {s.content}
                    </div>
                    <div className="mt-1.5 text-[11.5px] text-brand-deep inline-flex items-center gap-1">
                      Outreach örneği <ArrowRight className="w-3 h-3" aria-hidden />
                    </div>
                  </li>
                ))}
                <li className="text-[12px] text-ink-faint font-mono pl-1">+ 8 kaynak daha</li>
              </ul>
            </div>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <div className="mt-12 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <p className="font-display text-[22px] lg:text-[26px] tracking-tight">Kendiniz yapabilirsiniz.</p>
            <p className="font-display text-[22px] lg:text-[26px] tracking-tight text-ink-muted">
              Ya da{' '}
              <Link href="/contact#sales" className="accent-text hover:opacity-80">
                bize bırakabilirsiniz.
              </Link>
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
