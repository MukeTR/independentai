import { openaiAdapter } from './openai';
import { anthropicAdapter } from './anthropic';
import { googleAdapter } from './google';
import type { AiProviderAdapter, ProviderId } from './types';

export * from './types';
export * from './mention-extractor';

export const adapters: Record<ProviderId, AiProviderAdapter> = {
  OPENAI: openaiAdapter,
  ANTHROPIC: anthropicAdapter,
  GOOGLE: googleAdapter,
};

export const ALL_PROVIDERS: ProviderId[] = ['OPENAI', 'ANTHROPIC', 'GOOGLE'];

export function getAdapter(id: ProviderId): AiProviderAdapter {
  return adapters[id];
}

export function getAvailableProviders(): ProviderId[] {
  return ALL_PROVIDERS.filter((id) => adapters[id].isAvailable());
}
