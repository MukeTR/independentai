import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AiProviderAdapter, RunPromptInput, RunPromptOutput } from './types';
import { runMock } from './mock';

// gemini-1.5-flash 2026'da kaldırıldı (v1beta 404 döndürüyordu).
// Model adı env ile geçersiz kılınabilir — Google model hattını hızlı değiştiriyor.
const MODEL = process.env.GOOGLE_MODEL || 'gemini-2.5-flash';

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
