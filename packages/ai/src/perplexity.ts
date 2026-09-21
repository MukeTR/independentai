import type { AiErrorCode, AiProviderAdapter, RunPromptInput, RunPromptOutput } from './types';
import { AiProviderError } from './types';
import { estimateCostUsd, resolveModel } from './models';
import { DEFAULT_TIMEOUT_MS, withRetry, withTimeout } from './retry';

/**
 * Perplexity adapter (sonar ailesi).
 *
 *  - API OpenAI uyumludur: POST https://api.perplexity.ai/chat/completions, Bearer token.
 *    SDK kullanılmaz; yanıt gövdesindeki arama alanları (citations / search_results) OpenAI
 *    tiplerinde bulunmadığı için ham fetch + savunmacı okuma tercih edildi.
 *  - Modeller aramayı KENDİLERİ yapar; açılıp kapatılabilen bir arama aracı yoktur. Bu yüzden
 *    AI_WEB_SEARCH=0 Perplexity'de aramayı durdurmaz — groundingMode gerçekte dönen kaynağa bakar.
 *  - Kaynaklar `citations` (çoğunlukla düz URL dizisi) ve/veya `search_results`
 *    (title/url/date/snippet) alanlarından gelir. İkisi de yoksa citations boş dizi,
 *    groundingMode 'text' olur — kaynak uydurulmaz.
 *  - `language` alanı bilinçli olarak kullanılmaz: diğer adapter'lar da (OpenAI/Anthropic/Google)
 *    prompt'a dil talimatı eklemez. Ölçümün sağlayıcılar arasında karşılaştırılabilir kalması için
 *    yalnızca kullanıcının sorusu gönderilir; yerelleştirme ülke (user_location) üzerinden yapılır.
 *
 * Doküman (2026-09-20'de doğrulandı): https://docs.perplexity.ai/api-reference/chat-completions-post
 * NOT: Perplexity "Sonar Chat Completions is now Agent API" duyurusuna göre bu uç 27 Eylül 2026'ya
 * kadar destekleniyor. Taban adres PERPLEXITY_BASE_URL ile değiştirilebilir (geçiş/proxy senaryosu).
 */
const DEFAULT_BASE_URL = 'https://api.perplexity.ai';

function baseUrl(): string {
  const raw = process.env.PERPLEXITY_BASE_URL?.trim();
  return (raw && raw.length > 0 ? raw : DEFAULT_BASE_URL).replace(/\/+$/, '');
}

/** İlk dolu metin değerini döner (alan adı varsayımlarına karşı tolerans). */
function firstString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === 'string') {
      const t = v.trim();
      if (t.length > 0) return t;
    }
  }
  return undefined;
}

function readNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

type Citation = NonNullable<RunPromptOutput['citations']>[number];

/**
 * Tek bir kaynak öğesini okur. Öğe düz URL metni de olabilir, nesne de
 * ({ url | link } + { title | name } + { snippet | excerpt }). Geçerli http(s) URL yoksa atlanır.
 */
function pushCitation(out: Citation[], seen: Set<string>, raw: unknown): void {
  let url: string | undefined;
  let title: string | undefined;
  let snippet: string | undefined;
  if (typeof raw === 'string') {
    url = firstString(raw);
  } else {
    const o = asRecord(raw);
    url = firstString(o.url, o.link, o.source);
    title = firstString(o.title, o.name);
    snippet = firstString(o.snippet, o.excerpt, o.text);
  }
  if (!url || !/^https?:\/\//i.test(url)) return;
  const key = url.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  out.push({ url, ...(title ? { title } : {}), ...(snippet ? { snippet } : {}) });
}

/** Arama kaynakları: önce search_results (başlık taşır), sonra citations; tekrar edenler elenir. */
function readCitations(body: Record<string, unknown>): Citation[] {
  const out: Citation[] = [];
  const seen = new Set<string>();
  for (const field of ['search_results', 'citations'] as const) {
    const arr = body[field];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) pushCitation(out, seen, item);
  }
  return out;
}

/** choices[0].message.content — metin ya da parça dizisi ([{ type:'text', text }]) olabilir. */
function readText(body: Record<string, unknown>): string {
  const choices = Array.isArray(body.choices) ? body.choices : [];
  const content = asRecord(asRecord(choices[0]).message).content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    // Parçalar olduğu gibi birleştirilir; kırpma yapılmaz (aradaki boşluklar metnin parçasıdır).
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        const text = asRecord(part).text;
        return typeof text === 'string' ? text : '';
      })
      .join('');
  }
  return '';
}

/** HTTP durum kodu → hata sınıfı. */
function toAiError(status: number, detail: string): AiProviderError {
  let code: AiErrorCode;
  if (status === 401 || status === 403) code = 'auth';
  else if (status === 429) code = 'rate_limit';
  else if (status >= 500) code = 'server';
  else if (status >= 400) code = 'invalid';
  else code = 'unknown';
  return new AiProviderError('PERPLEXITY', code, `PERPLEXITY ${code} (${status}): ${detail.slice(0, 300)}`, { status });
}

export const perplexityAdapter: AiProviderAdapter = {
  id: 'PERPLEXITY',
  isAvailable: () => !!process.env.PERPLEXITY_API_KEY,
  async run(input: RunPromptInput): Promise<RunPromptOutput> {
    if (!this.isAvailable())
      throw new AiProviderError('PERPLEXITY', 'not_configured', 'PERPLEXITY_API_KEY tanımlı değil');
    const model = resolveModel('PERPLEXITY');
    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const start = Date.now();

    const payload = {
      model,
      messages: [{ role: 'user', content: input.prompt }],
      // OpenAI adapter'ındaki düz sohbet yolu ile aynı sıcaklık (sonar varsayılanı daha düşüktür).
      temperature: 0.7,
      // Ülke yerelleştirmesi — diğer adapter'lardaki user_location ile aynı anlam (varsayılan TR).
      web_search_options: { user_location: { country: input.country ?? 'TR' } },
    };

    const body = await withRetry('PERPLEXITY', () =>
      withTimeout(timeoutMs, async (signal) => {
        // Abort → fetch AbortError fırlatır → classifyError bunu 'timeout' olarak sınıflar.
        const res = await fetch(`${baseUrl()}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
          signal,
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          throw toAiError(res.status, detail);
        }
        const parsed: unknown = await res.json().catch(() => null);
        if (!parsed || typeof parsed !== 'object')
          throw new AiProviderError('PERPLEXITY', 'unknown', 'PERPLEXITY yanıtı okunamadı (JSON değil)');
        return parsed as Record<string, unknown>;
      }),
    );
    const latencyMs = Date.now() - start;

    const citations = readCitations(body);
    const usage = asRecord(body.usage);
    const inputTokens = readNumber(usage.prompt_tokens);
    const outputTokens = readNumber(usage.completion_tokens);
    const tokensUsed =
      readNumber(usage.total_tokens) ??
      (inputTokens != null && outputTokens != null ? inputTokens + outputTokens : undefined);
    // Arama sayısı bildirilmezse kaynak varlığından türetilir (sıfır sayılmaması için en az 1).
    const webSearchCount = readNumber(usage.num_search_queries) ?? (citations.length > 0 ? 1 : 0);
    // Perplexity gerçek maliyeti (token + arama isteği) usage.cost içinde bildirir; varsa o kullanılır.
    // Yoksa katalog üzerinden yalnız token maliyeti hesaplanır — arama ücreti modele ve arama
    // derinliğine göre değiştiği için uydurulmaz (bkz. WEB_SEARCH_PRICE_USD.PERPLEXITY = null).
    const reportedCost = readNumber(asRecord(usage.cost).total_cost);
    const modelName = firstString(body.model) ?? model;

    return {
      text: readText(body),
      modelName,
      inputTokens,
      outputTokens,
      tokensUsed,
      costUsd: reportedCost ?? estimateCostUsd('PERPLEXITY', modelName, { inputTokens, outputTokens, webSearchCount }),
      latencyMs,
      isMocked: false,
      citations,
      groundingMode: citations.length > 0 ? 'native' : 'text',
      webSearchCount,
    };
  },
};
