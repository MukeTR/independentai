import Link from 'next/link';
import { ArrowRight, Eye, Globe, Radar, Quote, Lightbulb, ShieldCheck, ListChecks, BarChart3 } from 'lucide-react';
import { Container } from '@/components/container';
import { Reveal } from '@/components/marketing/reveal';

const FEATURES = [
  { icon: Eye, t: 'AI Visibility', d: 'ChatGPT · Gemini · Claude', wide: true },
  { icon: Globe, t: 'Site Intelligence', d: 'Teknik + içerik audit' },
  { icon: Radar, t: 'Competitor Intelligence', d: 'Kim, hangi soruda, kaçıncı' },
  { icon: Quote, t: 'Citation Intelligence', d: 'Modellerin güvendiği kaynaklar' },
  { icon: Lightbulb, t: 'Content Opportunities', d: 'Boşluk → içerik önerisi' },
  { icon: ShieldCheck, t: 'Brand Accuracy', d: 'Halüsinasyon ve yanlış bilgi', wide: true },
  { icon: ListChecks, t: 'Tasks', d: 'Haftalık iş listesi, etki tahmini', wide: true },
  { icon: BarChart3, t: 'Reporting', d: 'Paylaşılabilir rapor, API', wide: true },
];

export function FeatureBento() {
  return (
    <section className="py-20 lg:py-28 border-t border-hairline">
      <Container>
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="eyebrow">Motorun içinde</div>
              <h2 className="font-display text-[30px] lg:text-[40px] tracking-tight mt-3 leading-[1.05]">
                Hepsi tek panelde.
              </h2>
            </div>
            <Link
              href="/features"
              className="inline-flex items-center gap-1.5 text-[14px] text-brand-deep hover:text-brand"
            >
              Tüm özellik detayları <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
        </Reveal>
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.t} delay={(i % 4) * 60} className={f.wide ? 'col-span-2' : ''}>
              <div className="card p-5 h-full hover:-translate-y-0.5 transition-transform duration-300">
                <f.icon className="w-5 h-5 text-brand" aria-hidden />
                <div className="font-display text-[16px] mt-4">{f.t}</div>
                <div className="text-[12.5px] text-ink-muted mt-1">{f.d}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
