import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { Sparkles, Wrench, Plus, Zap } from 'lucide-react';
import { CAPABILITIES } from '@independentai/shared';

export const metadata = buildMetadata({
  title: 'Sürüm Notları — Yeniliklerden haberdar olun',
  description: "Independent AI'a eklenen yeni özellikler, iyileştirmeler ve düzeltmeler.",
  path: '/changelog',
});

const RELEASES = [
  {
    version: 'v0.2.0',
    date: '2026-09-06',
    label: 'Public API',
    sections: [
      {
        type: 'NEW' as const,
        items: [
          'Public API v1 (GET /api/v1/visibility) ve API dokümantasyonu (/docs/api) yayında — salt-okunur, token bazlı, 60 istek/dk',
          'Ekip daveti ve roller (Owner / Admin / Viewer)',
          'E-posta doğrulama ve şifre sıfırlama',
          'Native web arama atıfları — Top Citation Sources (beta)',
        ],
      },
      {
        type: 'IMPROVE' as const,
        items: [
          'Deneme süresi sonunda salt-okunur mod (veriler silinmez, 7 gün ek süre)',
          'Dağıtık rate limit (API ve kimlik doğrulama uçları)',
        ],
      },
    ],
  },
  {
    version: 'v0.1.0',
    date: '2026-05-22',
    label: 'Lansman',
    sections: [
      {
        type: 'NEW' as const,
        items: [
          'İlk halka açık sürüm 🎉',
          '3 AI provider (ChatGPT, Claude, Gemini) paralel sorgu',
          'Akıllı marka tespiti (alias matching + pozisyon takibi)',
          'Görünürlük skoru, Share of Voice, 30 günlük trend paneli',
          'Onboarding (3-adımlı: marka, rakipler, ilk promptlar)',
          'Vercel Cron ile günlük otomatik rerun',
          'Manuel "şimdi çalıştır" özelliği',
          'Super admin paneli',
          'KVKK uyumlu legal sayfalar',
          'llms.txt ve SEO altyapısı',
        ],
      },
      {
        type: 'PROMO' as const,
        items: ['Lansmanda kayıt olan tüm kullanıcılara 6 ay tamamen ücretsiz erişim'],
      },
    ],
  },
];

/** Yol haritası — tek kaynak: CAPABILITIES (status === 'roadmap'). Tarih sözü vermiyoruz. */
const ROADMAP_NOTES: Record<string, string> = {
  multi_brand: 'Tek hesapta birden fazla kendi markası. Lansmanda hesap başına 1 marka.',
  webhooks: 'Olay tabanlı bildirimler (düşüş, cron tamamlandı). Şimdilik veriyi Public API ile çekin.',
  pdf_report: 'Otomatik müşteri/yönetim raporu üretimi.',
  perplexity: "Arama odaklı LLM'leri de izleme listesine ekliyoruz.",
  billing: 'Ücretli planlar ve ödeme; fiyatlar duyurulmadı.',
};
const ROADMAP = CAPABILITIES.filter((c) => c.status === 'roadmap').map((c) => ({
  eta: 'planlanıyor',
  t: c.label,
  d: ROADMAP_NOTES[c.key] ?? c.note ?? '',
}));

const ICONS = {
  NEW: { Icon: Plus, color: 'text-brand', label: 'Yeni' },
  FIX: { Icon: Wrench, color: 'text-warning', label: 'Düzeltme' },
  IMPROVE: { Icon: Zap, color: 'text-positive', label: 'İyileştirme' },
  PROMO: { Icon: Sparkles, color: 'text-brand', label: 'Promosyon' },
};

export default function Changelog() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Sürüm notları', href: '/changelog' },
        ]}
      />

      <section className="pt-24 pb-16">
        <Container className="max-w-4xl">
          <div className="eyebrow">Sürüm notları</div>
          <h1 className="font-display text-[52px] lg:text-[68px] tracking-tight mt-4 leading-[1.02]">
            Her yeni özellik <span className="text-brand">burada.</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            Independent AI hızlı evriliyor. Yeni özellikler, iyileştirmeler ve düzeltmeler için takipte kalın.
          </p>
        </Container>
      </section>

      <section className="pb-10">
        <Container>
          <div className="space-y-10">
            {RELEASES.map((r) => (
              <div key={r.version} className="card p-8 lg:p-10">
                <div className="flex items-baseline gap-4 flex-wrap">
                  <h2 className="font-display text-[32px] tracking-tight">{r.version}</h2>
                  <span className="chip own !text-[11px]">{r.label}</span>
                  <time className="text-[12px] text-ink-faint font-mono ml-auto">{r.date}</time>
                </div>

                <div className="mt-7 space-y-6">
                  {r.sections.map((s, i) => {
                    const { Icon, color, label } = ICONS[s.type];
                    return (
                      <div key={i}>
                        <div className={`flex items-center gap-2 ${color} mb-3`}>
                          <Icon className="w-4 h-4" />
                          <span className="text-[12px] font-mono tracking-wider uppercase">{label}</span>
                        </div>
                        <ul className="space-y-2 pl-6 border-l-2 border-hairline">
                          {s.items.map((it, j) => (
                            <li key={j} className="text-[14.5px] text-ink-muted leading-relaxed">
                              {it}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Section eyebrow="Yol haritası" title="Planlanıyor — henüz üründe yok." className="bg-paper-2/40">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ROADMAP.map((r) => (
            <div key={r.t} className="card p-5 border-dashed border-2 border-hairline bg-transparent">
              <div className="eyebrow text-brand-deep">{r.eta}</div>
              <div className="font-display text-[16px] mt-2">{r.t}</div>
              <p className="text-[12.5px] text-ink-muted mt-2 leading-relaxed">{r.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <CtaBlock />
    </>
  );
}
