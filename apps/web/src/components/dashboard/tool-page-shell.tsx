import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function ToolPageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-5xl">
      <Link href="/dashboard/tools" className="inline-flex items-center gap-1.5 text-[12px] text-ink-faint hover:text-ink">
        <ArrowLeft className="w-3 h-3" /> Tüm araçlar
      </Link>
      <div className="eyebrow mt-4">{eyebrow}</div>
      <h1 className="font-display text-[36px] tracking-tight mt-2">{title}</h1>
      <p className="text-[14px] text-ink-muted mt-2 max-w-2xl">{description}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}
