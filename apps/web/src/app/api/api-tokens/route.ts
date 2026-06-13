import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/prisma';
import { requireSession, handleRouteError } from '@/server/session';
import { generateToken } from '@/server/api-token';

export async function GET() {
  try {
    const session = await requireSession();
    const tokens = await prisma.apiToken.findMany({
      where: { tenantId: session.tenantId },
      select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(tokens);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const parsed = z.object({ name: z.string().min(1).max(60) }).safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ message: 'İsim gerekli' }, { status: 400 });

    const { token, hash, prefix } = generateToken();
    const rec = await prisma.apiToken.create({
      data: { tenantId: session.tenantId, name: parsed.data.name, tokenHash: hash, prefix },
      select: { id: true, name: true, prefix: true, createdAt: true },
    });
    // Plaintext token sadece burada bir kez döner
    return NextResponse.json({ ...rec, token });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSession();
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'id gerekli' }, { status: 400 });
    await prisma.apiToken.deleteMany({ where: { id, tenantId: session.tenantId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
