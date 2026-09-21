import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * Yanıt logosu — yalnız kelime markası (monogram yok). Kelimenin arkasında ince bir cam yüzey:
 * yarı saydam zemin + backdrop-blur + üstte tek beyaz ışık çizgisi. Nokta tek vurgu rengindedir.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('group inline-flex items-center', className)} aria-label="yanıt — ana sayfa">
      <span className="glass-word relative inline-flex items-baseline rounded-xl px-3 py-1.5">
        <span className="font-display text-[19px] tracking-[-0.02em] lowercase">yanıt</span>
        <span className="text-brand text-[19px] font-display">.</span>
      </span>
    </Link>
  );
}
