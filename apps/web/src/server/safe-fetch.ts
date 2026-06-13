/**
 * SSRF-güvenli fetch — kullanıcı tarafından girilen URL'leri sunucuda çekerken
 * internal/loopback/link-local/private ve cloud-metadata adreslerini engeller.
 * DNS rebinding'e karşı çözümlenen TÜM IP'leri doğrular; redirect'leri manuel
 * takip edip her hop'u yeniden doğrular.
 */
import { lookup } from 'node:dns/promises';

const MAX_REDIRECTS = 4;

function ipv4ToParts(ip: string): number[] | null {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((p) => p > 255)) return null;
  return parts;
}

function isPrivateIPv4(ip: string): boolean {
  const p = ipv4ToParts(ip);
  if (!p) return false;
  const [a, b] = p as [number, number, number, number];
  if (a === 10) return true; // 10/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 169 && b === 254) return true; // link-local + cloud IMDS 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true; // 192.168/16
  if (a === 192 && b === 0) return true; // 192.0.0/24, 192.0.2/24 (test-net)
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function isPrivateIPv6(raw: string): boolean {
  const ip = raw.toLowerCase();
  if (ip === '::1' || ip === '::') return true; // loopback / unspecified
  if (ip.startsWith('fe80') || ip.startsWith('fec0')) return true; // link-local
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // unique local fc00::/7
  // IPv4-mapped / NAT64: ::ffff:a.b.c.d veya ::ffff:0:a.b.c.d
  const mapped = ip.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped && mapped[1] && isPrivateIPv4(mapped[1])) return true;
  return false;
}

export function isBlockedIp(ip: string, family: number): boolean {
  return family === 6 ? isPrivateIPv6(ip) : isPrivateIPv4(ip);
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
]);

/** URL'i parse eder, şema + host + çözümlenen tüm IP'leri doğrular. Güvensizse fırlatır. */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new Error('Geçersiz URL');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Yalnızca http/https desteklenir');
  }
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith('.internal') || host.endsWith('.local')) {
    throw new Error('Erişime kapalı host');
  }
  // Host doğrudan IP ise direkt kontrol
  if (ipv4ToParts(host)) {
    if (isPrivateIPv4(host)) throw new Error('Özel/dahili adreslere erişilemez');
    return u;
  }
  if (host.includes(':')) {
    if (isPrivateIPv6(host)) throw new Error('Özel/dahili adreslere erişilemez');
    return u;
  }
  // Hostname → DNS ile çözümlenen tüm adresleri doğrula (DNS rebinding savunması)
  let addrs: { address: string; family: number }[];
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    throw new Error('Host çözümlenemedi');
  }
  if (addrs.length === 0) throw new Error('Host çözümlenemedi');
  for (const a of addrs) {
    if (isBlockedIp(a.address, a.family)) throw new Error('Özel/dahili adreslere erişilemez');
  }
  return u;
}

/**
 * SSRF-güvenli fetch. Her redirect hop'unu yeniden doğrular (redirect: 'manual').
 * Başarısızsa null döner (fetchText bunu zaten kabul ediyor).
 */
export async function safeFetch(rawUrl: string, init: RequestInit & { timeout?: number } = {}): Promise<Response | null> {
  const { timeout = 12000, ...rest } = init;
  let current = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(current); // güvensizse fırlatır

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    let res: Response;
    try {
      res = await fetch(current, { ...rest, redirect: 'manual', signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }

    // 3xx → Location'ı doğrulayıp manuel takip et
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return res;
      current = new URL(loc, current).toString();
      continue;
    }
    return res;
  }
  throw new Error('Çok fazla yönlendirme');
}
