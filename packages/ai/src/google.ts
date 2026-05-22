import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AiProviderAdapter, RunPromptInput, RunPromptOutput } from './types';
import { runMock } from './mock';

const MODEL = 'gemini-1.5-flash';

export const googleAdapter: AiProviderAdapter = {
  id: 'GOOGLE',
  isAvailable: () => !!process.env.GOOGLE_API_KEY,
  async run(input: RunPromptInput): Promise<RunPromptOutput> {
    if (!this.isAvailable()) return runMock('GOOGLE', input);

    const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const model = client.getGenerativeModel({ model: MODEL });
    const start = Date.now();
    const res = await model.generateContent(input.prompt);
    const latencyMs = Date.now() - start;

    return {
      text: res.response.text(),
      modelName: MODEL,
      tokensUsed: res.response.usageMetadata?.totalTokenCount,
      latencyMs,
      isMocked: false,
    };
  },
};
