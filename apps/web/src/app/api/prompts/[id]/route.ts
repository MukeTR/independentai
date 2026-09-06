import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, NotFoundError, ConflictError } from '@/server/errors';
import { prisma } from '@/server/prisma';
import { requireActor } from '@/server/authz';
import { cleanCategory, cleanPromptText, foldKey } from '@/server/normalize';
import { audit } from '@/server/audit';

export const GET = route('prompts.get', async (_req, { params }) => {
  const actor = await requireActor();
  const { id } = await params;
  const prompt = await prisma.prompt.findFirst({
    where: { id, tenantId: actor.tenantId },
    include: {
      runs: { orderBy: { runDate: 'desc' }, take: 30, include: { mentions: { orderBy: { position: 'asc' } } } },
    },
  });
  if (!prompt) throw new NotFoundError();
  return NextResponse.json(prompt);
});

export const PATCH = route('prompts.update', async (req, { params }) => {
  const actor = await requireActor({ write: true });
  const { id } = await params;
  const owned = await prisma.prompt.findFirst({ where: { id, tenantId: actor.tenantId } });
  if (!owned) throw new NotFoundError();
  const body = await readJson<{ text?: unknown; category?: unknown; isActive?: unknown }>(req);
  const data: { text?: string; version?: { increment: number }; category?: string | null; isActive?: boolean } = {};
  if (body.text !== undefined) {
    const text = cleanPromptText(body.text);
    if (text !== owned.text) {
      const dup = await prisma.prompt.findMany({
        where: { tenantId: actor.tenantId, id: { not: id } },
        select: { text: true },
      });
      if (dup.some((p) => foldKey(p.text) === foldKey(text))) throw new ConflictError('Bu soru zaten izleniyor');
      data.text = text;
      data.version = { increment: 1 }; // metin değişti → yeni sürüm; eski run'lar eski sürümü taşır
    }
  }
  if (body.category !== undefined) data.category = cleanCategory(body.category);
  if (body.isActive !== undefined) data.isActive = body.isActive === true;
  const updated = await prisma.prompt.update({ where: { id }, data });
  await audit({
    action: 'prompt.update',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'prompt',
    targetId: id,
    meta: { fields: Object.keys(data) },
    req,
  });
  return NextResponse.json(updated);
});

export const DELETE = route('prompts.delete', async (req, { params }) => {
  const actor = await requireActor({ write: true });
  const { id } = await params;
  const owned = await prisma.prompt.findFirst({ where: { id, tenantId: actor.tenantId } });
  if (!owned) throw new NotFoundError();
  await prisma.prompt.delete({ where: { id } });
  await audit({
    action: 'prompt.delete',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'prompt',
    targetId: id,
    req,
  });
  return NextResponse.json({ ok: true });
});
