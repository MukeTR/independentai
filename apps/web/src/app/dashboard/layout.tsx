import { redirect } from 'next/navigation';
import { getSession } from '@/server/session';
import { getMe } from '@/server/repo';
import { DockNav } from '@/components/dock-nav';
import { TopBar } from '@/components/top-bar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const me = await getMe(session.userId);
  if (!me) redirect('/login');

  return (
    <div className="min-h-screen">
      <TopBar user={me} />
      <main className="mx-auto max-w-[1280px] px-6 lg:px-10 pt-7 pb-28">{children}</main>
      <DockNav user={me} />
    </div>
  );
}
