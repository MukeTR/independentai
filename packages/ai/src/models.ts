/**
 * Model yapılandırması ve fiyat kataloğu — TEK kaynak.
 *
 *  - Varsayılan modeller env ile geçersiz kılınabilir (OPENAI_MODEL, ANTHROPIC_MODEL, GOOGLE_MODEL).
 *  - Env değeri allowlist dışındaysa varsayılana düşülür ve uyarı loglanır (yanlış model adı
 *    production'ı sessizce mock'a düşürmesin).
 *  - Fiyatlar USD / 1M token; `effectiveFrom` ile tarihçeli. Katalogda olmayan model için
 *    maliyet `null` (bilinmiyor) döner — asla 0 uydurulmaz.
 *
 * Kaynaklar (2026-09-06 itibarıyla doğrulandı):
 *  - https://developers.openai.com/api/docs/pricing
 *  - https://platform.claude.com/docs/en/about-claude/pricing
 *  - https://ai.google.dev/gemini-api/docs/pricing
 */
import type { ProviderId } from './types';

export type ModelPrice = {
  inputPerM: number;
  outputPerM: number;
  effectiveFrom: string; // ISO tarih
  source: string;
};

export type ModelSpec = {
  provider: ProviderId;
  id: string;
  label: string;
  /** Native web arama / grounding destekleniyor mu */
  webSearch: boolean;
  prices: ModelPrice[];
};

export const MODEL_CATALOG: ModelSpec[] = [
  // ── OpenAI ──
  {
    provider: 'OPENAI',
    id: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    webSearch: true,
    prices: [{ inputPerM: 0.15, outputPerM: 0.6, effectiveFrom: '2024-07-18', source: 'openai-pricing' }],
  },
  {
    provider: 'OPENAI',
    id: 'gpt-4.1-mini',
    label: 'GPT-4.1 mini',
    webSearch: true,
    prices: [{ inputPerM: 0.4, outputPerM: 1.6, effectiveFrom: '2025-04-14', source: 'openai-pricing' }],
  },
  {
    provider: 'OPENAI',
    id: 'gpt-4.1-nano',
    label: 'GPT-4.1 nano',
    webSearch: false,
    prices: [{ inputPerM: 0.1, outputPerM: 0.4, effectiveFrom: '2025-04-14', source: 'openai-pricing' }],
  },
  {
    provider: 'OPENAI',
    id: 'gpt-5-mini',
    label: 'GPT-5 mini',
    webSearch: true,
    prices: [{ inputPerM: 0.25, outputPerM: 2.0, effectiveFrom: '2025-08-07', source: 'openai-pricing' }],
  },
  {
    provider: 'OPENAI',
    id: 'gpt-5-nano',
    label: 'GPT-5 nano',
    webSearch: false,
    prices: [{ inputPerM: 0.05, outputPerM: 0.4, effectiveFrom: '2025-08-07', source: 'openai-pricing' }],
  },
  // ── Anthropic ──
  {
    provider: 'ANTHROPIC',
    id: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    webSearch: true,
    prices: [{ inputPerM: 1.0, outputPerM: 5.0, effectiveFrom: '2025-10-15', source: 'anthropic-pricing' }],
  },
  {
    provider: 'ANTHROPIC',
    id: 'claude-sonnet-5',
    label: 'Claude Sonnet 5',
    webSearch: true,
    prices: [{ inputPerM: 2.0, outputPerM: 10.0, effectiveFrom: '2026-05-01', source: 'anthropic-pricing' }],
  },
  {
    provider: 'ANTHROPIC',
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    webSearch: true,
    prices: [{ inputPerM: 3.0, outputPerM: 15.0, effectiveFrom: '2026-02-01', source: 'anthropic-pricing' }],
  },
  // ── Google ──
  {
    provider: 'GOOGLE',
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    webSearch: true,
    prices: [{ inputPerM: 0.3, outputPerM: 2.5, effectiveFrom: '2025-06-17', source: 'gemini-pricing' }],
  },
  {
    provider: 'GOOGLE',
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash-Lite',
    webSearch: true,
    prices: [{ inputPerM: 0.1, outputPerM: 0.4, effectiveFrom: '2025-07-22', source: 'gemini-pricing' }],
  },
  { provider: 'GOOGLE', id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', webSearch: true, prices: [] },
  {
    provider: 'GOOGLE',
    id: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    webSearch: true,
    prices: [{ inputPerM: 1.5, outputPerM: 9.0, effectiveFrom: '2026-06-01', source: 'gemini-pricing' }],
  },
];

/** Provider'ın kendi arama aracı için çağrı başına ek ücret (USD). */
export const WEB_SEARCH_PRICE_USD: Record<ProviderId, { perCall: number; source: string } | null> = {
  OPENAI: { perCall: 0.01, source: 'openai-pricing ($10/1k)' },
  ANTHROPIC: { perCall: 0.01, source: 'anthropic-pricing ($10/1k)' },
  // Gemini 2.5: 1.500 ücretsiz istek/gün sonrası $35/1k "grounded prompt". Gerçek ücret kotaya bağlı
  // olduğundan tahmini üst sınır olarak alınır.
  GOOGLE: { perCall: 0.035, source: 'gemini-pricing ($35/1k, kota sonrası)' },
};

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  OPENAI: 'gpt-4o-mini',
  ANTHROPIC: 'claude-haiku-4-5',
  GOOGLE: 'gemini-2.5-flash',
};

const ENV_KEYS: Record<ProviderId, string> = {
  OPENAI: 'OPENAI_MODEL',
  ANTHROPIC: 'ANTHROPIC_MODEL',
  GOOGLE: 'GOOGLE_MODEL',
};

const warned = new Set<string>();

/** Env override → allowlist kontrolü → varsayılan. */
export function resolveModel(provider: ProviderId): string {
  const override = process.env[ENV_KEYS[provider]]?.trim();
  if (!override) return DEFAULT_MODELS[provider];
  const known = MODEL_CATALOG.some((m) => m.provider === provider && m.id === override);
  if (known) return override;
  // Allowlist dışı ama açıkça izin verildiyse (yeni model denemesi) kabul et; maliyet null olur.
  if (process.env.AI_MODEL_ALLOW_UNLISTED === '1') return override;
  if (!warned.has(override)) {
    warned.add(override);
    console.warn(
      JSON.stringify({
        level: 'warn',
        event: 'ai.model_not_in_allowlist',
        provider,
        model: override,
        fallback: DEFAULT_MODELS[provider],
      }),
    );
  }
  return DEFAULT_MODELS[provider];
}

export function getModelSpec(provider: ProviderId, modelId: string): ModelSpec | null {
  return (
    MODEL_CATALOG.find((m) => m.provider === provider && (m.id === modelId || modelId.startsWith(`${m.id}-`))) ?? null
  );
}

export function priceFor(provider: ProviderId, modelId: string, at = new Date()): ModelPrice | null {
  const spec = getModelSpec(provider, modelId);
  if (!spec || !spec.prices.length) return null;
  const applicable = spec.prices
    .filter((p) => new Date(p.effectiveFrom) <= at)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  return applicable[0] ?? null;
}

/**
 * Maliyet hesabı. Bilinmeyen model veya eksik token bilgisi → null (bilinmiyor).
 */
export function estimateCostUsd(
  provider: ProviderId,
  modelId: string,
  usage: { inputTokens?: number; outputTokens?: number; webSearchCount?: number },
  at = new Date(),
): number | null {
  const price = priceFor(provider, modelId, at);
  if (!price) return null;
  if (usage.inputTokens == null || usage.outputTokens == null) return null;
  let cost = (usage.inputTokens / 1_000_000) * price.inputPerM + (usage.outputTokens / 1_000_000) * price.outputPerM;
  const ws = WEB_SEARCH_PRICE_USD[provider];
  if (ws && usage.webSearchCount) cost += usage.webSearchCount * ws.perCall;
  return Math.round(cost * 1e6) / 1e6;
}

/** Native web arama/grounding açık mı? (AI_WEB_SEARCH=0 ile kapatılır; varsayılan açık) */
export function webSearchEnabled(): boolean {
  const v = process.env.AI_WEB_SEARCH;
  if (v == null || v === '') return true;
  return v === '1' || v.toLowerCase() === 'true';
}

/** Admin sağlık ekranı için özet. */
export function describeModels(): {
  provider: ProviderId;
  model: string;
  source: 'env' | 'default';
  priced: boolean;
  webSearch: boolean;
}[] {
  return (['OPENAI', 'ANTHROPIC', 'GOOGLE'] as ProviderId[]).map((p) => {
    const model = resolveModel(p);
    const spec = getModelSpec(p, model);
    return {
      provider: p,
      model,
      source: process.env[ENV_KEYS[p]] && process.env[ENV_KEYS[p]] === model ? 'env' : 'default',
      priced: !!priceFor(p, model),
      webSearch: !!spec?.webSearch && webSearchEnabled(),
    };
  });
}
