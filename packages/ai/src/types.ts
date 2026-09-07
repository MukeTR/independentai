export type ProviderId = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE';

export type RunPromptInput = {
  prompt: string;
  language?: 'tr' | 'en';
  /** Provider'ın native web arama/grounding özelliğini kullan (atıf verisi için). */
  webSearch?: boolean;
  /** İstek başına toplam zaman aşımı (ms) */
  timeoutMs?: number;
  /** Ülke kodu — arama sonuçlarını yerelleştirir (varsayılan TR) */
  country?: string;
};

export type GroundingMode = 'native' | 'text' | 'none';

export type RunPromptOutput = {
  text: string;
  modelName: string;
  tokensUsed?: number;
  inputTokens?: number;
  outputTokens?: number;
  /** null/undefined = maliyet BİLİNMİYOR (fiyat kataloğunda model yok). 0 ile karıştırılmaz. */
  costUsd?: number | null;
  latencyMs: number;
  isMocked: boolean;
  citations?: Array<{ url: string; title?: string; snippet?: string }>;
  /** native: provider arama sonuçlarından; text: yalnızca metin içi linkler; none: veri yok */
  groundingMode: GroundingMode;
  webSearchCount?: number;
};

export type AiErrorCode = 'auth' | 'rate_limit' | 'timeout' | 'server' | 'invalid' | 'not_configured' | 'unknown';

export class AiProviderError extends Error {
  readonly code: AiErrorCode;
  readonly provider: ProviderId;
  readonly retryable: boolean;
  readonly status?: number;
  constructor(
    provider: ProviderId,
    code: AiErrorCode,
    message: string,
    opts: { status?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: opts.cause });
    this.provider = provider;
    this.code = code;
    this.status = opts.status;
    this.retryable = code === 'rate_limit' || code === 'timeout' || code === 'server';
  }
}

export interface AiProviderAdapter {
  id: ProviderId;
  isAvailable(): boolean;
  run(input: RunPromptInput): Promise<RunPromptOutput>;
}
