/**
 * Site-scan çekirdek testleri için HTML fixture'ları (deterministik, ağ yok).
 *  GOOD_PAGE  = iyi yapılandırılmış kurumsal sayfa (title/meta/OG/JSON-LD/canonical/lang/viewport)
 *  POOR_PAGE  = başlıksız, şemasız, göreli og:image, çoklu H1
 *  WAF_PAGE   = Cloudflare challenge gövdesi (403 ile kullanılır)
 *  LEGACY_PAGE = windows-1254 meta charset'li eski sayfa
 * `artifact()` bu HTML'lerden scoring.ts Artifact'ı üretir; `pageOf()` parsePage ile PageArtifact'a çevirir.
 */
import type { Artifact } from '@/server/commerce/scoring';
import { parsePage, type PageArtifact } from '@/server/site-scan/fetch-page';

export const GOOD_URL = 'https://iyi-site.example/';

export const GOOD_PAGE = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>İyi Site — Ankara’da endüstriyel mutfak ekipmanı üreticisi</title>
<meta name="description" content="İyi Site, 1998’den beri Ankara’da endüstriyel mutfak ekipmanı üretir; ISO 9001 belgeli, Avrupa’ya ihracat yapar. Teklif için arayın.">
<link rel="canonical" href="https://iyi-site.example/">
<meta property="og:title" content="İyi Site — endüstriyel mutfak ekipmanı">
<meta property="og:description" content="ISO 9001 belgeli üretici; Avrupa’ya ihracat.">
<meta property="og:image" content="https://iyi-site.example/img/og.jpg">
<meta property="og:url" content="https://iyi-site.example/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="İyi Site">
<meta property="og:locale" content="tr_TR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://iyi-site.example/img/og.jpg">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Organization","name":"İyi Site","url":"https://iyi-site.example/","logo":"https://iyi-site.example/logo.png","telephone":"+90 312 000 00 00","address":{"@type":"PostalAddress","addressLocality":"Ankara","addressCountry":"TR"},"sameAs":["https://www.linkedin.com/company/iyi-site"]}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebSite","name":"İyi Site","url":"https://iyi-site.example/"}
</script>
</head>
<body>
<header><a href="/">Ana sayfa</a> <a href="/urunler">Ürünler</a> <a href="/hakkimizda">Hakkımızda</a> <a href="/iletisim">İletişim</a> <a href="https://www.linkedin.com/company/iyi-site" rel="nofollow noopener">LinkedIn</a></header>
<main>
<h1>Endüstriyel mutfak ekipmanı üreticisi</h1>
<p>1998’den beri Ankara’da üretim yapıyoruz. Otel, restoran ve yemekhaneler için pişirme, soğutma ve hazırlık üniteleri üretiyoruz; ISO 9001 ve CE belgelerimiz mevcut. Avrupa Birliği ülkelerine düzenli ihracat gerçekleştiriyoruz.</p>
<h2>Fiyatlar ne kadar?</h2>
<p>Fiyat, ünite sayısına ve özel ölçüye göre belirlenir; teklif 2 iş günü içinde iletilir. Standart üniteler için fiyat listesi ürün sayfalarındadır.</p>
<h2>Teslimat süresi</h2>
<p>Stoktaki ürünler 5 iş gününde, özel üretim 4–6 haftada teslim edilir.</p>
<h3>Servis ve garanti koşulları</h3>
<p>Tüm ürünlerde 2 yıl servis desteği verilir.</p>
<a href="mailto:info@iyi-site.example">E-posta</a>
<a href="tel:+903120000000">Telefon</a>
</main>
<footer>İyi Site Sanayi A.Ş. · Ostim Mah. 100. Cad. No: 5 Yenimahalle/Ankara · +90 312 000 00 00 · <a href="/kvkk">KVKK aydınlatma metni</a> · <a href="/cerez-politikasi">Çerez politikası</a></footer>
</body>
</html>`;

export const POOR_URL = 'http://zayif-site.example/';

export const POOR_PAGE = `<html>
<head>
<meta property="og:image" content="/img/og.png">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"Zayıf"}</script>
</head>
<body>
<h1>Hoş geldiniz</h1>
<h1>Zayıf Site</h1>
<div id="root"></div>
<a href="/a">A</a>
<script src="/app.js"></script>
</body>
</html>`;

export const WAF_URL = 'https://korumali-site.example/';

export const WAF_PAGE = `<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta name="robots" content="noindex,nofollow">
<script src="/cdn-cgi/challenge-platform/h/b/orchestrate/jsch/v1"></script></head>
<body><div id="cf-browser-verification" class="cf-im-under-attack"><noscript><h1>Please turn JavaScript on and reload the page.</h1></noscript></div></body></html>`;

export const LEGACY_URL = 'https://eski-site.example/';

export const LEGACY_PAGE = `<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=windows-1254">
<title>Eski Site — Türkçe karakterli başlık, epey uzun bir başlık cümlesi</title>
<meta name="description" content="Eski kodlamayla yayında olan bir kurumsal site; 2003’ten beri hizmet veriyoruz ve içerik çoğunlukla düz metin.">
<meta name="viewport" content="width=device-width">
</head>
<body>
<h1>Eski Site</h1>
<p>Bu sayfa windows-1254 ile kodlanmıştır.</p>
</body>
</html>`;

export const GOOD_ROBOTS = `User-agent: *
Disallow: /admin
Allow: /

Sitemap: https://iyi-site.example/sitemap.xml
`;

export const BLOCK_GPT_ROBOTS = `User-agent: *
Allow: /

User-agent: GPTBot
Disallow: /
`;

export const GOOD_LLMS = `# İyi Site
> Endüstriyel mutfak ekipmanı üreticisi.
- [Ürünler](https://iyi-site.example/urunler)
`;

export const GOOD_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://iyi-site.example/</loc><lastmod>2026-09-01</lastmod></url>
  <url><loc>https://iyi-site.example/urunler</loc></url>
</urlset>`;

export function artifact(
  url: string,
  text: string,
  opts: {
    status?: number;
    headers?: Record<string, string>;
    latencyMs?: number;
    finalUrl?: string;
    error?: Artifact['error'];
  } = {},
): Artifact {
  const status = opts.status ?? 200;
  return {
    ok: status >= 200 && status < 400,
    status,
    text,
    url: opts.finalUrl ?? url,
    headers: new Headers({ 'content-type': 'text/html; charset=utf-8', ...(opts.headers ?? {}) }),
    latencyMs: opts.latencyMs ?? 120,
    truncated: false,
    redirects: [],
    ...(opts.error ? { error: opts.error } : {}),
  };
}

export function pageOf(
  url: string,
  html: string,
  opts: {
    status?: number;
    headers?: Record<string, string>;
    robots?: string | null;
    llms?: string | null;
    sitemap?: string | null;
    finalUrl?: string;
  } = {},
): PageArtifact {
  const origin = new URL(url).origin;
  return parsePage(url, artifact(url, html, { status: opts.status, headers: opts.headers, finalUrl: opts.finalUrl }), {
    robots:
      opts.robots === undefined
        ? null
        : opts.robots === null
          ? artifact(`${origin}/robots.txt`, '', { status: 404, headers: { 'content-type': 'text/plain' } })
          : artifact(`${origin}/robots.txt`, opts.robots, { headers: { 'content-type': 'text/plain' } }),
    llms:
      opts.llms === undefined
        ? null
        : opts.llms === null
          ? artifact(`${origin}/llms.txt`, '', { status: 404, headers: { 'content-type': 'text/plain' } })
          : artifact(`${origin}/llms.txt`, opts.llms, { headers: { 'content-type': 'text/plain' } }),
    sitemap:
      opts.sitemap === undefined
        ? null
        : opts.sitemap === null
          ? artifact(`${origin}/sitemap.xml`, '', { status: 404, headers: { 'content-type': 'application/xml' } })
          : artifact(`${origin}/sitemap.xml`, opts.sitemap, { headers: { 'content-type': 'application/xml' } }),
    fetchedAt: '2026-09-21T00:00:00.000Z',
  });
}
