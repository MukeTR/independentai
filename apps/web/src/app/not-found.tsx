import Link from 'next/link';
import { Logo } from '@/components/logo';

export const metadata = { title: 'Sayfa bulunamadı — Independent AI', robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="max-w-6xl w-full mx-auto px-6 pt-7">
        <Logo />
      </header>
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="eyebrow">404</div>
          <h1 className="font-display text-[32px] tracking-tight mt-2">Sayfa bulunamadı</h1>
          <p className="text-[14px] text-ink-muted mt-3">Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.</p>
          <div className="flex justify-center gap-2 mt-6 flex-wrap">
            <Link href="/" className="btn-primary">
              Ana sayfa
            </Link>
            <Link href="/blog" className="btn-secondary">
              Blog
            </Link>
            <Link href="/dashboard" className="btn-secondary">
              Panel
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
