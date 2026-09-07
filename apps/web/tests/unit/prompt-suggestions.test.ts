import { describe, expect, it } from 'vitest';
import { buildCommercePrompts, MAX_SUGGESTIONS } from '@/server/commerce/prompt-suggestions';
import { PROMPT_CATEGORY_VALUES } from '@/server/normalize';

const INPUT = {
  brandName: 'Good Store',
  categories: ['Bebek Battaniyesi', 'Zıbın', 'Uyku Tulumu'],
  productTypes: ['battaniye', 'zıbın'],
  vendors: ['Good Store'],
  competitors: ['Rakip A', 'Rakip B'],
};

describe('buildCommercePrompts', () => {
  it('deterministik ve tekrar içermez; kategori değerleri normalize.ts ile uyumlu', () => {
    const a = buildCommercePrompts(INPUT);
    const b = buildCommercePrompts(INPUT);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(5);
    expect(a.length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
    const texts = a.map((s) => s.text.toLocaleLowerCase('tr'));
    expect(new Set(texts).size).toBe(texts.length);
    for (const s of a) {
      expect((PROMPT_CATEGORY_VALUES as readonly string[]).includes(s.category)).toBe(true);
      expect(s.text.length).toBeGreaterThanOrEqual(5);
      expect(s.text.length).toBeLessThanOrEqual(500);
      expect(s.rationale).toBeTruthy();
      expect(s.language).toBe('tr');
    }
  });

  it('kalıpları üretir: en iyi {kategori}, {marka} vs {rakip}, nereden alınır, yorumları', () => {
    const texts = buildCommercePrompts(INPUT).map((s) => s.text);
    expect(texts).toContain('En iyi bebek battaniyesi markaları hangileri?');
    expect(texts).toContain('Good Store vs Rakip A: hangisi daha iyi?');
    expect(texts).toContain('Bebek Battaniyesi nereden alınır?');
    expect(texts).toContain('Good Store battaniye yorumları nasıl?');
    expect(texts).toContain('Good Store güvenilir mi?');
  });

  it('zaten izlenen sorular (Türkçe harf duyarsız) elenir; boş marka → boş liste; max uygulanır', () => {
    const existing = ['EN İYİ BEBEK BATTANİYESİ MARKALARI HANGİLERİ?'];
    const out = buildCommercePrompts({ ...INPUT, existing });
    expect(out.map((s) => s.text)).not.toContain('En iyi bebek battaniyesi markaları hangileri?');
    expect(buildCommercePrompts({ ...INPUT, brandName: '  ' })).toEqual([]);
    expect(buildCommercePrompts({ ...INPUT, max: 4 })).toHaveLength(4);
    expect(buildCommercePrompts({ ...INPUT, max: 999 }).length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
  });

  it('TR+EN istenirse her iki dilde üretir ve round-robin ile kategoriye yığılmaz', () => {
    const out = buildCommercePrompts({ ...INPUT, languages: ['tr', 'en'] });
    expect(out.some((s) => s.language === 'en')).toBe(true);
    expect(out.some((s) => s.text === 'What are the best bebek battaniyesi brands?')).toBe(true);
    const first10 = out.slice(0, 10).map((s) => s.category);
    expect(new Set(first10).size).toBeGreaterThan(1);
  });

  it('katalog yoksa yalnızca marka/rakip kalıpları kalır; boş dizeler ve fazla uzun değerler atılır', () => {
    const out = buildCommercePrompts({
      brandName: 'Acme',
      categories: ['', ' ', 'x'.repeat(200)],
      productTypes: [],
      vendors: [],
      competitors: ['Zed'],
    });
    const texts = out.map((s) => s.text);
    expect(texts).toContain('Acme yorumları nasıl?');
    expect(texts).toContain('Acme vs Zed: hangisi daha iyi?');
    expect(texts.some((t) => /nereden alınır/.test(t))).toBe(false);
  });
});
