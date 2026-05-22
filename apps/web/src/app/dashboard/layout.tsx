import { redirect } from 'next/navigation';
import { getSession } from '@/server/session';
import { getMe } from '@/server/repo';
import { Sidebar } from '@/components/sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const me = await getMe(session.userId);
  if (!me) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <Sidebar user={me} />
      <main className="flex-1 p-10 overflow-x-hidden">{children}</main>
    </div>
  );
}
