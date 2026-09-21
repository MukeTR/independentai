import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { requireSuperAdmin } from '@/server/authz';
import { getAdminStats } from '@/server/admin-stats';

/** Süper admin: /admin KPI şeridi verisi (JSON; sayfa aynı fonksiyonu doğrudan çağırır). */
export const GET = route('admin.stats', async () => {
  await requireSuperAdmin();
  return NextResponse.json(await getAdminStats());
});
