import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/server/session';
import { prisma } from '@/server/prisma';
import { Logo } from '@/components/logo';
import {
  LayoutDashboard,
  Building2,
  Users as UsersIcon,
  Activity,
  Settings as SettingsIcon,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';

export const metadata = { robots: { index: false, follow: false } };

const ADMIN_NAV = [
  { href: '/admin', label: 'Genel Bakış', icon: LayoutDashboard, exact: true },
  { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
  { href: '/admin/users', label: 'Kullanıcılar', icon: UsersIcon },
  { href: '/admin/runs', label: 'Run kayıtları', icon: Activity },
  { href: '/admin/system', label: 'Sistem', icon: SettingsIcon },
  { href: '/admin/system/api-keys', label: 'API Keys', icon: KeyRound },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isSuperAdmin: true, email: true, sessionVersion: true },
  });
  if (!user?.isSuperAdmin || user.sessionVersion !== session.sv) redirect('/dashboard');

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="w-full md:w-[240px] shrink-0 border-b md:border-b-0 md:border-r border-hairline bg-paper-2 md:min-h-screen flex flex-col">
        <div className="p-5">
          <Logo />
          <div className="chip own !text-[10px] mt-3">Super Admin</div>
        </div>

        <nav aria-label="Admin gezinmesi" className="px-3 mt-2 flex-1 flex md:flex-col gap-1 overflow-x-auto">
          {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] mb-1 text-ink-muted hover:text-ink hover:bg-paper-3"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t-hairline border-hairline">
          <Link href="/dashboard" className="flex items-center gap-2 text-[12px] text-ink-muted hover:text-ink">
            <ArrowLeft className="w-3.5 h-3.5" />
            Tenant dashboard'una dön
          </Link>
          <div className="text-[10.5px] text-ink-faint font-mono mt-3 truncate">{user.email}</div>
        </div>
      </aside>

      <main className="flex-1 p-5 md:p-10 overflow-x-hidden min-w-0">{children}</main>
    </div>
  );
}
