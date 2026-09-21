/**
 * Blog batch 5 (spec §7.7): 6 yazı, ≥350 kelime, publishedAt 2026-09-15..21, yazar "Yanıt ekibi", kategori mevcut set,
 * gövde yalnız p/h2/h3/ul/quote/code, inline link YOK (markdown/HTML), `%\d` geçen blokta kaynak adı (TÜİK/Digital 2026/
 * EY/TÜSİAD), yasak ifade yok, eski model adı yok, slug mevcut POSTS ile çakışmıyor, sektör düz metin yolu geçerli.
 */
import { describe, expect, it } from 'vitest';
import { BATCH_5 } from '@/data/blog-posts-batch-5';
import { POSTS, getWordCount, type BlogCategory } from '@/data/blog-posts';
import { SECTORS } from '@/data/sectors';
import { TOOL_REGISTRY } from '@/lib/tool-registry';

const CATEGORIES: BlogCategory[] = ['GEO', 'AI', 'Pazarlama', 'Ürün', 'Teknik', 'Strateji', 'Sektör'];
const EXPECTED: Record<string, BlogCategory> = {
  'whatsapp-link-onizlemesi-bos-gorunuyor': 'Pazarlama',
  'musteriniz-chatgpt-ye-ne-soruyor-sektor-sektor': 'Strateji',
  'organization-localbusiness-schema-turkiye': 'GEO',
  'klinik-web-sitesi-ai-gorunurluk-kontrol-listesi': 'Sektör',
  'www-https-yonlendirme-zinciri-tek-adres': 'Teknik',
  'guvenlik-basliklari-kobi-rehberi': 'Teknik',
};
const SOURCE = /TÜİK|Digital 2026|EY|TÜSİAD/;
const FORBIDDEN = [/garanti/i, /en iyi/i, /türkiye.?nin ilk/i, /hükmed/i, /\bdominate\b/i];
const STALE_MODELS = [/gemini[- ]?1\.5/i, /gemini[- ]?2\.0/i, /gpt-?3\.5/i, /claude[- ]?(2|3|3\.5)\b/i, /\bbard\b/i];

function blocks(post: (typeof BATCH_5)[number]): string[] {
  return post.body.flatMap((b) => (b.type === 'ul' ? b.items : [b.text]));
}

describe('BATCH_5', () => {
  it('6 yazı; slug/kategori tablosu spec §7.7 ile aynı; mevcut POSTS ile çakışmaz', () => {
    expect(BATCH_5).toHaveLength(6);
    expect(BATCH_5.map((p) => p.slug)).toEqual(Object.keys(EXPECTED));
    const existing = new Set(POSTS.map((p) => p.slug));
    for (const p of BATCH_5) expect(existing.has(p.slug), p.slug).toBe(false);
  });

  it.each(BATCH_5.map((p) => [p.slug, p] as const))('%s: biçim kuralları', (slug, p) => {
    expect(p.category).toBe(EXPECTED[slug]);
    expect(CATEGORIES).toContain(p.category);
    expect(p.author.name).toBe('Yanıt ekibi');
    expect(p.publishedAt >= '2026-09-15' && p.publishedAt <= '2026-09-21', p.publishedAt).toBe(true);
    expect(getWordCount(p), `${slug} kelime`).toBeGreaterThanOrEqual(350);
    expect(p.readTimeMin).toBeGreaterThanOrEqual(3);
    expect(p.excerpt.length).toBeGreaterThan(60);
    expect(p.title.length).toBeLessThanOrEqual(90);
    for (const b of p.body) expect(['p', 'h2', 'h3', 'ul', 'quote', 'code']).toContain(b.type);
    expect(p.body.filter((b) => b.type === 'h2').length).toBeGreaterThanOrEqual(3);
  });

  it.each(BATCH_5.map((p) => [p.slug, p] as const))('%s: inline link yok, yüzde kaynaklı, yasak ifade yok', (_slug, p) => {
    for (const t of [p.title, p.excerpt, ...blocks(p)]) {
      expect(t).not.toMatch(/\]\(/); // markdown link
      expect(t).not.toMatch(/<a\s/i); // html link
      if (/%\s?\d/.test(t)) expect(t, t).toMatch(SOURCE);
      for (const re of FORBIDDEN) expect(t, `${re}`).not.toMatch(re);
      for (const re of STALE_MODELS) expect(t, `${re}`).not.toMatch(re);
    }
  });

  it('http(s) linki yalnız code bloklarında (gövde düz metin)', () => {
    for (const p of BATCH_5)
      for (const b of p.body) {
        if (b.type === 'code') continue;
        for (const t of b.type === 'ul' ? b.items : [b.text]) expect(t, p.slug).not.toMatch(/https?:\/\//);
      }
  });

  it('düz metin sektör/araç yolları gerçek slug’lara işaret eder', () => {
    const sectorSlugs = new Set(SECTORS.map((s) => s.slug));
    const toolSlugs = new Set(TOOL_REGISTRY.map((t) => t.slug));
    const bodyText = BATCH_5.map((p) => blocks(p).join('\n')).join('\n');
    for (const m of bodyText.matchAll(/\/sektor\/([a-z0-9-]+)/g)) expect(sectorSlugs.has(m[1]!), m[0]).toBe(true);
    for (const m of bodyText.matchAll(/\/arac\/([a-z0-9-]+)/g)) expect(toolSlugs.has(m[1]!), m[0]).toBe(true);
    // klinik yazısı sektör sayfasına düz metin bağlanır; her yazıda en az bir iç yol vardır
    expect(blocks(BATCH_5.find((p) => p.slug.startsWith('klinik'))!).join(' ')).toContain('/sektor/klinik');
    for (const p of BATCH_5) expect(blocks(p).join(' '), p.slug).toMatch(/\/(sektor|arac)(\/|\b)/);
  });

  it('TÜİK yıl eşlemesi doğru: %92,3 → 2026, %19,2 → 2025, %90,0 → 2026', () => {
    const all = BATCH_5.map((p) => blocks(p).join('\n')).join('\n');
    for (const line of all.split('\n')) {
      if (line.includes('%92,3')) expect(line).toMatch(/TÜİK 2026/);
      if (line.includes('%19,2')) expect(line).toMatch(/TÜİK 2025/);
      if (line.includes('%90,0')) expect(line).toMatch(/TÜİK 2026/);
      if (line.includes('%94,49')) expect(line).toMatch(/Digital 2026/);
    }
  });
});
