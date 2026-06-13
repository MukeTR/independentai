'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, Swords, LayoutGrid, Sparkles } from 'lucide-react';
import { Logo } from './logo';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/dashboard', label: 'Genel Bakış', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/prompts', label: 'Sorular', icon: MessageSquare },
  { href: '/dashboard/competitors', label: 'Rakipler', icon: Swords },
  { href: '/dashboard/tools', label: 'Araçlar', icon: LayoutGrid },
];

export function TopBar({
  user,
}: {
  user: { email: string; tenant: { name: string; trialDaysLeft: number }; isSuperAdmin?: boolean };
}) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  return (
    <header
      className="sticky top-0 z-40 border-b border-hairline"
      style={{ background: 'rgba(247,245,239,0.82)', backdropFilter: 'blur(16px)' }}
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10 h-14 flex items-center justify-between gap-4">
        {/* Left: logo + nav */}
        <div className="flex items-center gap-6 min-w-0">
          <Logo className="shrink-0" />
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => {
              const active = isActive(n.href, n.exact);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition',
                    active ? 'bg-brand-glow text-brand-deep' : 'text-ink-muted hover:text-ink hover:bg-paper-4',
                  )}
                >
                  <n.icon className="w-3.5 h-3.5" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: super admin + trial + user */}
        <div className="flex items-center gap-3 shrink-0">
          {user.isSuperAdmin && (
            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-brand/30 px-2.5 py-1.5 text-[12px] text-brand-deep hover:bg-brand-glow transition"
            >
              <Sparkles className="w-3.5 h-3.5" /> Admin
            </Link>
          )}
          <div className="hidden sm:flex items-center gap-1.5 chip own !text-[11px]">
            <Sparkles className="w-3 h-3" />
            {user.tenant.trialDaysLeft} gün
          </div>
          <Link href="/dashboard/settings" className="flex items-center gap-2 group">
            <div className="text-right leading-tight hidden lg:block">
              <div className="text-[12px] text-ink max-w-[140px] truncate">{user.tenant.name}</div>
              <div className="text-[10px] text-ink-faint font-mono max-w-[140px] truncate">{user.email}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-brand/15 group-hover:bg-brand/25 transition flex items-center justify-center text-[12px] font-semibold text-brand-deep shrink-0">
              {user.tenant.name.slice(0, 1).toUpperCase()}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
