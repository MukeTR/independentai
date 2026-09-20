import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * Yanıt logosu — marka adı yanit.io; alan adı geçiş süresince independentai.space.
 * İşaret: violet → elektrik mavi gradyan üzerinde "Y".
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('inline-flex items-center gap-2.5 group', className)} aria-label="Yanıt — ana sayfa">
      <span className="relative inline-flex items-center justify-center h-8 w-8 rounded-lg accent-grad text-white font-display text-[16px] tracking-tight shadow-[0_6px_18px_-6px_rgba(124,92,255,0.7)]">
        Y
        <span className="absolute -inset-px rounded-lg ring-1 ring-white/20 group-hover:ring-white/40 transition" />
      </span>
      <span className="font-display text-[17px] tracking-tight">
        Yanıt<span className="text-brand">.</span>
      </span>
    </Link>
  );
}
