import OpenAI from 'openai';
import type { AiProviderAdapter, RunPromptInput, RunPromptOutput } from './types';
import { runMock } from './mock';

const MODEL = 'gpt-4o-mini';

export const openaiAdapter: AiProviderAdapter = {
  id: 'OPENAI',
  isAvailable: () => !!process.env.OPENAI_API_KEY,
  async run(input: RunPromptInput): Promise<RunPromptOutput> {
    if (!this.isAvailable()) return runMock('OPENAI', input);

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const start = Date.now();
    const res = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: input.prompt }],
      temperature: 0.7,
    });
    const latencyMs = Date.now() - start;

    return {
      text: res.choices[0]?.message?.content ?? '',
      modelName: res.model,
      tokensUsed: res.usage?.total_tokens,
      latencyMs,
      isMocked: false,
    };
  },
};
