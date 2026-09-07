/**
 * AI bot kaydı ve doğrulama seviyeleri.
 *
 * Temel kural: **user-agent tek başına kanıt değildir.** UA taklit edilebilir; yalnızca UA eşleşmesi
 * en fazla `UNVERIFIED`/`PROBABLE` üretir. `VERIFIED` için edge sağlayıcısının doğrulanmış-bot
 * sinyali, resmî IP aralığı, ters DNS + ileri doğrulama veya imza gerekir.
 *
 * Ayrıca: `Google-Extended` ve `Applebot-Extended` ayrı crawler DEĞİL, eğitim izni kontrol
 * token'larıdır (robots.txt'te anlam taşır, HTTP isteği üretmezler). Bunlardan ziyaret üretilmez.
 */
import type { BotPurpose, VerificationLevel } from '@independentai/db';

export const BOT_REGISTRY_VERSION = 1;

export type BotDefinition = {
  canonicalId: string;
  operator: string;
  displayName: string;
  purpose: BotPurpose;
  /** Resmî dokümanda geçen user-agent parçaları (küçük harf karşılaştırılır) */
  userAgents: string[];
  /** Operatörün doğrulama yöntemi */
  verificationMethod: 'ip_range' | 'reverse_dns' | 'signature' | 'none';
  /** Ters DNS doğrulaması için kabul edilen alan adı sonekleri */
  reverseDnsSuffixes?: string[];
  docsUrl?: string;
  /**
   * robots.txt kontrol token'ı: HTTP isteği üretmez. Ziyaret kaydı oluşturulmaz;
   * yalnızca izin analizinde kullanılır.
   */
  controlTokenOnly?: boolean;
};

export const BOT_REGISTRY: BotDefinition[] = [
  {
    canonicalId: 'openai.gptbot',
    operator: 'OpenAI',
    displayName: 'GPTBot',
    purpose: 'TRAINING',
    userAgents: ['gptbot'],
    verificationMethod: 'ip_range',
    docsUrl: 'https://platform.openai.com/docs/bots',
  },
  {
    canonicalId: 'openai.searchbot',
    operator: 'OpenAI',
    displayName: 'OAI-SearchBot',
    purpose: 'SEARCH',
    userAgents: ['oai-searchbot'],
    verificationMethod: 'ip_range',
    docsUrl: 'https://platform.openai.com/docs/bots',
  },
  {
    canonicalId: 'openai.chatgpt-user',
    operator: 'OpenAI',
    displayName: 'ChatGPT-User',
    purpose: 'AGENT',
    userAgents: ['chatgpt-user'],
    verificationMethod: 'ip_range',
    docsUrl: 'https://platform.openai.com/docs/bots',
  },
  {
    canonicalId: 'anthropic.claudebot',
    operator: 'Anthropic',
    displayName: 'ClaudeBot',
    purpose: 'TRAINING',
    userAgents: ['claudebot', 'anthropic-ai'],
    verificationMethod: 'ip_range',
    docsUrl: 'https://support.anthropic.com/en/articles/8896518',
  },
  {
    canonicalId: 'anthropic.claude-user',
    operator: 'Anthropic',
    displayName: 'Claude-User',
    purpose: 'AGENT',
    userAgents: ['claude-user', 'claude-web'],
    verificationMethod: 'ip_range',
    docsUrl: 'https://support.anthropic.com/en/articles/8896518',
  },
  {
    canonicalId: 'anthropic.claude-searchbot',
    operator: 'Anthropic',
    displayName: 'Claude-SearchBot',
    purpose: 'SEARCH',
    userAgents: ['claude-searchbot'],
    verificationMethod: 'ip_range',
    docsUrl: 'https://support.anthropic.com/en/articles/8896518',
  },
  {
    canonicalId: 'perplexity.bot',
    operator: 'Perplexity',
    displayName: 'PerplexityBot',
    purpose: 'SEARCH',
    userAgents: ['perplexitybot'],
    verificationMethod: 'ip_range',
    docsUrl: 'https://docs.perplexity.ai/guides/bots',
  },
  {
    canonicalId: 'perplexity.user',
    operator: 'Perplexity',
    displayName: 'Perplexity-User',
    purpose: 'AGENT',
    userAgents: ['perplexity-user'],
    verificationMethod: 'ip_range',
    docsUrl: 'https://docs.perplexity.ai/guides/bots',
  },
  {
    canonicalId: 'google.googlebot',
    operator: 'Google',
    displayName: 'Googlebot',
    purpose: 'SEARCH',
    userAgents: ['googlebot'],
    verificationMethod: 'reverse_dns',
    reverseDnsSuffixes: ['.googlebot.com', '.google.com'],
    docsUrl: 'https://developers.google.com/search/docs/crawling-indexing/verifying-googlebot',
  },
  {
    canonicalId: 'google.google-extended',
    operator: 'Google',
    displayName: 'Google-Extended',
    purpose: 'TRAINING',
    userAgents: ['google-extended'],
    verificationMethod: 'none',
    controlTokenOnly: true,
    docsUrl: 'https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers',
  },
  {
    canonicalId: 'apple.applebot',
    operator: 'Apple',
    displayName: 'Applebot',
    purpose: 'SEARCH',
    userAgents: ['applebot'],
    verificationMethod: 'reverse_dns',
    reverseDnsSuffixes: ['.applebot.apple.com'],
    docsUrl: 'https://support.apple.com/en-us/119829',
  },
  {
    canonicalId: 'apple.applebot-extended',
    operator: 'Apple',
    displayName: 'Applebot-Extended',
    purpose: 'TRAINING',
    userAgents: ['applebot-extended'],
    verificationMethod: 'none',
    controlTokenOnly: true,
    docsUrl: 'https://support.apple.com/en-us/119829',
  },
  {
    canonicalId: 'microsoft.bingbot',
    operator: 'Microsoft',
    displayName: 'Bingbot',
    purpose: 'SEARCH',
    userAgents: ['bingbot'],
    verificationMethod: 'reverse_dns',
    reverseDnsSuffixes: ['.search.msn.com'],
    docsUrl: 'https://www.bing.com/webmasters/help/verify-bingbot-2195837f',
  },
  {
    canonicalId: 'commoncrawl.ccbot',
    operator: 'Common Crawl',
    displayName: 'CCBot',
    purpose: 'TRAINING',
    userAgents: ['ccbot'],
    verificationMethod: 'none',
    docsUrl: 'https://commoncrawl.org/ccbot',
  },
  {
    canonicalId: 'bytedance.bytespider',
    operator: 'ByteDance',
    displayName: 'Bytespider',
    purpose: 'TRAINING',
    userAgents: ['bytespider'],
    verificationMethod: 'none',
  },
  {
    canonicalId: 'meta.externalagent',
    operator: 'Meta',
    displayName: 'meta-externalagent',
    purpose: 'TRAINING',
    userAgents: ['meta-externalagent', 'facebookbot'],
    verificationMethod: 'none',
    docsUrl: 'https://developers.facebook.com/docs/sharing/webmasters/web-crawlers',
  },
  {
    canonicalId: 'amazon.amazonbot',
    operator: 'Amazon',
    displayName: 'Amazonbot',
    purpose: 'SEARCH',
    userAgents: ['amazonbot'],
    verificationMethod: 'reverse_dns',
    reverseDnsSuffixes: ['.crawl.amazon.com'],
    docsUrl: 'https://developer.amazon.com/amazonbot',
  },
  {
    canonicalId: 'duckduckgo.assistbot',
    operator: 'DuckDuckGo',
    displayName: 'DuckAssistBot',
    purpose: 'ASSISTANT',
    userAgents: ['duckassistbot'],
    verificationMethod: 'none',
    docsUrl: 'https://duckduckgo.com/duckduckgo-help-pages/results/duckassistbot/',
  },
  {
    canonicalId: 'cohere.ai',
    operator: 'Cohere',
    displayName: 'cohere-ai',
    purpose: 'TRAINING',
    userAgents: ['cohere-ai', 'cohere-training-data-crawler'],
    verificationMethod: 'none',
  },
];

/** robots.txt analizinde anlamlı ama ziyaret üretmeyen token'lar. */
export const CONTROL_TOKEN_IDS = new Set(BOT_REGISTRY.filter((b) => b.controlTokenOnly).map((b) => b.canonicalId));

const UA_INDEX: [string, BotDefinition][] = BOT_REGISTRY.flatMap((b) =>
  b.userAgents.map((ua) => [ua, b] as [string, BotDefinition]),
).sort((a, b) => b[0].length - a[0].length); // uzun token önce: "applebot-extended" > "applebot"

/** User-agent'tan bot tanımı. Bulunamazsa null. Kontrol token'ları da döner (çağıran eler). */
export function matchBot(userAgent: string | null | undefined): BotDefinition | null {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  for (const [token, def] of UA_INDEX) if (ua.includes(token)) return def;
  return null;
}

export type EdgeSignals = {
  /** Cloudflare gibi bir edge katmanı botu doğruladıysa */
  edgeVerified?: boolean;
  /** Operatörün resmî IP aralığında olduğu doğrulandıysa */
  ipRangeVerified?: boolean;
  /** Ters DNS + ileri doğrulama başarılıysa */
  reverseDnsVerified?: boolean;
  /** İmza (Web Bot Auth vb.) doğrulandıysa */
  signatureVerified?: boolean;
};

export type BotVerdict = {
  bot: BotDefinition | null;
  verification: VerificationLevel;
  method: string | null;
  /** Kontrol token'ı: ziyaret kaydı ÜRETİLMEZ */
  ignore: boolean;
  reason: string;
};

/**
 * Doğrulama sırası: edge → IP aralığı → ters DNS → imza → yalnızca UA.
 * Yalnızca UA eşleşmesi asla VERIFIED olamaz.
 */
export function verifyBot(userAgent: string | null | undefined, signals: EdgeSignals = {}): BotVerdict {
  const bot = matchBot(userAgent);
  if (!bot) {
    return { bot: null, verification: 'UNVERIFIED', method: null, ignore: true, reason: 'not_a_known_bot' };
  }
  if (bot.controlTokenOnly) {
    return {
      bot,
      verification: 'UNVERIFIED',
      method: null,
      ignore: true,
      reason: 'control_token_only', // örn. Google-Extended: ayrı crawler değil
    };
  }
  if (signals.edgeVerified)
    return { bot, verification: 'VERIFIED', method: 'edge', ignore: false, reason: 'edge_verified_bot' };
  if (signals.ipRangeVerified)
    return { bot, verification: 'VERIFIED', method: 'ip_range', ignore: false, reason: 'official_ip_range' };
  if (signals.reverseDnsVerified)
    return {
      bot,
      verification: 'VERIFIED',
      method: 'reverse_dns',
      ignore: false,
      reason: 'reverse_dns_forward_confirmed',
    };
  if (signals.signatureVerified)
    return { bot, verification: 'VERIFIED', method: 'signature', ignore: false, reason: 'request_signature' };

  // Doğrulama sinyali yok. Operatörün doğrulanabilir bir yöntemi varsa "iddia edilmiş ama
  // kanıtlanmamış" (PROBABLE değil) demek daha dürüst: UNVERIFIED.
  return { bot, verification: 'UNVERIFIED', method: 'user_agent', ignore: false, reason: 'user_agent_only' };
}
