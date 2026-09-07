import { GoogleGenAI } from '@google/genai';
import type { AiProviderAdapter, RunPromptInput, RunPromptOutput } from './types';
import { AiProviderError } from './types';
import { estimateCostUsd, getModelSpec, resolveModel, webSearchEnabled } from './models';
import { DEFAULT_TIMEOUT_MS, withRetry, withTimeout } from './retry';

/**
 * Google Gemini adapter (@google/genai — eski @google/generative-ai paketi kullanımdan kalktı).
 *  - Grounding: config.tools = [{ googleSearch: {} }] → candidates[0].groundingMetadata
 *    (groundingChunks[].web.uri/title, webSearchQueries). Doküman: ai.google.dev/gemini-api/docs/google-search
 */
export const googleAdapter: AiProviderAdapter = {
  id: 'GOOGLE',
  isAvailable: () => !!process.env.GOOGLE_API_KEY,
  async run(input: RunPromptInput): Promise<RunPromptOutput> {
    if (!this.isAvailable()) throw new AiProviderError('GOOGLE', 'not_configured', 'GOOGLE_API_KEY tanımlı değil');
    const model = resolveModel('GOOGLE');
    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });
    const useSearch = (input.webSearch ?? webSearchEnabled()) && !!getModelSpec('GOOGLE', model)?.webSearch;
    const start = Date.now();

    const call = (withTools: boolean) =>
      withRetry('GOOGLE', () =>
        withTimeout(timeoutMs, (signal) =>
          client.models.generateContent({
            model,
            contents: input.prompt,
            config: {
              abortSignal: signal,
              ...(withTools ? { tools: [{ googleSearch: {} }] } : {}),
            },
          }),
        ),
      );

    let res: Awaited<ReturnType<typeof call>>;
    let grounded = useSearch;
    try {
      res = await call(useSearch);
    } catch (err) {
      if (useSearch && err instanceof AiProviderError && err.code === 'invalid') {
        grounded = false;
        res = await call(false);
      } else throw err;
    }
    const latencyMs = Date.now() - start;

    const citations: RunPromptOutput['citations'] = [];
    const gm = res.candidates?.[0]?.groundingMetadata;
    for (const chunk of gm?.groundingChunks ?? []) {
      if (chunk.web?.uri) citations.push({ url: chunk.web.uri, title: chunk.web.title ?? undefined });
    }
    const webSearchCount = gm?.webSearchQueries?.length ?? 0;
    const inputTokens = res.usageMetadata?.promptTokenCount;
    const outputTokens = res.usageMetadata?.candidatesTokenCount;
    return {
      text: res.text ?? '',
      modelName: model,
      inputTokens,
      outputTokens,
      tokensUsed: res.usageMetadata?.totalTokenCount,
      // Gemini 2.5 grounding "prompt başına" ücretlendirilir → arama yapıldıysa 1 birim.
      costUsd: estimateCostUsd('GOOGLE', model, {
        inputTokens,
        outputTokens,
        webSearchCount: grounded && webSearchCount > 0 ? 1 : 0,
      }),
      latencyMs,
      isMocked: false,
      citations,
      groundingMode: grounded ? 'native' : 'text',
      webSearchCount,
    };
  },
};
