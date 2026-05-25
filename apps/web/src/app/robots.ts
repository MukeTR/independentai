import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/admin/', '/api/'],
      },

      // OpenAI
      {
        userAgent: 'GPTBot',
        allow: '/',
      },
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
      },
      {
        userAgent: 'OAI-SearchBot',
        allow: '/',
      },

      // Anthropic
      {
        userAgent: 'ClaudeBot',
        allow: '/',
      },
      {
        userAgent: 'Claude-Web',
        allow: '/',
      },

      // Perplexity
      {
        userAgent: 'PerplexityBot',
        allow: '/',
      },

      // Google AI
      {
        userAgent: 'Google-Extended',
        allow: '/',
      },

      // ByteDance / Doubao
      {
        userAgent: 'Bytespider',
        allow: '/',
      },
    ],

    sitemap: `${SITE_URL}/sitemap.xml`,

    // Next.js host alanına sadece domain verilmesi daha güvenli
    host: SITE_URL.replace(/^https?:\/\//, ''),
  };
}
