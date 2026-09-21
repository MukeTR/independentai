import { describe, expect, it } from 'vitest';
import { factsFromProducts, type ProductFactInput } from '@/server/commerce/brand-facts';

const syncedAt = new Date('2026-09-05T08:00:00.000Z');
const later = new Date('2026-09-06T08:00:00.000Z');

function p(over: Partial<ProductFactInput> = {}): ProductFactInput {
  return {
    title: 'Ürün',
    categories: ['Bebek'],
    productType: 'Battaniye',
    vendor: 'Good Store',
    priceMin: 100,
    priceMax: 120,
    currency: 'TRY',
    availability: 'IN_STOCK',
    sourceUpdatedAt: new Date('2026-08-01T00:00:00.000Z'),
    syncedAt,
    ...over,
  };
}

describe('factsFromProducts', () => {
  it('boş katalog → boş liste', () => {
    expect(factsFromProducts([], { connectionId: 'c1' })).toEqual([]);
  });

  it('sayı, kategori, fiyat aralığı, marka, stok oranı ve en yeni güncelleme gerçeklerini üretir', () => {
    const products = [
      p(),
      p({ categories: ['Bebek', 'Hediye'], priceMin: 50, priceMax: 60 }),
      p({
        categories: [],
        productType: 'Zıbın',
        priceMin: 900,
        priceMax: null,
        availability: 'OUT_OF_STOCK',
        vendor: 'Other',
        syncedAt: later,
        sourceUpdatedAt: new Date('2026-09-01T00:00:00.000Z'),
      }),
      p({ availability: 'UNKNOWN', priceMin: null, priceMax: null }),
    ];
    const facts = factsFromProducts(products, { connectionId: 'c1', storeDomain: 'good-store.myshopify.com' });
    const texts = facts.map((f) => f.fact);
    expect(texts[0]).toBe('Mağaza kataloğunda (good-store.myshopify.com) 4 yayında ürün var.');
    expect(texts.find((t) => t.startsWith('Ürün kategorileri'))).toBe(
      'Ürün kategorileri: Bebek (3), Hediye (1), Zıbın (1).',
    );
    expect(texts.find((t) => t.startsWith('Fiyat aralığı'))).toBe('Fiyat aralığı: 50 – 900 TRY (3 fiyatlı ürün).');
    expect(texts.find((t) => t.startsWith('Satılan markalar'))).toBe(
      'Satılan markalar/tedarikçiler: Good Store, Other.',
    );
    expect(texts.find((t) => t.startsWith('Stok durumu'))).toBe("Stok durumu bilinen 3 ürünün %67'i stokta.");
    expect(texts.find((t) => t.startsWith('Katalogdaki en yeni'))).toBe(
      'Katalogdaki en yeni ürün güncellemesi: 2026-09-01.',
    );
    for (const f of facts) {
      expect(f.source).toBe('catalog');
      expect(f.connectionId).toBe('c1');
      expect(f.asOf).toBe(later.toISOString()); // en yeni senkron zamanı
    }
  });

  it('deterministik: aynı girdi aynı çıktı; sıralama sayıya sonra ada göre', () => {
    const products = [p({ categories: ['B'] }), p({ categories: ['A'] }), p({ categories: ['B'] })];
    const a = factsFromProducts(products, { connectionId: 'c' });
    const b = factsFromProducts([...products], { connectionId: 'c' });
    expect(a).toEqual(b);
    expect(a.find((f) => f.fact.startsWith('Ürün kategorileri'))?.fact).toBe('Ürün kategorileri: B (2), A (1).');
  });

  it('fiyatı olmayan katalogda fiyat gerçeği üretmez; para birimi karışıksa en yaygını kullanır', () => {
    const noPrice = factsFromProducts([p({ priceMin: null, priceMax: null })], { connectionId: 'c' });
    expect(noPrice.some((f) => f.fact.startsWith('Fiyat aralığı'))).toBe(false);
    const mixed = factsFromProducts(
      [
        p({ currency: 'USD', priceMin: 10, priceMax: 10 }),
        p({ currency: 'TRY', priceMin: 100, priceMax: 200 }),
        p({ currency: 'TRY', priceMin: 300, priceMax: 300 }),
      ],
      { connectionId: 'c' },
    );
    expect(mixed.find((f) => f.fact.startsWith('Fiyat aralığı'))?.fact).toBe(
      'Fiyat aralığı: 100 – 300 TRY (2 fiyatlı ürün).',
    );
  });
});
