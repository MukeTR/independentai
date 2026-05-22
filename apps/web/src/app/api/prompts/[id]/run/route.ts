import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireSession, handleRouteError, jsonError } from '@/server/session';
import { runPromptOnce } from '@/server/run-prompt';

export const maxDuration = 60; // Vercel hobby max

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const owned = await prisma.prompt.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!owned) return jsonError('Bulunamadı', 404);
    const result = await runPromptOnce(session.tenantId, id);
    return NextResponse.json(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
