import { NextResponse, after } from 'next/server';
import { route } from '@/server/route';
import { readJson, ConflictError, PlanLimitError } from '@/server/errors';
import { prisma } from '@/server/prisma';
import { requireActor } from '@/server/authz';
import { cleanCategory, cleanLanguage, cleanPromptText, foldKey } from '@/server/normalize';
import { runPromptOnce } from '@/server/run-prompt';
import { audit } from '@/server/audit';
import { log } from '@/server/logger';

export const maxDuration = 120; // ilk çalıştırma yanıttan sonra devam eder

export const GET = route('prompts.list', async () => {
  const actor = await requireActor();
  const list = await prisma.prompt.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { runs: { where: { status: 'SUCCESS' } } } } },
  });
  return NextResponse.json(list);
});

export const POST = route('prompts.create', async (req) => {
  const actor = await requireActor({ write: true });
  const body = await readJson<{ text?: unknown; category?: unknown; language?: unknown }>(req);
  const text = cleanPromptText(body.text);
  const category = cleanCategory(body.category);
  const language = cleanLanguage(body.language);

  const existing = await prisma.prompt.findMany({ where: { tenantId: actor.tenantId }, select: { text: true } });
  if (existing.length >= actor.entitlement.limits.prompts)
    throw new PlanLimitError(`Soru sınırı (${actor.entitlement.limits.prompts}) doldu`);
  const key = foldKey(text);
  if (existing.some((p) => foldKey(p.text) === key)) throw new ConflictError('Bu soru zaten izleniyor');

  const created = await prisma.prompt.create({ data: { tenantId: actor.tenantId, text, category, language } });
  await audit({
    action: 'prompt.create',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'prompt',
    targetId: created.id,
    req,
  });

  // İlk ölçümü cron'u beklemeden al; yanıtı bloklamaz.
  after(async () => {
    try {
      await runPromptOnce(actor.tenantId, created.id, { origin: 'INITIAL', triggeredBy: actor.userId });
    } catch (err) {
      log.warn('prompts.initial_run_failed', { tenantId: actor.tenantId, promptId: created.id, err });
    }
  });
  return NextResponse.json(created, { status: 201 });
});
