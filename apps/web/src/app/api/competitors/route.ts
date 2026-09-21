import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ConflictError, PlanLimitError } from '@/server/errors';
import { prisma } from '@/server/prisma';
import { requireActor } from '@/server/authz';
import { cleanAliases, cleanName, cleanWebsite, foldKey } from '@/server/normalize';
import { audit } from '@/server/audit';

export const GET = route('competitors.list', async () => {
  const actor = await requireActor();
  const list = await prisma.competitor.findMany({ where: { tenantId: actor.tenantId }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json(list);
});

export const POST = route('competitors.create', async (req) => {
  const actor = await requireActor({ write: true });
  const body = await readJson<{ name?: unknown; aliases?: unknown; website?: unknown }>(req);
  const name = cleanName(body.name, 'Rakip adı');
  const aliases = cleanAliases(body.aliases, name);
  const website = cleanWebsite(body.website);

  const [existing, ownBrands] = await Promise.all([
    prisma.competitor.findMany({ where: { tenantId: actor.tenantId }, select: { name: true, aliases: true } }),
    prisma.brand.findMany({ where: { tenantId: actor.tenantId, isOwn: true }, select: { name: true } }),
  ]);
  if (existing.length >= actor.entitlement.limits.competitors)
    throw new PlanLimitError(`Rakip sınırı (${actor.entitlement.limits.competitors}) doldu`);
  const key = foldKey(name);
  if (ownBrands.some((b) => foldKey(b.name) === key)) throw new ConflictError('Bu ad kendi markanız olarak tanımlı');
  if (existing.some((c) => foldKey(c.name) === key || c.aliases.some((a) => foldKey(a) === key)))
    throw new ConflictError('Bu rakip zaten ekli');

  const created = await prisma.competitor.create({ data: { tenantId: actor.tenantId, name, aliases, website } });
  await audit({
    action: 'competitor.create',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'competitor',
    targetId: created.id,
    req,
  });
  return NextResponse.json(created, { status: 201 });
});
