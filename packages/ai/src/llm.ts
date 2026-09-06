/**
 * Generic LLM yardımcıları — sınıflandırma, üretim, JSON çıktısı için.
 * Ölçüm adapter'larından farklı olarak düşük sıcaklık + JSON modu kullanır; web arama YAPMAZ.
 * Hiçbir provider key'i yoksa null döner; çağıran taraf heuristic fallback uygular.
 * Her çağrı `lastUsage` üzerinden maliyet/gecikme raporlar (görünürlük için).
 */
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import type { ProviderId } from './types';
import { estimateCostUsd, resolveModel } from './models';
import { DEFAULT_TIMEOUT_MS, withRetry, withTimeout } from './retry';

export function getCompletionProvider(): ProviderId | null {
  const pref = process.env.AI_CLASSIFIER_PROVIDER?.toUpperCase();
  const order: ProviderId[] =
    pref === 'ANTHROPIC'
      ? ['ANTHROPIC', 'OPENAI', 'GOOGLE']
      : pref === 'GOOGLE'
        ? ['GOOGLE', 'OPENAI', 'ANTHROPIC']
        : ['OPENAI', 'ANTHROPIC', 'GOOGLE'];
  for (const p of order) {
    if (p === 'OPENAI' && process.env.OPENAI_API_KEY) return p;
    if (p === 'ANTHROPIC' && process.env.ANTHROPIC_API_KEY) return p;
    if (p === 'GOOGLE' && process.env.GOOGLE_API_KEY) return p;
  }
  return null;
}

export type CompleteOpts = {
  system?: string;
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
  timeoutMs?: number;
};

export type CompletionUsage = {
  provider: ProviderId;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd: number | null;
  latencyMs: number;
};

/** Son yardımcı çağrının kullanım bilgisi (run-prompt enrichment maliyetini görünür kılmak için). */
export let lastUsage: CompletionUsage | null = null;

export async function complete(prompt: string, opts: CompleteOpts = {}): Promise<string | null> {
  const provider = getCompletionProvider();
  if (!provider) return null;
  const { system, maxTokens = 1024, temperature = 0.2, json = false, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  const start = Date.now();
  const model = resolveModel(provider);

  try {
    if (provider === 'OPENAI') {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: timeoutMs, maxRetries: 0 });
      const res = await withRetry('OPENAI', () =>
        withTimeout(timeoutMs, (signal) =>
          client.chat.completions.create(
            {
              model,
              messages: [
                ...(system ? [{ role: 'system' as const, content: system }] : []),
                { role: 'user' as const, content: prompt },
              ],
              temperature,
              max_tokens: maxTokens,
              ...(json ? { response_format: { type: 'json_object' as const } } : {}),
            },
            { signal },
          ),
        ),
      );
      lastUsage = {
        provider,
        model: res.model,
        inputTokens: res.usage?.prompt_tokens,
        outputTokens: res.usage?.completion_tokens,
        costUsd: estimateCostUsd('OPENAI', res.model, {
          inputTokens: res.usage?.prompt_tokens,
          outputTokens: res.usage?.completion_tokens,
        }),
        latencyMs: Date.now() - start,
      };
      return res.choices[0]?.message?.content ?? null;
    }
    if (provider === 'ANTHROPIC') {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: timeoutMs, maxRetries: 0 });
      const res = await withRetry('ANTHROPIC', () =>
        withTimeout(timeoutMs, (signal) =>
          client.messages.create(
            {
              model,
              max_tokens: maxTokens,
              temperature,
              ...(system ? { system } : {}),
              messages: [
                {
                  role: 'user',
                  content: json ? `${prompt}\n\nSadece geçerli JSON döndür, başka metin ekleme.` : prompt,
                },
              ],
            },
            { signal },
          ),
        ),
      );
      lastUsage = {
        provider,
        model: res.model,
        inputTokens: res.usage.input_tokens,
        outputTokens: res.usage.output_tokens,
        costUsd: estimateCostUsd('ANTHROPIC', res.model, {
          inputTokens: res.usage.input_tokens,
          outputTokens: res.usage.output_tokens,
        }),
        latencyMs: Date.now() - start,
      };
      return res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
    }
    const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });
    const res = await withRetry('GOOGLE', () =>
      withTimeout(timeoutMs, (signal) =>
        genai.models.generateContent({
          model,
          contents: prompt,
          config: {
            abortSignal: signal,
            temperature,
            maxOutputTokens: maxTokens,
            ...(system ? { systemInstruction: system } : {}),
            ...(json ? { responseMimeType: 'application/json' } : {}),
          },
        }),
      ),
    );
    lastUsage = {
      provider,
      model,
      inputTokens: res.usageMetadata?.promptTokenCount,
      outputTokens: res.usageMetadata?.candidatesTokenCount,
      costUsd: estimateCostUsd('GOOGLE', model, {
        inputTokens: res.usageMetadata?.promptTokenCount,
        outputTokens: res.usageMetadata?.candidatesTokenCount,
      }),
      latencyMs: Date.now() - start,
    };
    return res.text ?? null;
  } catch {
    lastUsage = null;
    return null;
  }
}

export async function completeJSON<T = unknown>(prompt: string, opts: CompleteOpts = {}): Promise<T | null> {
  const raw = await complete(prompt, { ...opts, json: true });
  if (!raw) return null;
  return parseJSON<T>(raw);
}

export function parseJSON<T = unknown>(raw: string): T | null {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence && fence[1]) text = fence[1].trim();
  const firstObj = text.indexOf('{');
  const firstArr = text.indexOf('[');
  const start = firstArr === -1 ? firstObj : firstObj === -1 ? firstArr : Math.min(firstObj, firstArr);
  if (start >= 0) {
    const lastObj = text.lastIndexOf('}');
    const lastArr = text.lastIndexOf(']');
    const end = Math.max(lastObj, lastArr);
    if (end >= start) text = text.slice(start, end + 1);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function hasLLM(): boolean {
  return getCompletionProvider() !== null;
}
