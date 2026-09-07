import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { readJson } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { deleteGoal, updateGoal } from '@/server/discovery/goals';
import { getOwnedSite } from '@/server/discovery/sites';

/** PATCH — hedefi günceller; yalnızca `isActive` gönderilirse aktif/pasif anahtarı gibi davranır. */
export const PATCH = route('discovery.goals.update', async (req, ctx) => {
  const actor = await requireActor({ write: true, brandContext: true });
  const siteId = await requireParam(ctx, 'id');
  const goalId = await requireParam(ctx, 'goalId');
  await getOwnedSite(actor, siteId);
  const body = await readJson<Record<string, unknown>>(req);
  const goal = await updateGoal(actor, goalId, body);
  return NextResponse.json({ goal });
});

/** DELETE — hedefi siler; geçmiş dönüşüm kayıtları hedefsiz kalır, olay verisi silinmez. */
export const DELETE = route('discovery.goals.delete', async (_req, ctx) => {
  const actor = await requireActor({ write: true, brandContext: true });
  const siteId = await requireParam(ctx, 'id');
  const goalId = await requireParam(ctx, 'goalId');
  await getOwnedSite(actor, siteId);
  await deleteGoal(actor, goalId);
  return NextResponse.json({ ok: true });
});
