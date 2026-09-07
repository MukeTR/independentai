/**
 * robots.txt snippet üretici — istemci ve sunucuda paylaşılan saf fonksiyon.
 * Yalnızca kullanıcının SEÇTİĞİ botlar için standart "Allow: /" satırları üretir; başka hiçbir
 * yönerge (crawl-delay, gizleme, yanıltma) eklenmez. Bot adları sabit listeden doğrulanır.
 */
export const KNOWN_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'anthropic-ai',
  'PerplexityBot',
  'Google-Extended',
  'CCBot',
  'Bytespider',
  'Applebot-Extended',
  'Googlebot',
  'Bingbot',
] as const;

export type KnownBot = (typeof KNOWN_BOTS)[number];

export function buildRobotsSnippet(selected: readonly string[], sitemapUrl?: string | null): string {
  const bots = KNOWN_BOTS.filter((b) => selected.includes(b));
  if (bots.length === 0) return '';
  const lines: string[] = ['# Independent AI — AI crawler izinleri (mevcut robots.txt dosyanızın sonuna ekleyin)'];
  for (const b of bots) {
    lines.push(`User-agent: ${b}`);
    lines.push('Allow: /');
    lines.push('');
  }
  if (sitemapUrl && /^https?:\/\/[^\s]+$/i.test(sitemapUrl)) lines.push(`Sitemap: ${sitemapUrl}`);
  return lines.join('\n').trimEnd() + '\n';
}
