import { NextRequest, NextResponse } from 'next/server';
import { seedDemoData } from '@/server/seed-demo';

export const maxDuration = 60;

/**
 * Prod'da demo tenant + örnek veri oluşturur (idempotent, SADECE demo tenant'ına dokunur).
 * Guard: Authorization: Bearer <CRON_SECRET>. Vercel prod env'inde CRON_SECRET tanımlı.
 *
 * Tetikleme:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://independentai.space/api/admin/seed-demo
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ message: 'Yetkisiz' }, { status: 401 });
  }

  try {
    const result = await seedDemoData();
    return NextResponse.json({ ok: true, ...result, note: 'Demo verisi hazır. demo@independentai.space / demo1234 ile giriş yapabilirsiniz.' });
  } catch (err) {
    console.error('[seed-demo]', err);
    return NextResponse.json({ message: err instanceof Error ? err.message : 'Seed başarısız' }, { status: 500 });
  }
}
