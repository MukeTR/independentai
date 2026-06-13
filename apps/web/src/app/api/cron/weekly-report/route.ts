import { NextRequest, NextResponse } from 'next/server';
import { runWeeklyReports } from '@/server/notify';

export const maxDuration = 60;

/**
 * Haftalık rapor cron'u — vercel.json'da haftada bir tetiklenir.
 * Auth: Vercel Cron otomatik `Authorization: Bearer <CRON_SECRET>` yollar.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ message: 'Yetkisiz' }, { status: 401 });
  }

  const result = await runWeeklyReports();
  return NextResponse.json({ ...result, timestamp: new Date().toISOString() });
}
