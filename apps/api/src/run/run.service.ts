import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ALL_PROVIDERS, getAdapter, extractMentions, type BrandSpec } from '@independentai/ai';
import type { AiProvider, Sentiment } from '@independentai/db';

@Injectable()
export class RunService {
  constructor(private readonly prisma: PrismaService) {}

  async runPromptForTenant(tenantId: string, promptId: string) {
    const prompt = await this.prisma.prompt.findFirst({ where: { id: promptId, tenantId } });
    if (!prompt) throw new NotFoundException();

    const [ownBrands, competitors] = await Promise.all([
      this.prisma.brand.findMany({ where: { tenantId, isOwn: true } }),
      this.prisma.competitor.findMany({ where: { tenantId } }),
    ]);

    const ownSpecs: BrandSpec[] = ownBrands.map((b) => ({
      id: b.id,
      name: b.name,
      aliases: b.aliases,
      isOwn: true,
    }));
    const compSpecs: BrandSpec[] = competitors.map((c) => ({
      name: c.name,
      aliases: c.aliases,
      isOwn: false,
    }));

    const results = await Promise.all(
      ALL_PROVIDERS.map(async (provider) => {
        const adapter = getAdapter(provider);
        try {
          const out = await adapter.run({ prompt: prompt.text, language: 'tr' });
          const mentions = extractMentions(out.text, ownSpecs, compSpecs);

          const run = await this.prisma.modelRun.create({
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
            include: { mentions: { orderBy: { position: 'asc' } } },
          });
          return run;
        } catch (err) {
          return this.prisma.modelRun.create({
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
      }),
    );

    return { runs: results };
  }

  async runAllActiveForAllTenants() {
    const prompts = await this.prisma.prompt.findMany({ where: { isActive: true } });
    let count = 0;
    for (const p of prompts) {
      await this.runPromptForTenant(p.tenantId, p.id);
      count++;
    }
    return { processed: count };
  }
}
