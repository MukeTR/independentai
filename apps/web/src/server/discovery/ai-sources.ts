/**
 * AI kaynak sınıflandırması — yalnızca **tam hostname** eşleşmesiyle.
 *
 * Kural: substring araması yapılmaz ("openai" geçen her host AI sayılmaz). Referrer yoksa trafik
 * DIRECT'tir; AI olduğu tahmin edilmez. Bilinmeyen host OTHER'dır; provider uydurulmaz.
 *
 * Listedeki hostlar ilgili AI ürününün kendi web uygulamasının adresidir (tarayıcıda doğrulanabilir).
 * Arama motorları ayrıca ORGANIC olarak işaretlenir ki AI referral ile karışmasın.
 */
import type { SourceClass } from '@independentai/db';
import { normalizeHost } from './events';

export type AiProviderKey =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'perplexity'
  | 'microsoft'
  | 'xai'
  | 'mistral'
  | 'deepseek'
  | 'meta'
  | 'you'
  | 'poe';

export type AiSource = { provider: AiProviderKey; label: string; hosts: string[] };

/** Kayıt sürümü: liste değişince artır (dashboard'da hangi sürümle sınıflandırıldığı görülür). */
export const AI_SOURCE_REGISTRY_VERSION = 1;

export const AI_SOURCES: AiSource[] = [
  { provider: 'openai', label: 'ChatGPT', hosts: ['chatgpt.com', 'chat.openai.com', 'openai.com'] },
  { provider: 'anthropic', label: 'Claude', hosts: ['claude.ai', 'anthropic.com'] },
  { provider: 'google', label: 'Gemini', hosts: ['gemini.google.com', 'bard.google.com'] },
  { provider: 'perplexity', label: 'Perplexity', hosts: ['perplexity.ai'] },
  { provider: 'microsoft', label: 'Copilot', hosts: ['copilot.microsoft.com', 'm365.cloud.microsoft'] },
  { provider: 'xai', label: 'Grok', hosts: ['grok.com', 'x.ai'] },
  { provider: 'mistral', label: 'Le Chat (Mistral)', hosts: ['chat.mistral.ai'] },
  { provider: 'deepseek', label: 'DeepSeek', hosts: ['chat.deepseek.com'] },
  { provider: 'meta', label: 'Meta AI', hosts: ['meta.ai'] },
  { provider: 'you', label: 'You.com', hosts: ['you.com'] },
  { provider: 'poe', label: 'Poe', hosts: ['poe.com'] },
];

/** Arama motorları: AI referral DEĞİL (ORGANIC). Gemini/Copilot gibi AI ürünleri yukarıdadır. */
const SEARCH_HOSTS = new Set([
  'google.com',
  'bing.com',
  'duckduckgo.com',
  'yandex.com',
  'yandex.com.tr',
  'search.brave.com',
  'ecosia.org',
  'startpage.com',
  'baidu.com',
  'search.marginalia.nu',
]);

const HOST_TO_PROVIDER = new Map<string, AiProviderKey>();
for (const s of AI_SOURCES) for (const h of s.hosts) HOST_TO_PROVIDER.set(h, s.provider);

const PROVIDER_LABEL = new Map<AiProviderKey, string>(AI_SOURCES.map((s) => [s.provider, s.label]));

export function providerLabel(provider: string | null | undefined): string {
  if (!provider) return 'Bilinmiyor';
  return PROVIDER_LABEL.get(provider as AiProviderKey) ?? provider;
}

export type SourceClassification = {
  sourceClass: SourceClass;
  provider: AiProviderKey | null;
  referrerHost: string | null;
  /** Sınıflandırmanın nedeni (UI'da açıklanabilirlik) */
  reason: 'ai_referrer' | 'utm_ai' | 'search_referrer' | 'no_referrer' | 'other_referrer';
};

/**
 * Referrer host'una (ve yalnızca allowlist'teki UTM sinyaline) göre kaynak sınıfı.
 *
 * `utm_source` yalnızca AI ürününün kendi adıysa ve referrer YOKSA dikkate alınır; referrer varsa
 * gerçek referrer kazanır (UTM istemci tarafından uydurulabilir).
 */
export function classifySource(input: {
  referrerHost?: string | null;
  utm?: Record<string, string> | null;
  siteHost?: string | null;
}): SourceClassification {
  const host = normalizeHost(input.referrerHost ?? null);
  const siteHost = normalizeHost(input.siteHost ?? null);

  // Kendi sitesinden gelen iç gezinme: kaynak değil.
  if (host && siteHost && host === siteHost) {
    return { sourceClass: 'DIRECT', provider: null, referrerHost: host, reason: 'no_referrer' };
  }

  if (host) {
    const provider = HOST_TO_PROVIDER.get(host);
    if (provider) return { sourceClass: 'AI_REFERRAL', provider, referrerHost: host, reason: 'ai_referrer' };
    if (SEARCH_HOSTS.has(host)) return { sourceClass: 'ORGANIC', provider: null, referrerHost: host, reason: 'search_referrer' };
    return { sourceClass: 'OTHER', provider: null, referrerHost: host, reason: 'other_referrer' };
  }

  // Referrer yok: yalnızca açık ve tanınan bir UTM kaynağı varsa AI say.
  const utmSource = input.utm?.utm_source?.toLowerCase().trim();
  if (utmSource) {
    const byName: Record<string, AiProviderKey> = {
      chatgpt: 'openai',
      openai: 'openai',
      claude: 'anthropic',
      anthropic: 'anthropic',
      gemini: 'google',
      perplexity: 'perplexity',
      copilot: 'microsoft',
      grok: 'xai',
    };
    const provider = byName[utmSource];
    if (provider) return { sourceClass: 'AI_REFERRAL', provider, referrerHost: null, reason: 'utm_ai' };
  }

  return { sourceClass: 'DIRECT', provider: null, referrerHost: null, reason: 'no_referrer' };
}
