import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/prisma';
import { getSession } from '@/server/session';
import { hydrateEnvFromConfig } from '@/server/system-config';
import { runContentAudit } from '@/server/content-audit';

export const maxDuration = 60;

const schema = z.object({ url: z.string().min(3).max(300) });

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ message: 'Geçersiz URL' }, { status: 400 });

    await hydrateEnvFromConfig();
    const session = await getSession();
    const result = await runContentAudit(parsed.data.url);

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

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : 'Hata' }, { status: 500 });
  }
}
