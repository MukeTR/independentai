import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError, NotFoundError, PlanLimitError } from '@/server/errors';
import { prisma } from '@/server/prisma';
import { requireActor } from '@/server/authz';
import { generateToken, API_SCOPES } from '@/server/api-token';
import { audit } from '@/server/audit';

const select = {
  id: true,
  name: true,
  prefix: true,
  scopes: true,
  lastUsedAt: true,
  createdAt: true,
  expiresAt: true,
  revokedAt: true,
} as const;

export const GET = route('tokens.list', async () => {
  const actor = await requireActor({ role: 'OWNER' });
  const tokens = await prisma.apiToken.findMany({
    where: { tenantId: actor.tenantId, revokedAt: null },
    select,
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(tokens);
});

/** Yalnızca OWNER token üretebilir. Düz metin token yalnızca bu yanıtta bir kez döner. */
export const POST = route('tokens.create', async (req) => {
  const actor = await requireActor({ role: 'OWNER', write: true });
  const body = await readJson<{ name?: unknown; expiresInDays?: unknown }>(req);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 1 || name.length > 60) throw new ClientError('Token adı 1-60 karakter olmalı');
  let expiresAt: Date | null = null;
  if (body.expiresInDays !== undefined && body.expiresInDays !== null) {
    const d = Number(body.expiresInDays);
    if (!Number.isInteger(d) || d < 1 || d > 365) throw new ClientError('Geçerlilik 1-365 gün olmalı');
    expiresAt = new Date(Date.now() + d * 86_400_000);
  }
  const active = await prisma.apiToken.count({ where: { tenantId: actor.tenantId, revokedAt: null } });
  if (active >= actor.entitlement.limits.apiTokens)
    throw new PlanLimitError(`Aktif token sınırı (${actor.entitlement.limits.apiTokens}) doldu`);

  const { token, hash, prefix } = generateToken();
  const rec = await prisma.apiToken.create({
    data: {
      tenantId: actor.tenantId,
      name,
      tokenHash: hash,
      prefix,
      scopes: [...API_SCOPES],
      createdById: actor.userId,
      expiresAt,
    },
    select,
  });
  await audit({
    action: 'api_token.create',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'api_token',
    targetId: rec.id,
    req,
  });
  return NextResponse.json({ ...rec, token }, { status: 201 });
});

/** İptal (revoke): satır silinmez, revokedAt set edilir (denetim izi korunur). */
export const DELETE = route('tokens.revoke', async (req) => {
  const actor = await requireActor({ role: 'OWNER' });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw new ClientError('id gerekli');
  const res = await prisma.apiToken.updateMany({
    where: { id, tenantId: actor.tenantId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (res.count === 0) throw new NotFoundError('Token bulunamadı');
  await audit({
    action: 'api_token.revoke',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'api_token',
    targetId: id,
    req,
  });
  return NextResponse.json({ ok: true });
});
