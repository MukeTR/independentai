import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, NotFoundError } from '@/server/errors';
import { prisma } from '@/server/prisma';
import { requireActor } from '@/server/authz';
import { cleanAliases, cleanName, cleanWebsite } from '@/server/normalize';
import { audit } from '@/server/audit';

export const PATCH = route('brands.update', async (req, { params }) => {
  const actor = await requireActor({ write: true });
  const { id } = await params;
  const body = await readJson<{ name?: unknown; aliases?: unknown; website?: unknown }>(req);
  const owned = await prisma.brand.findFirst({ where: { id, tenantId: actor.tenantId } });
  if (!owned) throw new NotFoundError();
  const name = body.name !== undefined ? cleanName(body.name, 'Marka adı') : owned.name;
  const data = {
    name,
    ...(body.aliases !== undefined ? { aliases: cleanAliases(body.aliases, name) } : {}),
    ...(body.website !== undefined ? { website: cleanWebsite(body.website) } : {}),
  };
  const updated = await prisma.brand.update({ where: { id }, data });
  await audit({
    action: 'brand.update',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'brand',
    targetId: id,
    req,
  });
  return NextResponse.json(updated);
});

export const DELETE = route('brands.delete', async (req, { params }) => {
  const actor = await requireActor({ write: true, role: 'OWNER' });
  const { id } = await params;
  const owned = await prisma.brand.findFirst({ where: { id, tenantId: actor.tenantId } });
  if (!owned) throw new NotFoundError();
  await prisma.brand.delete({ where: { id } });
  await audit({
    action: 'brand.delete',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'brand',
    targetId: id,
    req,
  });
  return NextResponse.json({ ok: true });
});
