import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  /**
   * Özel User-Agent grubu, `*` grubunu TAMAMEN geçersiz kılar (REP): yapay zekâ botlarına
   * yalnızca `allow: '/'` yazmak panel, yönetim ve API yollarını onlara açık bırakırdı.
   * Bu yüzden aynı disallow listesi her grupta tekrar edilir.
   */
  const PRIVATE_PATHS = ['/dashboard/', '/admin/', '/api/'];

  /** Yapay zekâ tarayıcıları — herkese açık sayfalara açık, özel alanlara kapalı. */
  const AI_AGENTS = [
    // OpenAI
    'GPTBot',
    'ChatGPT-User',
    'OAI-SearchBot',
    // Anthropic
    'ClaudeBot',
    'Claude-Web',
    // Perplexity
    'PerplexityBot',
    // Google AI
    'Google-Extended',
    // ByteDance / Doubao
    'Bytespider',
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },

      ...AI_AGENTS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: PRIVATE_PATHS,
      })),
    ],

    sitemap: `${SITE_URL}/sitemap.xml`,

    // Next.js host alanına sadece domain verilmesi daha güvenli
    host: SITE_URL.replace(/^https?:\/\//, ''),
  };
}
