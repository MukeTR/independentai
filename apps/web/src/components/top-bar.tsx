'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Plus, Bell, ChevronRight } from 'lucide-react';
import { Logo } from './logo';

function sectionLabel(pathname: string): string {
  if (pathname === '/dashboard') return 'Komuta Merkezi';
  if (pathname.startsWith('/dashboard/prompts')) return 'İzlenen Sorular';
  if (pathname.startsWith('/dashboard/competitors')) return 'Rakipler';
  if (pathname.startsWith('/dashboard/tools')) return 'Araçlar';
  if (pathname.startsWith('/dashboard/settings')) return 'Markam';
  if (pathname.startsWith('/dashboard/alerts')) return 'Uyarılar';
  if (pathname.startsWith('/dashboard/api')) return 'API Erişimi';
  return 'Panel';
}

export function TopBar({
  user,
}: {
  user: { email: string; tenant: { name: string; trialDaysLeft: number }; isSuperAdmin?: boolean };
}) {
  const pathname = usePathname();
  const section = sectionLabel(pathname);

  return (
    <header
      className="sticky top-0 z-40 border-b border-hairline"
      style={{ background: 'rgba(247,245,239,0.82)', backdropFilter: 'blur(16px)' }}
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10 h-14 flex items-center justify-between gap-4">
        {/* Left: logo + bağlam başlığı (nav menüsü YOK — o dock'ta) */}
        <div className="flex items-center gap-3 min-w-0">
          <Logo className="shrink-0" />
          <ChevronRight className="w-3.5 h-3.5 text-ink-faint shrink-0 hidden sm:block" />
          <span className="text-[13.5px] text-ink-muted truncate hidden sm:block">{section}</span>
        </div>

        {/* Right: hızlı aksiyon + bildirim + trial + admin + kullanıcı */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/prompts"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-ink text-paper-3 px-3 py-1.5 text-[12.5px] font-medium hover:bg-brand-deep transition"
          >
            <Plus className="w-3.5 h-3.5" /> Yeni Soru
          </Link>
          <Link
            href="/dashboard/alerts"
            className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:bg-paper-4 hover:text-ink transition"
            title="Uyarılar"
          >
            <Bell className="w-4 h-4" />
          </Link>
          {user.isSuperAdmin && (
            <Link
              href="/admin"
              className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-brand/30 px-2.5 py-1.5 text-[12px] text-brand-deep hover:bg-brand-glow transition"
            >
              <Sparkles className="w-3.5 h-3.5" /> Admin
            </Link>
          )}
          <div className="hidden sm:flex items-center gap-1.5 chip own !text-[11px]">
            <Sparkles className="w-3 h-3" />
            {user.tenant.trialDaysLeft} gün
          </div>
          <Link href="/dashboard/settings" className="flex items-center gap-2 group pl-1">
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
