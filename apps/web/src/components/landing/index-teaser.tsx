import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/container';
import { Reveal } from '@/components/marketing/reveal';

const SECTORS = ['SaaS', 'E-ticaret altyapıları', 'Pazaryeri ajansları', 'Özel sağlık', 'Fintech', 'Eğitim'];
const ROWS = [
  { n: 'Marka A', v: 81 },
  { n: 'Marka B', v: 78 },
  { n: 'Marka C', v: 64 },
  { n: 'Marka D', v: 61 },
];

/** Türkiye AI Görünürlük Endeksi — aylık sektör sıralaması (hazırlanıyor; temsili örnek). */
export function IndexTeaser() {
  return (
    <section className="py-20 lg:py-24 border-t border-hairline bg-paper-2">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <Reveal>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="eyebrow text-brand-deep">Hazırlanıyor · her ay bir sektör</div>
                <span className="chip !text-[10.5px]">yakında · örnek tablo temsili</span>
              </div>
              <h2 className="font-display text-[32px] lg:text-[42px] tracking-tight mt-3 leading-[1.05]">
                Türkiye AI Görünürlük Endeksi
              </h2>
              <p className="text-[15.5px] text-ink-muted mt-4 leading-relaxed max-w-xl">
                Planımız: her ay bir sektörün markalarını aynı satın alma sorularında ölçüp sıralamak. Kategorinizde
                kaçıncı sıradasınız, kim sizden kaç kat fazla öneriliyor. Endeks henüz yayımlanmadı; aşağıdaki tablo
                temsilidir.
              </p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {SECTORS.map((s) => (
                  <li key={s} className="chip !text-[11.5px]">
                    {s}
                  </li>
                ))}
              </ul>
              <Link
                href="/contact#press"
                className="mt-7 inline-flex items-center gap-1.5 text-[14px] text-brand-deep hover:text-brand"
              >
                Endeks çıkınca haber ver <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </Reveal>
          </div>
          <div className="lg:col-span-5">
            <Reveal delay={100}>
              <div className="card p-6" aria-label="Örnek endeks tablosu (temsili)">
                <div className="flex items-center justify-between">
                  <div className="eyebrow">Yanıt görünürlük skoru</div>
                  <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-ink-faint">temsili</span>
                </div>
                <ol className="mt-5 space-y-3">
                  {ROWS.map((r, i) => (
                    <li key={r.n} className="flex items-center gap-3 text-[13.5px]">
                      <span className="font-mono text-[11px] text-ink-faint w-4">{i + 1}</span>
                      <span className="w-20 text-ink">{r.n}</span>
                      <span className="flex-1 h-2 rounded-full bg-paper-4 overflow-hidden">
                        <span className="block h-full rounded-full accent-grad" style={{ width: `${r.v}%` }} />
                      </span>
                      <span className="font-mono tabular text-ink w-8 text-right">{r.v}</span>
                    </li>
                  ))}
                </ol>
                <p className="text-[11.5px] text-ink-faint mt-5">
                  Marka A–D hayali; skorlar örnek. Gerçek endeks tarih, model ve soru setiyle yayımlanacak.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
