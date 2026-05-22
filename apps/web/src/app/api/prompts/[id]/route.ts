import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/prisma';
import { requireSession, handleRouteError, jsonError } from '@/server/session';

const patchSchema = z.object({
  text: z.string().min(5).max(500).optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const prompt = await prisma.prompt.findFirst({
      where: { id, tenantId: session.tenantId },
      include: {
        runs: {
          orderBy: { runDate: 'desc' },
          take: 30,
          include: { mentions: { orderBy: { position: 'asc' } } },
        },
      },
    });
    if (!prompt) return jsonError('Bulunamadı', 404);
    return NextResponse.json(prompt);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = patchSchema.parse(await req.json());
    const owned = await prisma.prompt.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!owned) return jsonError('Bulunamadı', 404);
    const updated = await prisma.prompt.update({ where: { id }, data: body });
    return NextResponse.json(updated);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const owned = await prisma.prompt.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!owned) return jsonError('Bulunamadı', 404);
    await prisma.prompt.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
