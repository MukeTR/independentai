/**
 * Independent AI — Cloudflare Worker crawler sensörü
 *
 * NEDEN GEREKLİ: AI crawler'ları (GPTBot, ClaudeBot, PerplexityBot…) JavaScript çalıştırmaz.
 * Tarayıcı SDK'sı onları GÖREMEZ. Bu Worker isteği kenardan görür, yalnızca bilinen bir AI botu
 * ise imzalı bir telemetri kaydı üretir ve `/api/collect/v1/server` ucuna gönderir.
 *
 * Ne GÖNDERİLİR: user-agent, yol (query'siz), HTTP durumu, içerik türü, zaman, doğrulama sinyali.
 * Ne GÖNDERİLMEZ: Cookie, Authorization, query string, gövde, form verisi, insan ziyaretçileri.
 * Ham IP yalnızca `IAI_SEND_IP = "1"` iken gönderilir (ters DNS doğrulaması için) ve sunucuda
 * SAKLANMAZ.
 *
 * İmza: `X-IAI-Signature = hex HMAC-SHA256(ingest secret, `${timestamp}.${rawBody}`)`.
 *
 * Fail-open: telemetri hatası müşterinin sitesini ETKİLEMEZ; yanıt her hâlde origin'den döner.
 */

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

/**
 * robots.txt kontrol token'ları: ayrı bir crawler DEĞİL, eğitim izni anahtarıdır.
 * HTTP isteği üretmezler; yanlışlıkla görülürse ziyaret sayılmaz.
 */
const CONTROL_TOKENS = ['google-extended', 'applebot-extended'];

const MAX_BATCH = 50;
const FLUSH_MS = 2_000;
const DEFAULT_ENDPOINT = 'https://independentai.space';

/** Isolate ömrü boyunca yaşayan tampon (Cloudflare isolate'i istekler arasında korur). */
const buffer = [];
let flushPending = false;

function isControlToken(ua) {
  for (const t of CONTROL_TOKENS) if (ua.indexOf(t) !== -1) return true;
  return false;
}

function matchBot(ua) {
  if (!ua) return null;
  const lower = ua.toLowerCase();
  if (isControlToken(lower)) return null;
  for (const t of AI_BOT_TOKENS) if (lower.indexOf(t) !== -1) return t;
  return null;
}

function hex(buf) {
  const bytes = new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

async function sign(secret, timestamp, rawBody) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}.${rawBody}`)));
}

async function flush(env) {
  if (!buffer.length) return;
  const hits = buffer.splice(0, MAX_BATCH);
  const endpoint = (env.IAI_ENDPOINT || DEFAULT_ENDPOINT).replace(/\/+$/, '');
  const rawBody = JSON.stringify({ hits });
  const timestamp = String(Date.now());

  try {
    const signature = await sign(env.IAI_INGEST_SECRET, timestamp, rawBody);
    await fetch(`${endpoint}/api/collect/v1/server`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-IAI-Key': env.IAI_SITE_KEY,
        'X-IAI-Timestamp': timestamp,
        'X-IAI-Signature': signature,
      },
      body: rawBody,
    });
  } catch (_err) {
    // Telemetri kaybı kabul edilebilir; site etkilenmez.
  }
}

function scheduleFlush(env, ctx) {
  if (buffer.length >= MAX_BATCH) {
    ctx.waitUntil(flush(env));
    return;
  }
  if (flushPending) return;
  flushPending = true;
  ctx.waitUntil(
    new Promise((resolve) => setTimeout(resolve, FLUSH_MS)).then(() => {
      flushPending = false;
      return flush(env);
    }),
  );
}

export default {
  async fetch(request, env, ctx) {
    // 1) Yanıt her zaman origin'den döner — sensör hiçbir koşulda araya girmez.
    const response = await fetch(request);

    try {
      if (!env || !env.IAI_SITE_KEY || !env.IAI_INGEST_SECRET) return response;

      const ua = request.headers.get('user-agent') || '';
      if (!matchBot(ua)) return response;

      const url = new URL(request.url);
      const cf = request.cf || {};
      const category = typeof cf.verifiedBotCategory === 'string' ? cf.verifiedBotCategory.trim() : '';
      const botManagement = cf.botManagement || {};
      // Cloudflare'in doğrulanmış-bot sinyali: UA taklidini eler. Yoksa sunucu UNVERIFIED sayar.
      const verified = category !== '' || botManagement.verifiedBot === true;

      const hit = {
        id: crypto.randomUUID(),
        ua: ua.slice(0, 512),
        // Yalnızca pathname — query string ASLA gönderilmez.
        path: url.pathname.slice(0, 2048),
        status: response.status,
        ct: (response.headers.get('content-type') || '').split(';')[0].slice(0, 120),
        ts: Date.now(),
        src: 'cloudflare',
        verified,
      };

      // Ham IP opsiyoneldir; yalnızca ters DNS doğrulaması için gönderilir ve saklanmaz.
      if (env.IAI_SEND_IP === '1') {
        const ip = request.headers.get('cf-connecting-ip');
        if (ip) hit.ip = ip.slice(0, 64);
      }

      buffer.push(hit);
      while (buffer.length > MAX_BATCH * 4) buffer.shift();
      scheduleFlush(env, ctx);
    } catch (_err) {
      // Fail-open
    }

    return response;
  },
};
