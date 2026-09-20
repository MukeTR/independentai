import Link from 'next/link';
import { ArrowRight, Eye, Globe, Radar, Quote, Lightbulb, ShieldCheck, ListChecks, BarChart3 } from 'lucide-react';
import { CAPABILITIES } from '@independentai/shared';
import { Container } from '@/components/container';
import { Reveal } from '@/components/marketing/reveal';

/**
 * Modül kartları. Rozet yetenek matrisinden türer: capability yoksa ya da `roadmap` ise "yakında",
 * `beta` ise "beta". Yapılacaklar (Tasks) kodda yok → "yakında"; kart yalnızca planı anlatır.
 */
type Feature = { icon: typeof Eye; t: string; d: string; cap: string; wide?: boolean };

const FEATURES: Feature[] = [
  { icon: Eye, t: 'AI görünürlüğü', d: 'ChatGPT · Gemini · Claude', cap: 'tracking', wide: true },
  { icon: Globe, t: 'Site denetimi', d: 'Teknik + içerik denetimi, ücretsiz araçlar', cap: 'geo_tools' },
  { icon: Radar, t: 'Rakip takibi', d: 'Kim, hangi soruda, kaçıncı', cap: 'competitors' },
  { icon: Quote, t: 'Atıf kaynakları', d: 'Modellerin güvendiği kaynaklar', cap: 'citations' },
  { icon: Lightbulb, t: 'İçerik fırsatları', d: 'İçerik denetimi, soru bulucu, AEO yazıcı', cap: 'geo_tools' },
  { icon: ShieldCheck, t: 'Marka doğruluğu', d: 'Halüsinasyon ve yanlış bilgi kontrolü', cap: 'geo_tools', wide: true },
  { icon: ListChecks, t: 'Yapılacaklar', d: 'Haftalık iş listesi — yol haritasında', cap: 'tasks', wide: true },
  { icon: BarChart3, t: 'Raporlama', d: 'Paylaşılabilir rapor, haftalık e-posta, API', cap: 'share_links', wide: true },
];

function badgeFor(cap: string): 'beta' | 'yakında' | null {
  const c = CAPABILITIES.find((x) => x.key === cap);
  if (!c || c.status === 'roadmap') return 'yakında';
  if (c.status === 'beta') return 'beta';
  return null;
}

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
          {FEATURES.map((f, i) => {
            const badge = badgeFor(f.cap);
            return (
              <Reveal key={f.t} delay={(i % 4) * 60} className={f.wide ? 'col-span-2' : ''}>
                <div
                  className={`card p-5 h-full hover:-translate-y-0.5 transition-transform duration-300 ${
                    badge === 'yakında' ? 'border-dashed' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <f.icon className="w-5 h-5 text-brand" aria-hidden />
                    {badge && (
                      <span className="chip !text-[10px]">{f.cap === 'tasks' ? 'Yapılacaklar · yakında' : badge}</span>
                    )}
                  </div>
                  <div className="font-display text-[16px] mt-4">{f.t}</div>
                  <div className="text-[12.5px] text-ink-muted mt-1">{f.d}</div>
                </div>
              </Reveal>
            );
          })}
        </div>
        <p className="text-[11.5px] text-ink-faint mt-5 font-mono">
          Rozetler yetenek matrisinden gelir · “yakında” etiketli modül üründe yok · landing ekranları temsili
        </p>
      </Container>
    </section>
  );
}
