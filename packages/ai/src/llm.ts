/**
 * Generic LLM yardımcıları — sınıflandırma, üretim, JSON çıktısı için.
 * Adapter'lardan farklı olarak düşük sıcaklık + opsiyonel JSON modu kullanır.
 * Hiçbir provider key'i yoksa null döner; çağıran taraf heuristic fallback uygular.
 */
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ProviderId } from './types';

export function getCompletionProvider(): ProviderId | null {
  if (process.env.OPENAI_API_KEY) return 'OPENAI';
  if (process.env.ANTHROPIC_API_KEY) return 'ANTHROPIC';
  if (process.env.GOOGLE_API_KEY) return 'GOOGLE';
  return null;
}

export type CompleteOpts = {
  system?: string;
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
};

/**
 * Bir prompt'u en uygun (ucuz) modelde çalıştırır, düz metin döndürür.
 * Provider yoksa null. Hata durumunda da null (best-effort).
 */
export async function complete(prompt: string, opts: CompleteOpts = {}): Promise<string | null> {
  const provider = getCompletionProvider();
  if (!provider) return null;
  const { system, maxTokens = 1024, temperature = 0.2, json = false } = opts;

  try {
    if (provider === 'OPENAI') {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          ...(system ? [{ role: 'system' as const, content: system }] : []),
          { role: 'user' as const, content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
        ...(json ? { response_format: { type: 'json_object' as const } } : {}),
      });
      return res.choices[0]?.message?.content ?? null;
    }
    if (provider === 'ANTHROPIC') {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const res = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages: [{ role: 'user', content: json ? `${prompt}\n\nSadece geçerli JSON döndür, başka metin ekleme.` : prompt }],
      });
      return res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
    }
    // GOOGLE
    const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const res = await model.generateContent(
      json ? `${prompt}\n\nSadece geçerli JSON döndür, başka metin ekleme.` : prompt,
    );
    return res.response.text();
  } catch {
    return null;
  }
}

/**
 * complete() çıktısını JSON olarak parse eder. Markdown code-fence'leri temizler.
 * Başarısızsa null.
 */
export async function completeJSON<T = unknown>(prompt: string, opts: CompleteOpts = {}): Promise<T | null> {
  const raw = await complete(prompt, { ...opts, json: true });
  if (!raw) return null;
  return parseJSON<T>(raw);
}

export function parseJSON<T = unknown>(raw: string): T | null {
  let text = raw.trim();
  // ```json ... ``` fence temizle
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence && fence[1]) text = fence[1].trim();
  // İlk { veya [ ile son } veya ] arasını al
  const firstObj = text.indexOf('{');
  const firstArr = text.indexOf('[');
  const start = firstArr === -1 ? firstObj : firstObj === -1 ? firstArr : Math.min(firstObj, firstArr);
  if (start > 0) {
    const lastObj = text.lastIndexOf('}');
    const lastArr = text.lastIndexOf(']');
    const end = Math.max(lastObj, lastArr);
    if (end > start) text = text.slice(start, end + 1);
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
