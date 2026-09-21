/**
 * W2 fixture'ları (kırık link, robots/sitemap, hreflang) — deterministik, ağ yok.
 *  - `b-site.example`: 4 sayfalı küçük site (ana → ürünler → ürün/1, ürün/2; hakkımızda; iletişim), kırık iç link,
 *    yavaş sayfa, dış linkler (405→GET, ölü, 403), görsel/script/css kaynakları, mailto/tel/javascript/data linkleri.
 *  - `buyuk.example`: N linkli tek sayfa (bütçe kesimi testi).
 *  - `indeks.example`: sitemapindex (4 alt), `gz.example`: .gz sitemap, `bozuk.example`: HTML dönen sitemap,
 *    `kapali.example`: `Disallow: /` + CSS engeli + bilinmeyen direktif.
 *  - `cok-dilli.example`: tr/en/de hreflang (de geri dönmüyor), `hatali.example`: bozuk kodlar, `tek-dilli.example`.
 * `siteBResponse(url, init)` safeFetch mock'u için yönlendirici (unit + integration ortak).
 */

export const B_ORIGIN = 'https://b-site.example';
export const B_URL = `${B_ORIGIN}/`;

export const B_HOME = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>B Site — Ankara’da makine üreticisi</title>
<meta name="description" content="B Site 2001’den beri Ankara’da endüstriyel makine üretir; ISO 9001 belgeli.">
<link rel="canonical" href="https://b-site.example/">
<link rel="stylesheet" href="/css/site.css">
<script src="/js/app.js"></script>
<script src="https://cdn.dis.example/lib.js"></script>
</head>
<body>
<header>
<a href="/">Ana sayfa</a>
<a href="/urunler">Ürünler</a>
<a href="/hakkimizda">Hakkımızda</a>
<a href="/iletisim">İletişim</a>
<a href="/kirik-sayfa">Kampanya</a>
<a href="/yavas">Katalog</a>
<a href="https://dis.example/">Dış kaynak</a>
<a href="https://olu.example/">Ölü site</a>
<a href="https://yasak.example/">Korumalı site</a>
<a href="mailto:info@b-site.example">E-posta</a>
<a href="tel:+903120000000">Telefon</a>
<a href="javascript:void(0)">Menü</a>
<a href="data:text/plain,abc">Veri</a>
<a href="#iletisim">Aşağı</a>
</header>
<main>
<h1>Endüstriyel makine üreticisi</h1>
<img src="/img/logo.png" alt="B Site logosu">
<img src="/img/yok.png" alt="Eksik görsel">
<p>Otel, restoran ve fabrikalar için üretim yapıyoruz. +90 312 000 00 00</p>
</main>
<footer><a href="/kvkk">KVKK</a></footer>
</body>
</html>`;

export const B_URUNLER = `<!doctype html><html lang="tr"><head><title>Ürünler — B Site</title></head>
<body><h1>Ürünler</h1>
<a href="/urun/1">Pişirme ünitesi</a>
<a href="/urun/2">Soğutma ünitesi</a>
<a href="/kirik-sayfa">Kampanya (eski)</a>
<a href="/urunler?utm_source=x">Ürünler (takip)</a>
<a href="/katalog.pdf">Katalog PDF</a>
</body></html>`;

export const B_URUN1 = `<!doctype html><html lang="tr"><head><title>Pişirme ünitesi — B Site</title></head>
<body><h1>Pişirme ünitesi</h1><a href="/urun/1/detay">Teknik detay</a><a href="/urunler">Geri</a><img src="/img/urun1.jpg" alt="ürün"></body></html>`;

export const B_URUN2 = `<!doctype html><html lang="tr"><head><title>Soğutma ünitesi — B Site</title></head>
<body><h1>Soğutma ünitesi</h1><a href="/urunler">Geri</a><a href="/gizli/fiyat">Bayi fiyatı</a></body></html>`;

export const B_HAKKIMIZDA = `<!doctype html><html lang="tr"><head><title>Hakkımızda — B Site</title></head>
<body><h1>Hakkımızda</h1><a href="/">Ana sayfa</a><a href="/ekip">Ekip</a></body></html>`;

export const B_ILETISIM = `<!doctype html><html lang="tr"><head><title>İletişim — B Site</title></head>
<body><h1>İletişim</h1><a href="/">Ana sayfa</a></body></html>`;

export const B_ROBOTS = `User-agent: *
Disallow: /gizli
Allow: /

Sitemap: https://b-site.example/sitemap.xml
`;

export const B_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url><loc>https://b-site.example/</loc><lastmod>2026-09-01</lastmod>
    <xhtml:link rel="alternate" hreflang="tr-TR" href="https://b-site.example/"/>
    <xhtml:link rel="alternate" hreflang="en-GB" href="https://b-site.example/en/"/>
  </url>
  <url><loc>https://b-site.example/urunler</loc><lastmod>2026-08-15</lastmod></url>
  <url><loc>https://b-site.example/urun/1</loc><lastmod>2026-08-15</lastmod></url>
  <url><loc>https://b-site.example/urun/2</loc></url>
  <url><loc>https://b-site.example/hakkimizda</loc></url>
  <url><loc>https://b-site.example/iletisim</loc></url>
  <url><loc>https://b-site.example/kirik-sayfa</loc></url>
  <url><loc><![CDATA[https://b-site.example/gizli/fiyat]]></loc></url>
  <url><loc>http://b-site.example/eski</loc></url>
  <url><loc>https://baska-host.example/sayfa</loc></url>
</urlset>`;

/** Disallow: / + CSS engeli + bilinmeyen direktif + grup dışı kural */
export const BAD_ROBOTS = `Noindex: /eski
User-agent: *
Disallow: /
Disallow: /wp-content/
Disallow: /*.css$
Crawl-delay: 10
Foo: bar
`;

export const SITEMAPINDEX_B = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://indeks.example/sitemap-1.xml</loc><lastmod>2026-09-01</lastmod></sitemap>
  <sitemap><loc>https://indeks.example/sitemap-2.xml</loc></sitemap>
  <sitemap><loc>https://indeks.example/sitemap-3.xml</loc></sitemap>
  <sitemap><loc>https://indeks.example/sitemap-4.xml</loc></sitemap>
</sitemapindex>`;

export function childSitemap(host: string, n: number, count = 3): string {
  const urls = Array.from(
    { length: count },
    (_, i) => `<url><loc>https://${host}/bolum-${n}/sayfa-${i + 1}</loc><lastmod>2026-09-0${(i % 9) + 1}</lastmod></url>`,
  );
  return `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
}

export const INVALID_SITEMAP_HTML = `<!doctype html><html><head><title>404</title></head><body><h1>Bulunamadı</h1></body></html>`;

// ── hreflang ──
export const ML_ORIGIN = 'https://cok-dilli.example';
export const ML_TR = `<!doctype html><html lang="tr"><head><title>Çok Dilli — Antalya’da diş kliniği</title>
<meta name="description" content="Antalya’da implant ve estetik diş tedavisi.">
<link rel="canonical" href="https://cok-dilli.example/">
<link rel="alternate" hreflang="tr-TR" href="https://cok-dilli.example/">
<link rel="alternate" hreflang="en-GB" href="https://cok-dilli.example/en/">
<link rel="alternate" hreflang="de" href="https://cok-dilli.example/de/">
<link rel="alternate" hreflang="x-default" href="https://cok-dilli.example/">
</head><body><h1>Diş kliniği</h1><a href="/en/">English</a><a href="/de/">Deutsch</a><p>+90 242 000 00 00</p></body></html>`;

export const ML_EN = `<!doctype html><html lang="en"><head><title>Dental clinic in Antalya</title>
<link rel="alternate" hreflang="en-GB" href="https://cok-dilli.example/en/">
<link rel="alternate" hreflang="tr-TR" href="https://cok-dilli.example/">
<link rel="alternate" hreflang="x-default" href="https://cok-dilli.example/">
</head><body><h1>Dental clinic</h1></body></html>`;

/** Geri dönüş linki YOK (tr'yi göstermiyor) */
export const ML_DE = `<!doctype html><html lang="de"><head><title>Zahnklinik Antalya</title>
<link rel="alternate" hreflang="de" href="https://cok-dilli.example/de/">
</head><body><h1>Zahnklinik</h1></body></html>`;

export const BAD_HREFLANG = `<!doctype html><html><head><title>Hatalı</title>
<link rel="canonical" href="https://hatali.example/en/">
<link rel="alternate" hreflang="en-UK" href="https://hatali.example/en/">
<link rel="alternate" hreflang="tr-tr" href="https://hatali.example/tr/">
<link rel="alternate" hreflang="en_US" href="https://hatali.example/us/">
<link rel="alternate" hreflang="fr" href="https://hatali.example/fr/">
<link rel="alternate" hreflang="fr" href="https://hatali.example/fr-2/">
</head><body><h1>Hatalı</h1></body></html>`;

export const MONO_TR = `<!doctype html><html lang="tr"><head><title>Tek Dilli — Bursa’da mobilya atölyesi</title>
<meta name="description" content="Bursa’da özel ölçü mobilya üretimi."></head>
<body><h1>Mobilya atölyesi</h1><a href="/urunler">Ürünler</a><p>0224 000 00 00</p></body></html>`;

export const MONO_WITH_SIGNALS = `<!doctype html><html lang="tr"><head><title>The best furniture workshop in Bursa for hotels and homes</title>
<meta name="description" content="Custom furniture for the hospitality sector and homes with fast delivery."></head>
<body><h1>Mobilya atölyesi</h1><a href="/en/">English</a><a href="/ar/">العربية</a><p>+90 224 000 00 00</p></body></html>`;

/** N linkli tek sayfa (bütçe kesimi). */
export function bigPage(n: number, origin = 'https://buyuk.example'): string {
  const links = Array.from({ length: n }, (_, i) => `<a href="${origin}/sayfa-${i + 1}">Sayfa ${i + 1}</a>`);
  return `<!doctype html><html lang="tr"><head><title>Büyük site</title></head><body><h1>Büyük</h1>${links.join('\n')}</body></html>`;
}

export type MockResponse = {
  status: number;
  ok: boolean;
  url: string;
  headers: Headers;
  text: string;
  truncated: boolean;
  redirects: { from: string; to: string; status: number }[];
};

function res(
  url: string,
  text: string,
  type = 'text/html; charset=utf-8',
  status = 200,
  headers: Record<string, string> = {},
): MockResponse {
  const allowed = /^text\/|xml|json/i.test(type);
  return {
    status,
    ok: status < 400 && allowed,
    url,
    headers: new Headers({ 'content-type': type, ...headers }),
    text: allowed ? text : '',
    truncated: false,
    redirects: [],
  };
}

/**
 * safeFetch mock yönlendiricisi. `null` = ağ hatası; `'timeout'` işareti için çağıran gecikme uygular.
 * HEAD isteklerinde gövde boş döner (safe-fetch davranışı).
 */
export function siteBResponse(rawUrl: string, init: { method?: string } = {}): MockResponse | null {
  const u = new URL(rawUrl);
  const head = init.method === 'HEAD';
  const html = (text: string, status = 200) => res(rawUrl, head ? '' : text, 'text/html; charset=utf-8', status);
  const nf = () => html(INVALID_SITEMAP_HTML, 404);
  const p = u.pathname;
  switch (u.hostname) {
    case 'b-site.example': {
      if (p === '/' || p === '') return html(B_HOME);
      if (p === '/urunler') return html(B_URUNLER);
      if (p === '/urun/1') return html(B_URUN1);
      if (p === '/urun/2') return html(B_URUN2);
      if (p === '/urun/1/detay') return html('<html><body>Detay</body></html>');
      if (p === '/hakkimizda') return html(B_HAKKIMIZDA);
      if (p === '/iletisim') return html(B_ILETISIM);
      if (p === '/kvkk') return html('<html><body>KVKK</body></html>');
      if (p === '/ekip') return html('<html><body>Sunucu hatası</body></html>', 500);
      if (p === '/gizli/fiyat') return html('<html><body>Gizli</body></html>');
      if (p === '/robots.txt') return res(rawUrl, head ? '' : B_ROBOTS, 'text/plain');
      if (p === '/sitemap.xml') return res(rawUrl, head ? '' : B_SITEMAP, 'application/xml');
      if (p === '/img/logo.png') return res(rawUrl, '', 'image/png', 200, { 'content-length': '2048' });
      if (p === '/img/urun1.jpg') return res(rawUrl, '', 'image/jpeg', 200);
      if (p === '/js/app.js') return res(rawUrl, head ? '' : 'console.log(1)', 'application/javascript');
      if (p === '/css/site.css') return res(rawUrl, head ? '' : 'body{}', 'text/css');
      if (p === '/katalog.pdf') return res(rawUrl, '', 'application/pdf', 200);
      if (p === '/en/') return html(ML_EN);
      if (p === '/eski') return nf();
      return nf(); // /kirik-sayfa, /img/yok.png, /yavas (test gecikme uygular) …
    }
    case 'dis.example':
      if (head) return res(rawUrl, '', 'text/html', 405);
      return html('<html><body>Dış</body></html>');
    case 'cdn.dis.example':
      return res(rawUrl, '', 'application/javascript', 200);
    case 'olu.example':
      return null;
    case 'yasak.example':
      return html('<html><body>Forbidden</body></html>', 403);
    case 'baska-host.example':
      return html('<html><body>Başka</body></html>');
    case 'buyuk.example': {
      if (p === '/' || p === '') return html(bigPage(300));
      if (p === '/robots.txt') return res(rawUrl, '', 'text/plain', 404);
      return html(`<html><body><h1>${p}</h1></body></html>`);
    }
    case 'indeks.example': {
      if (p === '/robots.txt') return res(rawUrl, head ? '' : 'User-agent: *\nAllow: /\nSitemap: https://indeks.example/sitemap.xml\n', 'text/plain');
      if (p === '/sitemap.xml') return res(rawUrl, head ? '' : SITEMAPINDEX_B, 'application/xml');
      const m = p.match(/^\/sitemap-(\d)\.xml$/);
      if (m) return res(rawUrl, head ? '' : childSitemap('indeks.example', Number(m[1])), 'application/xml');
      if (p === '/' || p === '') return html('<html lang="tr"><head><title>İndeks</title></head><body><h1>İndeks</h1></body></html>');
      return html('<html><body>ok</body></html>');
    }
    case 'gz.example': {
      if (p === '/robots.txt') return res(rawUrl, head ? '' : 'User-agent: *\nAllow: /\nSitemap: https://gz.example/sitemap.xml.gz\n', 'text/plain');
      if (p === '/sitemap.xml.gz') return res(rawUrl, '', 'application/x-gzip', 200);
      if (p === '/sitemap.xml') return nf();
      return html('<html lang="tr"><head><title>GZ</title></head><body><h1>GZ</h1></body></html>');
    }
    case 'bozuk.example': {
      if (p === '/robots.txt') return res(rawUrl, '', 'text/plain', 404);
      if (p === '/sitemap.xml') return res(rawUrl, head ? '' : INVALID_SITEMAP_HTML, 'text/html', 200);
      return html('<html lang="tr"><head><title>Bozuk</title></head><body><h1>Bozuk</h1></body></html>');
    }
    case 'kapali.example': {
      if (p === '/robots.txt') return res(rawUrl, head ? '' : BAD_ROBOTS, 'text/plain');
      if (p === '/sitemap.xml') return res(rawUrl, head ? '' : childSitemap('kapali.example', 1, 4), 'application/xml');
      return html('<html lang="tr"><head><title>Kapalı</title></head><body><h1>Kapalı</h1></body></html>');
    }
    case 'cok-dilli.example': {
      if (p === '/' || p === '') return html(ML_TR);
      if (p === '/en/') return html(ML_EN);
      if (p === '/de/') return html(ML_DE);
      if (p === '/robots.txt') return res(rawUrl, '', 'text/plain', 404);
      if (p === '/sitemap.xml') return res(rawUrl, '', 'application/xml', 404);
      return nf();
    }
    case 'hatali.example': {
      if (p === '/' || p === '') return html(BAD_HREFLANG);
      if (p === '/en/') return html(BAD_HREFLANG);
      if (p === '/tr/') return html('<html><head><title>tr</title></head><body></body></html>');
      if (p === '/us/') return nf();
      if (p === '/fr/' || p === '/fr-2/') return html('<html><head><title>fr</title></head><body></body></html>');
      if (p === '/robots.txt' || p === '/sitemap.xml') return res(rawUrl, '', 'text/plain', 404);
      return nf();
    }
    case 'tek-dilli.example': {
      if (p === '/' || p === '') return html(MONO_TR);
      if (p === '/sinyalli') return html(MONO_WITH_SIGNALS);
      return res(rawUrl, '', 'text/plain', 404);
    }
    default:
      return nf();
  }
}
