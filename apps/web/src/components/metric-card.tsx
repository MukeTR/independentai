import { cn } from '@/lib/cn';

export function MetricCard({
  label,
  value,
  suffix,
  hint,
  tone = 'default',
  className,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  hint?: string;
  tone?: 'default' | 'brand' | 'positive' | 'warning';
  className?: string;
}) {
  const toneClass =
    tone === 'brand' ? 'text-brand' : tone === 'positive' ? 'text-positive' : tone === 'warning' ? 'text-warning' : 'text-ink';
  return (
    <div className={cn('card p-6', className)}>
      <div className="eyebrow">{label}</div>
      <div className={cn('font-display text-[40px] tracking-tight tabular mt-3', toneClass)}>
        {value}
        {suffix && <span className="text-[18px] text-ink-faint ml-1">{suffix}</span>}
      </div>
      {hint && <div className="text-[12px] text-ink-muted mt-2">{hint}</div>}
    </div>
  );
}
