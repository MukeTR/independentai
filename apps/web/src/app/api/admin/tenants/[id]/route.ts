import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError, NotFoundError } from '@/server/errors';
import { requireSuperAdmin } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { audit } from '@/server/audit';

/** Süper admin: plan atama ve deneme süresini uzatma (fiyat/ödeme sağlayıcısı gelene kadar elle). */
export const PATCH = route('admin.tenant_update', async (req, { params }) => {
  const actor = await requireSuperAdmin();
  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) throw new NotFoundError('Tenant bulunamadı');
  const body = await readJson<{ plan?: unknown; trialEndsAt?: unknown }>(req);
  const data: { plan?: 'LAUNCH' | 'STARTER' | 'GROWTH'; trialEndsAt?: Date } = {};
  if (body.plan !== undefined) {
    if (body.plan !== 'LAUNCH' && body.plan !== 'STARTER' && body.plan !== 'GROWTH')
      throw new ClientError('Geçersiz plan');
    data.plan = body.plan;
  }
  if (body.trialEndsAt !== undefined) {
    const d = new Date(String(body.trialEndsAt));
    if (Number.isNaN(d.getTime())) throw new ClientError('Geçersiz tarih');
    data.trialEndsAt = d;
  }
  const updated = await prisma.tenant.update({ where: { id }, data });
  await audit({
    action: 'admin.tenant_update',
    actorUserId: actor.userId,
    targetType: 'tenant',
    targetId: id,
    meta: data,
    req,
  });
  return NextResponse.json({ id: updated.id, plan: updated.plan, trialEndsAt: updated.trialEndsAt });
});
