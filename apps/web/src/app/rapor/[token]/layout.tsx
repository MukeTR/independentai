import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Logo } from '@/components/logo';

/**
 * Kalıcı rapor kabuğu — pazarlama header/footer'ı yerine sade Shell (share/[token] kalıbı):
 * Logo + "Yanıt ile hazırlandı", main, kısa altbilgi. Sayfa indekslenmez (page.tsx metadata).
 */
export const metadata = {
  robots: { index: false, follow: true },
};

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="max-w-5xl w-full mx-auto px-4 sm:px-6 pt-7 flex items-center justify-between gap-4">
        <Logo />
        <span className="chip !text-[10.5px]">
          <Sparkles className="w-3 h-3 text-brand" aria-hidden /> Yanıt ile hazırlandı
        </span>
      </header>
      <main id="main" className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {children}
      </main>
      <footer className="text-center pb-8 px-4 text-[12px] text-ink-faint">
        Bu rapor{' '}
        <Link href="/" className="underline hover:text-ink">
          Yanıt
        </Link>{' '}
        ile hazırlanmıştır · Tüm ücretsiz araçlar:{' '}
        <Link href="/arac" className="underline hover:text-ink">
          /arac
        </Link>
      </footer>
    </div>
  );
}
