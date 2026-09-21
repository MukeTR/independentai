import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError, PlanLimitError } from '@/server/errors';
import { prisma } from '@/server/prisma';
import { requireActor } from '@/server/authz';

export const GET = route('facts.list', async () => {
  const actor = await requireActor();
  const facts = await prisma.brandFact.findMany({ where: { tenantId: actor.tenantId }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json(facts);
});

export const POST = route('facts.create', async (req) => {
  const actor = await requireActor({ write: true });
  const body = await readJson<{ fact?: unknown }>(req);
  const fact = typeof body.fact === 'string' ? body.fact.replace(/\s+/g, ' ').trim() : '';
  if (fact.length < 3 || fact.length > 300) throw new ClientError('Marka gerçeği 3-300 karakter olmalı');
  const count = await prisma.brandFact.count({ where: { tenantId: actor.tenantId } });
  if (count >= 50) throw new PlanLimitError('En fazla 50 marka gerçeği eklenebilir');
  const created = await prisma.brandFact.create({ data: { tenantId: actor.tenantId, fact } });
  return NextResponse.json(created, { status: 201 });
});

export const DELETE = route('facts.delete', async (req) => {
  const actor = await requireActor({ write: true });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw new ClientError('id gerekli');
  await prisma.brandFact.deleteMany({ where: { id, tenantId: actor.tenantId } });
  return NextResponse.json({ ok: true });
});
