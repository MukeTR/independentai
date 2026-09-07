import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { requireSuperAdmin } from '@/server/authz';
import { queueSummary } from '@/server/run-prompt';
import { prisma } from '@/server/prisma';

/** Cron/kuyruk gözlemi: bekleyen/çalışan/hatalı sayıları, son batch'ler, son bildirimler. */
export const GET = route('admin.jobs', async () => {
  await requireSuperAdmin();
  const [queue, notifications, recentErrors] = await Promise.all([
    queueSummary(),
    prisma.notificationLog.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.modelRun.findMany({
      where: { status: 'ERROR' },
      orderBy: { runDate: 'desc' },
      take: 20,
      select: {
        id: true,
        provider: true,
        errorCode: true,
        runDate: true,
        attempt: true,
        origin: true,
        prompt: { select: { tenantId: true } },
      },
    }),
  ]);
  return NextResponse.json({ queue, notifications, recentErrors });
});
