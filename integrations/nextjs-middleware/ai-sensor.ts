/**
 * Independent AI — Next.js / Vercel Edge middleware sensörü
 *
 * AI crawler'ları JavaScript çalıştırmadığı için tarayıcı SDK'sı onları göremez. Bu sarmalayıcı
 * edge middleware'de user-agent'ı görür ve yalnızca bilinen AI botlarını imzalı olarak
 * `POST /api/collect/v1/server` ucuna bildirir.
 *
 * Kurulum (`middleware.ts`):
 * ```ts
 * import { NextResponse } from 'next/server';
 * import { withAiSensor } from './lib/ai-sensor';
 *
 * export const middleware = withAiSensor(() => NextResponse.next(), {
 *   key: process.env.IAI_SITE_KEY!,
 *   secret: process.env.IAI_INGEST_SECRET!,
 * });
 *
 * export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
 * ```
 *
 * Bu dosyanın hiçbir bağımlılığı yoktur (`next` tiplerini bile import etmez); Edge runtime'daki
 * standart `fetch` + `crypto.subtle` API'lerini kullanır.
 *
 * Gizlilik: Cookie, Authorization, query string, gövde ve insan trafiği GÖNDERİLMEZ.
 * Ham IP yalnızca `sendIp: true` iken gönderilir (ters DNS doğrulaması için) ve saklanmaz.
 */

export type AiSensorOptions = {
  /** Public site anahtarı (`iais_…`) — gizli değildir. */
  key: string;
  /** Ingest sırrı (`iaix_…`) — HMAC imzası için; sunucu tarafı ortam değişkeninde tutun. */
  secret: string;
  /** Collector kökü (varsayılan: https://independentai.space). */
  endpoint?: string;
  /** Ham IP gönderimi (ters DNS doğrulaması). Varsayılan: kapalı. */
  sendIp?: boolean;
  /** Bir istekte gönderilecek en fazla kayıt (varsayılan 25, sunucu tavanı 200). */
  batchSize?: number;
  /** Tamponun bekleyeceği en uzun süre, ms (varsayılan 2000). */
  flushMs?: number;
};

type WaitUntilEvent = { waitUntil?: (promise: Promise<unknown>) => void } | undefined;
type EdgeHandler<Req extends Request, Res extends Response> = (req: Req, event: WaitUntilEvent) => Res | Promise<Res>;

type ServerHit = {
  id: string;
  ua: string;
  path: string;
  status?: number;
  ts: number;
  src: 'vercel';
  verified?: boolean;
  ip?: string;
};

/** Bilinen AI bot user-agent parçaları (küçük harf, substring eşleşmesi). */
const AI_BOT_TOKENS = [
  'gptbot',
  'oai-searchbot',
  'chatgpt-user',
  'claudebot',
  'anthropic-ai',
  'claude-user',
  'claude-web',
  'claude-searchbot',
  'perplexitybot',
  'perplexity-user',
  'googlebot',
  'applebot',
  'bingbot',
  'ccbot',
  'bytespider',
  'meta-externalagent',
  'facebookbot',
  'amazonbot',
  'duckassistbot',
  'cohere-ai',
  'cohere-training-data-crawler',
];

/** robots.txt kontrol token'ları — ayrı crawler değil, ziyaret üretmez. */
const CONTROL_TOKENS = ['google-extended', 'applebot-extended'];

const DEFAULT_ENDPOINT = 'https://independentai.space';

const buffer: ServerHit[] = [];
let firstQueuedAt = 0;

function isAiBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  for (const token of CONTROL_TOKENS) if (ua.indexOf(token) !== -1) return false;
  for (const token of AI_BOT_TOKENS) if (ua.indexOf(token) !== -1) return true;
  return false;
}

function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += bytes[i]!.toString(16).padStart(2, '0');
  return out;
}

/** `hex HMAC-SHA256(secret, "<timestamp>.<rawBody>")` — sunucudaki `signPayload` ile birebir aynı. */
export async function signPayload(secret: string, timestamp: string, rawBody: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}.${rawBody}`)));
}

async function flush(options: AiSensorOptions): Promise<void> {
  const hits = buffer.splice(0, options.batchSize ?? 25);
  if (!hits.length) return;
  firstQueuedAt = buffer.length ? Date.now() : 0;

  const endpoint = (options.endpoint ?? DEFAULT_ENDPOINT).replace(/\/+$/, '');
  const rawBody = JSON.stringify({ hits });
  const timestamp = String(Date.now());

  try {
    const signature = await signPayload(options.secret, timestamp, rawBody);
    await fetch(`${endpoint}/api/collect/v1/server`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-IAI-Key': options.key,
        'X-IAI-Timestamp': timestamp,
        'X-IAI-Signature': signature,
      },
      body: rawBody,
    });
  } catch {
    // Telemetri kaybı kabul edilebilir; istek etkilenmez.
  }
}

/**
 * Middleware'i sarar: önce asıl middleware çalışır, sonra (yalnızca AI botu ise) telemetri
 * `waitUntil` içinde gönderilir. Sensör hata alırsa istek AYNEN devam eder (fail-open).
 */
export function withAiSensor<Req extends Request, Res extends Response>(
  middleware: EdgeHandler<Req, Res>,
  options: AiSensorOptions,
): (req: Req, event?: WaitUntilEvent) => Promise<Res> {
  return async function handler(req: Req, event?: WaitUntilEvent): Promise<Res> {
    const res = await middleware(req, event);

    try {
      if (!options.key || !options.secret) return res;
      const ua = req.headers.get('user-agent') ?? '';
      if (!ua || !isAiBot(ua)) return res;

      const url = new URL(req.url);
      const hit: ServerHit = {
        id: crypto.randomUUID(),
        ua: ua.slice(0, 512),
        // Yalnızca pathname — query string ASLA gönderilmez.
        path: url.pathname.slice(0, 2048),
        ts: Date.now(),
        src: 'vercel',
      };
      // Middleware origin'in nihai durumunu göremez; yalnızca kendi ürettiği yönlendirme/hata
      // durumunu bildiririz. Aksi hâlde her isteği "200" saymak yanlış olurdu.
      if (res.status >= 300) hit.status = res.status;
      if (options.sendIp) {
        const fwd = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim();
        if (fwd) hit.ip = fwd.slice(0, 64);
      }

      buffer.push(hit);
      if (!firstQueuedAt) firstQueuedAt = Date.now();
      while (buffer.length > (options.batchSize ?? 25) * 4) buffer.shift();

      const due =
        buffer.length >= (options.batchSize ?? 25) || Date.now() - firstQueuedAt >= (options.flushMs ?? 2_000);
      if (due) {
        const task = flush(options);
        if (event?.waitUntil) event.waitUntil(task);
        else await task;
      }
    } catch {
      // Fail-open: sensör asla isteği bozmaz.
    }

    return res;
  };
}
