import Link from 'next/link';
import { cn } from '@/lib/cn';

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('inline-flex items-center gap-2.5 group', className)}>
      <span className="relative inline-flex items-center justify-center h-8 w-8 rounded-md bg-ink text-paper-3 font-display text-[15px] tracking-tight">
        iA
        <span className="absolute -inset-px rounded-md ring-1 ring-brand/30 group-hover:ring-brand/60 transition" />
      </span>
      <span className="font-display text-[17px] tracking-tight">
        Independent <span className="text-brand">AI</span>
      </span>
    </Link>
  );
}
