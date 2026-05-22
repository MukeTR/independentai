import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/prisma';
import { requireSession, handleRouteError } from '@/server/session';

const schema = z.object({
  name: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  website: z.string().url().optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    const list = await prisma.brand.findMany({
      where: { tenantId: session.tenantId, isOwn: true },
      orderBy: { createdAt: 'asc' },
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
    const created = await prisma.brand.create({
      data: { tenantId: session.tenantId, isOwn: true, ...body },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
