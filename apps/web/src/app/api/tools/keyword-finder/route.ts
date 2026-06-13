import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession, handleRouteError } from '@/server/session';
import { hydrateEnvFromConfig } from '@/server/system-config';
import { findPromptIdeas } from '@/server/keyword-finder';

export const maxDuration = 60;

const schema = z.object({ topic: z.string().min(2).max(120), industry: z.string().max(80).optional() });

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ message: 'Geçersiz konu' }, { status: 400 });

    await hydrateEnvFromConfig();
    const ideas = await findPromptIdeas(parsed.data.topic, parsed.data.industry);
    return NextResponse.json({ ideas });
  } catch (err) {
    return handleRouteError(err);
  }
}
