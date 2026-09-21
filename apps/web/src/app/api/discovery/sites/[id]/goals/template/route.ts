import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { ClientError, readJson } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { applyGoalTemplate, GOAL_TEMPLATES, listGoals } from '@/server/discovery/goals';

/**
 * POST /api/discovery/sites/:id/goals/template — site türüne uygun hazır hedef paketini uygular.
 * Var olan adlar atlanır (tekrar uygulamak veri bozmaz).
 */
export const POST = route('discovery.goals.template', async (req, ctx) => {
  const actor = await requireActor({ write: true, brandContext: true });
  const id = await requireParam(ctx, 'id');
  const body = await readJson<{ kind?: unknown }>(req);
  const kind = typeof body.kind === 'string' ? body.kind : '';
  if (!GOAL_TEMPLATES[kind]) throw new ClientError('Geçersiz şablon paketi');
  const created = await applyGoalTemplate(actor, id, kind);
  const goals = await listGoals(actor.tenantId, id);
  return NextResponse.json({ created, goals }, { status: 201 });
});
