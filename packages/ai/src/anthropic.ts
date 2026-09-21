import Anthropic from '@anthropic-ai/sdk';
import type { AiProviderAdapter, RunPromptInput, RunPromptOutput } from './types';
import { AiProviderError } from './types';
import { estimateCostUsd, getModelSpec, resolveModel, webSearchEnabled } from './models';
import { DEFAULT_TIMEOUT_MS, withRetry, withTimeout } from './retry';

/**
 * Anthropic adapter.
 *  - Web arama: `web_search_20250305` sunucu aracı (tüm güncel modellerde çalışan temel sürüm).
 *    Atıflar `text` bloklarındaki `citations[]` (web_search_result_location) ve
 *    `web_search_tool_result` bloklarından toplanır. usage.server_tool_use.web_search_requests
 *    maliyet için kullanılır. Doküman: platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool
 */
export const anthropicAdapter: AiProviderAdapter = {
  id: 'ANTHROPIC',
  isAvailable: () => !!process.env.ANTHROPIC_API_KEY,
  async run(input: RunPromptInput): Promise<RunPromptOutput> {
    if (!this.isAvailable())
      throw new AiProviderError('ANTHROPIC', 'not_configured', 'ANTHROPIC_API_KEY tanımlı değil');
    const model = resolveModel('ANTHROPIC');
    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: timeoutMs, maxRetries: 0 });
    const useSearch = (input.webSearch ?? webSearchEnabled()) && !!getModelSpec('ANTHROPIC', model)?.webSearch;
    const start = Date.now();

    const call = (withTools: boolean) =>
      withRetry('ANTHROPIC', () =>
        withTimeout(timeoutMs, (signal) =>
          client.messages.create(
            {
              model,
              max_tokens: 1024,
              messages: [{ role: 'user', content: input.prompt }],
              ...(withTools
                ? {
                    tools: [
                      {
                        type: 'web_search_20250305' as const,
                        name: 'web_search' as const,
                        max_uses: 3,
                        user_location: { type: 'approximate' as const, country: input.country ?? 'TR' },
                      },
                    ],
                  }
                : {}),
            },
            { signal },
          ),
        ),
      );

    let res: Anthropic.Message;
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
    const textParts: string[] = [];
    for (const block of res.content) {
      if (block.type === 'text') {
        textParts.push(block.text);
        for (const c of block.citations ?? []) {
          if (c.type === 'web_search_result_location')
            citations.push({ url: c.url, title: c.title ?? undefined, snippet: c.cited_text });
        }
      } else if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
        for (const r of block.content) {
          if (r.type === 'web_search_result') citations.push({ url: r.url, title: r.title });
        }
      }
    }
    const inputTokens = res.usage.input_tokens;
    const outputTokens = res.usage.output_tokens;
    const webSearchCount = res.usage.server_tool_use?.web_search_requests ?? 0;
    return {
      text: textParts.join('\n'),
      modelName: res.model,
      inputTokens,
      outputTokens,
      tokensUsed: inputTokens + outputTokens,
      costUsd: estimateCostUsd('ANTHROPIC', res.model, { inputTokens, outputTokens, webSearchCount }),
      latencyMs,
      isMocked: false,
      citations,
      groundingMode: grounded ? 'native' : 'text',
      webSearchCount,
    };
  },
};
