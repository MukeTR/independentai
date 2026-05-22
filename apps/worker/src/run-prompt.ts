import { prisma, AiProvider, Sentiment } from '@independentai/db';
import { ALL_PROVIDERS, getAdapter, extractMentions, type BrandSpec } from '@independentai/ai';

export async function runPromptOnce(tenantId: string, promptId: string) {
  const prompt = await prisma.prompt.findFirst({ where: { id: promptId, tenantId } });
  if (!prompt) return { skipped: true, reason: 'prompt not found' };

  const [ownBrands, competitors] = await Promise.all([
    prisma.brand.findMany({ where: { tenantId, isOwn: true } }),
    prisma.competitor.findMany({ where: { tenantId } }),
  ]);

  const ownSpecs: BrandSpec[] = ownBrands.map((b) => ({
    id: b.id, name: b.name, aliases: b.aliases, isOwn: true,
  }));
  const compSpecs: BrandSpec[] = competitors.map((c) => ({
    name: c.name, aliases: c.aliases, isOwn: false,
  }));

  for (const provider of ALL_PROVIDERS) {
    const adapter = getAdapter(provider);
    try {
      const out = await adapter.run({ prompt: prompt.text, language: 'tr' });
      const mentions = extractMentions(out.text, ownSpecs, compSpecs);

      await prisma.modelRun.create({
        data: {
          promptId: prompt.id,
          provider: provider as AiProvider,
          modelName: out.modelName,
          responseText: out.text,
          tokensUsed: out.tokensUsed,
          costUsd: out.costUsd,
          latencyMs: out.latencyMs,
          isMocked: out.isMocked,
          mentions: {
            create: mentions.map((m) => ({
              brandId: m.brandId,
              mentionName: m.mentionName,
              isOwnBrand: m.isOwnBrand,
              isCompetitor: m.isCompetitor,
              position: m.position,
              sentiment: m.sentiment as Sentiment,
              snippet: m.snippet,
            })),
          },
        },
      });
    } catch (err) {
      await prisma.modelRun.create({
        data: {
          promptId: prompt.id,
          provider: provider as AiProvider,
          modelName: 'error',
          responseText: '',
          errorMessage: err instanceof Error ? err.message : String(err),
          latencyMs: 0,
        },
      });
    }
  }

  return { ok: true };
}
