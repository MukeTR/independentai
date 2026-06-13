import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/prisma';
import { getSession } from '@/server/session';
import { hydrateEnvFromConfig } from '@/server/system-config';
import { runGeoAudit } from '@/server/geo-audit';
import { rateLimit, clientIp } from '@/server/rate-limit';

export const maxDuration = 60;

const schema = z.object({ url: z.string().min(3).max(300) });

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    // Public lead-magnet: giriş yoksa IP başına saatlik limit (DoS + LLM maliyet koruması)
    if (!session && rateLimit(`geo-audit:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ message: 'Saatlik limit aşıldı. Tam erişim için kayıt olun.' }, { status: 429 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: 'Geçersiz URL' }, { status: 400 });

    await hydrateEnvFromConfig(); // LLM comprehension pass'i için key'ler
    const result = await runGeoAudit(parsed.data.url);

    // Sonucu kaydet — best-effort: DB yazımı patlasa bile kullanıcı denetim sonucunu alır.
    try {
      await prisma.audit.create({
        data: {
          tenantId: session?.tenantId ?? null,
          kind: 'GEO',
          url: result.url,
          overallScore: result.overallScore,
          breakdown: result.breakdown,
          findings: result.findings,
        },
      });
    } catch (e) {
      console.error('[geo-audit persist]', e);
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Denetim başarısız' },
      { status: 500 },
    );
  }
}
