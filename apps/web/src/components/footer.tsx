import Link from 'next/link';
import { Logo } from './logo';
import { Container } from './container';
import { ECOMMERCE_TOOL_LINKS, RANK_CHECKER_LINKS, SOLUTION_LINKS } from './nav-data';

const FOOTER_LINKS = [
  {
    heading: 'Ürün',
    links: [
      { href: '/features', label: 'Özellikler' },
      { href: '/pricing', label: 'Fiyatlandırma' },
      { href: '/how-it-works', label: 'Nasıl çalışır' },
      { href: '/use-cases', label: 'Kullanım senaryoları' },
      { href: '/docs', label: 'Dokümantasyon' },
      { href: '/changelog', label: 'Sürüm notları' },
    ],
  },
  {
    heading: 'Çözümler',
    links: SOLUTION_LINKS.map((l) => ({ href: l.href, label: l.title })),
  },
  {
    heading: 'Kaynaklar',
    links: [
      { href: '/blog', label: 'Blog' },
      { href: '/blog/arsiv', label: 'Tüm yazılar' },
      { href: '/resources/geo-101', label: 'GEO 101 rehberi' },
      { href: '/resources/glossary', label: 'AI sözlüğü' },
    ],
  },
  {
    heading: 'Ücretsiz araçlar',
    links: [
      ...ECOMMERCE_TOOL_LINKS.map((l) => ({ href: l.href, label: l.title })),
      ...RANK_CHECKER_LINKS.map((l) => ({ href: l.href, label: l.title })),
    ],
  },
  {
    heading: 'Şirket',
    links: [
      { href: '/about', label: 'Hakkımızda' },
      { href: '/contact', label: 'İletişim' },
      { href: '/contact#press', label: 'Basın' },
      { href: '/contact#sales', label: 'Satış' },
    ],
  },
  {
    heading: 'Yasal',
    links: [
      { href: '/legal/privacy', label: 'Gizlilik politikası' },
      { href: '/legal/terms', label: 'Kullanım şartları' },
      { href: '/legal/kvkk', label: 'KVKK aydınlatması' },
      { href: '/legal/cookies', label: 'Çerez politikası' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t-hairline border-hairline mt-24 bg-paper-2/60">
      <Container className="py-16">
        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-3">
            <Logo />
            <p className="text-[13.5px] text-ink-muted mt-4 leading-relaxed max-w-[280px]">
              Yapay zekaların markanızı ve ürünlerinizi ne sıklıkla, hangi sırada ve nasıl önerdiğini bağımsız bir gözle
              ölçen görünürlük platformu.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="chip own !text-[10.5px]">independentai.space</span>
              <span className="chip !text-[10.5px]">v0.1 · lansman</span>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-9 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-x-6 gap-y-8">
            {FOOTER_LINKS.map((col) => (
              <div key={col.heading}>
                <div className="eyebrow mb-4">{col.heading}</div>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-[13px] text-ink-muted hover:text-ink transition">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t-hairline border-hairline mt-14 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[12px] text-ink-faint">
          <div>© {new Date().getFullYear()} Independent AI · Türkiye</div>
          <div className="font-mono">independentai.space</div>
        </div>
      </Container>
    </footer>
  );
}
