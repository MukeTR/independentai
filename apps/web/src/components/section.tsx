import { cn } from '@/lib/cn';
import { Container } from './container';

export function Section({
  id,
  eyebrow,
  title,
  intro,
  className,
  containerClassName,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title?: React.ReactNode;
  intro?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <section id={id} className={cn('py-20 lg:py-28', className)}>
      <Container className={containerClassName}>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        {title && (
          <h2 className="font-display text-[36px] lg:text-[48px] tracking-tight mt-3 max-w-4xl leading-[1.05]">
            {title}
          </h2>
        )}
        {intro && (
          <p className="text-[16px] lg:text-[18px] text-ink-muted mt-5 max-w-2xl leading-relaxed">{intro}</p>
        )}
        {children && <div className={cn(eyebrow || title || intro ? 'mt-14' : '')}>{children}</div>}
      </Container>
    </section>
  );
}
