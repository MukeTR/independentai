import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/prisma';
import { getSession } from '@/server/session';
import { hydrateEnvFromConfig } from '@/server/system-config';
import { runGeoAudit } from '@/server/geo-audit';

export const maxDuration = 60;

const schema = z.object({ url: z.string().min(3).max(300) });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: 'Geçersiz URL' }, { status: 400 });

    await hydrateEnvFromConfig(); // LLM comprehension pass'i için key'ler
    const session = await getSession();
    const result = await runGeoAudit(parsed.data.url);

    // Sonucu kaydet (giriş yoksa public lead-magnet denetimi olarak)
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

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Denetim başarısız' },
      { status: 500 },
    );
  }
}
