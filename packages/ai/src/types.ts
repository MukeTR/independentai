export type ProviderId = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE';

export type RunPromptInput = {
  prompt: string;
  language?: 'tr' | 'en';
};

export type RunPromptOutput = {
  text: string;
  modelName: string;
  tokensUsed?: number;
  costUsd?: number;
  latencyMs: number;
  isMocked: boolean;
  citations?: Array<{ url: string; title?: string; snippet?: string }>;
};

export interface AiProviderAdapter {
  id: ProviderId;
  isAvailable(): boolean;
  run(input: RunPromptInput): Promise<RunPromptOutput>;
}
