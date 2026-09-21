/**
 * OpenRouter model kullanım sıralaması — Yanıt'ın rutin ölçümlerinden biri.
 *
 * NE ÖLÇER (ve ne ölçmez):
 *   OpenRouter bir API yönlendiricisidir. Buradaki paylar, GELİŞTİRİCİLERİN OpenRouter üzerinden
 *   hangi modele ne kadar token gönderdiğini gösterir. Bu, tüketicinin ChatGPT uygulamasına ne
 *   sorduğuyla AYNI ŞEY DEĞİLDİR: ChatGPT, Gemini ve Claude'un kendi uygulamaları bu yönlendiriciden
 *   geçmez. Bu yüzden veri "geliştirici tarafında hangi model çalışıyor" sorusunun cevabıdır.
 *   Sayfada bu ayrım açıkça yazılmalıdır; aksi hâlde okuru yanıltır.
 *
 * ÖLÇÜM PENCERESİ (2026-09-20'de kaynağın kendi metninden doğrulandı):
 *   Okuduğumuz sorgu `["rankings","models",{"view":"week"}]`. OpenRouter aynı sayfada şunu yazıyor:
 *     "Today, This Week, and This Month each cover a trailing window of one day, seven days, and
 *      thirty days, ending with the most recent complete daily bucket."
 *   Yani satırdaki `date` alanı TEK BİR GÜNÜN verisi değil, YEDİ GÜNLÜK pencerenin BİTTİĞİ gündür.
 *   Sayfada "şu günün verisi" denirse okur yanılır; "şu günde biten 7 günlük pencere" denmelidir.
 *
 * `change` ALANI (aynı metinden doğrulandı):
 *     "Trending compares the trailing seven days with the seven days before it and ranks models by
 *      the percentage change in tokens, including only models with at least one million tokens in
 *      the current window so that a small base cannot produce a large percentage. New models with
 *      no prior week are listed first, up to five of them."
 *   Yani `change` bir ORANDIR (0,0845 = %8,45): son 7 günün token'ı ile ondan önceki 7 günün
 *   token'ının karşılaştırması. Kaynağın döndürdüğü dizi de bu değere göre AZALAN sıradadır
 *   (gözlemle doğrulandı: 2026-09-19 penceresinde 20 satırın tamamı kesin azalan).
 *   Eşik nedeniyle liste "en çok token işleyen 20 model" değil, "eşiği geçenler arasında token'ı
 *   en çok değişen 20 model"dir; paylar bu yüzden platformun tamamının değil, LİSTENİN payıdır.
 *
 * NASIL ALINIR:
 *   /rankings sayfası Next.js RSC ile gelir ve veriyi `self.__next_f.push([1,"…"])` parçalarında
 *   taşır. Parçalar birleştirilip React Query'nin dehydrate edilmiş durumundan
 *   `["rankings","models",…]` ve `["rankings","apps"]` sorgularının `data` değerleri çıkarılır.
 *   Tarayıcı çalıştırmaya gerek yoktur.
 *   robots.txt (2026-09-20) yalnızca /seo/ yolunu kapatır; /rankings taranabilir.
 *
 * KIRILGANLIK:
 *   Bu bir HTML/RSC ayrıştırmasıdır, sözleşmeli bir API değil. OpenRouter yapıyı değiştirirse
 *   ayrıştırma BAŞARISIZ OLUR ve `OpenRouterParseError` fırlatır. Sessizce boş veri döndürmez:
 *   eski anlık görüntü yerinde kalır, cron hatayı loglar ve sayfa "veri tazelenemedi" der.
 *   Modeller ZORUNLU, uygulamalar (apps) İSTEĞE BAĞLIDIR: apps ayrıştırılamazsa tüm okuma
 *   çökmez, yalnızca o bölüm boş kalır.
 */
import { safeFetch } from './safe-fetch';
import { prisma } from './prisma';
import { log } from './logger';

export const OPENROUTER_RANKINGS_URL = 'https://openrouter.ai/rankings';
/** Sayfa ~2,3 MB; varsayılan 2 MB sınırı RSC yükünü ortadan keserdi. */
const MAX_BYTES = 6 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 25_000;

/** Kaynağın model sorgusunda okuduğumuz görünüm ve karşılığı olan pencere uzunluğu. */
export const MODELS_VIEW = 'week' as const;
export const WINDOW_DAYS = 7;
/** Uygulama sıralamasında models penceresiyle AYNI uzunluğu seçiyoruz ki iki bölüm kıyaslanabilsin. */
const APPS_VIEW_ORDER = ['week', 'month', 'day'] as const;
const APPS_WINDOW_DAYS: Record<(typeof APPS_VIEW_ORDER)[number], number> = { day: 1, week: 7, month: 30 };
const APPS_LIMIT = 20;

export class OpenRouterParseError extends Error {
  constructor(message: string) {
    super(`OpenRouter sıralaması okunamadı: ${message}`);
    this.name = 'OpenRouterParseError';
  }
}

/** Tek bir modelin, tek bir penceredeki ham kullanım satırı. Zorunlu alan yalnız iki tanesidir. */
type RawRow = {
  date?: string;
  model_permaslug?: string;
  variant?: string;
  total_prompt_tokens?: number;
  total_completion_tokens?: number;
  total_native_tokens_reasoning?: number;
  total_native_tokens_cached?: number;
  /** İSTEK SAYISI. Ad yanıltıcı ama kaynakta böyle. */
  count?: number;
  total_tool_calls?: number;
  requests_with_tool_call_errors?: number;
  change?: number;
};

/** `["rankings","apps"]` satırı. `total_tokens` kaynakta STRING gelir. */
type RawApp = {
  app_id?: number;
  total_tokens?: number | string;
  total_requests?: number | string;
  rank?: number;
  app?: {
    id?: number;
    title?: string;
    slug?: string;
    origin_url?: string | null;
    main_url?: string | null;
    categories?: unknown;
  };
};

export type ModelShare = {
  /** OpenRouter permaslug, ör. "openai/gpt-5.2" */
  slug: string;
  /** Sağlayıcı kısmı, ör. "openai" */
  author: string;
  /** Model kısmı, ör. "gpt-5.2" */
  model: string;
  /** "standard" | "free" | … ; aynı slug birden çok variant'la geldiyse "a+b" */
  variant?: string;
  /** istem + cevap token'ı */
  tokens: number;
  promptTokens?: number;
  completionTokens?: number;
  /** Listenin toplam token'ı içindeki payı, yüzde (0-100), iki ondalık */
  sharePct: number;
  /** Kaynaktaki `count` alanı: istek sayısı */
  requests?: number;
  /** Listenin toplam isteği içindeki payı, yüzde */
  requestSharePct?: number;
  /** (istem + cevap) / istek, tam sayıya yuvarlı */
  tokensPerRequest?: number;
  /** istem / cevap; cevap 0 ise tanımsız */
  promptPerCompletion?: number;
  reasoningTokens?: number;
  cachedTokens?: number;
  /** akıl yürütme token'ı / cevap token'ı, yüzde; cevap 0 ise tanımsız */
  reasoningPct?: number;
  /** önbelleklenmiş token / istem token'ı, yüzde; istem 0 ise tanımsız */
  cachedPct?: number;
  toolCalls?: number;
  /**
   * Araç çağrısı sırasında hata dönen İSTEK sayısı. Oran HESAPLANMIYOR: paydanın
   * "araç çağrısı yapan istek sayısı" olması gerekir, kaynakta böyle bir alan yok
   * (`total_tool_calls` çağrı sayısıdır, istek sayısı değil). Ham sayı saklanır,
   * türetilmiş bir oran ne hesaplanır ne gösterilir.
   */
  toolCallErrorRequests?: number;
  /** Kaynağın `change` alanı, ORAN (0,0845 = %8,45). Anlamı modül başında belgelendi. */
  changeRatio?: number;
};

export type AuthorShare = {
  author: string;
  tokens: number;
  sharePct: number;
  /** Bu sağlayıcının listedeki model sayısı */
  modelCount: number;
  requests?: number;
  requestSharePct?: number;
};

export type AppUsage = {
  /** Kaynağın kendi sırası. BOŞLUKLU gelir: herkese açık olmayan uygulamalar listede yoktur. */
  rank?: number;
  appId?: number;
  title: string;
  slug?: string;
  /** origin_url'in yalnız host kısmı; sayfada bağlantı değil, düz metin olarak gösterilir. */
  host?: string;
  categories: string[];
  tokens: number;
  requests?: number;
  tokensPerRequest?: number;
};

export type AppsBlock = {
  view: (typeof APPS_VIEW_ORDER)[number];
  windowDays: number;
  items: AppUsage[];
};

export type RankingsSnapshot = {
  /** Pencerenin BİTTİĞİ gün (kaynağın verdiği tarih), YYYY-MM-DD */
  dataDate: string;
  /** Pencerenin uzunluğu, gün */
  windowDays: number;
  /** Listedeki tüm modellerin toplam token'ı */
  totalTokens: number;
  totalPromptTokens?: number;
  totalCompletionTokens?: number;
  totalRequests?: number;
  models: ModelShare[];
  authors: AuthorShare[];
  apps?: AppsBlock;
  /** Ölçümün alındığı an */
  fetchedAt: Date;
  sourceUrl: string;
};

/* ────────────────────────────────────────────────────────────────────────────
   Küçük yardımcılar — hepsi "eksik alan = undefined", asla "eksik alan = 0".
   ──────────────────────────────────────────────────────────────────────────── */

/** Sayıya çevirir; sayı değilse undefined. Boş dize, null, NaN, Infinity elenir. */
function num(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Payda 0 ya da tanımsızsa bölme YOK — undefined döner, sayfa "veri yok" gösterir. */
function ratio(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined || b === undefined || b === 0) return undefined;
  const r = a / b;
  return Number.isFinite(r) ? r : undefined;
}

/**
 * RSC yükünü yeniden kurar. Sunucu HTML'i `self.__next_f.push([1,"<kaçışlanmış>"])`
 * çağrılarıyla parça parça gönderir; hepsi sırayla birleştirilince tek bir metin olur.
 */
function reconstructFlight(html: string): string {
  const parts = html.match(/self\.__next_f\.push\(\[1,\s*"(?:[^"\\]|\\.)*"\]\)/g);
  if (!parts || parts.length === 0) throw new OpenRouterParseError('RSC yükü bulunamadı');
  let out = '';
  for (const p of parts) {
    const q = p.indexOf('"');
    const raw = p.slice(q, p.lastIndexOf('"') + 1);
    try {
      out += JSON.parse(raw) as string;
    } catch {
      // Tek bir bozuk parça tüm yükü çöpe atmamalı; sırayı bozmadan atla.
    }
  }
  if (!out) throw new OpenRouterParseError('RSC parçaları çözülemedi');
  return out;
}

/**
 * `start` konumundaki `[` ya da `{` ile başlayan JSON değerini dengeli sayarak keser.
 * Dize içindeki parantezleri saymamak için basit bir dize/kaçış durumu tutulur.
 */
function sliceBalanced(s: string, start: number): string | null {
  const open = s[start];
  if (open !== '[' && open !== '{') return null;
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (c === '\\') {
      esc = true;
      continue;
    }
    if (c === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Dehydrate durumdan bir sorgunun `data` değerini çıkarır. React Query yükünde
 * `"state":{"data":…}` bloğu `"queryKey":…` anahtarından ÖNCE gelir; anahtarın hemen
 * öncesindeki son `"state":{"data":` o sorguya aittir.
 * Bulunamazsa FIRLATMAZ, undefined döner — çağıran zorunluluğa kendi karar verir.
 */
function extractQueryData(flight: string, queryKeyPrefix: string): unknown {
  const keyAt = flight.indexOf(`"queryKey":${queryKeyPrefix}`);
  if (keyAt < 0) return undefined;
  const before = flight.slice(0, keyAt);
  const marker = '"state":{"data":';
  const stateAt = before.lastIndexOf(marker);
  if (stateAt < 0) return undefined;
  const text = sliceBalanced(before, stateAt + marker.length);
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** `["rankings","models",…]` sorgusunun `data` dizisi — ZORUNLU. */
function extractModelRows(flight: string): RawRow[] {
  const data = extractQueryData(flight, '["rankings","models"');
  if (data === undefined) throw new OpenRouterParseError('models sorgusu bulunamadı');
  if (!Array.isArray(data) || data.length === 0) throw new OpenRouterParseError('models dizisi boş');
  return data as RawRow[];
}

/** `["rankings","apps"]` sorgusu — İSTEĞE BAĞLI. `{day,week,month}` nesnesi gelir. */
function extractApps(flight: string): AppsBlock | undefined {
  const data = extractQueryData(flight, '["rankings","apps"]');
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;
  const byView = data as Record<string, unknown>;
  for (const view of APPS_VIEW_ORDER) {
    const rows = byView[view];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    const items: AppUsage[] = [];
    for (const raw of rows as RawApp[]) {
      const title = typeof raw?.app?.title === 'string' ? raw.app.title.trim() : '';
      const tokens = num(raw?.total_tokens);
      if (!title || tokens === undefined || tokens <= 0) continue;
      const requests = num(raw?.total_requests);
      const originUrl = raw.app?.origin_url ?? raw.app?.main_url ?? undefined;
      let host: string | undefined;
      if (typeof originUrl === 'string' && originUrl) {
        // Yalnız host saklanır: sayfada tıklanabilir dış bağlantı üretmiyoruz.
        try {
          host = new URL(originUrl).hostname.replace(/^www\./, '');
        } catch {
          host = undefined;
        }
      }
      const cats = Array.isArray(raw.app?.categories)
        ? (raw.app?.categories as unknown[]).filter((c): c is string => typeof c === 'string').slice(0, 3)
        : [];
      items.push({
        rank: num(raw.rank),
        appId: num(raw.app_id) ?? num(raw.app?.id),
        title: title.slice(0, 80),
        slug: typeof raw.app?.slug === 'string' ? raw.app.slug.slice(0, 80) : undefined,
        host,
        categories: cats,
        tokens,
        requests,
        tokensPerRequest: requests ? Math.round(tokens / requests) : undefined,
      });
    }
    if (items.length === 0) continue;
    items.sort((a, b) => b.tokens - a.tokens);
    return { view, windowDays: APPS_WINDOW_DAYS[view], items: items.slice(0, APPS_LIMIT) };
  }
  return undefined;
}

/** Tek bir slug için biriken ham toplamlar. `has*` bayrakları "0" ile "alan yok"u ayırır. */
type Acc = {
  prompt: number;
  completion: number;
  reasoning: number;
  cached: number;
  requests: number;
  toolCalls: number;
  toolErrors: number;
  hasPrompt: boolean;
  hasCompletion: boolean;
  hasReasoning: boolean;
  hasCached: boolean;
  hasRequests: boolean;
  hasToolCalls: boolean;
  hasToolErrors: boolean;
  variants: Set<string>;
  changes: number[];
  rows: number;
};

function emptyAcc(): Acc {
  return {
    prompt: 0,
    completion: 0,
    reasoning: 0,
    cached: 0,
    requests: 0,
    toolCalls: 0,
    toolErrors: 0,
    hasPrompt: false,
    hasCompletion: false,
    hasReasoning: false,
    hasCached: false,
    hasRequests: false,
    hasToolCalls: false,
    hasToolErrors: false,
    variants: new Set<string>(),
    changes: [],
    rows: 0,
  };
}

/** Ham satırları en güncel pencereye indirger ve payları hesaplar. */
export function aggregateRows(
  rows: RawRow[],
  apps?: AppsBlock,
): Omit<RankingsSnapshot, 'fetchedAt' | 'sourceUrl'> {
  const dates = rows.map((r) => (typeof r.date === 'string' ? r.date.slice(0, 10) : '')).filter(Boolean);
  if (dates.length === 0) throw new OpenRouterParseError('satırlarda tarih yok');
  const dataDate = dates.sort()[dates.length - 1]!;

  const byModel = new Map<string, Acc>();
  for (const r of rows) {
    if (typeof r.model_permaslug !== 'string' || !r.model_permaslug) continue;
    if (typeof r.date !== 'string' || r.date.slice(0, 10) !== dataDate) continue;

    const prompt = num(r.total_prompt_tokens);
    const completion = num(r.total_completion_tokens);
    const tokens = (prompt ?? 0) + (completion ?? 0);
    if (tokens <= 0) continue;

    const acc = byModel.get(r.model_permaslug) ?? emptyAcc();
    acc.rows += 1;
    if (prompt !== undefined) {
      acc.prompt += prompt;
      acc.hasPrompt = true;
    }
    if (completion !== undefined) {
      acc.completion += completion;
      acc.hasCompletion = true;
    }
    const reasoning = num(r.total_native_tokens_reasoning);
    if (reasoning !== undefined) {
      acc.reasoning += reasoning;
      acc.hasReasoning = true;
    }
    const cached = num(r.total_native_tokens_cached);
    if (cached !== undefined) {
      acc.cached += cached;
      acc.hasCached = true;
    }
    const requests = num(r.count);
    if (requests !== undefined) {
      acc.requests += requests;
      acc.hasRequests = true;
    }
    const toolCalls = num(r.total_tool_calls);
    if (toolCalls !== undefined) {
      acc.toolCalls += toolCalls;
      acc.hasToolCalls = true;
    }
    const toolErrors = num(r.requests_with_tool_call_errors);
    if (toolErrors !== undefined) {
      acc.toolErrors += toolErrors;
      acc.hasToolErrors = true;
    }
    if (typeof r.variant === 'string' && r.variant) acc.variants.add(r.variant);
    const change = num(r.change);
    if (change !== undefined) acc.changes.push(change);
    byModel.set(r.model_permaslug, acc);
  }
  if (byModel.size === 0) throw new OpenRouterParseError(`${dataDate} için kullanılabilir satır yok`);

  const entries = [...byModel.entries()];
  const totalTokens = entries.reduce((a, [, v]) => a + v.prompt + v.completion, 0);
  const anyRequests = entries.some(([, v]) => v.hasRequests);
  const totalRequests = anyRequests ? entries.reduce((a, [, v]) => a + v.requests, 0) : undefined;
  const totalPromptTokens = entries.some(([, v]) => v.hasPrompt)
    ? entries.reduce((a, [, v]) => a + v.prompt, 0)
    : undefined;
  const totalCompletionTokens = entries.some(([, v]) => v.hasCompletion)
    ? entries.reduce((a, [, v]) => a + v.completion, 0)
    : undefined;

  const pct = (n: number, total: number | undefined) =>
    total && total > 0 ? round2((n / total) * 100) : undefined;

  const models: ModelShare[] = entries
    .map(([slug, v]) => {
      const slash = slug.indexOf('/');
      const tokens = v.prompt + v.completion;
      const requests = v.hasRequests ? v.requests : undefined;
      // Aynı slug birden çok satırdan geldiyse `change` hangi satıra aitti belirsizdir:
      // tek satır varsa kullan, birden çoksa HİÇ gösterme.
      const changeRatio = v.changes.length === 1 ? v.changes[0] : undefined;
      const ppc = ratio(v.hasPrompt ? v.prompt : undefined, v.hasCompletion ? v.completion : undefined);
      const reasoningR = v.hasReasoning
        ? ratio(v.reasoning, v.hasCompletion ? v.completion : undefined)
        : undefined;
      const cachedR = v.hasCached ? ratio(v.cached, v.hasPrompt ? v.prompt : undefined) : undefined;
      return {
        slug,
        author: slash > 0 ? slug.slice(0, slash) : slug,
        model: slash > 0 ? slug.slice(slash + 1) : slug,
        variant: v.variants.size ? [...v.variants].sort().join('+') : undefined,
        tokens,
        promptTokens: v.hasPrompt ? v.prompt : undefined,
        completionTokens: v.hasCompletion ? v.completion : undefined,
        sharePct: pct(tokens, totalTokens) ?? 0,
        requests,
        requestSharePct: requests === undefined ? undefined : pct(requests, totalRequests),
        tokensPerRequest: requests && requests > 0 ? Math.round(tokens / requests) : undefined,
        promptPerCompletion: ppc === undefined ? undefined : round2(ppc),
        reasoningTokens: v.hasReasoning ? v.reasoning : undefined,
        cachedTokens: v.hasCached ? v.cached : undefined,
        reasoningPct: reasoningR === undefined ? undefined : round2(reasoningR * 100),
        cachedPct: cachedR === undefined ? undefined : round2(cachedR * 100),
        toolCalls: v.hasToolCalls ? v.toolCalls : undefined,
        toolCallErrorRequests: v.hasToolErrors ? v.toolErrors : undefined,
        changeRatio,
      } satisfies ModelShare;
    })
    .sort((a, b) => b.tokens - a.tokens);

  const authorMap = new Map<string, { tokens: number; requests: number; hasRequests: boolean; modelCount: number }>();
  for (const m of models) {
    const cur = authorMap.get(m.author) ?? { tokens: 0, requests: 0, hasRequests: false, modelCount: 0 };
    cur.tokens += m.tokens;
    if (m.requests !== undefined) {
      cur.requests += m.requests;
      cur.hasRequests = true;
    }
    cur.modelCount += 1;
    authorMap.set(m.author, cur);
  }
  const authors: AuthorShare[] = [...authorMap.entries()]
    .map(([author, v]) => ({
      author,
      tokens: v.tokens,
      modelCount: v.modelCount,
      sharePct: pct(v.tokens, totalTokens) ?? 0,
      requests: v.hasRequests ? v.requests : undefined,
      requestSharePct: v.hasRequests ? pct(v.requests, totalRequests) : undefined,
    }))
    .sort((a, b) => b.tokens - a.tokens);

  return {
    dataDate,
    windowDays: WINDOW_DAYS,
    totalTokens,
    totalPromptTokens,
    totalCompletionTokens,
    totalRequests,
    models,
    authors,
    apps,
  };
}

/**
 * Sıralamayı canlı olarak çeker. Ağ ya da ayrıştırma hatasında FIRLAR — çağıran taraf
 * (cron) hatayı loglar ve eski anlık görüntüyü korur.
 */
export async function fetchOpenRouterRankings(): Promise<RankingsSnapshot> {
  const res = await safeFetch(OPENROUTER_RANKINGS_URL, { timeout: FETCH_TIMEOUT_MS, maxBytes: MAX_BYTES });
  if (!res) throw new OpenRouterParseError('sayfa yanıt vermedi');
  if (!res.ok) throw new OpenRouterParseError(`HTTP ${res.status}`);
  if (res.truncated) throw new OpenRouterParseError('sayfa gövdesi kesildi, yük eksik');

  const flight = reconstructFlight(res.text);
  const rows = extractModelRows(flight);
  // Uygulama sıralaması isteğe bağlı: burada hata yutulur, modeller yoluna devam eder.
  let apps: AppsBlock | undefined;
  try {
    apps = extractApps(flight);
  } catch (err) {
    log.warn('openrouter.apps_parse_failed', { err });
    apps = undefined;
  }
  const agg = aggregateRows(rows, apps);
  return { ...agg, fetchedAt: new Date(), sourceUrl: OPENROUTER_RANKINGS_URL };
}

/* ────────────────────────────────────────────────────────────────────────────
   Kalıcılık — sayfa her istekte kazıma yapmaz; cron yazar, sayfa okur.
   ──────────────────────────────────────────────────────────────────────────── */

const SOURCE = 'openrouter';

/** Kaydedilmiş anlık görüntünün sayfaya verilen hâli. */
export type StoredRankings = RankingsSnapshot & {
  /** Ölçümün üstünden geçen gün sayısı; sayfa "bayat" uyarısı için kullanır. */
  ageDays: number;
};

function toStored(row: {
  dataDate: string;
  totalTokens: string;
  models: unknown;
  authors: unknown;
  apps: unknown;
  windowDays: number | null;
  sourceUrl: string;
  fetchedAt: Date;
}): StoredRankings {
  const ms = Date.now() - row.fetchedAt.getTime();
  const models = (Array.isArray(row.models) ? (row.models as ModelShare[]) : []) ?? [];
  // Toplamlar model satırlarından TÜRETİLİR; ayrı sütun tutmuyoruz. Bir alan satırların
  // hepsinde yoksa (eski şemadan gelen kayıt) toplam da undefined kalır — 0 diye gösterilmez.
  const sumIfAll = (pick: (m: ModelShare) => number | undefined): number | undefined => {
    if (models.length === 0) return undefined;
    let total = 0;
    for (const m of models) {
      const v = pick(m);
      if (v === undefined) return undefined;
      total += v;
    }
    return total;
  };
  const apps =
    row.apps && typeof row.apps === 'object' && !Array.isArray(row.apps) && Array.isArray((row.apps as AppsBlock).items)
      ? (row.apps as AppsBlock)
      : undefined;
  return {
    dataDate: row.dataDate,
    // Eski kayıtlarda sütun yok: pencere her zaman `view=week` okunduğu için 7 varsayılır.
    windowDays: row.windowDays ?? WINDOW_DAYS,
    totalTokens: Number(row.totalTokens),
    totalPromptTokens: sumIfAll((m) => m.promptTokens),
    totalCompletionTokens: sumIfAll((m) => m.completionTokens),
    totalRequests: sumIfAll((m) => m.requests),
    models,
    authors: (Array.isArray(row.authors) ? (row.authors as AuthorShare[]) : []) ?? [],
    apps,
    sourceUrl: row.sourceUrl,
    fetchedAt: row.fetchedAt,
    ageDays: Math.floor(ms / 86_400_000),
  };
}

/** Sayfanın okuduğu fonksiyon. Kayıt yoksa null döner; sayfa o zaman bölümü göstermez. */
export async function latestRankings(): Promise<StoredRankings | null> {
  try {
    const row = await prisma.modelUsageSnapshot.findFirst({
      where: { source: SOURCE },
      orderBy: { dataDate: 'desc' },
    });
    return row ? toStored(row) : null;
  } catch (err) {
    log.warn('openrouter.read_failed', { err });
    return null;
  }
}

/** Son N günün anlık görüntüleri — pay değişimini göstermek için. Yeniden eskiye. */
export async function recentRankings(limit = 14): Promise<StoredRankings[]> {
  try {
    const rows = await prisma.modelUsageSnapshot.findMany({
      where: { source: SOURCE },
      orderBy: { dataDate: 'desc' },
      take: Math.max(1, Math.min(60, limit)),
    });
    return rows.map(toStored);
  } catch (err) {
    log.warn('openrouter.read_failed', { err });
    return [];
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   Herkese açık JSON gövdesi — hem /api/public/model-rankings hem sayfa aynı sözlüğü kullanır.
   ──────────────────────────────────────────────────────────────────────────── */

/** Uçtaki gövde sürümü; alan eklenip çıkarsa burası artar. */
export const RANKINGS_PAYLOAD_VERSION = 2;

/**
 * Ham veri ucunun gövdesi. Türetilmiş her alanın tanımı `fields` içinde Türkçe yazılıdır;
 * teknik okur sayfadan ayrılmadan neyin nasıl hesaplandığını görebilsin diye.
 */
export function rankingsPayload(snap: StoredRankings) {
  return {
    schemaVersion: RANKINGS_PAYLOAD_VERSION,
    source: SOURCE,
    sourceUrl: snap.sourceUrl,
    sourceView: MODELS_VIEW,
    window: {
      /** Pencerenin bittiği gün (dahil) */
      endDate: snap.dataDate,
      days: snap.windowDays,
    },
    fetchedAt: snap.fetchedAt.toISOString(),
    ageDays: snap.ageDays,
    totals: {
      tokens: snap.totalTokens,
      promptTokens: snap.totalPromptTokens ?? null,
      completionTokens: snap.totalCompletionTokens ?? null,
      requests: snap.totalRequests ?? null,
      models: snap.models.length,
      authors: snap.authors.length,
    },
    models: snap.models,
    authors: snap.authors,
    apps: snap.apps ?? null,
    fields: {
      tokens: 'total_prompt_tokens + total_completion_tokens',
      sharePct: 'tokens / Σ(listedeki tüm modellerin tokens) × 100',
      requests: 'kaynaktaki count alanı (istek sayısı)',
      requestSharePct: 'requests / Σ(listedeki tüm modellerin requests) × 100',
      tokensPerRequest: 'tokens / requests, tam sayıya yuvarlı',
      promptPerCompletion: 'promptTokens / completionTokens; completionTokens 0 ise yok',
      reasoningPct: 'total_native_tokens_reasoning / completionTokens × 100',
      cachedPct: 'total_native_tokens_cached / promptTokens × 100',
      changeRatio:
        'kaynağın change alanı: son 7 günün token toplamının, ondan önceki 7 güne göre oransal değişimi (0,0845 = %8,45)',
      toolCallErrorRequests:
        'araç çağrısında hata dönen istek sayısı (ham). Doğru payda kaynakta bulunmadığı için oran hesaplanmaz.',
    },
    notes: [
      'Paylar platformun tamamının değil, bu listenin toplamının payıdır.',
      'Veri OpenRouter üzerinden geçen geliştirici trafiğini ölçer; ChatGPT, Gemini ve Claude uygulamalarının kendi trafiği buradan geçmez.',
      'Pencere, kaynağın "en son tamamlanmış günlük kova" ile biten 7 günlük penceresidir.',
    ],
  };
}

export type RefreshResult =
  | { ok: true; dataDate: string; models: number; authors: number; apps: number; created: boolean }
  | { ok: false; error: string };

/**
 * Rutin tazeleme — günlük cron çağırır.
 *
 * Hata FIRLATMAZ: başarısızlıkta eski anlık görüntü yerinde kalır ve cron'un geri kalanı
 * (asıl ölçüm işi) etkilenmez. Sonuç nesnesi hatayı taşır, log'a düşer.
 */
export async function refreshOpenRouterRankings(): Promise<RefreshResult> {
  let snap: RankingsSnapshot;
  try {
    snap = await fetchOpenRouterRankings();
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log.warn('openrouter.fetch_failed', { error });
    return { ok: false, error };
  }

  try {
    const existing = await prisma.modelUsageSnapshot.findUnique({
      where: { source_dataDate: { source: SOURCE, dataDate: snap.dataDate } },
      select: { id: true },
    });
    const payload = {
      totalTokens: String(snap.totalTokens),
      models: snap.models as unknown as object,
      authors: snap.authors as unknown as object,
      apps: (snap.apps ?? null) as unknown as object,
      windowDays: snap.windowDays,
      fetchedAt: snap.fetchedAt,
    };
    await prisma.modelUsageSnapshot.upsert({
      where: { source_dataDate: { source: SOURCE, dataDate: snap.dataDate } },
      create: { source: SOURCE, dataDate: snap.dataDate, sourceUrl: snap.sourceUrl, ...payload },
      update: payload,
    });
    log.info('openrouter.refreshed', {
      dataDate: snap.dataDate,
      models: snap.models.length,
      apps: snap.apps?.items.length ?? 0,
    });
    return {
      ok: true,
      dataDate: snap.dataDate,
      models: snap.models.length,
      authors: snap.authors.length,
      apps: snap.apps?.items.length ?? 0,
      created: !existing,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log.warn('openrouter.write_failed', { error });
    return { ok: false, error };
  }
}
