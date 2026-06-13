import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession, handleRouteError } from '@/server/session';
import { hydrateEnvFromConfig } from '@/server/system-config';
import { generateAeoContent } from '@/server/aeo-writer';

export const maxDuration = 60;

const schema = z.object({
  type: z.enum(['faq', 'qa', 'meta', 'social']),
  topic: z.string().min(3).max(200),
  brand: z.string().max(80).optional(),
  notes: z.string().max(400).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ message: 'Geçersiz giriş' }, { status: 400 });

    await hydrateEnvFromConfig();
    const { type, topic, brand, notes } = parsed.data;
    const result = await generateAeoContent(type, topic, brand, notes);
    return NextResponse.json(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
