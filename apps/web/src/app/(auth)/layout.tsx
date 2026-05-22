import { Logo } from '@/components/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="max-w-6xl w-full mx-auto px-6 pt-7">
        <Logo />
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="text-center pb-8 text-[12px] text-ink-faint">
        independentai.space · 2026
      </footer>
    </div>
  );
}
