import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/prisma';
import { requireSession, handleRouteError } from '@/server/session';

export async function GET() {
  try {
    const session = await requireSession();
    const facts = await prisma.brandFact.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(facts);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const parsed = z.object({ fact: z.string().min(3).max(300) }).safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ message: 'Geçersiz' }, { status: 400 });
    const fact = await prisma.brandFact.create({
      data: { tenantId: session.tenantId, fact: parsed.data.fact },
    });
    return NextResponse.json(fact);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSession();
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'id gerekli' }, { status: 400 });
    await prisma.brandFact.deleteMany({ where: { id, tenantId: session.tenantId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
