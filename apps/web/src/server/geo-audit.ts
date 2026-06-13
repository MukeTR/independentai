/**
 * GEO Audit motoru (Faz 2) — bir URL'i çekip AI-hazırlığını 0-100 puanlar.
 * 5 eksen (Geoptie tarzı): answerFirst, citationAuthority, aiComprehension, technical, freshness.
 * Bağımlılıksız: regex tabanlı HTML analizi + opsiyonel LLM "anlaşılabilirlik" pass'i.
 */
import { complete } from '@independentai/ai';
import { safeFetch } from './safe-fetch';

export type AuditStatus = 'pass' | 'warn' | 'fail';
export type AuditFinding = { category: string; status: AuditStatus; title: string; detail: string; fix?: string };

export type GeoAuditResult = {
  url: string;
  overallScore: number;
  breakdown: {
    answerFirst: number;
    citationAuthority: number;
    aiComprehension: number;
    technical: number;
    freshness: number;
  };
  findings: AuditFinding[];
};

const FETCH_TIMEOUT = 12000;
const CURRENT_YEAR = new Date().getFullYear();

export async function fetchText(url: string, timeout = FETCH_TIMEOUT): Promise<string | null> {
  try {
    // SSRF-güvenli: internal/loopback/metadata adresleri engellenir, redirect'ler yeniden doğrulanır.
    const res = await safeFetch(url, {
      timeout,
      headers: { 'User-Agent': 'IndependentAI-GEOBot/1.0 (+https://independentai.space)' },
    });
    if (!res || !res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi, ' ') // named + decimal + hex entities
    .replace(/\s+/g, ' ')
    .trim();
}

function countMatches(re: RegExp, html: string): number {
  return (html.match(re) || []).length;
}

export async function runGeoAudit(rawUrl: string): Promise<GeoAuditResult> {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  const origin = (() => {
    try {
      return new URL(url).origin;
    } catch {
      return '';
    }
  })();

  const html = await fetchText(url);
  const findings: AuditFinding[] = [];

  if (html === null) {
    return {
      url,
      overallScore: 0,
      breakdown: { answerFirst: 0, citationAuthority: 0, aiComprehension: 0, technical: 0, freshness: 0 },
      findings: [
        { category: 'Erişim', status: 'fail', title: 'Sayfa çekilemedi', detail: 'URL yanıt vermedi veya engelledi. HTTPS, erişilebilirlik ve bot engellerini kontrol edin.' },
      ],
    };
  }

  const text = stripTags(html);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const isHttps = url.startsWith('https://');

  // Paralel ek dosya kontrolleri
  const [robotsTxt, llmsTxt] = await Promise.all([
    origin ? fetchText(`${origin}/robots.txt`, 6000) : Promise.resolve(null),
    origin ? fetchText(`${origin}/llms.txt`, 6000) : Promise.resolve(null),
  ]);

  // ───────── TECHNICAL ─────────
  let technical = 0;
  const hasTitle = /<title[^>]*>([^<]{3,})<\/title>/i.test(html);
  const hasMetaDesc = /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}/i.test(html);
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html);
  const hasJsonLd = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
  const noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);
  const aiBotsAllowed = !robotsTxt || !gptBotDisallowed(robotsTxt);

  technical += isHttps ? 18 : 0;
  technical += hasTitle ? 14 : 0;
  technical += hasMetaDesc ? 14 : 0;
  technical += hasViewport ? 10 : 0;
  technical += hasCanonical ? 10 : 0;
  technical += hasJsonLd ? 18 : 0;
  technical += aiBotsAllowed ? 10 : 0;
  technical += llmsTxt ? 6 : 0;
  if (noindex) technical = Math.max(0, technical - 40);
  technical = Math.min(100, technical);

  findings.push(statusFinding('Teknik', isHttps, 'HTTPS', 'Site güvenli bağlantı kullanıyor.', 'SSL sertifikası kurun.'));
  findings.push(statusFinding('Teknik', hasJsonLd, 'Yapısal veri (JSON-LD)', 'Sayfada schema.org yapısal verisi var.', 'Organization/FAQ JSON-LD ekleyin — Schema aracımızı kullanın.'));
  findings.push(statusFinding('Teknik', hasMetaDesc, 'Meta açıklama', 'Anlamlı bir meta açıklama mevcut.', '20+ karakterlik açıklayıcı meta description ekleyin.'));
  findings.push(statusFinding('Teknik', aiBotsAllowed, 'AI bot erişimi', 'GPTBot ve diğer AI crawler\'lar engellenmemiş.', 'robots.txt\'de AI botlara izin verin — robots.txt aracımızı kullanın.'));
  findings.push(statusFinding('Teknik', !!llmsTxt, 'llms.txt', 'Sitenizde llms.txt bulundu.', 'llms.txt ekleyin — AI\'a markanızı doğrudan anlatır.'));
  if (noindex) findings.push({ category: 'Teknik', status: 'fail', title: 'noindex etiketi', detail: 'Sayfa arama motorlarına kapalı işaretlenmiş!', fix: 'robots meta etiketinden noindex\'i kaldırın.' });

  // ───────── CONTENT STRUCTURE / ANSWER-FIRST ─────────
  const h1 = countMatches(/<h1[\s>]/gi, html);
  const h2 = countMatches(/<h2[\s>]/gi, html);
  const h3 = countMatches(/<h3[\s>]/gi, html);
  const lists = countMatches(/<(ul|ol)[\s>]/gi, html);
  const tables = countMatches(/<table[\s>]/gi, html);
  const hasFaq = /faq|sıkça sorulan|s\.s\.s|frequently asked/i.test(html);
  const hasQuestionHeadings = /<h[2-3][^>]*>[^<]*\?[^<]*<\/h[2-3]>/i.test(html);

  let answerFirst = 0;
  answerFirst += h1 === 1 ? 18 : h1 > 1 ? 8 : 0;
  answerFirst += h2 >= 2 ? 20 : h2 === 1 ? 10 : 0;
  answerFirst += h3 >= 1 ? 8 : 0;
  answerFirst += lists >= 1 ? 16 : 0;
  answerFirst += tables >= 1 ? 8 : 0;
  answerFirst += hasFaq ? 16 : 0;
  answerFirst += hasQuestionHeadings ? 14 : 0;
  answerFirst = Math.min(100, answerFirst);

  findings.push(statusFinding('İçerik', h1 === 1, 'Tek H1 başlık', 'Sayfada tam olarak bir H1 var.', h1 === 0 ? 'Bir H1 başlık ekleyin.' : 'Birden fazla H1 var, tek H1 kullanın.'));
  findings.push(statusFinding('İçerik', h2 >= 2, 'Alt başlık hiyerarşisi', 'Yeterli H2 alt başlık ile içerik bölümlenmiş.', 'İçeriği H2/H3 ile bölümleyin — AI bölümleri ayrı ayrı alıntılar.'));
  findings.push(statusFinding('İçerik', lists >= 1, 'Liste yapısı', 'Liste/tablo var — AI bunları kolay alıntılar.', 'Karşılaştırma ve adımları madde/numaralı liste yapın.'));
  findings.push(statusFinding('İçerik', hasFaq || hasQuestionHeadings, 'Soru-cevap formatı', 'FAQ veya soru başlıkları mevcut.', 'Soru formatında başlıklar + kısa net cevaplar ekleyin.'));

  // ───────── CITATION AUTHORITY ─────────
  const outboundLinks = countMatches(/<a[^>]+href=["']https?:\/\//gi, html);
  const internalAnchors = countMatches(/<a[^>]+href=["']\/[^"']/gi, html);
  const hasReferences = /kaynak|referans|reference|source|\[\d+\]/i.test(text);

  let citationAuthority = 0;
  citationAuthority += outboundLinks >= 3 ? 35 : outboundLinks >= 1 ? 18 : 0;
  citationAuthority += internalAnchors >= 3 ? 25 : internalAnchors >= 1 ? 12 : 0;
  citationAuthority += hasReferences ? 25 : 0;
  citationAuthority += wordCount >= 600 ? 15 : wordCount >= 300 ? 8 : 0;
  citationAuthority = Math.min(100, citationAuthority);

  findings.push(statusFinding('Otorite', outboundLinks >= 3, 'Dış kaynak bağlantıları', 'Güvenilir dış kaynaklara atıf var.', 'Verileri otoriter kaynaklara linkleyin — AI güveni artar.'));
  findings.push(statusFinding('Otorite', hasReferences, 'Kaynak gösterimi', 'İçerikte kaynak/referans dili var.', 'İstatistik ve iddialara kaynak ekleyin.'));

  // ───────── FRESHNESS ─────────
  const hasPublished = /article:published_time|datePublished/i.test(html);
  const hasModified = /article:modified_time|dateModified/i.test(html);
  const mentionsCurrentYear = new RegExp(`\\b${CURRENT_YEAR}\\b`).test(text);
  const mentionsLastYear = new RegExp(`\\b${CURRENT_YEAR - 1}\\b`).test(text);

  let freshness = 0;
  freshness += hasModified ? 40 : hasPublished ? 25 : 0;
  freshness += mentionsCurrentYear ? 40 : mentionsLastYear ? 20 : 0;
  freshness += wordCount >= 300 ? 20 : 0;
  freshness = Math.min(100, freshness);

  findings.push(statusFinding('Tazelik', hasModified || hasPublished, 'Tarih meta verisi', 'Yayın/güncelleme tarihi işaretlenmiş.', 'dateModified/datePublished schema alanı ekleyin.'));
  findings.push(statusFinding('Tazelik', mentionsCurrentYear, 'Güncel yıl referansı', `İçerik ${CURRENT_YEAR} yılına atıf yapıyor.`, 'İçeriği güncel tutun, yıl referanslarını yenileyin.'));

  // ───────── AI COMPREHENSION (opsiyonel LLM) ─────────
  let aiComprehension = heuristicComprehension(wordCount, h2, lists, hasFaq);
  const llmScore = await llmComprehension(text.slice(0, 3000));
  if (llmScore !== null) aiComprehension = llmScore;
  findings.push({
    category: 'Anlaşılabilirlik',
    status: aiComprehension >= 70 ? 'pass' : aiComprehension >= 45 ? 'warn' : 'fail',
    title: 'AI anlaşılabilirliği',
    detail: `İçeriğin AI için netlik/öz puanı: ${aiComprehension}/100.`,
    fix: aiComprehension < 70 ? 'Kısa paragraflar, net tanımlar ve doğrudan cevaplarla yazın.' : undefined,
  });

  // ───────── OVERALL ─────────
  const breakdown = { answerFirst, citationAuthority, aiComprehension, technical, freshness };
  const overallScore = Math.round(
    answerFirst * 0.22 + citationAuthority * 0.18 + aiComprehension * 0.25 + technical * 0.22 + freshness * 0.13,
  );

  return { url, overallScore, breakdown, findings };
}

/** Sadece GPTBot user-agent grubunun içinde "Disallow: /" var mı? (gruplar arası taşmayı önler) */
function gptBotDisallowed(robots: string): boolean {
  const idx = robots.search(/user-agent:\s*gptbot/i);
  if (idx === -1) return false; // GPTBot'a özel kural yok → engellenmemiş
  const after = robots.slice(idx);
  const nextUA = after.slice(1).search(/^\s*user-agent:/im);
  const block = nextUA === -1 ? after : after.slice(0, nextUA + 1);
  return /^\s*disallow:\s*\/\s*$/im.test(block);
}

function statusFinding(category: string, ok: boolean, title: string, passDetail: string, fix: string): AuditFinding {
  return ok
    ? { category, status: 'pass', title, detail: passDetail }
    : { category, status: 'fail', title, detail: 'Eksik veya iyileştirilebilir.', fix };
}

function heuristicComprehension(wordCount: number, h2: number, lists: number, hasFaq: boolean): number {
  let s = 30;
  if (wordCount >= 300) s += 20;
  if (wordCount >= 800) s += 10;
  if (h2 >= 2) s += 20;
  if (lists >= 1) s += 10;
  if (hasFaq) s += 10;
  return Math.min(100, s);
}

async function llmComprehension(sample: string): Promise<number | null> {
  if (!sample || sample.length < 100) return null;
  const out = await complete(
    `Aşağıdaki web sayfası içeriğini bir yapay zekanın anlayıp doğru alıntılaması açısından 0-100 arası puanla. Netlik, doğrudan cevaplar, yapı ve özlülüğe bak. Sadece sayı döndür.\n\nİçerik:\n"""${sample}"""`,
    { maxTokens: 10, temperature: 0 },
  );
  if (!out) return null;
  const n = parseInt(out.replace(/[^\d]/g, '').slice(0, 3), 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
}
