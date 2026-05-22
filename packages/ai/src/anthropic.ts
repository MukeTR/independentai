import Anthropic from '@anthropic-ai/sdk';
import type { AiProviderAdapter, RunPromptInput, RunPromptOutput } from './types';
import { runMock } from './mock';

const MODEL = 'claude-haiku-4-5';

export const anthropicAdapter: AiProviderAdapter = {
  id: 'ANTHROPIC',
  isAvailable: () => !!process.env.ANTHROPIC_API_KEY,
  async run(input: RunPromptInput): Promise<RunPromptOutput> {
    if (!this.isAvailable()) return runMock('ANTHROPIC', input);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const start = Date.now();
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: input.prompt }],
    });
    const latencyMs = Date.now() - start;

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    return {
      text,
      modelName: res.model,
      tokensUsed: res.usage.input_tokens + res.usage.output_tokens,
      latencyMs,
      isMocked: false,
    };
  },
};
