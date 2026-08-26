import { NextRequest, NextResponse } from 'next/server';
import { runDuePrompts } from '@/server/run-prompt';
import { runDailyDropAlerts } from '@/server/notify';

export const maxDuration = 60; // Vercel hobby max

// Prompt turu için ayrılan süre; kalanı düşüş uyarılarına bırakılır.
const PROMPT_BUDGET_MS = 45_000;

/**
 * Vercel Cron daily endpoint — vercel.json'da "0 23 * * *" (23:00 UTC = 02:00 TR) ile tetiklenir.
 *
 * Auth: Vercel Cron istekleri otomatik olarak `Authorization: Bearer <CRON_SECRET>` header'ı yollar.
 * https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
 *
 * Bütçe dolarsa kalan promptlar bir sonraki tetiklemeye devreder (`remaining`),
 * aynı gün çalışmış promptlar tekrar çalıştırılmaz.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ message: 'Yetkisiz' }, { status: 401 });
  }

  const startedAt = Date.now();
  const runs = await runDuePrompts({ deadlineAt: startedAt + PROMPT_BUDGET_MS });

  // Veri tazelendikten sonra düşüş uyarılarını değerlendir (süre kaldıysa).
  let alerts: { alerted: number; checked: number } | { skipped: true } = { skipped: true };
  if (Date.now() - startedAt < PROMPT_BUDGET_MS) {
    alerts = await runDailyDropAlerts();
  }

  return NextResponse.json({
    ...runs,
    alerts,
    durationMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  });
}
