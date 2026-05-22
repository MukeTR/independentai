import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Logo } from './logo';
import { MegaMenu, type MegaPanel } from './mega-menu';
import { Container } from './container';

const PANELS: MegaPanel[] = [
  {
    label: 'Çözümler',
    sections: [
      {
        heading: 'Sektöre göre',
        links: [
          { href: '/use-cases#saas', title: 'SaaS şirketleri', description: 'Yazılım önerilerinde geçiyor musunuz?' },
          { href: '/use-cases#ecommerce', title: 'E-ticaret', description: 'Marka önerilerinde sıranız ne?' },
          { href: '/use-cases#agency', title: 'Ajanslar', description: 'Müşterilerinizin AI görünürlüğünü yönetin.' },
          { href: '/use-cases#enterprise', title: 'Kurumsal', description: 'Marka itibarınızı AI çağında koruyun.' },
        ],
      },
      {
        heading: 'Role göre',
        links: [
          { href: '/use-cases#marketing', title: 'Pazarlama liderleri' },
          { href: '/use-cases#founder', title: 'Kurucu / CEO' },
          { href: '/use-cases#seo', title: 'SEO uzmanları' },
          { href: '/use-cases#pr', title: 'PR / iletişim' },
        ],
      },
    ],
    featured: {
      eyebrow: 'Yeni',
      title: 'GEO 101 — AI çağında görünürlük rehberi',
      body: 'AI’nın markaları nasıl önerdiğine dair 12 sayfalık ücretsiz başucu kitabı.',
      href: '/resources/geo-101',
      cta: 'Rehberi aç',
    },
  },
  {
    label: 'Özellikler',
    sections: [
      {
        heading: 'İzleme',
        links: [
          { href: '/features#multi-model', title: '3 modelde paralel', description: 'ChatGPT, Claude, Gemini' },
          { href: '/features#alias-detection', title: 'Akıllı marka tespiti', description: 'Alternatif yazımlar dahil' },
          { href: '/features#daily-tracking', title: 'Günlük rerun', description: 'Her sabah taze veri' },
          { href: '/features#on-demand', title: 'Anında çalıştırma', description: 'Tek tıkla yeniden tara' },
        ],
      },
      {
        heading: 'Analiz',
        links: [
          { href: '/features#visibility-score', title: 'Görünürlük skoru' },
          { href: '/features#share-of-voice', title: 'Share of Voice' },
          { href: '/features#trend', title: 'Zaman serisi trendi' },
          { href: '/features#sentiment', title: 'Tonal analiz', badge: 'beta' },
        ],
      },
    ],
    featured: {
      eyebrow: 'Demo',
      title: 'Canlı dashboard\'u 60 saniyede gör',
      body: 'Kayıt olmadan örnek bir hesap üzerinden tüm özellikleri keşfet.',
      href: '/login',
      cta: 'Demo\'ya gir',
    },
  },
  {
    label: 'Kaynaklar',
    sections: [
      {
        heading: 'Öğren',
        links: [
          { href: '/blog', title: 'Blog', description: 'GEO ve AI marka stratejisi' },
          { href: '/resources/geo-101', title: 'GEO 101 rehberi' },
          { href: '/resources/glossary', title: 'AI pazarlama sözlüğü' },
        ],
      },
      {
        heading: 'Yardım',
        links: [
          { href: '/docs', title: 'Dokümantasyon' },
          { href: '/changelog', title: 'Sürüm notları' },
          { href: '/contact', title: 'Destek' },
        ],
      },
      {
        heading: 'API',
        links: [
          { href: '/docs/api', title: 'API referansı', badge: 'yakında' },
          { href: '/docs/webhooks', title: 'Webhooks', badge: 'yakında' },
        ],
      },
    ],
  },
  {
    label: 'Şirket',
    sections: [
      {
        heading: 'Hakkında',
        links: [
          { href: '/about', title: 'Independent AI nedir?' },
          { href: '/about#mission', title: 'Misyonumuz' },
          { href: '/about#team', title: 'Ekip' },
        ],
      },
      {
        heading: 'İletişim',
        links: [
          { href: '/contact', title: 'Bize yazın' },
          { href: '/contact#sales', title: 'Satış görüşmesi' },
          { href: '/contact#press', title: 'Basın' },
        ],
      },
    ],
  },
];

export function Header() {
  return (
    <header className="relative z-40">
      <div className="border-b-hairline border-hairline/60 backdrop-blur-sm bg-paper/80 sticky top-0 z-40">
        <Container>
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-10">
              <Logo />
              <MegaMenu panels={PANELS} />
            </div>
            <div className="flex items-center gap-2">
              <Link href="/pricing" className="hidden md:inline-flex text-[14px] text-ink-muted hover:text-ink px-3 py-2">
                Fiyatlandırma
              </Link>
              <Link href="/login" className="text-[14px] text-ink-muted hover:text-ink px-3 py-2">
                Giriş
              </Link>
              <Link href="/register" className="btn-primary !py-2 !px-4 inline-flex items-center gap-1.5 text-[13.5px]">
                Ücretsiz başla <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </Container>
      </div>
    </header>
  );
}
