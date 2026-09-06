import { openaiAdapter } from './openai';
import { anthropicAdapter } from './anthropic';
import { googleAdapter } from './google';
import { runMock } from './mock';
import {
  AiProviderError,
  type AiProviderAdapter,
  type ProviderId,
  type RunPromptInput,
  type RunPromptOutput,
} from './types';

export * from './types';
export * from './models';
export * from './retry';
export * from './mention-extractor';
export * from './citation-extractor';
export * from './llm';
export * from './embed';
export { runMock } from './mock';

const realAdapters: Record<ProviderId, AiProviderAdapter> = {
  OPENAI: openaiAdapter,
  ANTHROPIC: anthropicAdapter,
  GOOGLE: googleAdapter,
};

export const ALL_PROVIDERS: ProviderId[] = ['OPENAI', 'ANTHROPIC', 'GOOGLE'];

/**
 * Mock politikası: anahtar yoksa ve mock'a izin varsa (yerel/dev) sahte cevap; production'da
 * `not_configured` hatası. Böylece production'da sahte veri gerçek ölçüm gibi görünmez.
 */
export function getAdapter(id: ProviderId, opts: { allowMock?: boolean } = {}): AiProviderAdapter {
  const real = realAdapters[id];
  const allowMock = opts.allowMock ?? process.env.IAI_ALLOW_MOCK === '1';
  return {
    id,
    isAvailable: () => real.isAvailable(),
    async run(input: RunPromptInput): Promise<RunPromptOutput> {
      if (real.isAvailable()) return real.run(input);
      if (allowMock) return runMock(id, input);
      throw new AiProviderError(id, 'not_configured', `${id} API anahtarı yapılandırılmamış`);
    },
  };
}

export function getAvailableProviders(): ProviderId[] {
  return ALL_PROVIDERS.filter((id) => realAdapters[id].isAvailable());
}

export { realAdapters as adapters };
