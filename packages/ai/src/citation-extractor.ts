/**
 * AI cevap metninden atıf/kaynak çıkarımı (Faz 0/1/6).
 * Provider native citation verirse onları da birleştirir; metindeki URL'leri parse eder.
 */

export type ExtractedCitation = {
  url: string;
  domain: string;
  title?: string;
};

const URL_RE = /https?:\/\/[^\s<>()\[\]"']+/gi;

/** Cümle sonu noktalamasını kırpar ama dengeli parantez/köşeli ayraçları korur (örn. Wikipedia linkleri). */
function trimTrailingPunct(raw: string): string {
  let u = raw.replace(/[.,;:!?'"]+$/, '');
  const count = (s: string, ch: string) => s.split(ch).length - 1;
  while (u.endsWith(')') && count(u, '(') < count(u, ')')) u = u.slice(0, -1);
  while (u.endsWith(']') && count(u, '[') < count(u, ']')) u = u.slice(0, -1);
  return u;
}
// Markdown link: [title](url)
const MD_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi;

/** "www.linkedin.com/foo" → "linkedin.com" */
export function normalizeDomain(url: string): string {
  try {
    const u = new URL(url);
    let host = u.hostname.toLowerCase();
    if (host.startsWith('www.')) host = host.slice(4);
    return host;
  } catch {
    return '';
  }
}

export function extractCitations(
  responseText: string,
  providerCitations?: Array<{ url: string; title?: string }>,
): ExtractedCitation[] {
  const seen = new Set<string>();
  const out: ExtractedCitation[] = [];

  const add = (rawUrl: string, title?: string) => {
    const url = trimTrailingPunct(rawUrl);
    const domain = normalizeDomain(url);
    if (!domain) return;
    const key = `${domain}|${url}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ url, domain, title });
  };

  // 1) Provider native citations
  for (const c of providerCitations ?? []) add(c.url, c.title);

  // 2) Markdown linkler (başlıkla)
  let m: RegExpExecArray | null;
  while ((m = MD_LINK_RE.exec(responseText)) !== null) {
    if (m[2]) add(m[2], m[1]);
  }

  // 3) Çıplak URL'ler
  while ((m = URL_RE.exec(responseText)) !== null) {
    if (m[0]) add(m[0]);
  }

  return out;
}

/** Domain bazında agregasyon — Top Citation Sources widget'ı için. */
export function aggregateByDomain(
  citations: { domain: string }[],
): { domain: string; count: number }[] {
  const map = new Map<string, number>();
  for (const c of citations) map.set(c.domain, (map.get(c.domain) ?? 0) + 1);
  return [...map.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count);
}
