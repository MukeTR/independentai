import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ConflictError } from '@/server/errors';
import { prisma } from '@/server/prisma';
import { requireActor } from '@/server/authz';
import { cleanAliases, cleanName, cleanWebsite } from '@/server/normalize';
import { audit } from '@/server/audit';

export const GET = route('brands.list', async () => {
  const actor = await requireActor();
  const list = await prisma.brand.findMany({
    where: { tenantId: actor.tenantId, isOwn: true },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(list);
});

/** Lansmanda hesap başına 1 kendi markası (entitlement.limits.ownBrands). */
export const POST = route('brands.create', async (req) => {
  const actor = await requireActor({ write: true });
  const body = await readJson<{ name?: unknown; aliases?: unknown; website?: unknown }>(req);
  const name = cleanName(body.name, 'Marka adı');
  const aliases = cleanAliases(body.aliases, name);
  const website = cleanWebsite(body.website);

  const count = await prisma.brand.count({ where: { tenantId: actor.tenantId, isOwn: true } });
  if (count >= actor.entitlement.limits.ownBrands) {
    throw new ConflictError(
      `Bu planda en fazla ${actor.entitlement.limits.ownBrands} kendi markası tanımlanabilir. Mevcut markayı düzenleyin.`,
    );
  }
  const created = await prisma.brand.create({
    data: { tenantId: actor.tenantId, isOwn: true, name, aliases, website },
  });
  await audit({
    action: 'brand.create',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'brand',
    targetId: created.id,
    req,
  });
  return NextResponse.json(created, { status: 201 });
});
