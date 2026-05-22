import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireSession, handleRouteError, jsonError } from '@/server/session';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const owned = await prisma.competitor.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!owned) return jsonError('Bulunamadı', 404);
    await prisma.competitor.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
