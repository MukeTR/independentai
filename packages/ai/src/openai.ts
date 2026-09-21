import OpenAI from 'openai';
import type { AiProviderAdapter, RunPromptInput, RunPromptOutput } from './types';
import { AiProviderError } from './types';
import { estimateCostUsd, getModelSpec, resolveModel, webSearchEnabled } from './models';
import { DEFAULT_TIMEOUT_MS, withRetry, withTimeout } from './retry';

/**
 * OpenAI adapter.
 *  - Web arama: Responses API + `web_search_preview` aracı → `url_citation` annotation'ları.
 *    (SDK 4.104: tool tipi 'web_search_preview'; doküman: developers.openai.com/api/docs/guides/tools-web-search)
 *  - Arama desteklemeyen model / 400 → düz chat completion'a düşer (groundingMode: 'text').
 */
export const openaiAdapter: AiProviderAdapter = {
  id: 'OPENAI',
  isAvailable: () => !!process.env.OPENAI_API_KEY,
  async run(input: RunPromptInput): Promise<RunPromptOutput> {
    if (!this.isAvailable()) throw new AiProviderError('OPENAI', 'not_configured', 'OPENAI_API_KEY tanımlı değil');
    const model = resolveModel('OPENAI');
    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: timeoutMs, maxRetries: 0 });
    const useSearch = (input.webSearch ?? webSearchEnabled()) && !!getModelSpec('OPENAI', model)?.webSearch;
    const start = Date.now();

    if (useSearch) {
      try {
        const res = await withRetry('OPENAI', () =>
          withTimeout(timeoutMs, (signal) =>
            client.responses.create(
              {
                model,
                input: input.prompt,
                tools: [
                  {
                    type: 'web_search_preview',
                    search_context_size: 'low',
                    user_location: { type: 'approximate', country: input.country ?? 'TR' },
                  },
                ],
              },
              { signal },
            ),
          ),
        );
        const latencyMs = Date.now() - start;
        const citations: RunPromptOutput['citations'] = [];
        let webSearchCount = 0;
        for (const item of res.output ?? []) {
          if (item.type === 'web_search_call') webSearchCount += 1;
          if (item.type === 'message') {
            for (const part of item.content ?? []) {
              if (part.type === 'output_text') {
                for (const a of part.annotations ?? []) {
                  if (a.type === 'url_citation') citations.push({ url: a.url, title: a.title });
                }
              }
            }
          }
        }
        const inputTokens = res.usage?.input_tokens;
        const outputTokens = res.usage?.output_tokens;
        return {
          text: res.output_text ?? '',
          modelName: res.model ?? model,
          inputTokens,
          outputTokens,
          tokensUsed: res.usage?.total_tokens,
          costUsd: estimateCostUsd('OPENAI', res.model ?? model, { inputTokens, outputTokens, webSearchCount }),
          latencyMs,
          isMocked: false,
          citations,
          groundingMode: 'native',
          webSearchCount,
        };
      } catch (err) {
        // Model aramayı desteklemiyorsa (invalid) düz moda düş; diğer hatalar yukarı çıkar.
        if (!(err instanceof AiProviderError) || err.code !== 'invalid') throw err;
      }
    }

    const res = await withRetry('OPENAI', () =>
      withTimeout(timeoutMs, (signal) =>
        client.chat.completions.create(
          { model, messages: [{ role: 'user', content: input.prompt }], temperature: 0.7 },
          { signal },
        ),
      ),
    );
    const latencyMs = Date.now() - start;
    const inputTokens = res.usage?.prompt_tokens;
    const outputTokens = res.usage?.completion_tokens;
    return {
      text: res.choices[0]?.message?.content ?? '',
      modelName: res.model,
      inputTokens,
      outputTokens,
      tokensUsed: res.usage?.total_tokens,
      costUsd: estimateCostUsd('OPENAI', res.model, { inputTokens, outputTokens }),
      latencyMs,
      isMocked: false,
      groundingMode: 'text',
      webSearchCount: 0,
    };
  },
};
