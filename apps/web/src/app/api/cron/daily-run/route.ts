import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { runPromptOnce } from '@/server/run-prompt';

export const maxDuration = 60; // Vercel hobby max

/**
 * Vercel Cron daily endpoint — vercel.json'da "0 23 * * *" (23:00 UTC = 02:00 TR) ile tetiklenir.
 *
 * Auth: Vercel Cron istekleri otomatik olarak `Authorization: Bearer <CRON_SECRET>` header'ı yollar.
 * https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ message: 'Yetkisiz' }, { status: 401 });
  }

  const prompts = await prisma.prompt.findMany({
    where: { isActive: true },
    select: { id: true, tenantId: true },
  });

  // Tüm tenant'ların tüm aktif promptlarını sırayla çalıştır.
  // Provider çağrıları run-prompt içinde paralel; her prompt için ~3-5sn.
  // 60s timeout → ~10-15 prompt güvenle döner.
  // Daha fazlası gerekirse cron'u parçalamak için ek endpoint açarız.
  const results: { promptId: string; ok: boolean; error?: string }[] = [];
  for (const p of prompts) {
    try {
      await runPromptOnce(p.tenantId, p.id);
      results.push({ promptId: p.id, ok: true });
    } catch (err) {
      results.push({
        promptId: p.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    processed: results.length,
    failed: results.filter((r) => !r.ok).length,
    timestamp: new Date().toISOString(),
  });
}
