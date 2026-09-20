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
 * NASIL ALINIR:
 *   /rankings sayfası Next.js RSC ile gelir ve veriyi `self.__next_f.push([1,"…"])` parçalarında
 *   taşır. Parçalar birleştirilip React Query'nin dehydrate edilmiş durumundan
 *   `["rankings","models",…]` sorgusunun `data` dizisi çıkarılır. Tarayıcı çalıştırmaya gerek yoktur.
 *   robots.txt (2026-09-20) yalnızca /seo/ yolunu kapatır; /rankings taranabilir.
 *
 * KIRILGANLIK:
 *   Bu bir HTML/RSC ayrıştırmasıdır, sözleşmeli bir API değil. OpenRouter yapıyı değiştirirse
 *   ayrıştırma BAŞARISIZ OLUR ve `OpenRouterParseError` fırlatır. Sessizce boş veri döndürmez:
 *   eski anlık görüntü yerinde kalır, cron hatayı loglar ve sayfa "veri tazelenemedi" der.
 */
import { safeFetch } from './safe-fetch';
import { prisma } from './prisma';
import { log } from './logger';

export const OPENROUTER_RANKINGS_URL = 'https://openrouter.ai/rankings';
/** Sayfa ~2,3 MB; varsayılan 2 MB sınırı RSC yükünü ortadan keserdi. */
const MAX_BYTES = 6 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 25_000;

export class OpenRouterParseError extends Error {
  constructor(message: string) {
    super(`OpenRouter sıralaması okunamadı: ${message}`);
    this.name = 'OpenRouterParseError';
  }
}

/** Tek bir modelin, tek bir gündeki ham kullanım satırı. */
type RawRow = {
  date: string;
  model_permaslug: string;
  total_prompt_tokens?: number;
  total_completion_tokens?: number;
};

export type ModelShare = {
  /** OpenRouter permaslug, ör. "openai/gpt-5.2" */
  slug: string;
  /** Sağlayıcı kısmı, ör. "openai" */
  author: string;
  /** Model kısmı, ör. "gpt-5.2" */
  model: string;
  tokens: number;
  /** Toplam içindeki payı, yüzde (0-100), iki ondalık */
  sharePct: number;
};

export type AuthorShare = {
  author: string;
  tokens: number;
  sharePct: number;
  /** Bu sağlayıcının listedeki model sayısı */
  modelCount: number;
};

export type RankingsSnapshot = {
  /** Verinin ait olduğu gün (OpenRouter'ın verdiği tarih), YYYY-MM-DD */
  dataDate: string;
  /** Listedeki tüm modellerin toplam token'ı */
  totalTokens: number;
  models: ModelShare[];
  authors: AuthorShare[];
  /** Ölçümün alındığı an */
  fetchedAt: Date;
  sourceUrl: string;
};

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

/** `["rankings","models",…]` sorgusunun `data` dizisini çıkarır. */
function extractModelRows(flight: string): RawRow[] {
  const keyAt = flight.indexOf('"queryKey":["rankings","models"');
  if (keyAt < 0) throw new OpenRouterParseError('models sorgusu bulunamadı');
  const before = flight.slice(0, keyAt);
  const stateAt = before.lastIndexOf('"state":{"data":[');
  if (stateAt < 0) throw new OpenRouterParseError('models verisi bulunamadı');
  const arrayAt = before.indexOf('[', stateAt + '"state":{"data":'.length - 1);

  // Diziyi dengeli köşeli parantez sayarak kes; dize içindeki parantezleri saymamak için
  // basit bir dize/kaçış durumu tutulur.
  const s = before;
  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;
  for (let i = arrayAt; i < s.length; i++) {
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
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end < 0) throw new OpenRouterParseError('models dizisi kapanmıyor');

  let rows: unknown;
  try {
    rows = JSON.parse(s.slice(arrayAt, end));
  } catch (err) {
    throw new OpenRouterParseError(`models dizisi JSON değil: ${(err as Error).message}`);
  }
  if (!Array.isArray(rows) || rows.length === 0) throw new OpenRouterParseError('models dizisi boş');
  return rows as RawRow[];
}

/** Ham satırları en güncel güne indirger ve payları hesaplar. */
export function aggregateRows(rows: RawRow[]): Omit<RankingsSnapshot, 'fetchedAt' | 'sourceUrl'> {
  const dates = rows.map((r) => (typeof r.date === 'string' ? r.date.slice(0, 10) : '')).filter(Boolean);
  if (dates.length === 0) throw new OpenRouterParseError('satırlarda tarih yok');
  const dataDate = dates.sort()[dates.length - 1]!;

  const byModel = new Map<string, number>();
  for (const r of rows) {
    if (typeof r.model_permaslug !== 'string') continue;
    if (typeof r.date !== 'string' || r.date.slice(0, 10) !== dataDate) continue;
    const tokens = (Number(r.total_prompt_tokens) || 0) + (Number(r.total_completion_tokens) || 0);
    if (tokens <= 0) continue;
    byModel.set(r.model_permaslug, (byModel.get(r.model_permaslug) ?? 0) + tokens);
  }
  if (byModel.size === 0) throw new OpenRouterParseError(`${dataDate} için kullanılabilir satır yok`);

  const totalTokens = [...byModel.values()].reduce((a, b) => a + b, 0);
  const pct = (n: number) => Math.round((n / totalTokens) * 10000) / 100;

  const models: ModelShare[] = [...byModel.entries()]
    .map(([slug, tokens]) => {
      const slash = slug.indexOf('/');
      return {
        slug,
        author: slash > 0 ? slug.slice(0, slash) : slug,
        model: slash > 0 ? slug.slice(slash + 1) : slug,
        tokens,
        sharePct: pct(tokens),
      };
    })
    .sort((a, b) => b.tokens - a.tokens);

  const authorMap = new Map<string, { tokens: number; modelCount: number }>();
  for (const m of models) {
    const cur = authorMap.get(m.author) ?? { tokens: 0, modelCount: 0 };
    cur.tokens += m.tokens;
    cur.modelCount += 1;
    authorMap.set(m.author, cur);
  }
  const authors: AuthorShare[] = [...authorMap.entries()]
    .map(([author, v]) => ({ author, tokens: v.tokens, modelCount: v.modelCount, sharePct: pct(v.tokens) }))
    .sort((a, b) => b.tokens - a.tokens);

  return { dataDate, totalTokens, models, authors };
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
  const agg = aggregateRows(rows);
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
  sourceUrl: string;
  fetchedAt: Date;
}): StoredRankings {
  const ms = Date.now() - row.fetchedAt.getTime();
  return {
    dataDate: row.dataDate,
    totalTokens: Number(row.totalTokens),
    models: (row.models as ModelShare[]) ?? [],
    authors: (row.authors as AuthorShare[]) ?? [],
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

export type RefreshResult =
  | { ok: true; dataDate: string; models: number; authors: number; created: boolean }
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
    await prisma.modelUsageSnapshot.upsert({
      where: { source_dataDate: { source: SOURCE, dataDate: snap.dataDate } },
      create: {
        source: SOURCE,
        dataDate: snap.dataDate,
        totalTokens: String(snap.totalTokens),
        models: snap.models as unknown as object,
        authors: snap.authors as unknown as object,
        sourceUrl: snap.sourceUrl,
        fetchedAt: snap.fetchedAt,
      },
      update: {
        totalTokens: String(snap.totalTokens),
        models: snap.models as unknown as object,
        authors: snap.authors as unknown as object,
        fetchedAt: snap.fetchedAt,
      },
    });
    log.info('openrouter.refreshed', { dataDate: snap.dataDate, models: snap.models.length });
    return {
      ok: true,
      dataDate: snap.dataDate,
      models: snap.models.length,
      authors: snap.authors.length,
      created: !existing,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log.warn('openrouter.write_failed', { error });
    return { ok: false, error };
  }
}
