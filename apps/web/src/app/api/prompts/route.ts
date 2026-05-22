import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/prisma';
import { requireSession, handleRouteError } from '@/server/session';

const schema = z.object({
  text: z.string().min(5).max(500),
  category: z.string().optional(),
  language: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    const list = await prisma.prompt.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { runs: true } } },
    });
    return NextResponse.json(list);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = schema.parse(await req.json());
    const created = await prisma.prompt.create({
      data: {
        tenantId: session.tenantId,
        text: body.text,
        category: body.category,
        language: body.language ?? 'tr',
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
