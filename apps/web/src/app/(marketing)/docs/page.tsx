import Link from 'next/link';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { ArrowRight, BookOpen, Rocket, Zap, KeyRound, Webhook, FileText } from 'lucide-react';

export const metadata = buildMetadata({
  title: 'Dokümantasyon',
  description: 'Independent AI kurulum, kullanım ve API rehberleri.',
  path: '/docs',
});

const SECTIONS = [
  {
    icon: Rocket,
    title: 'Hızlı başlangıç',
    description: '5 dakikada kayıt, onboarding ve ilk dashboard.',
    items: [
      { t: 'Hesap oluşturma', href: '#account' },
      { t: 'Onboarding (3 adım)', href: '#onboarding' },
      { t: 'İlk promptu ekleme', href: '#first-prompt' },
      { t: 'Dashboard\'u okuma', href: '#reading-dashboard' },
    ],
  },
  {
    icon: BookOpen,
    title: 'Kavramlar',
    description: 'Görünürlük skoru, SoV, alias matching gibi terimler.',
    items: [
      { t: 'Görünürlük skoru', href: '#visibility' },
      { t: 'Share of Voice', href: '#sov' },
      { t: 'Alias matching', href: '#alias' },
      { t: 'Sentiment analizi', href: '#sentiment' },
    ],
  },
  {
    icon: Zap,
    title: 'En iyi pratikler',
    description: 'Etkili prompt yazımı, alias ekleme stratejileri.',
    items: [
      { t: 'Hangi soruları izlemeli?', href: '#what-prompts' },
      { t: 'Etkili alias listesi', href: '#alias-tips' },
      { t: 'Rakip seçimi', href: '#competitor-tips' },
      { t: 'Trend yorumlama', href: '#trend-reading' },
    ],
  },
  {
    icon: KeyRound,
    title: 'API referansı',
    description: 'REST API endpoint\'leri ve örnekleri.',
    items: [
      { t: 'Kimlik doğrulama', href: '/docs/api#auth' },
      { t: 'Brands API', href: '/docs/api#brands' },
      { t: 'Prompts API', href: '/docs/api#prompts' },
      { t: 'Metrics API', href: '/docs/api#metrics' },
    ],
    badge: 'yakında',
  },
  {
    icon: Webhook,
    title: 'Webhooks',
    description: 'Olay tabanlı entegrasyonlar.',
    items: [
      { t: 'Webhook kurulumu', href: '/docs/webhooks' },
      { t: 'Olay tipleri', href: '/docs/webhooks#events' },
      { t: 'Güvenlik (signature)', href: '/docs/webhooks#signing' },
    ],
    badge: 'yakında',
  },
  {
    icon: FileText,
    title: 'Veri export',
    description: 'CSV indirme, BI araçlarıyla entegrasyon.',
    items: [
      { t: 'CSV export', href: '#csv' },
      { t: 'Google Sheets bağlantı', href: '#sheets' },
      { t: 'Looker Studio', href: '#looker' },
    ],
    badge: 'yakında',
  },
];

export default function Docs() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Ana sayfa', href: '/' }, { name: 'Dokümantasyon', href: '/docs' }]} />

      <section className="pt-24 pb-16">
        <Container className="max-w-4xl">
          <div className="eyebrow">Dokümantasyon</div>
          <h1 className="font-display text-[52px] lg:text-[68px] tracking-tight mt-4 leading-[1.02]">
            Independent AI\'ı <span className="text-brand">en iyi şekilde kullanın.</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            Kurulum, kullanım ve ileri seviye teknik dokümanlar. API ve webhooks yakında.
          </p>
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SECTIONS.map((s) => (
              <div key={s.title} className="card p-7">
                <div className="flex items-center justify-between">
                  <s.icon className="w-5 h-5 text-brand" />
                  {s.badge && <span className="chip !text-[10px]">{s.badge}</span>}
                </div>
                <h2 className="font-display text-[19px] mt-4">{s.title}</h2>
                <p className="text-[13px] text-ink-muted mt-2 leading-relaxed">{s.description}</p>
                <ul className="space-y-2 mt-5">
                  {s.items.map((i) => (
                    <li key={i.t}>
                      <Link href={i.href} className="text-[13px] text-ink-muted hover:text-brand-deep inline-flex items-center gap-1.5 transition">
                        <ArrowRight className="w-3 h-3" />
                        {i.t}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Quick start expanded inline */}
      <Section id="account" eyebrow="Hızlı başlangıç" title="5 dakikada başlangıç." className="bg-paper-2/40">
        <div className="space-y-10">
          {[
            { id: 'account', n: '01', t: 'Hesap oluştur',
              c: 'İndependentai.space/register adresine gidin. Email, şifre, şirket adı yeterli. Kredi kartı bilgisi istenmez. 6 ay tüm özellikler ücretsiz.' },
            { id: 'onboarding', n: '02', t: 'Onboarding (3 adım)',
              c: '1) Marka adınızı + 3-5 alternatif yazımı (alias) girin. 2) 3-5 rakip ekleyin. 3) İzlemek istediğiniz 3-5 örnek soruyu yazın. Süre: ~2 dakika.' },
            { id: 'first-prompt', n: '03', t: 'İlk promptunu ekle',
              c: 'Dashboard\'da "Promptlar" sekmesi. Müşterilerinizin AI\'ya sorabileceği soruları yazın. Örn: "Restoranlar için en iyi POS yazılımı". "Şimdi çalıştır" butonu ile hemen sonuç görebilirsin.' },
            { id: 'reading-dashboard', n: '04', t: 'Dashboard\'u oku',
              c: 'Görünürlük skoru = soruların % kaçında markanız geçti. Share of Voice = sizin + rakiplerin toplam mention\'ı içinde sizin payınız. Trend = son 30 günde değişim. Modellere göre = ChatGPT vs Claude vs Gemini.' },
          ].map((s) => (
            <div key={s.id} id={s.id} className="border-l-2 border-brand/40 pl-6">
              <div className="font-mono text-[11px] tracking-eyebrow text-brand">{s.n}</div>
              <h3 className="font-display text-[22px] tracking-tight mt-2">{s.t}</h3>
              <p className="text-[14px] text-ink-muted mt-3 leading-relaxed max-w-2xl">{s.c}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
