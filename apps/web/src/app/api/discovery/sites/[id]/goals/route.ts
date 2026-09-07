import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { readJson } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { createGoal, GOAL_TEMPLATES, listGoals } from '@/server/discovery/goals';
import { getOwnedSite } from '@/server/discovery/sites';

/**
 * GET /api/discovery/sites/:id/goals — sitenin dönüşüm hedefleri + site türüne uygun şablon paketi.
 * Sahiplik önce `getOwnedSite` ile doğrulanır: başka tenant'ın site id'si 404.
 */
export const GET = route('discovery.goals.list', async (_req, ctx) => {
  const actor = await requireActor({ brandContext: true });
  const id = await requireParam(ctx, 'id');
  const site = await getOwnedSite(actor, id);
  const goals = await listGoals(actor.tenantId, site.id);
  const kind = site.siteKind && GOAL_TEMPLATES[site.siteKind] ? site.siteKind : 'other';
  return NextResponse.json({ goals, template: { kind, items: GOAL_TEMPLATES[kind] ?? [] } });
});

/** POST — tek hedef ekler (PATH / EVENT / DATA_ATTRIBUTE). */
export const POST = route('discovery.goals.create', async (req, ctx) => {
  const actor = await requireActor({ write: true, brandContext: true });
  const id = await requireParam(ctx, 'id');
  const body = await readJson<Record<string, unknown>>(req);
  const goal = await createGoal(actor, id, body);
  return NextResponse.json({ goal }, { status: 201 });
});
