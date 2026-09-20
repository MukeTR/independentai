import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * Sayılı aşama/sekme hapları ("Yeni · 12"). Bağlantı tabanlı (URL = durum), aktif hap `aria-current="page"`.
 * Renk: emerald = kazanıldı/aktif, amber = beklemede, rose = kayıp/iptal, brand = seçili nötr.
 */
export type PillTone = 'neutral' | 'brand' | 'positive' | 'warning' | 'danger';

export type StagePill = {
  key: string;
  label: string;
  count?: number;
  href: string;
  active?: boolean;
  tone?: PillTone;
};

const ACTIVE: Record<PillTone, string> = {
  neutral: 'bg-ink text-paper border-ink',
  brand: 'bg-brand text-white border-brand',
  positive: 'bg-positive text-white border-positive',
  warning: 'bg-warning text-white border-warning',
  danger: 'bg-danger text-white border-danger',
};

export function StagePills({
  pills,
  ariaLabel,
  className,
}: {
  pills: StagePill[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <nav aria-label={ariaLabel} className={cn('flex flex-wrap gap-1.5', className)}>
      {pills.map((p) => (
        <Link
          key={p.key}
          href={p.href}
          aria-current={p.active ? 'page' : undefined}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium min-h-[36px] transition',
            p.active
              ? ACTIVE[p.tone ?? 'neutral']
              : 'border-hairline bg-paper-3 text-ink-muted hover:text-ink hover:border-ink/40',
          )}
        >
          {p.label}
          {p.count !== undefined && (
            <span className={cn('tabular text-[11px]', p.active ? 'opacity-80' : 'text-ink-faint')}>
              · {p.count.toLocaleString('tr-TR')}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
