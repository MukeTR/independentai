import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/prisma';
import { requireSession, handleRouteError, jsonError } from '@/server/session';

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  aliases: z.array(z.string()).optional(),
  website: z.string().url().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = patchSchema.parse(await req.json());
    const owned = await prisma.brand.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!owned) return jsonError('Bulunamadı', 404);
    const updated = await prisma.brand.update({ where: { id }, data: body });
    return NextResponse.json(updated);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const owned = await prisma.brand.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!owned) return jsonError('Bulunamadı', 404);
    await prisma.brand.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
