import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/prisma';
import { requireSession, handleRouteError } from '@/server/session';
import { hydrateEnvFromConfig } from '@/server/system-config';
import { runCannibalization } from '@/server/cannibalization';

export const maxDuration = 60;

const schema = z.object({ input: z.string().min(5).max(4000) });

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ message: 'Geçersiz giriş' }, { status: 400 });

    await hydrateEnvFromConfig(); // OpenAI embedding key'i için
    const result = await runCannibalization(parsed.data.input);

    // Embedding'leri ileride yeniden kullanmak için saklamıyoruz (anlık analiz),
    // ama tenant'ın son analiz sonucunu audit gibi kaydetmek istersek burada yapılır.
    void session;

    return NextResponse.json(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
