#!/usr/bin/env node
/**
 * Workflow'un ürettiği genişletilmiş body'leri veri dosyalarına uygular.
 * Kullanım: node apps/web/scripts/apply-expanded.mjs <expanded.json>
 *
 * <expanded.json> şekli: { expanded: [ { slug, file, readTimeMin, body:[...] }, ... ] }
 * Her post, dosyasında slug'ından bulunur; readTimeMin ve body dizisi (bracket-match ile)
 * değiştirilir. title/excerpt/publishedAt/author dokunulmaz.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('Kullanım: node apply-expanded.mjs <expanded.json>');
  process.exit(1);
}

const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
const expanded = data.expanded ?? data;

/** Agent çıktısındaki HTML entity'lerini çöz (örn. code bloğundaki '&gt;' -> '>'). */
function decodeEntities(v) {
  return String(v)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&'); // en son (çift-decode önlemek için)
}

/** Tek-tırnaklı JS string literal için kaçışlama (code blokları dahil çok-satırlı güvenli). */
function esc(v) {
  return decodeEntities(v)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n');
}

/** BlogBody[] -> TS dizi literali (mevcut dosya stiline yakın 6/8 boşluk girinti). */
function serializeBody(body) {
  const lines = body.map((b) => {
    if (b.type === 'ul') {
      const items = (b.items ?? []).map((it) => `        '${esc(it)}',`).join('\n');
      return `      { type: 'ul', items: [\n${items}\n      ] },`;
    }
    return `      { type: '${b.type}', text: '${esc(b.text ?? '')}' },`;
  });
  return `[\n${lines.join('\n')}\n    ]`;
}

/** src içinde slug'lı objenin body dizisinin [start,end) sınırlarını bracket-match ile bul. */
function findBodyArray(src, fromIdx) {
  const bodyKey = src.indexOf('body:', fromIdx);
  const arrStart = src.indexOf('[', bodyKey);
  let depth = 0;
  let inStr = false;
  let i = arrStart;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === "'") inStr = false;
    } else if (c === "'") {
      inStr = true;
    } else if (c === '[') {
      depth++;
    } else if (c === ']') {
      depth--;
      if (depth === 0) { i++; break; }
    }
  }
  return { arrStart, arrEnd: i };
}

// Aynı dosyadaki birden çok post için: dosyayı bir kez oku, hepsini uygula, bir kez yaz.
const byFile = new Map();
for (const post of expanded) {
  if (!byFile.has(post.file)) byFile.set(post.file, []);
  byFile.get(post.file).push(post);
}

let totalApplied = 0;
for (const [file, posts] of byFile) {
  let src = readFileSync(file, 'utf8');
  for (const post of posts) {
    const slugIdx = src.indexOf(`slug: '${post.slug}'`);
    if (slugIdx === -1) { console.error(`! slug bulunamadı: ${post.slug} (${file})`); continue; }
    const nextSlugIdx = src.indexOf('slug:', slugIdx + 6);
    const bound = nextSlugIdx === -1 ? src.length : nextSlugIdx;

    // readTimeMin güncelle (slug ile body arası)
    const segment = src.slice(slugIdx, bound);
    const newSegment = segment.replace(/readTimeMin:\s*\d+/, `readTimeMin: ${post.readTimeMin}`);
    src = src.slice(0, slugIdx) + newSegment + src.slice(bound);

    // body dizisini değiştir (güncel src üzerinde slug'ı yeniden bul)
    const slugIdx2 = src.indexOf(`slug: '${post.slug}'`);
    const { arrStart, arrEnd } = findBodyArray(src, slugIdx2);
    src = src.slice(0, arrStart) + serializeBody(post.body) + src.slice(arrEnd);

    const wc = post.body.reduce((a, b) => a + (b.type === 'ul'
      ? (b.items ?? []).join(' ').split(/\s+/).filter(Boolean).length
      : (b.text ?? '').split(/\s+/).filter(Boolean).length), 0);
    console.log(`✓ ${post.slug}  (~${wc} kelime, readTime ${post.readTimeMin})`);
    totalApplied++;
  }
  writeFileSync(file, src);
  console.log(`  → yazıldı: ${file}`);
}
console.log(`\nToplam ${totalApplied} yazı uygulandı.`);
