import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError, ProviderUnavailableError } from '@/server/errors';
import { getAdapter, extractMentions, detectOtherBrands, AiProviderError, type ProviderId } from '@independentai/ai';
import { hydrateEnvFromConfig } from '@/server/system-config';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { getActor } from '@/server/authz';
import { mockAllowed } from '@/server/env';
import { cleanName } from '@/server/normalize';

export const maxDuration = 60;

/**
 * Public lead-magnet: kayıtsız kullanıcı IP başına 8/saat + küresel tavan; giriş yapmış kullanıcı
 * tenant başına 30/saat. Provider anahtarı yoksa (ve mock kapalıysa) 503 döner — sahte sonuç yok.
 */
export const POST = route('tools.rank_check', async (req) => {
  const actor = await getActor();
  if (actor) await enforceRateLimit(req, LIMITS.tool, `tenant:${actor.tenantId}`);
  else await enforceRateLimit(req, LIMITS.publicRankCheck);

  const body = await readJson<{ brand?: unknown; prompt?: unknown; provider?: unknown }>(req);
  const brand = cleanName(body.brand, 'Marka adı');
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (prompt.length < 3 || prompt.length > 300) throw new ClientError('Soru 3-300 karakter olmalı');
  const provider = body.provider;
  if (provider !== 'OPENAI' && provider !== 'ANTHROPIC' && provider !== 'GOOGLE')
    throw new ClientError('Geçersiz sağlayıcı');

  await hydrateEnvFromConfig();
  const adapter = getAdapter(provider as ProviderId, { allowMock: mockAllowed() });
  let out;
  try {
    out = await adapter.run({ prompt, language: 'tr', timeoutMs: 40_000, country: 'TR' });
  } catch (err) {
    if (err instanceof AiProviderError && err.code === 'not_configured')
      throw new ProviderUnavailableError('Bu model şu an yapılandırılmamış. Lütfen daha sonra deneyin.');
    if (
      err instanceof AiProviderError &&
      (err.code === 'rate_limit' || err.code === 'timeout' || err.code === 'server')
    ) {
      throw new ProviderUnavailableError('AI sağlayıcı geçici olarak yanıt vermiyor. Lütfen tekrar deneyin.');
    }
    throw err;
  }

  const mentions = extractMentions(out.text, [{ name: brand, aliases: [] }], []);
  const own = mentions.find((m) => m.isOwnBrand);
  const otherBrands = await detectOtherBrands(out.text, [brand], 6);

  return NextResponse.json({
    found: !!own,
    position: own?.position ?? null,
    sentiment: own?.sentiment ?? null,
    snippet: own?.snippet ?? null,
    otherBrands: otherBrands.map((b) => b.name),
    otherBrandsDetail: otherBrands,
    answer: out.text,
    modelName: out.modelName,
    isMocked: out.isMocked,
    groundingMode: out.groundingMode,
    citations: (out.citations ?? []).slice(0, 10),
  });
});
