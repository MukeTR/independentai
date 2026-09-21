/**
 * W1 (site sağlığı A) fixture'ları — deterministik, ağ yok. Çekirdek fixture'lar (`site-html-core.ts`: GOOD/POOR/WAF/
 * LEGACY) yeniden kullanılır; burada dört motora özel varyantlar vardır:
 *  - SEO: başlık atlaması (h1→h3), noindex, göreli/farklı-host canonical, JS-only gövde, favicon
 *  - Sosyal: göreli og:image, twitter alanı yok, uzun og:description, http:// görsel
 *  - Güvenlik: iyi / zayıf / sızıntılı başlık setleri, TLS probe sonuçları
 *  - Yönlendirme: 4 varyant için zincirler (tek adım, üç adım, döngü, http'de kalan, meta refresh)
 */
import type { Artifact } from '@/server/commerce/scoring';
import type { HeadResult } from '@/server/site-scan/budget';
import type { TlsProbe } from '@/server/site-scan/tls-probe';
import { artifact } from './site-html-core';

export { artifact, pageOf } from './site-html-core';

// ───────────────────────────── SEO ─────────────────────────────

export const SEO_SKIP_URL = 'https://atlayan-site.example/hizmetler';

/** H1 var ama H2 yok, doğrudan H3; canonical göreli; meta robots noindex; favicon yok; gövde kısa (JS-only izlenimi) */
export const SEO_SKIP_PAGE = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hizmetler</title>
<meta name="description" content="Kısa.">
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="/hizmetler">
</head>
<body>
<h1>Hizmetlerimiz</h1>
<h3>Danışmanlık</h3>
<div id="app"></div>
<script src="/bundle.js"></script>
</body>
</html>`;

export const SEO_CANON_URL = 'https://kanonik-site.example/urun';

/** Canonical farklı host + http şeması; robots.txt bu yolu engelliyor */
export const SEO_CANON_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ürün sayfası — Kanonik Site, endüstriyel ürünler ve çözümler kataloğu</title>
<meta name="description" content="Kanonik Site ürün kataloğu: endüstriyel çözümler, teknik özellikler, teslimat ve fiyat bilgisi. Teklif için formu doldurun ya da arayın.">
<link rel="canonical" href="http://baska-site.example/urun">
<link rel="icon" href="/favicon.ico">
</head>
<body>
<h1>Ürün</h1>
<h2>Özellikler</h2>
<p>${'Endüstriyel ürün açıklaması ve teknik detaylar. '.repeat(12)}</p>
</body>
</html>`;

export const SEO_BLOCK_ROBOTS = `User-agent: *
Disallow: /urun
`;

// ───────────────────────────── Sosyal önizleme ─────────────────────────────

export const SOCIAL_POOR_URL = 'https://paylasim-zayif.example/';

/** og:title var, og:description/og:url yok; og:image göreli; twitter yok; title/description var (fallback) */
export const SOCIAL_POOR_PAGE = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>Paylaşım Zayıf — hizmetler</title>
<meta name="description" content="Paylaşım Zayıf firması hizmet açıklaması; müşteriye gönderilen link burada kötü görünür.">
<meta property="og:title" content="Paylaşım Zayıf">
<meta property="og:image" content="/img/kapak.png">
</head>
<body><h1>Paylaşım Zayıf</h1><p>Metin.</p></body>
</html>`;

export const SOCIAL_HTTP_IMG_URL = 'https://http-gorsel.example/';

/** Tüm OG alanları var ama görsel http:// ve og:description çok uzun; twitter:image farklı */
export const SOCIAL_HTTP_IMG_PAGE = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>HTTP Görsel — kurumsal</title>
<meta name="description" content="Kurumsal açıklama metni, elli karakterden uzun olacak şekilde yazılmıştır.">
<meta property="og:title" content="HTTP Görsel — kurumsal">
<meta property="og:description" content="${'Çok uzun bir açıklama metni. '.repeat(12)}">
<meta property="og:url" content="https://http-gorsel.example/">
<meta property="og:image" content="http://http-gorsel.example/img/og.jpg">
<meta name="twitter:card" content="summary">
<meta name="twitter:image" content="https://http-gorsel.example/img/tw.jpg">
</head>
<body><h1>HTTP Görsel</h1></body>
</html>`;

export const SOCIAL_NO_IMG_URL = 'https://gorselsiz.example/';

/** og:image hiç yok; title var → "metin kartı" fallback bilgisi */
export const SOCIAL_NO_IMG_PAGE = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>Görselsiz Site — sadece metin</title>
<meta name="description" content="Bu sitede paylaşım görseli tanımlanmamış; WhatsApp yalnızca başlık ve açıklama gösterir.">
<meta property="og:title" content="Görselsiz Site">
<meta property="og:description" content="Sadece metin kartı.">
<meta property="og:url" content="https://gorselsiz.example/">
<meta name="twitter:card" content="summary">
</head>
<body><h1>Görselsiz</h1></body>
</html>`;

export function head(
  url: string,
  status: number,
  opts: { contentType?: string | null; contentLength?: number | null; error?: HeadResult['error'] } = {},
): HeadResult {
  return {
    status,
    ok: status > 0 && status < 400,
    url,
    headers: new Headers(opts.contentType ? { 'content-type': opts.contentType } : {}),
    contentType: opts.contentType ?? null,
    contentLength: opts.contentLength ?? null,
    latencyMs: 12,
    redirects: [],
    ...(opts.error ? { error: opts.error } : {}),
  };
}

// ───────────────────────────── Güvenlik başlıkları ─────────────────────────────

export const SEC_GOOD_URL = 'https://guvenli-site.example/';

export const SEC_GOOD_HEADERS: Record<string, string> = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
  'content-security-policy': "default-src 'self'; script-src 'self' https://cdn.example; frame-ancestors 'none'",
  'x-frame-options': 'SAMEORIGIN',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'cross-origin-opener-policy': 'same-origin',
  server: 'nginx',
};

export const SEC_POOR_URL = 'https://acik-site.example/';

/** Hiç güvenlik başlığı yok; Server/X-Powered-By sürüm sızdırıyor; kullanımdan kalkmış X-XSS-Protection var */
export const SEC_POOR_HEADERS: Record<string, string> = {
  server: 'Apache/2.4.29 (Ubuntu)',
  'x-powered-by': 'PHP/7.2.24',
  'x-xss-protection': '1; mode=block',
};

export const SEC_WEAK_URL = 'https://yarim-site.example/';

/** HSTS kısa; CSP unsafe-inline+unsafe-eval; frame-ancestors yok; XFO yok; nosniff var */
export const SEC_WEAK_HEADERS: Record<string, string> = {
  'strict-transport-security': 'max-age=86400',
  'content-security-policy': "default-src * 'unsafe-inline' 'unsafe-eval'",
  'x-content-type-options': 'nosniff',
  'expect-ct': 'max-age=0',
  server: 'cloudflare',
};

export const SEC_PAGE = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Güvenlik test sayfası</title></head><body><h1>Merhaba</h1><p>Sıradan bir sayfa.</p></body></html>`;

const DAY = 86_400_000;

export function tlsOk(over: Partial<TlsProbe> = {}): TlsProbe {
  const daysLeft = over.daysLeft ?? 60;
  return {
    ok: true,
    validTo: new Date(Date.now() + daysLeft * DAY).toISOString(),
    validFrom: new Date(Date.now() - 30 * DAY).toISOString(),
    daysLeft,
    issuer: "Let's Encrypt",
    subject: 'guvenli-site.example',
    hostnameMatch: true,
    authorized: true,
    authorizationError: null,
    protocol: 'TLSv1.3',
    legacyTls: false,
    ...over,
  };
}

export function tlsFailed(error = 'Zaman aşımı'): TlsProbe {
  return {
    ok: false,
    validTo: null,
    validFrom: null,
    daysLeft: null,
    issuer: null,
    subject: null,
    hostnameMatch: null,
    authorized: null,
    authorizationError: null,
    protocol: null,
    legacyTls: null,
    error,
  };
}

// ───────────────────────────── Yönlendirme zinciri ─────────────────────────────

export type Hop = { from: string; to: string; status: number };

/** Zincirli Artifact: `redirects` doldurulur, son URL `finalUrl`, son durum `status`. */
export function chained(
  input: string,
  hops: Hop[],
  opts: { status?: number; html?: string; error?: Artifact['error']; headers?: Record<string, string> } = {},
): Artifact {
  const finalUrl = hops.length ? hops[hops.length - 1]!.to : input;
  const a = artifact(input, opts.html ?? SEC_PAGE, {
    status: opts.status ?? 200,
    finalUrl,
    headers: opts.headers,
    error: opts.error,
  });
  return { ...a, redirects: hops };
}

/** Yardımcı: A → B → C zinciri üret (ardışık 301'ler) */
export function chainOf(urls: string[], status = 301): Hop[] {
  const out: Hop[] = [];
  for (let i = 0; i < urls.length - 1; i++) out.push({ from: urls[i]!, to: urls[i + 1]!, status });
  return out;
}

export const META_REFRESH_PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=https://www.yenile.example/"><title>Yönlendiriliyor</title></head><body><script>location.href = "https://www.yenile.example/";</script></body></html>`;
