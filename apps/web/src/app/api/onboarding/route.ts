import { NextResponse, after } from 'next/server';
import { route } from '@/server/route';
import { readJson } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { completeOnboarding, type OnboardingInput } from '@/server/accounts';
import { runPromptOnce } from '@/server/run-prompt';
import { audit } from '@/server/audit';
import { log } from '@/server/logger';
import { prisma } from '@/server/prisma';
import { cleanWebsite } from '@/server/normalize';
import { isSectorSlug } from '@/lib/tool-registry';
import { runFirstSiteScan } from '@/server/first-scan';
import { computeTenantSignal } from '@/server/agency-signal';

export const maxDuration = 120;

/**
 * Tek, transaction-safe onboarding ucu: marka + rakipler + sorular birlikte yazılır,
 * tenant.onboardingCompletedAt set edilir. İlk ölçümler yanıt gönderildikten sonra (after) alınır.
 * Sektör seçimi (`industry`, SECTOR_SLUGS) Tenant.industry'ye yazılır; ardından ilk site taraması
 * (mevcut AI Crawler motoru, 20 s, hata yutulur) ve ajans sinyali hesabı da `after()` içinde koşar.
 */
export const POST = route('onboarding.complete', async (req) => {
  const actor = await requireActor({ write: true, role: 'OWNER' });
  const body = await readJson<OnboardingInput & { industry?: unknown }>(req);
  const result = await completeOnboarding(actor.tenantId, body);
  const industry = isSectorSlug(body.industry) ? body.industry : null;
  if (industry) await prisma.tenant.update({ where: { id: actor.tenantId }, data: { industry } });
  const website = cleanWebsite(body.brand?.website) ?? actor.tenant.website;
  await audit({
    action: 'onboarding.complete',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    meta: { prompts: result.prompts.length, competitors: result.competitors, industry, firstScan: !!website },
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
    // İlk site taraması + ajans sinyali: her ikisi de kendi içinde hata yutar; onboarding sonucunu etkilemez.
    await runFirstSiteScan(actor.tenantId, website);
    try {
      await computeTenantSignal(actor.tenantId);
    } catch (err) {
      log.warn('onboarding.agency_signal_failed', { tenantId: actor.tenantId, err });
    }
  });

  return NextResponse.json(
    { ok: true, ...result, initialRuns: initial.length, firstScan: !!website, next: '/dashboard' },
    { status: 201 },
  );
});
