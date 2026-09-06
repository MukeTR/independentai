/**
 * SSRF-güvenli fetch — kullanıcı tarafından girilen URL'leri sunucuda çekerken:
 *
 *  - Yalnızca http/https, yalnızca 80/443 portları; URL içinde kimlik bilgisi (user:pass@) yasak.
 *  - Bloklu host adları (localhost, *.internal, *.local, metadata) ve tüm özel/loopback/
 *    link-local/CGNAT/multicast/IPv4-mapped IPv6 aralıkları reddedilir.
 *  - DNS rebinding / TOCTOU: DNS çözümü bağlantı kuran soketin KENDİ lookup'ında doğrulanır
 *    (undici Agent `connect.lookup`). Yani doğrulanan adres ile bağlanılan adres aynıdır;
 *    "önce kontrol et sonra fetch tekrar çözsün" açığı yoktur.
 *  - Redirect'ler manuel takip edilir ve her hop yeniden doğrulanır (maks 4).
 *  - Yanıt gövdesi akış halinde okunur ve MAX_BODY_BYTES'ta kesilir (sıkıştırma bombası/
 *    devasa sayfa koruması). İzin verilen content-type: text/html, text/plain, xml, json.
 *  - Zaman aşımı: bağlantı + toplam okuma.
 */
import { lookup as dnsLookup } from 'node:dns';
import { isIP } from 'node:net';
import { Agent, fetch as undiciFetch, type Dispatcher } from 'undici';

const MAX_REDIRECTS = 4;
export const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_PORTS = new Set(['', '80', '443']);
const ALLOWED_CONTENT_TYPES = [/^text\//i, /xml/i, /json/i];

export class UnsafeUrlError extends Error {}

function ipv4ToParts(ip: string): number[] | null {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((p) => p > 255)) return null;
  return parts;
}

function isPrivateIPv4(ip: string): boolean {
  const p = ipv4ToParts(ip);
  if (!p) return true; // parse edilemeyen → güvensiz say
  const [a, b] = p as [number, number, number, number];
  if (a === 10) return true; // 10/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 169 && b === 254) return true; // link-local + IMDS
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true; // 192.168/16
  if (a === 192 && b === 0) return true; // 192.0.0/24, 192.0.2/24
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmark 198.18/15
  if (a === 198 && b === 51) return true; // TEST-NET-2
  if (a === 203 && b === 0) return true; // TEST-NET-3
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a >= 224) return true; // multicast + reserved + broadcast
  return false;
}

/** IPv6 adresini tam (genişletilmiş) hextet dizisine açar. */
function expandIPv6(raw: string): number[] | null {
  let ip = raw.toLowerCase().replace(/^\[|\]$/g, '');
  const zone = ip.indexOf('%');
  if (zone !== -1) ip = ip.slice(0, zone);
  // gömülü IPv4 (::ffff:1.2.3.4)
  const v4 = ip.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4) {
    const parts = ipv4ToParts(v4[1]!);
    if (!parts) return null;
    const hi = ((parts[0]! << 8) | parts[1]!) & 0xffff;
    const lo = ((parts[2]! << 8) | parts[3]!) & 0xffff;
    ip = ip.slice(0, ip.length - v4[1]!.length) + hi.toString(16) + ':' + lo.toString(16);
  }
  const halves = ip.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;
  const full = [...head, ...Array(missing).fill('0'), ...tail];
  const nums = full.map((h) => parseInt(h || '0', 16));
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff)) return null;
  return nums;
}

function isPrivateIPv6(raw: string): boolean {
  const h = expandIPv6(raw);
  if (!h) return true;
  const [h0, h1, h2, h3, h4, h5, h6, h7] = h as [number, number, number, number, number, number, number, number];
  const allZero = h.every((x) => x === 0);
  if (allZero) return true; // ::
  if (h0 === 0 && h1 === 0 && h2 === 0 && h3 === 0 && h4 === 0 && h5 === 0 && h6 === 0 && h7 === 1) return true; // ::1
  // IPv4-mapped ::ffff:a.b.c.d  ve IPv4-compatible ::a.b.c.d ve NAT64 64:ff9b::/96
  if (h0 === 0 && h1 === 0 && h2 === 0 && h3 === 0 && h4 === 0 && (h5 === 0xffff || h5 === 0)) {
    return isPrivateIPv4(`${h6 >> 8}.${h6 & 0xff}.${h7 >> 8}.${h7 & 0xff}`);
  }
  if (h0 === 0x64 && h1 === 0xff9b) return isPrivateIPv4(`${h6 >> 8}.${h6 & 0xff}.${h7 >> 8}.${h7 & 0xff}`);
  if ((h0 & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((h0 & 0xffc0) === 0xfec0) return true; // fec0::/10 site-local (eski)
  if ((h0 & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((h0 & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (h0 === 0x2001 && h1 === 0x0db8) return true; // dokümantasyon
  if (h0 === 0x2002) return isPrivateIPv4(`${h1 >> 8}.${h1 & 0xff}.${h2 >> 8}.${h2 & 0xff}`); // 6to4
  return false;
}

export function isBlockedIp(ip: string, family?: number): boolean {
  const fam = family ?? isIP(ip);
  if (fam === 6) return isPrivateIPv6(ip);
  if (fam === 4) return isPrivateIPv4(ip);
  return true;
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
  'ip6-localhost',
  'ip6-loopback',
]);

function assertHostAllowed(host: string) {
  if (!host) throw new UnsafeUrlError('Geçersiz host');
  if (
    BLOCKED_HOSTNAMES.has(host) ||
    host.endsWith('.internal') ||
    host.endsWith('.local') ||
    host.endsWith('.localhost') ||
    host.endsWith('.arpa')
  ) {
    throw new UnsafeUrlError('Erişime kapalı host');
  }
  // Onaltılık/ondalık/oktal IPv4 kısaltmaları (0x7f000001, 2130706433, 0177.0.0.1) URL parser
  // tarafından zaten noktalı forma normalize edilir; yine de rakamla başlayıp IP olmayanları reddet.
  if (/^[0-9x.]+$/i.test(host) && !ipv4ToParts(host)) throw new UnsafeUrlError('Geçersiz IP biçimi');
}

/** URL'i parse eder; şema, port, kimlik bilgisi ve host adını doğrular. DNS'e gitmez. */
export function parsePublicUrl(rawUrl: string): URL {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError('Geçersiz URL');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new UnsafeUrlError('Yalnızca http/https desteklenir');
  if (u.username || u.password) throw new UnsafeUrlError('URL içinde kimlik bilgisi kullanılamaz');
  if (!ALLOWED_PORTS.has(u.port)) throw new UnsafeUrlError('Yalnızca 80/443 portlarına izin verilir');
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  assertHostAllowed(host);
  if (isIP(host)) {
    if (isBlockedIp(host)) throw new UnsafeUrlError('Özel/dahili adreslere erişilemez');
  }
  return u;
}

/**
 * Bağlantı için kullanılan lookup: çözümlenen HER adres doğrulanır; biri bile özelse bağlantı
 * kurulmaz. Böylece doğrulanan adres = bağlanılan adres (TOCTOU yok).
 */
function guardedLookup(
  hostname: string,
  options: unknown,
  callback: (err: NodeJS.ErrnoException | null, address: unknown, family?: number) => void,
) {
  const opts = (typeof options === 'object' && options ? options : {}) as Record<string, unknown>;
  dnsLookup(hostname, { ...opts, all: true } as never, (err, addresses) => {
    if (err) return callback(err, undefined as never);
    const list = (Array.isArray(addresses) ? addresses : [addresses]) as { address: string; family: number }[];
    if (!list.length)
      return callback(Object.assign(new Error('Host çözümlenemedi'), { code: 'ENOTFOUND' }), undefined as never);
    for (const a of list) {
      if (isBlockedIp(a.address, a.family)) {
        return callback(
          Object.assign(new UnsafeUrlError('Özel/dahili adreslere erişilemez'), { code: 'EBLOCKED' }),
          undefined as never,
        );
      }
    }
    if (opts.all) return callback(null, list);
    const first = list[0]!;
    callback(null, first.address, first.family);
  });
}

let agent: Agent | null = null;
function getAgent(): Dispatcher {
  if (!agent) {
    agent = new Agent({
      connect: { lookup: guardedLookup as never, timeout: 8_000 },
      headersTimeout: 15_000,
      bodyTimeout: 15_000,
    });
  }
  return agent;
}

/** Test/araç kullanımı: DNS ile çözümleyip tüm adresleri doğrular (bağlantı kurmaz). */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  const u = parsePublicUrl(rawUrl);
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (isIP(host)) return u;
  await new Promise<void>((resolve, reject) => {
    guardedLookup(host, { all: true }, (err) =>
      err ? reject(err instanceof UnsafeUrlError ? err : new UnsafeUrlError('Host çözümlenemedi')) : resolve(),
    );
  });
  return u;
}

export type SafeFetchResult = {
  status: number;
  ok: boolean;
  url: string;
  headers: Headers;
  /** Gövde (MAX_BODY_BYTES'ta kesilmiş olabilir) */
  text: string;
  truncated: boolean;
};

export type SafeFetchInit = {
  timeout?: number;
  headers?: Record<string, string>;
  maxBytes?: number;
  method?: 'GET' | 'HEAD';
};

async function readCapped(
  res: Response,
  maxBytes: number,
  signal: AbortSignal,
): Promise<{ text: string; truncated: boolean }> {
  const body = res.body;
  if (!body) return { text: '', truncated: false };
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  try {
    while (true) {
      if (signal.aborted) throw new Error('Zaman aşımı');
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        chunks.push(value.subarray(0, Math.max(0, value.byteLength - (total - maxBytes))));
        truncated = true;
        break;
      }
      chunks.push(value);
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* yoksay */
    }
  }
  const merged = new Uint8Array(chunks.reduce((s, c) => s + c.byteLength, 0));
  let off = 0;
  for (const c of chunks) {
    merged.set(c, off);
    off += c.byteLength;
  }
  return { text: new TextDecoder('utf-8', { fatal: false }).decode(merged), truncated };
}

/**
 * SSRF-güvenli fetch. Güvensiz URL'de UnsafeUrlError fırlatır; ağ hatasında null döner.
 */
export async function safeFetch(rawUrl: string, init: SafeFetchInit = {}): Promise<SafeFetchResult | null> {
  const { timeout = 12_000, headers = {}, maxBytes = MAX_BODY_BYTES, method = 'GET' } = init;
  let current = parsePublicUrl(rawUrl).toString();
  const deadline = Date.now() + timeout;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), remaining);
    let res: Response;
    try {
      res = (await undiciFetch(current, {
        method,
        headers: {
          'User-Agent': 'IndependentAI-GEOBot/1.0 (+https://independentai.space)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5',
          ...headers,
        },
        redirect: 'manual',
        signal: ctrl.signal,
        dispatcher: getAgent(),
      })) as unknown as Response;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof UnsafeUrlError) throw err;
      const cause = (err as { cause?: { code?: string } })?.cause;
      if (cause?.code === 'EBLOCKED') throw new UnsafeUrlError('Özel/dahili adreslere erişilemez');
      return null;
    }

    if (res.status >= 300 && res.status < 400) {
      clearTimeout(timer);
      const loc = res.headers.get('location');
      try {
        await res.body?.cancel();
      } catch {
        /* yoksay */
      }
      if (!loc)
        return { status: res.status, ok: false, url: current, headers: res.headers, text: '', truncated: false };
      current = parsePublicUrl(new URL(loc, current).toString()).toString(); // her hop yeniden doğrulanır
      continue;
    }

    const ct = res.headers.get('content-type') ?? '';
    if (ct && !ALLOWED_CONTENT_TYPES.some((re) => re.test(ct))) {
      clearTimeout(timer);
      try {
        await res.body?.cancel();
      } catch {
        /* yoksay */
      }
      return { status: res.status, ok: false, url: current, headers: res.headers, text: '', truncated: false };
    }
    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared > maxBytes * 4) {
      clearTimeout(timer);
      try {
        await res.body?.cancel();
      } catch {
        /* yoksay */
      }
      return { status: res.status, ok: false, url: current, headers: res.headers, text: '', truncated: true };
    }
    try {
      const { text, truncated } = await readCapped(res, maxBytes, ctrl.signal);
      return { status: res.status, ok: res.ok, url: current, headers: res.headers, text, truncated };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new UnsafeUrlError('Çok fazla yönlendirme');
}
