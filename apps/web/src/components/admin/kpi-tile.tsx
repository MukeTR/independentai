import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * KPI kutusu (Kârmatik "Genel Bakış" deseni): 2 px vurgu üst çizgisi, 11 px büyük harf etiket, büyük tabular sayı,
 * ipucu ve isteğe bağlı 14 günlük sparkline. `href` verilirse tüm kutu filtreli sayfaya bağlantıdır.
 */
export type KpiTone = 'default' | 'brand' | 'positive' | 'warning' | 'danger';

const ACCENT: Record<KpiTone, string> = {
  default: 'border-t-ink/30',
  brand: 'border-t-brand',
  positive: 'border-t-positive',
  warning: 'border-t-warning',
  danger: 'border-t-danger',
};
const VALUE: Record<KpiTone, string> = {
  default: 'text-ink',
  brand: 'text-brand-deep',
  positive: 'text-positive',
  warning: 'text-warning',
  danger: 'text-danger',
};

export function KpiTile({
  label,
  value,
  hint,
  href,
  tone = 'default',
  sparkline,
  sparklineLabel,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: KpiTone;
  /** Eski → yeni günlük değerler */
  sparkline?: number[];
  sparklineLabel?: string;
  className?: string;
}) {
  const body = (
    <>
      <div className="text-[11px] uppercase tracking-wider text-ink-faint font-medium">{label}</div>
      <div className={cn('font-display text-[30px] leading-none tracking-tight tabular mt-2', VALUE[tone])}>
        {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
      </div>
      {hint && <div className="text-[12px] text-ink-muted mt-1.5 leading-snug">{hint}</div>}
      {sparkline && sparkline.length > 1 && (
        <Sparkline values={sparkline} label={sparklineLabel ?? `${label} — son ${sparkline.length} gün`} />
      )}
    </>
  );
  const cls = cn(
    'card p-4 border-t-2 block min-w-0 h-full',
    ACCENT[tone],
    href && 'hover:bg-paper-2 transition focus-visible:ring-2 focus-visible:ring-brand',
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cls} aria-label={`${label}: ${value}${hint ? ` — ${hint}` : ''}`}>
        {body}
      </Link>
    );
  }
  return <div className={cls}>{body}</div>;
}

/** Bağımlılıksız SVG sparkline (sunucuda çizilir; recharts yüklenmez). */
export function Sparkline({
  values,
  label,
  width = 120,
  height = 28,
}: {
  values: number[];
  label: string;
  width?: number;
  height?: number;
}) {
  const max = Math.max(1, ...values);
  const n = values.length;
  const pts = values.map((v, i) => {
    const x = n === 1 ? 0 : (i / (n - 1)) * (width - 2) + 1;
    const y = height - 2 - (v / max) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = pts[pts.length - 1]?.split(',') ?? ['0', '0'];
  return (
    <svg
      role="img"
      aria-label={`${label}: ${values.join(', ')}`}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="mt-3 text-brand block max-w-full"
      preserveAspectRatio="none"
    >
      <polyline points={pts.join(' ')} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2" fill="currentColor" />
    </svg>
  );
}
