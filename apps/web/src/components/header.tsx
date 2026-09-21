import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Logo } from './logo';
import { MegaMenu } from './mega-menu';
import { MobileMenu } from './mobile-menu';
import { Container } from './container';
import { NAV_PANELS } from './nav-data';
import { getOffer } from '@/server/offer';

export async function Header({ themeClass }: { themeClass?: string } = {}) {
  const offer = await getOffer();
  const ctaLabel = `${offer.trialDays} gün dene`;
  return (
    <header className="sticky top-0 z-40 pt-3 sm:pt-4">
      <div className="px-4 sm:px-6">
        <Container className="!px-0">
          <div className="glass-bar flex items-center justify-between h-16 rounded-2xl pl-3 pr-2 sm:pl-4 sm:pr-3">
            <div className="flex items-center gap-6 xl:gap-9">
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
                {ctaLabel} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
              </Link>
              <MobileMenu panels={NAV_PANELS} themeClass={themeClass} ctaLabel={ctaLabel} />
            </div>
          </div>
        </Container>
      </div>
    </header>
  );
}
