import { NextResponse, type NextRequest } from 'next/server';
import { seedDemoData } from '@/server/seed-demo';
import { cronAuthorized } from '@/server/cron-auth';
import { isProduction } from '@/server/env';
import { log } from '@/server/logger';

export const maxDuration = 120;

/**
 * Demo tenant + örnek veri (idempotent, SADECE demo tenant'ına dokunur).
 * Guard: Authorization: Bearer <CRON_SECRET>. Production'da ayrıca IAI_ALLOW_DEMO_SEED=1 şart.
 */
export async function POST(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ message: 'Yetkisiz', code: 'unauthorized' }, { status: 401 });
  if (isProduction() && process.env.IAI_ALLOW_DEMO_SEED !== '1') {
    return NextResponse.json(
      { message: "Production'da demo seed kapalı (IAI_ALLOW_DEMO_SEED=1 gerekli)", code: 'forbidden' },
      { status: 403 },
    );
  }
  try {
    const result = await seedDemoData();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    log.error('seed-demo.failed', { err });
    return NextResponse.json({ message: 'Seed başarısız', code: 'internal' }, { status: 500 });
  }
}
