import { Logo } from '@/components/logo';
import { AuthShowcase } from './auth-showcase';

/**
 * Tam ekran giriş/kayıt düzeni: sol %30 beyaz panel (logo + form),
 * sağ %70 animasyonlu showcase (lg ve üstünde görünür).
 */
export function AuthSplit({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex">
      {/* Sol — beyaz panel */}
      <div className="relative z-10 w-full lg:w-[34%] xl:w-[30%] min-h-screen bg-paper-3 border-r border-hairline flex flex-col px-7 sm:px-10 py-8">
        <Logo />
        <div className="flex-1 flex items-center py-10">
          <div className="w-full max-w-sm mx-auto rise-1">{children}</div>
        </div>
        <div className="text-[12px] text-ink-faint">independentai.space · 2026</div>
      </div>

      {/* Sağ — animasyonlu showcase */}
      <div className="hidden lg:block lg:w-[66%] xl:w-[70%]">
        <AuthShowcase />
      </div>
    </div>
  );
}
