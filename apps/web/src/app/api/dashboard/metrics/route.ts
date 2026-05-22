import { NextRequest, NextResponse } from 'next/server';
import { requireSession, handleRouteError } from '@/server/session';
import { getDashboardMetrics } from '@/server/repo';

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const days = Number(req.nextUrl.searchParams.get('days') ?? 30);
    const metrics = await getDashboardMetrics(session.tenantId, days);
    return NextResponse.json(metrics);
  } catch (err) {
    return handleRouteError(err);
  }
}
