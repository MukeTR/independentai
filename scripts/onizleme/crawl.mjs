/**
 * Yanıt — statik anlık görüntü toplayıcı.
 *
 * Çalışan bir Next sunucusundan (varsayılan http://localhost:3311) herkese açık sayfaları
 * ve bağlı varlıkları indirip `dist/` altına düz dosya olarak yazar. Amaç: BACKEND BAĞLAMADAN
 * Cloudflare Workers üzerinde yayımlanabilecek bir vitrin kopyası üretmek.
 *
 * Ne YAPMAZ: API rotalarını, oturum gerektiren sayfaları (admin, dashboard, giriş) ve
 * form gönderimlerini kopyalamaz. Bunlar kasıtlı olarak dışarıda; Worker /api/* için
 * "bu önizlemede ölçüm çalışmıyor" cevabı döner.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.BASE ?? 'http://localhost:3311';
const OUT = process.env.OUT ?? path.resolve('dist');
const CONCURRENCY = 6;

/** Oturum gerektiren ya da anlık görüntüde anlamsız olan yollar. */
const SKIP = [
  /^\/api\//,
  /^\/admin(\/|$)/,
  /^\/dashboard(\/|$)/,
  /^\/agency(\/|$)/,
  /^\/login$/,
  /^\/register$/,
  /^\/logout$/,
  /^\/rapor\//,
  /^\/_next\/webpack-hmr/,
  /^\/_next\/image/, // sunucu tarafı iyileştirici; statik kopyada yok
];

const skip = (p) => SKIP.some((re) => re.test(p));

const pages = new Set();
const assets = new Set();
const done = new Set();
const failed = [];

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'YanitSnapshot/1.0' }, redirect: 'follow' });
  return res;
}

/** sitemap.xml herkese açık sayfa listesinin tek kaynağı. */
async function seedFromSitemap() {
  const res = await get(`${BASE}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap alınamadı: ${res.status}`);
  const xml = await res.text();
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    let p;
    try {
      p = new URL(m[1]).pathname;
    } catch {
      continue;
    }
    if (!skip(p)) pages.add(p);
  }
  // sitemap'te olmayan ama gerekli olanlar
  // sitemap.xml'in KENDİSİ de kaydedilmeli: robots.txt onu işaret ediyor, yoksa 404 olur.
  for (const p of ['/', '/llms.txt', '/sitemap.xml', '/opengraph-image']) pages.add(p);
}

/** HTML, CSS ve JS içinden yerel varlık yollarını toplar. */
function collectRefs(text, fromPath) {
  const out = new Set();
  const push = (raw) => {
    if (!raw) return;
    let v = raw.trim().replace(/^['"]|['"]$/g, '');
    if (!v || v.startsWith('data:') || v.startsWith('#') || v.startsWith('mailto:') || v.startsWith('tel:')) return;
    // Kendi origin'imizdeki mutlak adresleri yola indir
    if (v.startsWith('http')) {
      try {
        const u = new URL(v);
        if (u.origin !== BASE) return; // dış kaynakları indirmiyoruz
        v = u.pathname;
      } catch {
        return;
      }
    }
    if (!v.startsWith('/')) {
      // göreli yol: bulunduğu dizine göre çöz
      const dir = fromPath.endsWith('/') ? fromPath : path.posix.dirname(fromPath) + '/';
      v = path.posix.resolve(dir, v);
    }
    v = v.split('#')[0];
    // Sorgu dizesi statik kopyada anlamsız: `/contact?konu=satis` ayrı bir dosya OLMAMALI,
    // aynı sayfanın aynı kopyasıdır. Sorguyu at, yolu tekilleştir.
    v = v.split('?')[0];
    if (!v || skip(v)) return;
    out.add(v);
  };

  for (const m of text.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/g)) push(m[1]);
  // srcset: "a.webp 1x, b.webp 2x" — virgülle ayrılır, her parçanın ilk alanı adrestir
  for (const m of text.matchAll(/srcset\s*=\s*["']([^"']+)["']/g))
    for (const part of m[1].split(',')) push(part.trim().split(/\s+/)[0]);
  for (const m of text.matchAll(/url\(\s*([^)]+?)\s*\)/g)) push(m[1]);
  // Next'in bölüm listeleri: "static/chunks/....js"
  for (const m of text.matchAll(/["'](\/_next\/[^"']+?)["']/g)) push(m[1]);
  return out;
}

const isPageLike = (p) => !/\.[a-z0-9]{1,6}$/i.test(p) || p.endsWith('.txt') || p.endsWith('.xml');

async function savePage(p, body, contentType) {
  // /about → dist/about/index.html ; /llms.txt → dist/llms.txt
  let rel;
  if (/\.[a-z0-9]{1,6}$/i.test(p)) rel = p.slice(1);
  else rel = path.posix.join(p.slice(1), 'index.html');
  if (rel === '' || rel === 'index.html') rel = 'index.html';
  const full = path.join(OUT, rel);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body);
  return rel;
}

async function fetchOne(p) {
  if (done.has(p)) return;
  done.add(p);
  let res;
  try {
    res = await get(BASE + p);
  } catch (err) {
    failed.push(`${p} → ${err.message}`);
    return;
  }
  if (!res.ok) {
    failed.push(`${p} → HTTP ${res.status}`);
    return;
  }
  const ct = res.headers.get('content-type') ?? '';
  const textual = /text\/|json|javascript|xml|svg/.test(ct);
  const buf = Buffer.from(await res.arrayBuffer());
  await savePage(p, buf, ct);

  if (textual) {
    const text = buf.toString('utf8');
    for (const ref of collectRefs(text, p)) {
      if (done.has(ref)) continue;
      if (isPageLike(ref) && pages.has(ref)) continue; // zaten sayfa kuyruğunda
      assets.add(ref);
    }
  }
}

async function drain(queue, label) {
  let i = 0;
  const items = [...queue];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fetchOne(items[idx]);
      if (idx % 25 === 0) process.stdout.write(`\r${label}: ${idx + 1}/${items.length}   `);
    }
  });
  await Promise.all(workers);
  process.stdout.write(`\r${label}: ${items.length}/${items.length}   \n`);
}

await mkdir(OUT, { recursive: true });
await seedFromSitemap();
console.log(`sitemap'ten ${pages.size} sayfa`);

await drain(pages, 'sayfalar');

// Sayfalardan çıkan varlıkları çek; onların içinden çıkanları da (font, ikinci seviye chunk)
for (let round = 1; round <= 3; round++) {
  const pending = [...assets].filter((a) => !done.has(a));
  if (pending.length === 0) break;
  await drain(pending, `varlıklar tur ${round}`);
}

// ── Anlık görüntüye özel ek dosyalar ───────────────────────────────────────
// Cloudflare statik dosyaları Worker'a uğramadan servis ettiği için başlıklar `_headers`'ta.
await writeFile(
  path.join(OUT, '_headers'),
  `# Güvenlik başlıkları. Dizine ekleme kararı BURADA VERİLMEZ: önizleme adresi ile marka
# alan adı farklı davranmalı, bunu Worker robots.txt üzerinden yapar.
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
`,
);
// Vercel Analytics betiği bu barındırmada yok; boş dosya 404 gürültüsünü keser.
await mkdir(path.join(OUT, '_vercel/insights'), { recursive: true });
await writeFile(
  path.join(OUT, '_vercel/insights/script.js'),
  '// Vitrin önizlemesinde analitik yok.\n',
);

console.log(`\nindirilen toplam: ${done.size}`);
if (failed.length) {
  console.log(`başarısız: ${failed.length}`);
  for (const f of failed.slice(0, 25)) console.log('  ' + f);
}
