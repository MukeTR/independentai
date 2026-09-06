import { NextResponse, after } from 'next/server';
import { route } from '@/server/route';
import { readJson } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { completeOnboarding, type OnboardingInput } from '@/server/accounts';
import { runPromptOnce } from '@/server/run-prompt';
import { audit } from '@/server/audit';
import { log } from '@/server/logger';

export const maxDuration = 120;

/**
 * Tek, transaction-safe onboarding ucu: marka + rakipler + sorular birlikte yazılır,
 * tenant.onboardingCompletedAt set edilir. İlk ölçümler yanıt gönderildikten sonra (after) alınır.
 */
export const POST = route('onboarding.complete', async (req) => {
  const actor = await requireActor({ write: true, role: 'OWNER' });
  const body = await readJson<OnboardingInput>(req);
  const result = await completeOnboarding(actor.tenantId, body);
  await audit({
    action: 'onboarding.complete',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    meta: { prompts: result.prompts.length, competitors: result.competitors },
    req,
  });

  const initial = result.prompts.slice(0, 5); // ilk 5 soru hemen; kalanı gece cron'unda
  after(async () => {
    for (const promptId of initial) {
      try {
        await runPromptOnce(actor.tenantId, promptId, { origin: 'INITIAL', triggeredBy: actor.userId });
      } catch (err) {
        log.warn('onboarding.initial_run_failed', { tenantId: actor.tenantId, promptId, err });
      }
    }
  });

  return NextResponse.json({ ok: true, ...result, initialRuns: initial.length, next: '/dashboard' }, { status: 201 });
});
