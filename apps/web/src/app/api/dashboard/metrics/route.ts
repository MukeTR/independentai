import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { requireActor } from '@/server/authz';
import { getDashboardMetrics } from '@/server/repo';

export const GET = route('dashboard.metrics', async (req) => {
  const actor = await requireActor();
  const raw = Number(new URL(req.url).searchParams.get('days') ?? 30);
  const days = Number.isFinite(raw) ? Math.min(90, Math.max(1, Math.floor(raw))) : 30;
  return NextResponse.json(await getDashboardMetrics(actor.tenantId, days));
});
