/**
 * İçerik Denetleyicisi (Faz 4) — bir sayfayı analiz edip AI-alıntılanabilirliğini
 * artıracak önceliklendirilmiş aksiyon kartları üretir (Goodie tarzı: zorluk + etki).
 */
import { complete, completeJSON } from '@independentai/ai';
import { fetchText, stripTags } from './geo-audit';

export type Difficulty = 'Kolay' | 'Orta' | 'Zor';
export type Impact = 'Yüksek' | 'Orta' | 'Düşük';

export type ActionCard = {
  title: string;
  detail: string;
  difficulty: Difficulty;
  impact: Impact;
};

export type ContentAuditResult = {
  url: string;
  contentScore: number;
  summary: string;
  stats: { wordCount: number; headings: number; lists: number; hasFaq: boolean };
  recommendations: ActionCard[];
};

export async function runContentAudit(rawUrl: string): Promise<ContentAuditResult> {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  const html = await fetchText(url);
  if (html === null) {
    return {
      url,
      contentScore: 0,
      summary: 'Sayfa çekilemedi. URL ve erişilebilirliği kontrol edin.',
      stats: { wordCount: 0, headings: 0, lists: 0, hasFaq: false },
      recommendations: [],
    };
  }

  const text = stripTags(html);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const headings = (html.match(/<h[1-3][\s>]/gi) || []).length;
  const lists = (html.match(/<(ul|ol)[\s>]/gi) || []).length;
  const hasFaq = /faq|sıkça sorulan|s\.s\.s/i.test(html);

  // Deterministik içerik skoru
  let contentScore = 25;
  if (wordCount >= 300) contentScore += 15;
  if (wordCount >= 800) contentScore += 10;
  if (headings >= 3) contentScore += 20;
  if (lists >= 1) contentScore += 15;
  if (hasFaq) contentScore += 15;
  contentScore = Math.min(100, contentScore);

  const stats = { wordCount, headings, lists, hasFaq };

  // LLM ile aksiyon kartları
  let recommendations = await llmRecommendations(text.slice(0, 3500), stats);
  if (recommendations.length === 0) recommendations = heuristicRecommendations(stats);

  const summary =
    (await complete(
      `Bu web sayfası içeriğinin AI arama görünürlüğü açısından tek cümlelik özet değerlendirmesini Türkçe yaz (maks 25 kelime):\n"""${text.slice(0, 1500)}"""`,
      { maxTokens: 60, temperature: 0.3 },
    )) ?? `Sayfa ${wordCount} kelime, ${headings} başlık içeriyor. ${hasFaq ? 'FAQ mevcut.' : 'FAQ eklenebilir.'}`;

  return { url, contentScore, summary: summary.trim(), stats, recommendations };
}

async function llmRecommendations(sample: string, stats: ContentAuditResult['stats']): Promise<ActionCard[]> {
  if (!sample || sample.length < 100) return [];
  const prompt = `Aşağıdaki web sayfası içeriğini, ChatGPT/Claude/Gemini gibi AI motorlarının daha çok alıntılaması için nasıl iyileştireceğine dair 4-6 somut aksiyon öner.

İçerik (kısaltılmış):
"""${sample}"""

Mevcut yapı: ${stats.wordCount} kelime, ${stats.headings} başlık, ${stats.lists} liste, FAQ: ${stats.hasFaq ? 'var' : 'yok'}.

Her aksiyon için JSON. difficulty: Kolay|Orta|Zor. impact: Yüksek|Orta|Düşük.
Format: {"items":[{"title":"...","detail":"...","difficulty":"Kolay","impact":"Yüksek"}]}`;

  type Resp = { items: ActionCard[] };
  const res = await completeJSON<Resp>(prompt, { maxTokens: 900 });
  if (!res?.items?.length) return [];
  return res.items
    .filter((c) => c.title && c.detail)
    .map((c) => ({
      title: c.title,
      detail: c.detail,
      difficulty: (['Kolay', 'Orta', 'Zor'].includes(c.difficulty) ? c.difficulty : 'Orta') as Difficulty,
      impact: (['Yüksek', 'Orta', 'Düşük'].includes(c.impact) ? c.impact : 'Orta') as Impact,
    }))
    .slice(0, 6);
}

function heuristicRecommendations(stats: ContentAuditResult['stats']): ActionCard[] {
  const cards: ActionCard[] = [];
  if (!stats.hasFaq)
    cards.push({
      title: 'FAQ / Soru-Cevap bölümü ekleyin',
      detail: 'Müşteri sorularını başlık yapıp altına kısa net cevaplar verin. AI bu blokları doğrudan alıntılar.',
      difficulty: 'Orta',
      impact: 'Yüksek',
    });
  if (stats.headings < 3)
    cards.push({
      title: 'İçeriği alt başlıklarla bölün',
      detail: 'H2/H3 başlıklar ekleyerek konuları ayırın; AI her bölümü bağımsız alıntılayabilir.',
      difficulty: 'Kolay',
      impact: 'Yüksek',
    });
  if (stats.lists < 1)
    cards.push({
      title: 'Madde/numaralı liste kullanın',
      detail: 'Karşılaştırma ve adımları listeye çevirin — AI yapılandırılmış içeriği tercih eder.',
      difficulty: 'Kolay',
      impact: 'Orta',
    });
  if (stats.wordCount < 600)
    cards.push({
      title: 'İçeriği derinleştirin',
      detail: 'En az 600+ kelimeyle konuyu kapsamlı işleyin; yüzeysel sayfalar nadiren alıntılanır.',
      difficulty: 'Orta',
      impact: 'Orta',
    });
  cards.push({
    title: 'İstatistik ve kaynak ekleyin',
    detail: 'Somut veriler ve otoriter kaynak linkleri AI güvenini artırır.',
    difficulty: 'Orta',
    impact: 'Yüksek',
  });
  return cards;
}
