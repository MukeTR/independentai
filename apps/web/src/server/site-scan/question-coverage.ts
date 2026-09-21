/**
 * Satın alma sorusu kapsama (`/arac/satin-alma-sorusu-kapsama`, QUESTION_COVERAGE) — sektörün 20–25 müşteri sorusu
 * sitenin ≤30 sayfasında cevaplanıyor mu? Anahtar kelime (kök) eşleşmesi; cevap KALİTESİNİ ve AI DAVRANIŞINI ölçmez.
 *  - `sector` zorunlu (yoksa ClientError → 400). Sayfa seçimi page-picker.ts (sitemap slug ↔ soru kökleri).
 *  - Soru başına: H1–H3 başlıkta veya FAQPage Question.name'de eşleşme = answered; yalnız gövdede = partial; yok = none.
 *    Eksen puanı: her soru bir kontrol (pass/warn/fail) → coverage % = (answered + 0,5·partial)/N ile birebir.
 *  - Cevap biçimi: FAQPage şeması, soru işaretli H2/H3 sayısı, taranan sayfa genişliği.
 *  - Fiyat/konum: fiyat|ücret|ne kadar|₺|TL geçen sayfa sayısı; il adı + şube|yakın|adres geçen sayfa sayısı.
 *  - Hüküm (extra.summary): "N sorunun M'ine cevap var; K soru sahipsiz".
 */
import { ClientError } from '../errors';
import { hasType, str, type JsonLdNode } from '../commerce/html-analysis';
import { INTENT_LABELS, questionsFor, type QuestionIntent, type SectorQuestion } from '@/data/sector-questions';
import { SECTOR_BY_SLUG } from '@/data/sectors';
import { isSectorSlug } from '@/lib/tool-registry';
import { defineSiteTool } from './core';
import { collectPageArtifact, type PageArtifact } from './fetch-page';
import { fetchPickedPages, pickPages, type PickedPage } from './page-picker';
import { hasOrganizationSchema } from './quick-checks';
import { normalizeTr, tokenizeTr, tokensMatchGroups } from './tr-text';
import { TR_CITIES } from './trust-signals';

export type CoverageAxis = 'coverage' | 'answerFormat' | 'priceLocation' | 'schema';

export const COVERAGE_AXES = [
  { key: 'coverage' as const, label: 'Soru kapsama', weight: 50, description: 'Sektör sorularının kaçı başlıkta (tam) veya gövdede (kısmi) karşılık buluyor' },
  { key: 'answerFormat' as const, label: 'Cevap biçimi', weight: 25, description: 'FAQPage şeması, soru biçiminde H2/H3 başlıklar, taranan sayfa genişliği' },
  { key: 'priceLocation' as const, label: 'Fiyat ve konum sinyali', weight: 15, description: 'Fiyat/ücret ve il/şube ifadeleri geçen sayfalar' },
  { key: 'schema' as const, label: 'Şema', weight: 10, description: 'Organization/LocalBusiness ve sayfa tipi şeması' },
];

export const DISCLAIMER = 'Anahtar kelime eşleşmesi; cevap kalitesini ve AI davranışını ölçmez.';

export type CoverageStatus = 'answered' | 'partial' | 'none';

export type CoverageQuestion = {
  id: string;
  q: string;
  intent: QuestionIntent;
  intentLabel: string;
  status: CoverageStatus;
  /** En yakın sayfa (answered/partial) */
  pageUrl: string | null;
  pageTitle: string | null;
  /** Eşleşen başlık (answered) */
  heading: string | null;
};

export type CoverageArtifacts = { home: PageArtifact; pages: PageArtifact[]; picks: PickedPage[] };

export type CoverageExtra = {
  sector: string;
  sectorName: string;
  total: number;
  answered: number;
  partial: number;
  none: number;
  coveragePct: number;
  summary: string;
  questions: CoverageQuestion[];
  pagesPicked: number;
  pagesScanned: number;
  scannedUrls: string[];
  disclaimer: string;
  byIntent: { intent: QuestionIntent; label: string; total: number; answered: number; partial: number }[];
};

const PRICE_RE = /\bfiyat|ücret|ne kadar|₺|\btl\b|\btry\b|kaç para/i;
const LOCATION_HINT_RE = /\bşube|yakın|adres|ilçe|semt|mah\.|mahalle|cadde|sokak|harita/i;
const CITY_SET = new Set<string>(TR_CITIES.map((c) => normalizeTr(c)));

type PageIndex = {
  page: PageArtifact;
  headings: { text: string; tokens: string[] }[];
  bodyTokens: string[];
  hasFaqPage: boolean;
  questionHeadings: number;
  priceSignal: boolean;
  locationSignal: boolean;
};

function faqNames(nodes: JsonLdNode[]): string[] {
  const out: string[] = [];
  for (const n of nodes) {
    if (!hasType(n, 'FAQPage')) continue;
    const main = n.mainEntity;
    const list = Array.isArray(main) ? main : main ? [main] : [];
    for (const q of list) {
      if (q && typeof q === 'object') {
        const name = str((q as JsonLdNode).name);
        if (name) out.push(name);
      }
    }
  }
  return out;
}

export function indexPage(page: PageArtifact): PageIndex {
  const headingTexts = [...page.headings.h1, ...page.headings.h2, ...page.headings.h3, ...faqNames(page.jsonLd)];
  const headings = headingTexts.map((text) => ({ text, tokens: tokenizeTr(text) }));
  const body = page.text.slice(0, 80_000);
  const bodyTokens = tokenizeTr(body);
  const questionHeadings = [...page.headings.h2, ...page.headings.h3].filter((h) => h.includes('?')).length;
  const norm = normalizeTr(body);
  const cityHit = norm.split(' ').some((t) => CITY_SET.has(t));
  return {
    page,
    headings,
    bodyTokens,
    hasFaqPage: page.jsonLd.some((n) => hasType(n, 'FAQPage')),
    questionHeadings,
    priceSignal: PRICE_RE.test(body),
    locationSignal: cityHit && LOCATION_HINT_RE.test(body),
  };
}

/** Tek soru için tüm sayfalarda en iyi eşleşme. */
export function matchQuestion(q: SectorQuestion, pages: PageIndex[]): Omit<CoverageQuestion, 'id' | 'q' | 'intent' | 'intentLabel'> {
  let partial: PageIndex | null = null;
  for (const p of pages) {
    const h = p.headings.find((x) => tokensMatchGroups(x.tokens, q.keywords));
    if (h) return { status: 'answered', pageUrl: p.page.finalUrl, pageTitle: p.page.title, heading: h.text };
    if (!partial && tokensMatchGroups(p.bodyTokens, q.keywords)) partial = p;
  }
  if (partial) return { status: 'partial', pageUrl: partial.page.finalUrl, pageTitle: partial.page.title, heading: null };
  return { status: 'none', pageUrl: null, pageTitle: null, heading: null };
}

export function coverageSummary(total: number, answered: number, partial: number): string {
  const none = total - answered - partial;
  return `${total} sorunun ${answered}’ine cevap var${partial ? `, ${partial}’i kısmen` : ''}; ${none} soru sahipsiz`;
}

function requireSector(sector: string | undefined): string {
  if (!sector || !isSectorSlug(sector)) throw new ClientError('Sektör seçin');
  return sector;
}

export const questionCoverageTool = defineSiteTool<CoverageAxis, CoverageArtifacts, CoverageExtra>({
  kind: 'QUESTION_COVERAGE',
  axes: COVERAGE_AXES,
  collect: async (url, budget, input) => {
    const sector = requireSector(input.sector);
    const questions = questionsFor(sector);
    const home = await collectPageArtifact(url, budget, { sitemap: true, robots: true });
    if (!home.reachable) return { home, pages: [], picks: [{ url: home.url, reason: 'home', hits: 0 }] };
    const picks = pickPages(home, questions.map((q) => q.keywords));
    const pages = await fetchPickedPages(picks, budget);
    return { home, pages, picks };
  },
  analyze: ({ home, pages, picks }, s, ctx) => {
    const sector = requireSector(ctx.input.sector);
    const questions = questionsFor(sector);
    const sectorName = SECTOR_BY_SLUG[sector]?.name ?? sector;
    const reachable = [home, ...pages].filter((p) => p.reachable);
    const idx = reachable.map(indexPage);

    // ── Kapsama: her soru bir kontrol ──
    const results: CoverageQuestion[] = [];
    for (const q of questions) {
      const m = idx.length ? matchQuestion(q, idx) : { status: 'none' as const, pageUrl: null, pageTitle: null, heading: null };
      results.push({ id: q.id, q: q.q, intent: q.intent, intentLabel: INTENT_LABELS[q.intent], ...m });
      s.check(
        'coverage',
        1,
        m.status === 'answered' ? 'pass' : m.status === 'partial' ? 'warn' : 'fail',
        q.q,
        {
          pass: `Başlıkta karşılık var: “${(m.heading ?? '').slice(0, 90)}”`,
          warn: `Yalnız gövde metninde geçiyor (${m.pageUrl ?? ''}); başlık düzeyinde cevap yok.`,
          fail: 'Taranan sayfaların hiçbirinde bu soruya değen bir başlık veya metin yok.',
        },
        {
          fix: `“${q.q}” için bir H2/H3 açın ve altına 60 kelimelik doğrudan cevap yazın`,
          evidence: m.pageUrl ?? undefined,
          topic: 'questionCoverage',
        },
      );
    }
    const answered = results.filter((r) => r.status === 'answered').length;
    const partial = results.filter((r) => r.status === 'partial').length;
    const none = results.length - answered - partial;
    const coveragePct = results.length ? Math.round(((answered + 0.5 * partial) / results.length) * 100) : 0;

    // ── Cevap biçimi ──
    const faq = idx.some((p) => p.hasFaqPage);
    const qHeadings = idx.reduce((n, p) => n + p.questionHeadings, 0);
    s.check('answerFormat', 35, faq, 'FAQPage şeması', { pass: 'En az bir sayfada FAQPage var.', fail: 'Hiçbir sayfada FAQPage şeması yok; soru-cevaplarınız yapılandırılmış değil.' }, { fix: 'SSS bölümünü FAQPage JSON-LD ile işaretleyin', topic: 'faq' });
    s.check('answerFormat', 40, qHeadings >= 3 ? 'pass' : qHeadings > 0 ? 'warn' : 'fail', 'Soru biçiminde başlıklar', { pass: `${qHeadings} soru işaretli H2/H3 başlık.`, warn: `Yalnız ${qHeadings} soru başlığı var; müşteri sorularını başlık yapın.`, fail: 'Soru biçiminde (… ?) H2/H3 başlık yok.' }, { fix: 'Müşterinin sorduğu soruları H2/H3 başlık olarak yazın', topic: 'questionCoverage' });
    s.check('answerFormat', 25, idx.length >= 5 ? 'pass' : idx.length >= 2 ? 'warn' : 'fail', 'Taranabilir sayfa genişliği', { pass: `${idx.length} sayfa tarandı.`, warn: `Yalnız ${idx.length} sayfa tarandı; sitemap yoksa ana sayfa linkleriyle sınırlı kaldı.`, fail: 'Ana sayfa dışında taranabilir sayfa bulunamadı.' }, { fix: 'sitemap.xml yayınlayın ve hizmet/SSS sayfalarını ana sayfadan bağlayın', topic: 'sitemap' });

    // ── Fiyat / konum ──
    const pricePages = idx.filter((p) => p.priceSignal).length;
    const locPages = idx.filter((p) => p.locationSignal).length;
    s.check('priceLocation', 50, pricePages > 0, 'Fiyat / ücret ifadesi', { pass: `${pricePages} sayfada fiyat/ücret ifadesi var.`, fail: 'Hiçbir sayfada fiyat, ücret veya “ne kadar” ifadesi yok; asistan fiyat sorusunu başka kaynaktan tahmin eder.' }, { fix: 'Fiyat bandı ve neye bağlı olduğunu yazan bir bölüm ekleyin', topic: 'pricing' });
    s.check('priceLocation', 50, locPages > 0, 'Konum ifadesi (il + şube/adres)', { pass: `${locPages} sayfada il adı ve adres/şube ifadesi var.`, fail: 'İl adı ile birlikte adres/şube/harita ifadesi geçen sayfa yok.' }, { fix: 'İl/ilçe, şube ve hizmet bölgesini metinde açıkça yazın', topic: 'trustSignals' });

    // ── Şema ──
    const org = reachable.some((p) => hasOrganizationSchema(p.jsonLd));
    const pageType = reachable.some((p) => p.jsonLd.some((n) => ['Service', 'Product', 'Course', 'Hotel', 'FAQPage', 'Article', 'BlogPosting', 'WebSite'].some((t) => hasType(n, t))));
    s.check('schema', 50, org, 'Organization / LocalBusiness', { pass: 'Var.', fail: 'Yok.' }, { fix: 'Organization JSON-LD ekleyin', topic: 'organizationSchema' });
    s.check('schema', 50, pageType, 'Sayfa tipi şeması', { pass: 'Var.', fail: 'Service/Product/Course/FAQPage gibi sayfa tipi şeması yok.' }, { fix: 'Hizmet sayfalarına Service, SSS’ye FAQPage ekleyin', topic: 'faq' });

    const byIntent = (Object.keys(INTENT_LABELS) as QuestionIntent[])
      .map((intent) => {
        const rs = results.filter((r) => r.intent === intent);
        return { intent, label: INTENT_LABELS[intent], total: rs.length, answered: rs.filter((r) => r.status === 'answered').length, partial: rs.filter((r) => r.status === 'partial').length };
      })
      .filter((x) => x.total > 0);

    return {
      page: home,
      partial: pages.some((p) => p.page.error === 'budget'),
      extra: {
        sector,
        sectorName,
        total: results.length,
        answered,
        partial,
        none,
        coveragePct,
        summary: coverageSummary(results.length, answered, partial),
        questions: results,
        pagesPicked: picks.length,
        pagesScanned: idx.length,
        scannedUrls: reachable.map((p) => p.finalUrl),
        disclaimer: DISCLAIMER,
        byIntent,
      },
    };
  },
});
