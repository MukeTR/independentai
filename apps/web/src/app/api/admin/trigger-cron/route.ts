import { NextResponse } from 'next/server';
import { requireSuperAdmin, triggerManualCron, ForbiddenError } from '@/server/admin';
import { UnauthorizedError } from '@/server/session';

export const maxDuration = 60;

export async function POST() {
  try {
    await requireSuperAdmin();
    const result = await triggerManualCron();
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ message: 'Yetkisiz' }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: err instanceof Error ? err.message : 'Hata' }, { status: 500 });
  }
}
