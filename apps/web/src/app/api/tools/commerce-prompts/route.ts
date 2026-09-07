import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { requireActor } from '@/server/authz';
import { suggestCommercePrompts, type PromptLanguage } from '@/server/commerce/prompt-suggestions';

/** Ticari niyetli izleme sorusu önerileri — GET ?lang=tr,en&max=30 (deterministik, LLM yok). */
export const GET = route('tools.commerce_prompts', async (req) => {
  const actor = await requireActor({ brandContext: true });
  const params = new URL(req.url).searchParams;
  const languages = (params.get('lang') ?? 'tr')
    .split(',')
    .map((l) => l.trim())
    .filter((l): l is PromptLanguage => l === 'tr' || l === 'en');
  const maxRaw = Number(params.get('max') ?? 30);
  const max = Number.isFinite(maxRaw) ? Math.max(1, Math.min(30, Math.floor(maxRaw))) : 30;
  return NextResponse.json(
    await suggestCommercePrompts(actor.tenantId, { languages: languages.length ? languages : ['tr'], max }),
  );
});
