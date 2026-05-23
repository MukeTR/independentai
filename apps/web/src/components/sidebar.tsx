'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, Swords, Settings, LogOut, Wrench, Sparkles } from 'lucide-react';
import { Logo } from './logo';
import { cn } from '@/lib/cn';

const NAV_MAIN = [
  { href: '/dashboard', label: 'Genel Bakış', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/prompts', label: 'İzlenen Sorular', icon: MessageSquare },
  { href: '/dashboard/competitors', label: 'Rakipler', icon: Swords },
];

const NAV_TOOLS = [
  { href: '/dashboard/tools', label: 'Tüm Araçlar', icon: Wrench, exact: true },
  { href: '/dashboard/tools/llms-txt', label: 'llms.txt' },
  { href: '/dashboard/tools/robots', label: 'robots.txt' },
  { href: '/dashboard/tools/schema', label: 'Schema markup' },
  { href: '/dashboard/tools/audit', label: 'GEO Audit' },
  { href: '/dashboard/tools/visibility', label: 'Visibility hesaplayıcı' },
  { href: '/dashboard/tools/checklist', label: 'SEO checklist' },
];

const NAV_BOTTOM = [
  { href: '/dashboard/settings', label: 'Markam', icon: Settings },
];

export function Sidebar({ user }: { user: { email: string; tenant: { name: string; trialDaysLeft: number }; isSuperAdmin?: boolean } }) {
  const pathname = usePathname();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="w-[260px] shrink-0 border-r-hairline border-hairline bg-paper-2 min-h-screen flex flex-col">
      <div className="p-6">
        <Logo />
      </div>

      <nav className="px-3 flex-1 overflow-y-auto">
        {/* Main nav */}
        {NAV_MAIN.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] mb-1 transition',
                active
                  ? 'bg-paper-3 text-ink border-hairline border shadow-sm'
                  : 'text-ink-muted hover:text-ink hover:bg-paper-3',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}

        {/* Tools section */}
        <div className="mt-6 mb-2 px-3 flex items-center gap-2">
          <Wrench className="w-3 h-3 text-ink-faint" />
          <div className="eyebrow !text-[9.5px]">Araçlar</div>
        </div>
        {NAV_TOOLS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-[12.5px] mb-0.5 transition',
                active
                  ? 'bg-paper-3 text-ink border-hairline border'
                  : 'text-ink-muted hover:text-ink hover:bg-paper-3',
                'pl-9',
              )}
            >
              {Icon && <Icon className="w-3.5 h-3.5 -ml-6" />}
              {label}
            </Link>
          );
        })}

        {/* Settings */}
        <div className="mt-6">
          {NAV_BOTTOM.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
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
          {user.isSuperAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] mb-1 text-brand-deep hover:bg-brand-glow border-hairline border border-brand/30 transition"
            >
              <Sparkles className="w-4 h-4" />
              Super Admin
            </Link>
          )}
        </div>
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
