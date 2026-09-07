/**
 * Commerce denetim testleri için HTML/robots fixture'ları (deterministik, ağ yok).
 * "GOOD_*" = iyi yapılandırılmış Shopify-benzeri mağaza; "POOR_*" = JS'e bağımlı, şemasız mağaza.
 */

export const GOOD_ROBOTS = `# Shopify robots
User-agent: *
Disallow: /admin
Disallow: /cart
Disallow: /checkout
Allow: /

User-agent: GPTBot
Disallow: /

User-agent: Google-Extended
Disallow: /

Sitemap: https://good-store.example/sitemap.xml
`;

export const OPEN_ROBOTS = `User-agent: *
Disallow: /admin
Allow: /

Sitemap: https://good-store.example/sitemap.xml
`;

export const GOOD_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://good-store.example/</loc></url>
  <url><loc>https://good-store.example/products/organik-pamuk-battaniye</loc></url>
  <url><loc>https://good-store.example/collections/bebek</loc></url>
</urlset>`;

export const GOOD_LLMS = `# Good Store
> Bebek tekstili satan bir mağaza.
- [Ürünler](https://good-store.example/collections/all)
`;

const productLinks = Array.from(
  { length: 10 },
  (_, i) => `<li><a href="/products/urun-${i + 1}">Ürün ${i + 1}</a></li>`,
).join('');
const collectionLinks = ['bebek', 'battaniye', 'tekstil', 'hediye']
  .map((c) => `<a href="/collections/${c}">${c}</a>`)
  .join('');

export const GOOD_HOME = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>Good Store — Organik bebek tekstili</title>
<meta name="description" content="Good Store, GOTS sertifikalı organik pamuk bebek battaniyeleri ve tekstil ürünleri sunar. Türkiye geneline ücretsiz kargo.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta property="og:site_name" content="Good Store">
<link rel="canonical" href="https://good-store.example/">
<link rel="alternate" hreflang="tr-TR" href="https://good-store.example/">
<link rel="alternate" hreflang="en" href="https://good-store.example/en">
<script src="https://cdn.shopify.com/s/files/1/0001/theme.js"></script>
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
 {"@type":"Organization","name":"Good Store","url":"https://good-store.example","logo":"https://good-store.example/logo.png","sameAs":["https://instagram.com/goodstore"],"contactPoint":{"@type":"ContactPoint","telephone":"+90 212 000 00 00","contactType":"customer service"}},
 {"@type":"WebSite","name":"Good Store","url":"https://good-store.example"}
]}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Kargo ne zaman?","acceptedAnswer":{"@type":"Answer","text":"1-3 iş günü."}}]}
</script>
</head>
<body>
<header><nav>${collectionLinks}<a href="/pages/hakkimizda">Hakkımızda</a><a href="/pages/iletisim">İletişim</a></nav></header>
<main>
<h1>Organik pamuk bebek tekstili</h1>
<h2>Neden Good Store?</h2>
<p>${'Bebeğiniz için GOTS sertifikalı organik pamuk battaniyeler, uyku tulumları ve zıbınlar üretiyoruz. '.repeat(12)}</p>
<h2>Kargo ne zaman gelir?</h2><p>Siparişler 1-3 iş günü içinde teslim edilir.</p>
<h2>İade var mı?</h2><p>14 gün içinde koşulsuz iade.</p>
<ul>${productLinks}</ul>
</main>
<footer><p>© Good Store</p></footer>
</body></html>`;

export const GOOD_PRODUCT = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>Organik Pamuk Bebek Battaniyesi — Good Store</title>
<meta name="description" content="GOTS sertifikalı organik pamuk bebek battaniyesi, 90×120 cm, makinede yıkanabilir. Yeni doğan ve hediye için ideal.">
<link rel="canonical" href="https://good-store.example/products/organik-pamuk-battaniye">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product","name":"Organik Pamuk Bebek Battaniyesi","image":["https://good-store.example/cdn/battaniye.jpg"],
"description":"GOTS sertifikalı %100 organik pamuktan üretilen 90×120 cm bebek battaniyesi. Makinede 30°C yıkanabilir, boyasız ve nefes alan dokuya sahiptir.",
"sku":"GS-BB-90120","gtin13":"8690000000012","brand":{"@type":"Brand","name":"Good Store"},
"offers":{"@type":"Offer","price":"899.90","priceCurrency":"TRY","availability":"https://schema.org/InStock","url":"https://good-store.example/products/organik-pamuk-battaniye"},
"aggregateRating":{"@type":"AggregateRating","ratingValue":"4.8","reviewCount":"126"}}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Ana sayfa","item":"https://good-store.example/"},{"@type":"ListItem","position":2,"name":"Bebek","item":"https://good-store.example/collections/bebek"}]}
</script>
</head>
<body>
<nav aria-label="breadcrumb"><a href="/">Ana sayfa</a> / <a href="/collections/bebek">Bebek</a></nav>
<main>
<h1>Organik Pamuk Bebek Battaniyesi</h1>
<img src="/cdn/battaniye.jpg" alt="Organik pamuk bebek battaniyesi, krem rengi, 90x120 cm">
<img src="/cdn/battaniye-2.jpg" alt="Battaniye detay dokusu">
<p class="price">899,90 TL</p>
<p>${'Bu battaniye GOTS sertifikalı organik pamuktan üretilir. Bebek cildine uygun, nefes alan bir dokuya sahiptir. '.repeat(10)}</p>
<h2>Öne çıkan özellikler</h2>
<ul><li>%100 organik pamuk</li><li>90×120 cm</li><li>Makinede 30°C yıkanabilir</li><li>Türkiye'de üretildi</li></ul>
<h2>Teknik özellikler</h2>
<table><tr><th>Malzeme</th><td>Organik pamuk</td></tr><tr><th>Boyut</th><td>90×120 cm</td></tr><tr><th>Ağırlık</th><td>450 g</td></tr><tr><th>Yıkama</th><td>30°C</td></tr></table>
<h2>Hangi yaş için uygun?</h2><p>Yeni doğandan 3 yaşa kadar kullanılabilir.</p>
<h2>Nasıl yıkanır?</h2><p>Makinede 30°C hassas programda yıkayın.</p>
<p>126 yorum</p>
</main>
<footer><p>© Good Store</p></footer>
</body></html>`;

export const POOR_HOME = `<!doctype html>
<html>
<head>
<title>Shop</title>
<meta name="robots" content="noindex, nofollow">
</head>
<body>
<div id="root"></div>
<noscript>You need to enable JavaScript to run this app.</noscript>
<script src="/static/js/main.js"></script>
${'<script>window.__DATA__=' + JSON.stringify({ pad: 'x'.repeat(40_000) }) + ';</script>'}
</body></html>`;

export const POOR_PRODUCT = `<!doctype html>
<html>
<head><title>Product</title></head>
<body>
<header><nav>${'<a href="/c/x">Kategori</a>'.repeat(30)}</nav></header>
<div id="app">
<h1>Ürün</h1><h1>İkinci başlık</h1>
<img src="/a.jpg"><img src="/b.jpg">
<p>Harika ürün. Harika ürün. Harika ürün.</p>
</div>
<footer>${'<a href="/p/y">Footer link uzun metin burada tekrar ediyor</a>'.repeat(40)}</footer>
</body></html>`;
