/**
 * Prompt attribution — "ziyaretçi hangi soruyla geldi?" sorusuna ÜÇ AYRI kaynaktan yanıt.
 *
 * AI platformları kullanıcının gerçek promptunu hedef siteye GÖNDERMEZ. Bu yüzden burada
 * promptu bildiğimiz iddia edilmez; üç kaynak veride ve UI'da kesin ayrı tutulur:
 *
 *   • `USER_REPORTED` — ziyaretçinin gönüllü olarak yazdığı bildirim. Tek "gerçek" kaynak;
 *                       güven 100, metin PII'dan temizlenir ve 300 karaktere kırpılır.
 *   • `INFERRED`      — deterministik, açıklanabilir puanlama (LLM YOK). Her sinyalin katkısı
 *                       `evidence` içinde saklanır; eşiğin altındaysa KAYIT ÜRETİLMEZ.
 *   • `SYNTHETIC`     — Independent AI'ın kendi ölçümü (ModelRun). Gerçek ziyaretçi promptu
 *                       DEĞİLDİR; kayıt yazılmaz, yalnızca okuma amaçlı özet üretilir.
 *
 * Puan tablosu (sabit, belgeli — `SIGNAL_WEIGHTS`):
 *
 *   | Sinyal                                                   | Katkı        |
 *   |----------------------------------------------------------|--------------|
 *   | ModelRun/Citation URL'si oturumun landing path'i ile aynı | +45          |
 *   | Prompt kelimeleri ↔ landing path / entity etiketi örtüşme | +25'e kadar  |
 *   | Tamamlanan hedef türü ↔ prompt niyeti uyumu               | +15          |
 *   | AI sağlayıcı ↔ promptun o sağlayıcıdaki son görünürlüğü   | +10          |
 *   | Yalnızca referrer bilgisi                                 | +0           |
 *
 * `MIN_CONFIDENCE = 55` bilinçli seçilmiştir: atıf (citation) eşleşmesi OLMADAN ulaşılabilecek
 * en yüksek puan 25+15+10 = 50'dir; yani "yumuşak" sinyaller tek başına asla tahmin üretmez.
 * Atıf eşleşmesi de tek başına yetmez (45 < 55): en az bir destekleyici sinyal gerekir.
 */
import type { AttributionSource, GoalType, Prisma } from '@independentai/db';
import { PROVIDER_LABELS } from '@independentai/shared';
import { prisma } from '../prisma';
import { foldKey } from '../normalize';
import { NotFoundError } from '../errors';
import { providerLabel } from './ai-sources';
import { normalizeHost, normalizePath, redactPii, safeToken } from './events';

// ───────────────────────── Niyet kümesi ─────────────────────────

export const INTENTS = [
  { value: 'recommendation', label: 'Öneri isteme' },
  { value: 'comparison', label: 'Karşılaştırma' },
  { value: 'pricing', label: 'Fiyat / maliyet' },
  { value: 'alternative', label: 'Alternatif arama' },
  { value: 'how_to', label: 'Nasıl yapılır' },
  { value: 'local', label: 'Yakınımda / yerel' },
  { value: 'other', label: 'Diğer' },
] as const;

export type IntentKey = (typeof INTENTS)[number]['value'];

const INTENT_VALUES = INTENTS.map((i) => i.value) as readonly IntentKey[];
const INTENT_LABEL = new Map<string, string>(INTENTS.map((i) => [i.value, i.label]));

export function intentLabel(intent: string | null | undefined): string {
  if (!intent) return 'Bilinmiyor';
  return INTENT_LABEL.get(intent) ?? 'Diğer';
}

/** Ziyaretçi formundan gelen serbest değer → bilinen niyet anahtarı. Tanınmazsa `other`. */
const INTENT_SYNONYMS: Record<string, IntentKey> = {
  oneri: 'recommendation',
  öneri: 'recommendation',
  tavsiye: 'recommendation',
  recommendation: 'recommendation',
  recommend: 'recommendation',
  karsilastirma: 'comparison',
  karşılaştırma: 'comparison',
  comparison: 'comparison',
  compare: 'comparison',
  fiyat: 'pricing',
  ucret: 'pricing',
  ücret: 'pricing',
  maliyet: 'pricing',
  pricing: 'pricing',
  price: 'pricing',
  alternatif: 'alternative',
  alternative: 'alternative',
  nasil: 'how_to',
  nasıl: 'how_to',
  how_to: 'how_to',
  howto: 'how_to',
  yerel: 'local',
  yakin: 'local',
  yakın: 'local',
  local: 'local',
  diger: 'other',
  diğer: 'other',
  other: 'other',
};

export function normalizeIntent(raw: unknown): IntentKey | null {
  const token = safeToken(raw, 40);
  if (!token) return null;
  const key = foldKey(token).replace(/\s+/g, '_');
  if ((INTENT_VALUES as readonly string[]).includes(key)) return key as IntentKey;
  return INTENT_SYNONYMS[key] ?? 'other';
}

/**
 * Prompt metninden niyet çıkarımı — sabit sırayla ilk eşleşen kazanır (deterministik).
 * Kategori bilgisi varsa ve metinden bir şey çıkmazsa kategori kullanılır.
 */
const INTENT_PATTERNS: [IntentKey, RegExp][] = [
  ['pricing', /\b(fiyat\w*|ucret\w*|maliyet\w*|kac para|kac tl|price|pricing|cost)\b/],
  ['comparison', /\b(vs|versus|karsilastir\w*|hangisi daha|fark\w* nedir|compare|comparison)\b/],
  ['alternative', /\b(alternatif\w*|yerine|benzer\w*|muadil\w*|alternative)\b/],
  ['how_to', /\b(nasil\w*|adim adim|how to|rehber\w*|guide)\b/],
  ['local', /\b(yakin\w*|nerede|nereden|near me|nearby)\b/],
  ['recommendation', /\b(en iyi|onerir\w*|oner\w*|tavsiye\w*|hangi\w*|best|top|recommend\w*)\b/],
];

const CATEGORY_TO_INTENT: Record<string, IntentKey> = {
  discovery: 'recommendation',
  comparison: 'comparison',
  review: 'recommendation',
  how_to: 'how_to',
  other: 'other',
};

/**
 * Aksanları düşürür (NFD + birleşik işaret temizliği + ı/İ eşlemesi). Hem niyet desenleri hem de
 * kelime eşleştirme bunu kullanır: URL slug'ları çoğunlukla ASCII'ye katlanmış olur
 * ("/dis-klinigi") ama prompt tam diakritikle yazılır ("diş kliniği").
 */
export function deaccent(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i');
}

export function detectIntent(text: string, category?: string | null): IntentKey {
  const hay = deaccent(foldKey(text));
  for (const [intent, re] of INTENT_PATTERNS) if (re.test(hay)) return intent;
  if (category && CATEGORY_TO_INTENT[category]) return CATEGORY_TO_INTENT[category];
  return 'other';
}

// ───────────────────────── Puan tablosu ─────────────────────────

/** Sabit ağırlıklar. Değiştirmek attribution'ın anlamını değiştirir → testlerle kilitlidir. */
export const SIGNAL_WEIGHTS = {
  /** AI cevabındaki atıf URL'si oturumun indiği sayfayla birebir aynı */
  citationPathMatch: 45,
  /** Prompt kelimeleri ile landing path / entity etiketi örtüşmesi (üst sınır) */
  textOverlapMax: 25,
  /** Eşleşen her anlamlı kelimenin katkısı (üst sınıra kadar) */
  textOverlapPerWord: 8,
  /** Tamamlanan hedefin türü prompt niyetiyle uyumlu */
  goalIntentMatch: 15,
  /** Ziyaretin geldiği AI sağlayıcıda prompt son ölçümde markayı gösteriyordu */
  providerVisibility: 10,
  /** Yalnızca referrer: tek başına ASLA tahmin üretmez */
  referrerOnly: 0,
} as const;

/** Bu eşiğin altındaki tahmin için kayıt üretilmez (sahte kesinlik yok). */
export const MIN_CONFIDENCE = 55;

/** Hedef türü → uyumlu prompt niyetleri (uyum varsa +15). */
const GOAL_INTENTS: Record<GoalType, IntentKey[]> = {
  SIGN_UP: ['recommendation', 'comparison', 'alternative'],
  LEAD: ['recommendation', 'comparison', 'alternative', 'local'],
  DEMO: ['recommendation', 'comparison', 'alternative'],
  CONTACT: ['recommendation', 'local', 'how_to'],
  BOOKING: ['local', 'recommendation', 'pricing'],
  APPLICATION: ['how_to', 'recommendation'],
  SUBSCRIBE: ['recommendation', 'comparison', 'pricing'],
  PURCHASE: ['pricing', 'comparison', 'recommendation', 'alternative'],
  CUSTOM: [],
};

/** Ölçülebilen AI sağlayıcılar: oturumun referrer sağlayıcısı ↔ ModelRun.provider eşlemesi. */
const PROVIDER_TO_ENUM: Record<string, keyof typeof PROVIDER_LABELS> = {
  openai: 'OPENAI',
  anthropic: 'ANTHROPIC',
  google: 'GOOGLE',
};

// ───────────────────────── Metin karşılaştırma ─────────────────────────

/** Türkçe + İngilizce yüksek frekanslı, ayırt edici olmayan kelimeler. */
const STOPWORDS = new Set([
  'bir',
  'bu',
  'şu',
  'ile',
  'için',
  've',
  'veya',
  'ya',
  'da',
  'de',
  'ki',
  'mi',
  'mı',
  'mu',
  'mü',
  'en',
  'daha',
  'çok',
  'az',
  'ne',
  'nasıl',
  'hangi',
  'hangisi',
  'kim',
  'nerede',
  'var',
  'yok',
  'olan',
  'olarak',
  'gibi',
  'ama',
  'iyi',
  'kötü',
  'nedir',
  'midir',
  'the',
  'and',
  'for',
  'with',
  'best',
  'top',
  'what',
  'which',
  'how',
  'you',
  'are',
  'from',
]);

/** Karşılaştırmaya giren anlamlı kelimeler (Türkçe duyarlı katlama, tekilleştirilmiş). */
export function meaningfulWords(text: string, max = 12): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of foldKey(text).split(/\s+/)) {
    const w = raw.replace(/^[.'-]+|[.'-]+$/g, '');
    if (w.length < 3 || STOPWORDS.has(w) || /^\d+$/.test(w)) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= max) break;
  }
  return out;
}

/** Landing path + entity etiketlerinden karşılaştırma jetonları. */
export function contextTokens(landingPath: string, entityLabels: (string | null | undefined)[] = []): string[] {
  const parts = landingPath.split(/[/\-_.+]+/);
  const tokens = new Set<string>();
  for (const p of parts) {
    const w = foldKey(p);
    if (w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w)) tokens.add(w);
  }
  for (const label of entityLabels) {
    if (!label) continue;
    for (const w of meaningfulWords(label, 8)) tokens.add(w);
  }
  return [...tokens];
}

/**
 * Kelime ↔ jeton eşleşmesi: aksansız karşılaştırma, birebir ya da 4+ karakterlik önek
 * (Türkçe ekleri tolere eder: "klinigi" ↔ "kliniğimiz"). Tahmin ve boşluk önceliklendirme
 * AYNI kuralı kullanır.
 */
export function wordMatchesTokens(word: string, tokens: string[]): boolean {
  const w = deaccent(word);
  for (const raw of tokens) {
    const t = deaccent(raw);
    if (t === w) return true;
    if (w.length >= 4 && t.startsWith(w)) return true;
    if (t.length >= 4 && w.startsWith(t)) return true;
  }
  return false;
}

// ───────────────────────── Tahmin (INFERRED) ─────────────────────────

export type AttributionCandidate = {
  promptId: string;
  text: string;
  category?: string | null;
  /** AI cevabında atıf verilen ve BU siteye ait olan normalize yollar */
  citedPaths?: string[];
  /** Markanın son ölçümde göründüğü sağlayıcılar (OPENAI | ANTHROPIC | GOOGLE) */
  visibleProviders?: string[];
};

export type AttributionSessionInput = {
  id?: string | null;
  sourceClass: string;
  /** AI sağlayıcı anahtarı ("openai", "anthropic", …) */
  provider?: string | null;
  landingPath: string;
  /** Oturumun olaylarındaki varlık etiketleri (ürün/hizmet/makale adı) */
  entityLabels?: (string | null | undefined)[];
  /** Tamamlanan hedefin türü (varsa) */
  goalType?: GoalType | null;
};

export type EvidenceSignal = {
  signal: keyof typeof SIGNAL_WEIGHTS | 'referrerOnly';
  label: string;
  points: number;
  detail: string;
};

export type AttributionEvidence = {
  total: number;
  threshold: number;
  promptText: string;
  landingPath: string;
  provider: string | null;
  signals: EvidenceSignal[];
  /** İkinci en iyi aday (varsa) — tek adaya kilitlenmediğimizi gösterir */
  runnerUp: { promptId: string; confidence: number } | null;
};

export type InferredAttribution = {
  promptId: string;
  intent: IntentKey;
  confidence: number;
  evidence: AttributionEvidence;
};

type Scored = { candidate: AttributionCandidate; intent: IntentKey; score: number; signals: EvidenceSignal[] };

function scoreCandidate(session: AttributionSessionInput, candidate: AttributionCandidate): Scored {
  const signals: EvidenceSignal[] = [];
  const landingPath = normalizePath(session.landingPath);
  const intent = detectIntent(candidate.text, candidate.category ?? null);
  let score = 0;

  // 1) Atıf eşleşmesi — en güçlü sinyal: AI cevabı tam olarak bu sayfayı gösterdi.
  const cited = (candidate.citedPaths ?? []).map((p) => normalizePath(p));
  if (cited.includes(landingPath)) {
    score += SIGNAL_WEIGHTS.citationPathMatch;
    signals.push({
      signal: 'citationPathMatch',
      label: 'AI cevabındaki atıf bu sayfayı gösteriyordu',
      points: SIGNAL_WEIGHTS.citationPathMatch,
      detail: landingPath,
    });
  }

  // 2) Metin örtüşmesi — prompt kelimeleri ile inilen sayfa/varlık etiketi.
  const words = meaningfulWords(candidate.text);
  const tokens = contextTokens(landingPath, session.entityLabels ?? []);
  const matched = words.filter((w) => wordMatchesTokens(w, tokens));
  if (matched.length > 0) {
    const points = Math.min(SIGNAL_WEIGHTS.textOverlapMax, matched.length * SIGNAL_WEIGHTS.textOverlapPerWord);
    score += points;
    signals.push({
      signal: 'textOverlapMax',
      label: 'Soru kelimeleri inilen sayfayla örtüşüyor',
      points,
      detail: matched.join(', '),
    });
  }

  // 3) Hedef ↔ niyet uyumu.
  if (session.goalType && GOAL_INTENTS[session.goalType]?.includes(intent)) {
    score += SIGNAL_WEIGHTS.goalIntentMatch;
    signals.push({
      signal: 'goalIntentMatch',
      label: 'Tamamlanan hedef, sorunun niyetiyle uyumlu',
      points: SIGNAL_WEIGHTS.goalIntentMatch,
      detail: `${session.goalType} ↔ ${intentLabel(intent)}`,
    });
  }

  // 4) Sağlayıcı görünürlüğü — ziyaretin geldiği AI'da bu soru markayı gösteriyordu.
  const providerEnum = session.provider ? PROVIDER_TO_ENUM[session.provider] : undefined;
  if (providerEnum && (candidate.visibleProviders ?? []).includes(providerEnum)) {
    score += SIGNAL_WEIGHTS.providerVisibility;
    signals.push({
      signal: 'providerVisibility',
      label: 'Ziyaretin geldiği AI ürününde bu soruda markanız görünüyordu',
      points: SIGNAL_WEIGHTS.providerVisibility,
      detail: PROVIDER_LABELS[providerEnum],
    });
  }

  return { candidate, intent, score, signals };
}

/**
 * Deterministik, açıklanabilir tahmin. LLM kullanılmaz; aynı girdi her zaman aynı çıktıyı verir.
 * Eşiğin altında `null` döner — düşük güvenli tahmini göstermemek sahte kesinlikten iyidir.
 */
export function inferAttribution(
  session: AttributionSessionInput,
  candidates: AttributionCandidate[],
): InferredAttribution | null {
  // Referrer AI değilse prompt attribution üretilmez (direct/organic trafiği AI sayılmaz).
  if (session.sourceClass !== 'AI_REFERRAL') return null;
  if (candidates.length === 0) return null;

  const scored = candidates
    .map((c) => scoreCandidate(session, c))
    // Eşit puanda promptId'ye göre sabit sıra: çıktı çalıştırmalar arasında değişmez.
    .sort((a, b) => b.score - a.score || a.candidate.promptId.localeCompare(b.candidate.promptId));

  const best = scored[0];
  if (!best || best.score < MIN_CONFIDENCE) return null;

  const second = scored[1] ?? null;
  const signals = [...best.signals];
  // Referrer bilgisi kanıt listesinde görünür ama katkısı sıfırdır (şeffaflık).
  signals.push({
    signal: 'referrerOnly',
    label: 'Yalnızca referrer bilgisi (tek başına tahmin üretmez)',
    points: SIGNAL_WEIGHTS.referrerOnly,
    detail: providerLabel(session.provider ?? null),
  });

  return {
    promptId: best.candidate.promptId,
    intent: best.intent,
    confidence: Math.min(100, best.score),
    evidence: {
      total: best.score,
      threshold: MIN_CONFIDENCE,
      promptText: best.candidate.text,
      landingPath: normalizePath(session.landingPath),
      provider: session.provider ?? null,
      signals,
      runnerUp: second && second.score > 0 ? { promptId: second.candidate.promptId, confidence: second.score } : null,
    },
  };
}

// ───────────────────────── USER_REPORTED ─────────────────────────

export const MAX_REPORT_TEXT = 300;
/** Bir oturumdan kabul edilecek en fazla gönüllü bildirim (form spam'ine karşı). */
export const MAX_REPORTS_PER_SESSION = 5;

const AI_PROVIDER_KEYS = new Set([
  'openai',
  'anthropic',
  'google',
  'perplexity',
  'microsoft',
  'xai',
  'mistral',
  'deepseek',
  'meta',
  'you',
  'poe',
]);

export function normalizeReportProvider(raw: unknown): string | null {
  const token = safeToken(raw, 40);
  if (!token) return null;
  const key = foldKey(token).replace(/\s+/g, '');
  const alias: Record<string, string> = {
    chatgpt: 'openai',
    gpt: 'openai',
    claude: 'anthropic',
    gemini: 'google',
    bard: 'google',
    copilot: 'microsoft',
    grok: 'xai',
    lechat: 'mistral',
    metaai: 'meta',
    youcom: 'you',
  };
  const resolved = alias[key] ?? key;
  return AI_PROVIDER_KEYS.has(resolved) ? resolved : null;
}

/** Görünmez kontrol karakterlerini atar (kod noktası süzgeci — kontrol karakterli regex yok). */
function stripControlChars(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) continue;
    out += ch;
  }
  return out;
}

/** Serbest metin: PII temizlenir, tek satıra indirilir, 300 karaktere kırpılır. */
export function cleanReportText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const redacted = redactPii(raw.normalize('NFC').replace(/\s+/g, ' ').trim());
  // Kontrol karakterleri ve HTML köşeli parantezleri metinden çıkar.
  const cleaned = stripControlChars(redacted).replace(/[<>]/g, '').trim();
  if (!cleaned) return null;
  return cleaned.slice(0, MAX_REPORT_TEXT);
}

export type RecordUserReportedInput = {
  site: { id: string; tenantId: string };
  sessionKey: string;
  provider?: unknown;
  intent?: unknown;
  text?: unknown;
};

export type UserReportResult = { stored: boolean; id: string | null; sessionMatched: boolean; reason?: string };

/**
 * Ziyaretçinin gönüllü bildirimi. Oturum eşleşmezse kayıt yine yazılır (`sessionId: null`):
 * bildirim, oturum penceresi kapandıktan sonra da gelebilir; veri kaybetmek yerine
 * "oturuma bağlanamadı" bilgisiyle saklanır.
 */
export async function recordUserReported(input: RecordUserReportedInput): Promise<UserReportResult> {
  const session = await prisma.aiAcquisitionSession.findUnique({
    where: { trackedSiteId_sessionKey: { trackedSiteId: input.site.id, sessionKey: input.sessionKey } },
    select: { id: true, provider: true },
  });

  if (session) {
    const existing = await prisma.promptAttribution.count({
      where: { sessionId: session.id, source: 'USER_REPORTED' },
    });
    if (existing >= MAX_REPORTS_PER_SESSION) {
      return { stored: false, id: null, sessionMatched: true, reason: 'session_report_cap' };
    }
  }

  const text = cleanReportText(input.text);
  const intent = normalizeIntent(input.intent);
  const provider = normalizeReportProvider(input.provider) ?? session?.provider ?? null;

  const row = await prisma.promptAttribution.create({
    data: {
      tenantId: input.site.tenantId,
      trackedSiteId: input.site.id,
      sessionId: session?.id ?? null,
      source: 'USER_REPORTED',
      intent,
      // Ziyaretçinin kendi beyanı: tahmin değil, bildirim → tam güven.
      confidence: 100,
      evidence: { source: 'user_form', sessionMatched: !!session, hasText: !!text } as Prisma.InputJsonValue,
      reportedText: text,
      provider,
    },
    select: { id: true },
  });

  return { stored: true, id: row.id, sessionMatched: !!session };
}

// ───────────────────────── Aday yükleme ─────────────────────────

/** Tenant'ın izlediği aktif sorulardan en fazla 200'ü (en son güncellenenler). */
export const MAX_CANDIDATES = 200;

type CitationShape = { url?: unknown };

function extractCitationUrls(citations: unknown): string[] {
  if (!Array.isArray(citations)) return [];
  const out: string[] = [];
  for (const c of citations.slice(0, 50)) {
    const url = (c as CitationShape)?.url;
    if (typeof url === 'string' && url) out.push(url);
  }
  return out;
}

function sitePathsFrom(urls: string[], siteHost: string | null): string[] {
  const out = new Set<string>();
  for (const url of urls) {
    const host = normalizeHost(url);
    if (!host) continue;
    if (siteHost && host !== siteHost) continue;
    out.add(normalizePath(url));
  }
  return [...out];
}

export async function loadCandidates(
  tenantId: string,
  opts: { siteHost?: string | null; days?: number } = {},
): Promise<AttributionCandidate[]> {
  const days = Math.min(180, Math.max(1, Math.floor(opts.days ?? 60)));
  const since = new Date(Date.now() - days * 86_400_000);
  const prompts = await prisma.prompt.findMany({
    where: { tenantId, isActive: true },
    orderBy: { updatedAt: 'desc' },
    take: MAX_CANDIDATES,
    select: { id: true, text: true, category: true },
  });
  if (prompts.length === 0) return [];

  const runs = await prisma.modelRun.findMany({
    where: { promptId: { in: prompts.map((p) => p.id) }, status: 'SUCCESS', runDate: { gte: since } },
    orderBy: { runDate: 'desc' },
    take: 3000,
    select: {
      promptId: true,
      provider: true,
      citations: true,
      citationLinks: { select: { url: true } },
      mentions: { select: { isOwnBrand: true } },
    },
  });

  const siteHost = normalizeHost(opts.siteHost ?? null);
  const citedByPrompt = new Map<string, Set<string>>();
  // (prompt × provider) için YALNIZCA en son ölçüm dikkate alınır: eski bir görünürlük
  // bugünkü tahmini şişirmesin. `runs` tarih azalan sıralı olduğundan ilk görülen en sondur.
  const seenPair = new Set<string>();
  const visibleByPrompt = new Map<string, Set<string>>();

  for (const r of runs) {
    const paths = sitePathsFrom([...extractCitationUrls(r.citations), ...r.citationLinks.map((c) => c.url)], siteHost);
    if (paths.length) {
      const set = citedByPrompt.get(r.promptId) ?? new Set<string>();
      for (const p of paths) set.add(p);
      citedByPrompt.set(r.promptId, set);
    }
    const pair = `${r.promptId}|${r.provider}`;
    if (seenPair.has(pair)) continue;
    seenPair.add(pair);
    if (r.mentions.some((m) => m.isOwnBrand)) {
      const set = visibleByPrompt.get(r.promptId) ?? new Set<string>();
      set.add(r.provider);
      visibleByPrompt.set(r.promptId, set);
    }
  }

  return prompts.map((p) => ({
    promptId: p.id,
    text: p.text,
    category: p.category,
    citedPaths: [...(citedByPrompt.get(p.id) ?? [])],
    visibleProviders: [...(visibleByPrompt.get(p.id) ?? [])],
  }));
}

// ───────────────────────── Toplu tahmin ─────────────────────────

export type AttributionRunResult = {
  siteId: string;
  scanned: number;
  created: number;
  updated: number;
  /** Eşiğin altında kaldığı için kayıt üretilmeyen oturum sayısı */
  belowThreshold: number;
  /** Eşik altına düştüğü için silinen eski tahmin sayısı */
  removed: number;
  candidates: number;
};

/**
 * Son N oturum için INFERRED kayıt üretir. Idempotent: aynı (oturum, INFERRED) için tek kayıt
 * tutulur; yeniden çalıştırıldığında güncellenir, eşiğin altına düşerse silinir.
 */
export async function runAttributionForSite(
  siteId: string,
  opts: { limit?: number; days?: number } = {},
): Promise<AttributionRunResult> {
  const limit = Math.min(500, Math.max(1, Math.floor(opts.limit ?? 200)));
  const site = await prisma.trackedSite.findUnique({
    where: { id: siteId },
    select: { id: true, tenantId: true, domain: true },
  });
  if (!site) throw new NotFoundError('Site bulunamadı');

  const candidates = await loadCandidates(site.tenantId, { siteHost: site.domain, days: opts.days });
  const result: AttributionRunResult = {
    siteId: site.id,
    scanned: 0,
    created: 0,
    updated: 0,
    belowThreshold: 0,
    removed: 0,
    candidates: candidates.length,
  };
  if (candidates.length === 0) return result;

  const sessions = await prisma.aiAcquisitionSession.findMany({
    where: { trackedSiteId: site.id, sourceClass: 'AI_REFERRAL' },
    orderBy: { firstSeenAt: 'desc' },
    take: limit,
    select: {
      id: true,
      sourceClass: true,
      provider: true,
      landingPath: true,
      goal: { select: { type: true } },
      events: { where: { entityLabel: { not: null } }, select: { entityLabel: true }, take: 10 },
    },
  });

  for (const s of sessions) {
    result.scanned += 1;
    const inferred = inferAttribution(
      {
        id: s.id,
        sourceClass: s.sourceClass,
        provider: s.provider,
        landingPath: s.landingPath,
        entityLabels: s.events.map((e) => e.entityLabel),
        goalType: s.goal?.type ?? null,
      },
      candidates,
    );

    const existing = await prisma.promptAttribution.findFirst({
      where: { sessionId: s.id, source: 'INFERRED' },
      select: { id: true },
    });

    if (!inferred) {
      result.belowThreshold += 1;
      if (existing) {
        await prisma.promptAttribution.delete({ where: { id: existing.id } });
        result.removed += 1;
      }
      continue;
    }

    const data = {
      tenantId: site.tenantId,
      trackedSiteId: site.id,
      sessionId: s.id,
      promptId: inferred.promptId,
      source: 'INFERRED' as const,
      intent: inferred.intent,
      confidence: inferred.confidence,
      evidence: inferred.evidence as unknown as Prisma.InputJsonValue,
      provider: s.provider,
    };
    if (existing) {
      await prisma.promptAttribution.update({ where: { id: existing.id }, data });
      result.updated += 1;
    } else {
      await prisma.promptAttribution.create({ data });
      result.created += 1;
    }
  }

  return result;
}

// ───────────────────────── SYNTHETIC (yalnızca okuma) ─────────────────────────

export type SyntheticPrompt = {
  promptId: string;
  text: string;
  intent: IntentKey;
  runs: number;
  visibleRuns: number;
  /** Markanın göründüğü ölçüm oranı (%) */
  visibility: number;
  providers: { provider: string; label: string; runs: number; visible: number }[];
};

export type SyntheticSnapshot = {
  source: 'SYNTHETIC';
  /** Bu veri bir ziyaretçi bildirimi DEĞİLDİR; UI'da ayrı gösterilir. */
  disclaimer: string;
  range: { days: number; from: string; to: string };
  totalRuns: number;
  prompts: SyntheticPrompt[];
};

export const SYNTHETIC_DISCLAIMER =
  'Bu liste Independent AI’ın kendi ölçümlerinden (ModelRun) türetilmiştir. Gerçek bir ziyaretçinin sorduğu soru değildir; ziyaretçi promptu olarak sunulamaz.';

/** Mevcut ModelRun sonuçlarından özet üretir — hiçbir kayıt YAZILMAZ. */
export async function syntheticSnapshot(tenantId: string, days = 30): Promise<SyntheticSnapshot> {
  const span = Math.min(180, Math.max(1, Math.floor(days)));
  const to = new Date();
  const from = new Date(to.getTime() - span * 86_400_000);
  const runs = await prisma.modelRun.findMany({
    where: { prompt: { tenantId }, status: 'SUCCESS', runDate: { gte: from, lte: to } },
    orderBy: { runDate: 'desc' },
    take: 3000,
    select: {
      promptId: true,
      provider: true,
      prompt: { select: { text: true, category: true } },
      mentions: { select: { isOwnBrand: true } },
    },
  });

  type Acc = {
    text: string;
    category: string | null;
    runs: number;
    visibleRuns: number;
    byProvider: Map<string, { runs: number; visible: number }>;
  };
  const byPrompt = new Map<string, Acc>();
  for (const r of runs) {
    const acc = byPrompt.get(r.promptId) ?? {
      text: r.prompt.text,
      category: r.prompt.category,
      runs: 0,
      visibleRuns: 0,
      byProvider: new Map(),
    };
    const visible = r.mentions.some((m) => m.isOwnBrand);
    acc.runs += 1;
    if (visible) acc.visibleRuns += 1;
    const p = acc.byProvider.get(r.provider) ?? { runs: 0, visible: 0 };
    p.runs += 1;
    if (visible) p.visible += 1;
    acc.byProvider.set(r.provider, p);
    byPrompt.set(r.promptId, acc);
  }

  const prompts: SyntheticPrompt[] = [...byPrompt.entries()]
    .map(([promptId, a]) => ({
      promptId,
      text: a.text,
      intent: detectIntent(a.text, a.category),
      runs: a.runs,
      visibleRuns: a.visibleRuns,
      visibility: a.runs ? Math.round((a.visibleRuns / a.runs) * 100) : 0,
      providers: [...a.byProvider.entries()].map(([provider, v]) => ({
        provider,
        label: PROVIDER_LABELS[provider as keyof typeof PROVIDER_LABELS] ?? provider,
        runs: v.runs,
        visible: v.visible,
      })),
    }))
    .sort((a, b) => b.visibleRuns - a.visibleRuns || b.runs - a.runs || a.promptId.localeCompare(b.promptId))
    .slice(0, 25);

  return {
    source: 'SYNTHETIC',
    disclaimer: SYNTHETIC_DISCLAIMER,
    range: { days: span, from: from.toISOString(), to: to.toISOString() },
    totalRuns: runs.length,
    prompts,
  };
}

// ───────────────────────── Listeleme (UI) ─────────────────────────

export const SOURCE_META: Record<AttributionSource, { label: string; description: string }> = {
  USER_REPORTED: {
    label: 'Ziyaretçi bildirdi',
    description: 'Ziyaretçinin gönüllü olarak yazdığı bildirim. Tahmin değildir.',
  },
  INFERRED: {
    label: 'Tahmin (açıklanabilir)',
    description: `Deterministik sinyallerden hesaplanan tahmin. ${MIN_CONFIDENCE}% altındaki tahminler hiç kaydedilmez.`,
  },
  SYNTHETIC: {
    label: 'Kendi ölçümümüz',
    description: SYNTHETIC_DISCLAIMER,
  },
};

export type AttributionItem = {
  id: string;
  source: AttributionSource;
  promptId: string | null;
  promptText: string | null;
  intent: string | null;
  intentLabel: string;
  confidence: number;
  provider: string | null;
  providerLabel: string;
  reportedText: string | null;
  evidence: EvidenceSignal[];
  createdAt: string;
};

export type AttributionGroup = {
  source: AttributionSource;
  label: string;
  description: string;
  total: number;
  avgConfidence: number | null;
  intents: { intent: string; label: string; count: number }[];
  items: AttributionItem[];
};

export type AttributionListResult = {
  range: { days: number; from: string; to: string };
  siteId: string | null;
  totals: { userReported: number; inferred: number; synthetic: number };
  groups: AttributionGroup[];
  /** SYNTHETIC grubunun kaynağı — ayrı tutulur, ziyaretçi verisiyle karıştırılmaz. */
  synthetic: SyntheticSnapshot | null;
  minConfidence: number;
};

function evidenceSignals(raw: unknown): EvidenceSignal[] {
  const signals = (raw as { signals?: unknown } | null)?.signals;
  if (!Array.isArray(signals)) return [];
  return signals.filter((s): s is EvidenceSignal => !!s && typeof (s as EvidenceSignal).label === 'string').slice(0, 8);
}

/** Panel için kaynağına göre gruplanmış attribution listesi. */
export async function listAttributions(
  tenantId: string,
  opts: { siteId?: string | null; source?: string | null; days?: number; limit?: number } = {},
): Promise<AttributionListResult> {
  const days = Math.min(180, Math.max(1, Math.floor(opts.days ?? 30)));
  const limit = Math.min(200, Math.max(1, Math.floor(opts.limit ?? 50)));
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  const wanted =
    opts.source === 'USER_REPORTED' || opts.source === 'INFERRED' || opts.source === 'SYNTHETIC'
      ? (opts.source as AttributionSource)
      : null;

  // SYNTHETIC veritabanında tutulmaz (yalnızca okuma); yalnızca o istenmişse hiç sorgu yapılmaz.
  const sources: AttributionSource[] = wanted === 'SYNTHETIC' ? [] : wanted ? [wanted] : ['USER_REPORTED', 'INFERRED'];

  const rows =
    sources.length === 0
      ? []
      : await prisma.promptAttribution.findMany({
          where: {
            tenantId,
            ...(opts.siteId ? { trackedSiteId: opts.siteId } : {}),
            source: { in: sources },
            createdAt: { gte: from, lte: to },
          },
          orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
          take: limit * 2,
          select: {
            id: true,
            source: true,
            promptId: true,
            intent: true,
            confidence: true,
            provider: true,
            reportedText: true,
            evidence: true,
            createdAt: true,
            prompt: { select: { text: true } },
          },
        });

  const groups = new Map<AttributionSource, AttributionItem[]>();
  for (const r of rows) {
    const list = groups.get(r.source) ?? [];
    if (list.length >= limit) continue;
    list.push({
      id: r.id,
      source: r.source,
      promptId: r.promptId,
      promptText: r.prompt?.text ?? null,
      intent: r.intent,
      intentLabel: intentLabel(r.intent),
      confidence: r.confidence,
      provider: r.provider,
      providerLabel: providerLabel(r.provider),
      reportedText: r.source === 'USER_REPORTED' ? r.reportedText : null,
      evidence: evidenceSignals(r.evidence),
      createdAt: r.createdAt.toISOString(),
    });
    groups.set(r.source, list);
  }

  const synthetic = !wanted || wanted === 'SYNTHETIC' ? await syntheticSnapshot(tenantId, days) : null;

  const build = (source: AttributionSource, items: AttributionItem[]): AttributionGroup => {
    const counts = new Map<string, number>();
    for (const i of items) {
      const key = i.intent ?? 'other';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return {
      source,
      label: SOURCE_META[source].label,
      description: SOURCE_META[source].description,
      total: items.length,
      avgConfidence: items.length ? Math.round(items.reduce((s, i) => s + i.confidence, 0) / items.length) : null,
      intents: [...counts.entries()]
        .map(([intent, count]) => ({ intent, label: intentLabel(intent), count }))
        .sort((a, b) => b.count - a.count || a.intent.localeCompare(b.intent)),
      items,
    };
  };

  const syntheticItems: AttributionItem[] = (synthetic?.prompts ?? []).slice(0, limit).map((p) => ({
    id: `synthetic:${p.promptId}`,
    source: 'SYNTHETIC' as const,
    promptId: p.promptId,
    promptText: p.text,
    intent: p.intent,
    intentLabel: intentLabel(p.intent),
    confidence: p.visibility,
    provider: null,
    providerLabel: 'Independent AI ölçümü',
    reportedText: null,
    evidence: p.providers.map((pr) => ({
      signal: 'referrerOnly' as const,
      label: `${pr.label}: ${pr.visible}/${pr.runs} ölçümde görünür`,
      points: 0,
      detail: `${p.visibleRuns}/${p.runs} toplam ölçüm`,
    })),
    createdAt: synthetic?.range.to ?? to.toISOString(),
  }));

  const all: AttributionGroup[] = [];
  if (!wanted || wanted === 'USER_REPORTED') all.push(build('USER_REPORTED', groups.get('USER_REPORTED') ?? []));
  if (!wanted || wanted === 'INFERRED') all.push(build('INFERRED', groups.get('INFERRED') ?? []));
  if (!wanted || wanted === 'SYNTHETIC') all.push(build('SYNTHETIC', syntheticItems));

  return {
    range: { days, from: from.toISOString(), to: to.toISOString() },
    siteId: opts.siteId ?? null,
    totals: {
      userReported: (groups.get('USER_REPORTED') ?? []).length,
      inferred: (groups.get('INFERRED') ?? []).length,
      synthetic: syntheticItems.length,
    },
    groups: all,
    synthetic,
    minConfidence: MIN_CONFIDENCE,
  };
}
