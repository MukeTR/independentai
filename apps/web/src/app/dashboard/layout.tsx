import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Sidebar } from '@/components/sidebar';

type Me = {
  id: string;
  email: string;
  name: string | null;
  tenant: { id: string; name: string; trialDaysLeft: number; trialEndsAt: string };
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let me: Me;
  try {
    me = await api<Me>('/auth/me');
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      redirect('/login');
    }
    throw err;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar user={me} />
      <main className="flex-1 p-10 overflow-x-hidden">{children}</main>
    </div>
  );
}
