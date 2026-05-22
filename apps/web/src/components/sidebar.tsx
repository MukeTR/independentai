'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, Swords, Settings, LogOut } from 'lucide-react';
import { Logo } from './logo';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/dashboard', label: 'Genel Bakış', icon: LayoutDashboard },
  { href: '/dashboard/prompts', label: 'İzlenen Sorular', icon: MessageSquare },
  { href: '/dashboard/competitors', label: 'Rakipler', icon: Swords },
  { href: '/dashboard/settings', label: 'Markam', icon: Settings },
];

export function Sidebar({ user }: { user: { email: string; tenant: { name: string; trialDaysLeft: number } } }) {
  const pathname = usePathname();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  return (
    <aside className="w-[260px] shrink-0 border-r-hairline border-hairline bg-paper-2 min-h-screen flex flex-col">
      <div className="p-6">
        <Logo />
      </div>

      <nav className="px-3 mt-2 flex-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] mb-1 transition',
                active
                  ? 'bg-paper-3 text-ink border-hairline border'
                  : 'text-ink-muted hover:text-ink hover:bg-paper-3',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 m-3 card bg-brand-glow border-brand/20">
        <div className="eyebrow text-brand-deep">Ücretsiz deneme</div>
        <div className="font-display text-[20px] mt-1.5">{user.tenant.trialDaysLeft} gün kaldı</div>
        <div className="text-[11px] text-ink-muted mt-1">İlk 6 ay tüm kullanıcılara hediye.</div>
      </div>

      <div className="p-4 border-t-hairline border-hairline flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[12px] text-ink truncate">{user.tenant.name}</div>
          <div className="text-[10.5px] text-ink-faint truncate font-mono">{user.email}</div>
        </div>
        <button onClick={logout} className="text-ink-faint hover:text-danger" title="Çıkış">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
