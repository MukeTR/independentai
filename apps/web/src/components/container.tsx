import { cn } from '@/lib/cn';

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('max-w-[1200px] mx-auto px-6 lg:px-8', className)}>{children}</div>;
}
