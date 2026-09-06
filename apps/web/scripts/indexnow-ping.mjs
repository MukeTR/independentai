#!/usr/bin/env node
/**
 * IndexNow ping — Bing & Yandex'e URL'leri anlık bildirir (Google IndexNow kullanmaz).
 * Statik içerik olduğu için deploy sonrası bir kez (ya da yeni yazı ekleyince) çalıştırın:
 *
 *   node apps/web/scripts/indexnow-ping.mjs              # canlı sitemap'teki tüm URL'ler
 *   node apps/web/scripts/indexnow-ping.mjs https://independentai.space/blog/yeni-yazi
 *
 * Anahtar public/<key>.txt ile eşleşmeli (INDEXNOW_KEY, src/lib/seo.ts).
 */
const HOST = 'independentai.space';
const KEY = '392951a5a37d9cb5307632a96bcc596d';
const SITE = `https://${HOST}`;

async function getSitemapUrls() {
  const res = await fetch(`${SITE}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap alınamadı: ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => !u.includes('?')); // query-param URL'leri atla
}

async function main() {
  const args = process.argv.slice(2);
  const urlList = args.length ? args : await getSitemapUrls();
  console.log(`IndexNow: ${urlList.length} URL gönderiliyor → Bing/Yandex...`);

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: `${SITE}/${KEY}.txt`,
      urlList,
    }),
  });

  console.log(`IndexNow yanıt: ${res.status} ${res.statusText}`);
  if (res.status !== 200 && res.status !== 202) {
    console.log('Yanıt gövdesi:', await res.text());
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('IndexNow ping hatası:', e.message);
  process.exit(1);
});
