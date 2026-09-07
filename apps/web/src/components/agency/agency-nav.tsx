'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Users, Building2, Settings } from 'lucide-react';
import { cn } from '@/lib/cn';

const TABS = [
  { href: '/agency', label: 'Portföy', icon: LayoutGrid, exact: true },
  { href: '/agency/clients', label: 'Müşteriler', icon: Building2 },
  { href: '/agency/team', label: 'Ekip', icon: Users },
  { href: '/agency/settings', label: 'Ayarlar', icon: Settings },
];

export function AgencyNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Ajans bölümleri" className="flex items-center gap-1 overflow-x-auto -mx-1 px-1 mb-7">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] whitespace-nowrap transition border',
              active
                ? 'bg-ink text-paper-3 border-ink'
                : 'text-ink-muted border-hairline hover:border-ink hover:text-ink',
            )}
          >
            <t.icon className="w-3.5 h-3.5" aria-hidden /> {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
