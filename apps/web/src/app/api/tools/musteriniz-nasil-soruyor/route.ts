/**
 * "Müşteriniz sizi nasıl soruyor?" — ücretsiz araç ucu.
 *
 *  GET  ?sektor=<slug>  → yalnız soru bankası (site yok, tarama yok, skor yok).
 *  POST {url, sector}   → `handlePublicScan` zarfı (rate limit, yasaklı site, önbellek, kalıcı rapor) ile
 *                         TEK sayfa okunur ve her sorunun ipuçları o sayfanın metninde aranır.
 *
 * Dürüstlük sözleşmesi:
 *  - Yalnızca GİRİLEN sayfa okunur; site geneli taranmaz, iddia edilmez.
 *  - Sayfa okunamazsa skor/oran ÜRETİLMEZ: `unreachable` doldurulur, `score` 0 kalır ve arayüz oran yerine
 *    "Adrese ulaşılamadı" gösterir (bkz. server/geo-audit.ts aynı desen).
 *  - Kapsama kuralı: bir sorunun ipuçlarının hepsi sayfada geçiyorsa "var", en az biri geçiyorsa "kısmen",
 *    hiçbiri geçmiyorsa "yok".
 *  - Şehir ve hizmet adı SUNUCUYA GÖNDERİLMEZ: onlar yalnızca soru cümlelerindeki yer tutucuları doldurmak
 *    için istemcide kullanılır; böylece önbellek anahtarı (url|kind|sector) ile sonuç birebir örtüşür.
 */
import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { ClientError } from '@/server/errors';
import { enforceRateLimit, type LimitSpec } from '@/server/rate-limit';
import { handlePublicScan, type ScanInput } from '@/server/commerce/public-scan';
import type { CommerceFinding, Recommendation } from '@/server/commerce/scoring';
import { stripTags } from '@/server/geo-audit';
import { safeFetch, UnsafeUrlError } from '@/server/safe-fetch';
import { isSectorSlug, type SectorSlug } from '@/lib/tool-registry';
import { bankBySlug } from '@/data/question-bank';
import { STAGE_LABELS, STAGE_ORDER, type BankQuestion, type QuestionStage } from '@/data/question-bank/types';

export const maxDuration = 30;

const FETCH_TIMEOUT = 12_000;

/** Soru bankası okuma (tarama yok, dış istek yok) — yine de kötüye kullanıma karşı IP başına tavan. */
const BANK_LIMIT: LimitSpec = {
  name: 'question-bank',
  limit: 60,
  windowMs: 3_600_000,
  global: { limit: 3000, windowMs: 3_600_000 },
};

export type CoverageStatus = 'var' | 'kismen' | 'yok';

export type CoverageQuestion = {
  /** Bankadaki sıra — paylaşılan raporda soruyu yeniden bulmak için */
  index: number;
  q: string;
  stage: QuestionStage;
  stageLabel: string;
  answeredBy: string;
  why: string;
  signals: string[];
  /** Site verilmediyse veya sayfa okunamadıysa null (kapsama ÖLÇÜLMEDİ) */
  status: CoverageStatus | null;
  matched: string[];
  missing: string[];
};

export type StageSummary = {
  stage: QuestionStage;
  label: string;
  total: number;
  covered: number;
  partial: number;
  missing: number;
  /** 0-100; "var" tam, "kısmen" yarım sayılır */
  ratio: number;
};

export type QuestionBankPayload = {
  mode: 'banka' | 'kapsama';
  sector: SectorSlug;
  note: string;
  total: number;
  questions: CoverageQuestion[];
  stages: StageSummary[];
};

export type QuestionCoverageResult = QuestionBankPayload & {
  mode: 'kapsama';
  url: string;
  hostname: string;
  score: number;
  breakdown: Record<string, number>;
  findings: CommerceFinding[];
  recommendations: Recommendation[];
  summary: {
    covered: number;
    partial: number;
    missing: number;
    /** Oranı en düşük aşama; ölçüm yapılamadıysa null */
    weakestStage: QuestionStage | null;
    /** Önce cevaplanacak 3 sorunun `index` değeri */
    firstThree: number[];
  } | null;
  fetchedAt: string;
  /** Sayfa okunamadı: skor bir DEĞERLENDİRME DEĞİLDİR, ölçüm hiç yapılamamıştır. */
  unreachable?: { reason: 'network' | 'http'; status: number | null };
  waf: boolean;
  partial: boolean;
  /** `handlePublicScan` zarfı — sonuç JSON'una sunucu tarafında eklenir. */
  cached?: boolean;
  scanId?: string;
  reportToken?: string;
  reportUrl?: string;
};

/* ────────────────────────── metin eşleştirme ────────────────────────── */

/** Türkçe harfleri ASCII karşılığına indirger — "İ".toLowerCase() birleşik nokta üretmesin diye ÖNCE çalışır. */
const FOLD: Record<string, string> = {
  İ: 'i',
  I: 'i',
  ı: 'i',
  Ğ: 'g',
  ğ: 'g',
  Ü: 'u',
  ü: 'u',
  Ş: 's',
  ş: 's',
  Ö: 'o',
  ö: 'o',
  Ç: 'c',
  ç: 'c',
  Â: 'a',
  â: 'a',
  Î: 'i',
  î: 'i',
  Û: 'u',
  û: 'u',
};

/** Karşılaştırma metni: Türkçe harf katlama + küçük harf + harf/rakam dışı her şey tek boşluk. */
function normalizeForMatch(input: string): string {
  return input
    .replace(/[İIıĞğÜüŞşÖöÇçÂâÎîÛû]/g, (c) => FOLD[c] ?? c)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * İpucu sayfada geçiyor mu? Eşleşme KELİME BAŞINDA aranır (kelime içine düşen rastlantılar sayılmaz),
 * sonuna ek gelmesi serbesttir — "fiyat" ipucu "fiyatları" yazan sayfada da geçerlidir (Türkçe eklemeli dil).
 */
function containsSignal(haystack: string, signal: string): boolean {
  if (!signal) return false;
  let i = haystack.indexOf(signal);
  while (i !== -1) {
    if (i === 0 || haystack[i - 1] === ' ') return true;
    i = haystack.indexOf(signal, i + 1);
  }
  return false;
}

/** Kapsama kuralı: hepsi → "var", en az biri → "kısmen", hiçbiri → "yok". */
function coverageOf(matchedCount: number, signalCount: number): CoverageStatus {
  if (signalCount === 0) return 'yok';
  if (matchedCount >= signalCount) return 'var';
  return matchedCount > 0 ? 'kismen' : 'yok';
}

/** Sayfanın görünür metni + meta açıklamaları (öznitelikte kaldığı için stripTags bunları atar). */
function searchableText(html: string): string {
  const parts = [stripTags(html)];
  const wanted = new Set(['description', 'og:description', 'og:title', 'twitter:description']);
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = /(?:name|property)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    if (!key || !wanted.has(key)) continue;
    const content = /content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    if (content) parts.push(content);
  }
  return parts.join(' ');
}

/* ────────────────────────── sayfa okuma ────────────────────────── */

/**
 * `fetchText` her hatayı null'a indirger; burada nedeni ayırmak gerekiyor: adres hiç çözülmediyse verilecek
 * mesaj, sunucunun 403 döndürmesinden farklıdır (geo-audit.ts ile aynı desen).
 */
async function fetchPageDetailed(
  url: string,
): Promise<{ html: string } | { html: null; reason: 'network' | 'http'; status: number | null }> {
  try {
    const res = await safeFetch(url, { timeout: FETCH_TIMEOUT });
    if (!res) return { html: null, reason: 'network', status: null };
    if (!res.ok) return { html: null, reason: 'http', status: res.status };
    return { html: res.text };
  } catch (err) {
    if (err instanceof UnsafeUrlError) throw new ClientError(err.message);
    return { html: null, reason: 'network', status: null };
  }
}

/* ────────────────────────── banka ve özet ────────────────────────── */

function toCoverageQuestion(q: BankQuestion, index: number): CoverageQuestion {
  return {
    index,
    q: q.q,
    stage: q.stage,
    stageLabel: STAGE_LABELS[q.stage],
    answeredBy: q.answeredBy,
    why: q.why,
    signals: q.signals,
    status: null,
    matched: [],
    missing: q.signals,
  };
}

function stageSummaries(questions: CoverageQuestion[]): StageSummary[] {
  return STAGE_ORDER.map((stage) => {
    const items = questions.filter((q) => q.stage === stage);
    const covered = items.filter((q) => q.status === 'var').length;
    const partial = items.filter((q) => q.status === 'kismen').length;
    const missing = items.filter((q) => q.status === 'yok').length;
    const measured = covered + partial + missing;
    return {
      stage,
      label: STAGE_LABELS[stage],
      total: items.length,
      covered,
      partial,
      missing,
      ratio: measured > 0 ? Math.round((100 * (covered + partial * 0.5)) / measured) : 0,
    };
  }).filter((s) => s.total > 0);
}

/** Site verilmeden dönen çıktı: bankanın kendisi. Skor, oran ve kapsama YOK. */
function bankPayload(sector: SectorSlug): QuestionBankPayload {
  const bank = bankBySlug(sector);
  const questions = bank.questions.map(toCoverageQuestion);
  return {
    mode: 'banka',
    sector,
    note: bank.note,
    total: questions.length,
    questions,
    stages: stageSummaries(questions),
  };
}

/* ────────────────────────── kapsama taraması ────────────────────────── */

function unreachableResult(
  url: string,
  sector: SectorSlug,
  page: { reason: 'network' | 'http'; status: number | null },
  fetchedAt: string,
): QuestionCoverageResult {
  const base = bankPayload(sector);
  const isHttp = page.reason === 'http';
  const botWall = isHttp && (page.status === 403 || page.status === 429 || page.status === 503);
  return {
    ...base,
    mode: 'kapsama',
    url,
    hostname: hostnameOf(url),
    score: 0,
    breakdown: Object.fromEntries(STAGE_ORDER.map((s) => [s, 0])),
    findings: [
      {
        category: 'erisim',
        status: 'fail',
        title: isHttp ? `Sayfa ${page.status} döndürdü` : 'Adrese ulaşılamadı',
        detail: botWall
          ? `Sunucu cevap verdi ama sayfayı vermedi (HTTP ${page.status}). Bot koruması isteğimizi engelliyor olabilir; bu yüzden kapsama ölçülemedi.`
          : isHttp
            ? `Sunucu cevap verdi ama sayfayı vermedi (HTTP ${page.status}). Kaldırılmış bir sayfa ya da sunucu kuralı olabilir; kapsama ölçülemedi.`
            : 'Alan adı çözülemedi veya sunucu hiç cevap vermedi; kapsama ölçülemedi.',
        fix: isHttp
          ? 'Sunucu/CDN kurallarında YanıtBot ve diğer yapay zekâ tarayıcılarına izin verip yeniden deneyin.'
          : 'Adresi tarayıcıda açıp çalıştığını doğrulayın, sonra tam adresi (https:// dahil) yapıştırın.',
        weight: 100,
      },
    ],
    recommendations: [],
    summary: null,
    fetchedAt,
    unreachable: { reason: page.reason, status: page.status },
    waf: botWall,
    partial: true,
  };
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/** `handlePublicScan` yalnız doğrulanmış URL ile çağırır; sektör zorunludur (yoksa 400). */
async function runQuestionCoverage(url: string, input: ScanInput): Promise<QuestionCoverageResult> {
  const sector = input.sector;
  if (!isSectorSlug(sector)) throw new ClientError('Önce sektörünüzü seçin.');

  const fetchedAt = new Date().toISOString();
  const page = await fetchPageDetailed(url);
  if (page.html === null) return unreachableResult(url, sector, page, fetchedAt);

  const bank = bankBySlug(sector);
  const haystack = normalizeForMatch(searchableText(page.html));

  const questions: CoverageQuestion[] = bank.questions.map((q, index) => {
    const matched = q.signals.filter((s) => containsSignal(haystack, normalizeForMatch(s)));
    const status = coverageOf(matched.length, q.signals.length);
    return {
      index,
      q: q.q,
      stage: q.stage,
      stageLabel: STAGE_LABELS[q.stage],
      answeredBy: q.answeredBy,
      why: q.why,
      signals: q.signals,
      status,
      matched,
      missing: q.signals.filter((s) => !matched.includes(s)),
    };
  });

  const stages = stageSummaries(questions);
  const covered = questions.filter((q) => q.status === 'var').length;
  const partialCount = questions.filter((q) => q.status === 'kismen').length;
  const missing = questions.filter((q) => q.status === 'yok').length;
  const score = questions.length ? Math.round((100 * (covered + partialCount * 0.5)) / questions.length) : 0;

  // Önce cevaplanacak üç soru: karşılığı hiç olmayanlar, aşama sırasına göre; yetmezse "kısmen" olanlar.
  const order = new Map<QuestionStage, number>(STAGE_ORDER.map((s, i) => [s, i] as const));
  const byStage = (a: CoverageQuestion, b: CoverageQuestion) =>
    (order.get(a.stage) ?? 0) - (order.get(b.stage) ?? 0) || a.index - b.index;
  const firstThree = [
    ...questions.filter((q) => q.status === 'yok').sort(byStage),
    ...questions.filter((q) => q.status === 'kismen').sort(byStage),
  ]
    .slice(0, 3)
    .map((q) => q.index);

  const weakest = stages.length ? stages.reduce((a, b) => (b.ratio < a.ratio ? b : a)) : null;

  const findings: CommerceFinding[] = stages.map((s) => ({
    category: s.stage,
    status: s.ratio >= 70 ? 'pass' : s.ratio >= 35 ? 'warn' : 'fail',
    title: `${s.label}: ${s.total} sorudan ${s.covered} tanesinde tam karşılık var`,
    detail: `Bu aşamada ${s.covered} soruda karşılık, ${s.partial} soruda kısmen karşılık bulundu; ${s.missing} soruda girdiğiniz sayfada hiçbir ipucu geçmiyor.`,
    fix:
      s.ratio >= 70
        ? undefined
        : `${s.label} aşamasındaki soruları sayfada birer başlık (veya SSS maddesi) olarak açın; cevabı ilk iki cümlede verin.`,
    evidence: `oran %${s.ratio}`,
    weight: 20,
  }));

  const recommendations: Recommendation[] = firstThree
    .map((i) => questions[i])
    .filter((q): q is CoverageQuestion => !!q)
    .map((q) => ({
      title: `Şu soruya cevap yazın: “${q.q.length > 90 ? `${q.q.slice(0, 89)}…` : q.q}”`,
      difficulty: 'Orta' as const,
      impact: q.status === 'yok' ? ('Yüksek' as const) : ('Orta' as const),
      detail: `Cevabı taşıması gereken sayfa: ${q.answeredBy}. ${q.why}`,
      category: q.stage,
      steps: [
        'Soruyu sayfada aynı cümleyle bir başlık ya da SSS maddesi yapın.',
        'Cevabı ilk iki cümlede verin; ayrıntıyı altına yazın.',
        `Metinde şu sözler geçsin: ${q.signals.join(', ')}.`,
      ],
    }));

  return {
    mode: 'kapsama',
    sector,
    note: bank.note,
    total: questions.length,
    questions,
    stages,
    url,
    hostname: hostnameOf(url),
    score,
    breakdown: Object.fromEntries(stages.map((s) => [s.stage, s.ratio])),
    findings,
    recommendations,
    summary: {
      covered,
      partial: partialCount,
      missing,
      weakestStage: weakest ? weakest.stage : null,
      firstThree,
    },
    fetchedAt,
    waf: false,
    partial: false,
  };
}

/* ────────────────────────── uçlar ────────────────────────── */

/** Site olmadan soru bankası: `?sektor=<slug>`. */
export const GET = route('tools.question_coverage.bank', async (req) => {
  const sector = new URL(req.url).searchParams.get('sektor');
  if (!isSectorSlug(sector)) throw new ClientError('Önce sektörünüzü seçin.');
  const headers = await enforceRateLimit(req, BANK_LIMIT);
  return NextResponse.json(bankPayload(sector), { headers });
});

/** Site ile kapsama taraması: POST {url, sector}. */
export const POST = route('tools.question_coverage', async (req) =>
  handlePublicScan(req, 'QUESTION_COVERAGE', runQuestionCoverage, {
    input: (body) => ({ sector: typeof body.sector === 'string' ? body.sector : undefined }),
  }),
);
