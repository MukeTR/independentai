import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Logo } from './logo';
import { MegaMenu } from './mega-menu';
import { MobileMenu } from './mobile-menu';
import { Container } from './container';
import { NAV_PANELS } from './nav-data';

export function Header() {
  return (
    <header className="relative z-40">
      <div className="border-b-hairline border-hairline/60 backdrop-blur-sm bg-paper/80 sticky top-0 z-40">
        <Container>
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-10">
              <Logo />
              <MegaMenu panels={NAV_PANELS} />
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <Link
                href="/pricing"
                className="hidden md:inline-flex text-[14px] text-ink-muted hover:text-ink px-3 py-2"
              >
                Fiyatlandırma
              </Link>
              <Link
                href="/login"
                className="hidden sm:inline-flex text-[14px] text-ink-muted hover:text-ink px-2 sm:px-3 py-2 whitespace-nowrap"
              >
                Giriş
              </Link>
              <Link
                href="/register"
                className="btn-primary !py-2 !px-3 sm:!px-4 inline-flex items-center gap-1.5 text-[13.5px] whitespace-nowrap"
              >
                Ücretsiz başla <ArrowRight className="w-3.5 h-3.5" aria-hidden />
              </Link>
              <MobileMenu panels={NAV_PANELS} />
            </div>
          </div>
        </Container>
      </div>
    </header>
  );
}
