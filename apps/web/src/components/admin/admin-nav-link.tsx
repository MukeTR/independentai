'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

/**
 * Admin yan menü bağlantısı — aktif rotada `aria-current="page"` (INTEGRATE `admin/layout.tsx` ADMIN_NAV'ı buna bağlar).
 * `exact` yalnız birebir eşleşir (/admin); aksi hâlde alt yollar da aktiftir (/admin/leads/abc → Lead'ler).
 */
export function AdminNavLink({
  href,
  exact = false,
  children,
  className,
}: {
  href: string;
  exact?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname() ?? '';
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] mb-1 min-h-[44px] md:min-h-0 whitespace-nowrap',
        active ? 'bg-paper-3 text-ink font-medium' : 'text-ink-muted hover:text-ink hover:bg-paper-3',
        className,
      )}
    >
      {children}
    </Link>
  );
}
