import Image from 'next/image';
import { cn } from '@/lib/cn';

/**
 * El çizimi illüstrasyonlar (`public/img/ciz/*.webp`) — metni kıran görsel duraklar.
 * Beyaz zeminli, tek vurgu renkli; dekoratif kullanımda alt boş bırakılır.
 */
export type CizName = 'soru' | 'analiz' | 'yapilacaklar' | 'olc' | 'kiyas' | 'urun' | 'uyum' | 'ajans';

export function Ciz({
  name,
  alt,
  className,
  priority = false,
}: {
  name: CizName;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={`/img/ciz/${name}.webp`}
      alt={alt}
      width={900}
      height={675}
      priority={priority}
      unoptimized
      className={cn('w-full h-auto select-none', className)}
    />
  );
}

/** Üç adımlı görsel şerit: çizim + tek satır. Landing'de uzun metinlerin arasına nefes koyar. */
export function CizSteps({
  steps,
  className,
}: {
  steps: { name: CizName; alt: string; step: string; title: string; body: string }[];
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8', className)}>
      {steps.map((s) => (
        <div key={s.name} className="text-center">
          <div className="rounded-2xl border border-hairline bg-paper-3 overflow-hidden">
            <Ciz name={s.name} alt={s.alt} className="p-2" />
          </div>
          <div className="eyebrow mt-5">{s.step}</div>
          <h3 className="font-display text-[20px] mt-2 leading-snug">{s.title}</h3>
          <p className="text-[14px] text-ink-muted mt-2 leading-relaxed max-w-[34ch] mx-auto">{s.body}</p>
        </div>
      ))}
    </div>
  );
}
