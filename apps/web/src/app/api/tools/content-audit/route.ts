import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/prisma';
import { getSession } from '@/server/session';
import { hydrateEnvFromConfig } from '@/server/system-config';
import { runContentAudit } from '@/server/content-audit';
import { rateLimit, clientIp } from '@/server/rate-limit';

export const maxDuration = 60;

const schema = z.object({ url: z.string().min(3).max(300) });

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session && rateLimit(`content-audit:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ message: 'Saatlik limit aşıldı. Tam erişim için kayıt olun.' }, { status: 429 });
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ message: 'Geçersiz URL' }, { status: 400 });

    await hydrateEnvFromConfig();
    const result = await runContentAudit(parsed.data.url);

    // best-effort persist
    try {
      await prisma.audit.create({
        data: {
          tenantId: session?.tenantId ?? null,
          kind: 'CONTENT',
          url: result.url,
          overallScore: result.contentScore,
          breakdown: result.stats,
          findings: [{ category: 'Özet', status: 'pass', title: 'Özet', detail: result.summary }],
          recommendations: result.recommendations,
        },
      });
    } catch (e) {
      console.error('[content-audit persist]', e);
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : 'Hata' }, { status: 500 });
  }
}
