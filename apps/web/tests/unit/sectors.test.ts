import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SECTORS, SECTOR_BY_SLUG, sectorBySlug, sectorPath } from '@/data/sectors';
import { STATS, STAT_KEYS } from '@/data/stats';
import { SECTOR_SLUGS, TOOL_REGISTRY, toolBySlug } from '@/lib/tool-registry';

const ROOT = path.resolve(__dirname, '../..');
const FORBIDDEN_ALL = [/en iyi/i, /garanti/i, /türkiye.?nin ilk/i, /hükmed/i, /\bdominate\b/i];
const FORBIDDEN_REGULATED = [/sıralama/i, /hasta garantisi/i];

function textOf(s: (typeof SECTORS)[number]): string {
  return [
    s.name,
    s.headline,
    s.intro,
    s.imageAlt,
    ...s.showcaseQuestions,
    ...s.checks.map((c) => c.why),
    ...s.faq.flatMap((f) => [f.q, f.a]),
  ].join('\n');
}

describe('SECTORS', () => {
  it('9 sektör; slug listesi SECTOR_SLUGS ile birebir ve benzersiz', () => {
    expect(SECTORS).toHaveLength(9);
    expect(SECTORS.map((s) => s.slug).sort()).toEqual([...SECTOR_SLUGS].sort());
    expect(new Set(SECTORS.map((s) => s.slug)).size).toBe(9);
    for (const slug of SECTOR_SLUGS) expect(SECTOR_BY_SLUG[slug].slug).toBe(slug);
    expect(sectorBySlug('klinik')?.name).toBe('Klinik');
    expect(sectorBySlug('uzay')).toBeUndefined();
    expect(sectorPath('saas')).toBe('/sektor/saas');
  });

  it.each(SECTORS.map((s) => [s.slug, s] as const))('%s: alanlar, görsel, sorular, kontroller, SSS', (_slug, s) => {
    expect(s.headline).toMatch(/siteleri için yapay zekâ görünürlük testi$|için yapay zekâ görünürlük testi$/);
    expect(s.intro.length).toBeGreaterThan(80);
    expect(s.image).toBe(`/img/sektor/${s.slug}.webp`);
    expect(existsSync(path.join(ROOT, 'public', s.image)), s.image).toBe(true);
    expect(s.imageAlt.length).toBeGreaterThan(20);
    expect(s.showcaseQuestions).toHaveLength(5);
    for (const q of s.showcaseQuestions) expect(q.trim().length).toBeGreaterThan(15);
    expect(s.checks).toHaveLength(3);
    for (const c of s.checks) {
      expect(toolBySlug(c.tool), `${s.slug}: ${c.tool}`).toBeDefined();
      expect(c.why.length).toBeGreaterThan(30);
    }
    expect(new Set(s.checks.map((c) => c.tool)).size).toBe(3);
    expect(toolBySlug(s.featuredTool), s.featuredTool).toBeDefined();
    expect(s.faq).toHaveLength(5);
    for (const f of s.faq) {
      expect(f.q.trim().endsWith('?')).toBe(true);
      expect(f.a.length).toBeGreaterThan(40);
    }
    expect(STAT_KEYS).toContain(s.stat);
  });

  it('regulated: klinik ve hukuk-danismanlik true, diğerleri false', () => {
    const regulated = SECTORS.filter((s) => s.regulated).map((s) => s.slug);
    expect(regulated.sort()).toEqual(['hukuk-danismanlik', 'klinik']);
  });

  it('yasak ifadeler yok (tüm sektörler); regulated sektörlerde ek liste', () => {
    for (const s of SECTORS) {
      const t = textOf(s);
      for (const re of FORBIDDEN_ALL) expect(t, `${s.slug}: ${re}`).not.toMatch(re);
      if (s.regulated) for (const re of FORBIDDEN_REGULATED) expect(t, `${s.slug}: ${re}`).not.toMatch(re);
    }
  });

  it('istatistik cümlesi yalnız STATS sabitinden: sectors.ts kaynağında ham yüzde yok', () => {
    const src = readFileSync(path.join(ROOT, 'src/data/sectors.ts'), 'utf8');
    expect(src).not.toMatch(/%\s?\d/);
    expect(src).not.toMatch(/\d\s?%/);
  });

  it('sektör → araç eşlemesi spec §4 ile uyumlu', () => {
    const tools = (slug: string) => SECTOR_BY_SLUG[slug as (typeof SECTOR_SLUGS)[number]].checks.map((c) => c.tool);
    expect(tools('saas')).toEqual(['seo-karnesi', 'schema-denetimi', 'rakip-kiyas']);
    expect(tools('klinik')).toEqual(['schema-denetimi', 'guven-sinyalleri', 'guvenlik-basliklari']);
    expect(tools('hukuk-danismanlik')).toEqual(['guven-sinyalleri', 'schema-denetimi', 'seo-karnesi']);
    expect(tools('eticaret-altyapi')).toEqual([
      'e-ticaret-ai-gorunurluk-testi',
      'yonlendirme-zinciri',
      'robots-sitemap-kontrol',
    ]);
    expect(tools('egitim')).toEqual(['robots-sitemap-kontrol', 'kirik-link-bulucu', 'schema-denetimi']);
    expect(tools('gayrimenkul')).toEqual(['whatsapp-onizleme', 'kirik-link-bulucu', 'guven-sinyalleri']);
    expect(tools('turizm')).toEqual(['hreflang-kontrol', 'whatsapp-onizleme', 'robots-sitemap-kontrol']);
    expect(tools('b2b-uretici')).toEqual(['hreflang-kontrol', 'guvenlik-basliklari', 'schema-denetimi']);
    expect(tools('ajans').slice(0, 2)).toEqual(['rakip-kiyas', 'whatsapp-onizleme']);
    expect(SECTOR_BY_SLUG.ajans.partnerCta).toBe(true);
    for (const s of SECTORS) expect(s.featuredTool).toBe('musteriniz-nasil-soruyor');
  });
});

describe('STATS', () => {
  it('4 sabit; yıl/kaynak/URL/cümle tutarlı (TÜİK %92,3 = 2026, %19,2 = 2025)', () => {
    expect(STAT_KEYS).toHaveLength(4);
    expect(STATS.internetUsage.year).toBe(2026);
    expect(STATS.internetUsage.sentence).toMatch(/%92,3.*TÜİK 2026/);
    expect(STATS.genAiUsage.year).toBe(2025);
    expect(STATS.genAiUsage.sentence).toMatch(/%19,2.*TÜİK 2025/);
    expect(STATS.whatsappUsage.sentence).toMatch(/%90,0.*TÜİK 2026/);
    expect(STATS.chatgptShare.confidence).toBe('orta');
    expect(STATS.chatgptShare.sentence).toMatch(/%94,49.*Digital 2026/);
    for (const s of Object.values(STATS)) {
      expect(s.sourceUrl).toMatch(/^https:\/\//);
      expect(s.sentence).toContain(s.value);
      expect(s.sentence).toContain(String(s.year));
    }
  });
  it('registry: her sektör kontrol aracı gerçek bir kayıt (18 araç)', () => {
    expect(TOOL_REGISTRY.length).toBe(18);
  });
});
