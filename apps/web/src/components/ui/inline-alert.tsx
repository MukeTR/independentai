import { cn } from '@/lib/cn';

/** Erişilebilir satır içi durum mesajı: hata → role=alert, diğerleri aria-live=polite. */
export function InlineAlert({
  tone = 'error',
  children,
  className,
  id,
}: {
  tone?: 'error' | 'success' | 'info' | 'warning';
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  if (!children) return null;
  const toneClass =
    tone === 'error'
      ? 'text-danger bg-danger/5 border-danger/20'
      : tone === 'success'
        ? 'text-positive bg-positive/5 border-positive/20'
        : tone === 'warning'
          ? 'text-warning bg-warning/5 border-warning/20'
          : 'text-brand-deep bg-brand-glow border-brand/20';
  return (
    <div
      id={id}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={cn('text-[13px] border rounded-lg p-3 leading-relaxed', toneClass, className)}
    >
      {children}
    </div>
  );
}
