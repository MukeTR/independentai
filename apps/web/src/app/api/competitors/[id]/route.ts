import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, NotFoundError } from '@/server/errors';
import { prisma } from '@/server/prisma';
import { requireActor } from '@/server/authz';
import { cleanAliases, cleanName, cleanWebsite } from '@/server/normalize';
import { audit } from '@/server/audit';

export const PATCH = route('competitors.update', async (req, { params }) => {
  const actor = await requireActor({ write: true });
  const { id } = await params;
  const owned = await prisma.competitor.findFirst({ where: { id, tenantId: actor.tenantId } });
  if (!owned) throw new NotFoundError();
  const body = await readJson<{ name?: unknown; aliases?: unknown; website?: unknown }>(req);
  const name = body.name !== undefined ? cleanName(body.name, 'Rakip adı') : owned.name;
  const updated = await prisma.competitor.update({
    where: { id },
    data: {
      name,
      ...(body.aliases !== undefined ? { aliases: cleanAliases(body.aliases, name) } : {}),
      ...(body.website !== undefined ? { website: cleanWebsite(body.website) } : {}),
    },
  });
  return NextResponse.json(updated);
});

export const DELETE = route('competitors.delete', async (req, { params }) => {
  const actor = await requireActor({ write: true });
  const { id } = await params;
  const owned = await prisma.competitor.findFirst({ where: { id, tenantId: actor.tenantId } });
  if (!owned) throw new NotFoundError();
  await prisma.competitor.delete({ where: { id } });
  await audit({
    action: 'competitor.delete',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'competitor',
    targetId: id,
    req,
  });
  return NextResponse.json({ ok: true });
});
