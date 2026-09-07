/**
 * Katalogdan doğrulanabilir marka gerçekleri (Faz D).
 *
 * Bağlı mağaza kataloğundan (CatalogProduct, deletedAt null) sayılabilir/ölçülebilir gerçekler
 * üretilir: ürün sayısı, kategoriler, fiyat aralığı, markalar, stok oranı, en yeni güncelleme.
 * Her gerçek kaynağını (source:'catalog'), zaman damgasını (asOf = son senkron) ve bağlantıyı taşır.
 *
 * BrandFact tablosuna YAZILMAZ; `combinedBrandFacts` manuel gerçeklerle çalışma zamanında birleştirir.
 * Böylece katalog değişince gerçekler kendiliğinden güncellenir ve kullanıcı manuel listesini
 * katalog gürültüsüyle kirletmez.
 */
import { prisma } from '../prisma';

export type ProductFactInput = {
  title: string;
  categories: string[];
  productType: string | null;
  vendor: string | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';
  sourceUpdatedAt: Date | null;
  syncedAt: Date;
};

export type CatalogFact = {
  fact: string;
  source: 'catalog';
  /** Son senkron zamanı (ISO) */
  asOf: string;
  connectionId: string;
};

export type BrandFactEntry = {
  id?: string;
  fact: string;
  source: 'manual' | 'catalog';
  asOf: string | null;
  connectionId?: string;
};

export type CombinedBrandFacts = {
  facts: BrandFactEntry[];
  manualCount: number;
  catalogCount: number;
  /** Katalog gerçeklerinin en yeni asOf değeri */
  catalogAsOf: string | null;
};

const MAX_LIST = 10;

const nf = (n: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(n);

function topCounts(values: string[], max = MAX_LIST): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    const k = v.trim();
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'tr'))
    .slice(0, max);
}

/** Saf: ürün listesi → gerçekler. Deterministik sıralama; boş katalogda boş dizi. */
export function factsFromProducts(
  products: ProductFactInput[],
  meta: { connectionId: string; storeDomain?: string | null; providerLabel?: string | null },
): CatalogFact[] {
  if (products.length === 0) return [];
  const asOfDate = products.reduce((m, p) => (p.syncedAt > m ? p.syncedAt : m), products[0]!.syncedAt);
  const asOf = asOfDate.toISOString();
  const store = meta.storeDomain ? ` (${meta.storeDomain})` : '';
  const mk = (fact: string): CatalogFact => ({ fact, source: 'catalog', asOf, connectionId: meta.connectionId });
  const out: CatalogFact[] = [];

  out.push(mk(`Mağaza kataloğunda${store} ${nf(products.length)} yayında ürün var.`));

  const cats = topCounts(
    products.flatMap((p) => (p.categories.length ? p.categories : p.productType ? [p.productType] : [])),
  );
  if (cats.length) {
    const total = new Set(
      products.flatMap((p) => (p.categories.length ? p.categories : p.productType ? [p.productType] : [])),
    ).size;
    out.push(
      mk(
        `Ürün kategorileri${total > cats.length ? ` (ilk ${cats.length}/${total})` : ''}: ${cats.map((c) => `${c.value} (${c.count})`).join(', ')}.`,
      ),
    );
  }

  const priced = products.filter((p) => p.priceMin != null && p.priceMin > 0);
  if (priced.length) {
    const currencies = topCounts(priced.map((p) => p.currency ?? ''));
    const currency = currencies[0]?.value || '';
    const same = priced.filter((p) => (p.currency ?? '') === currency);
    const min = Math.min(...same.map((p) => p.priceMin as number));
    const max = Math.max(...same.map((p) => Math.max(p.priceMax ?? 0, p.priceMin as number)));
    out.push(
      mk(
        `Fiyat aralığı: ${nf(min)} – ${nf(max)} ${currency || '(para birimi belirsiz)'} (${nf(same.length)} fiyatlı ürün).`,
      ),
    );
  }

  const vendors = topCounts(products.map((p) => p.vendor ?? ''));
  if (vendors.length) {
    out.push(
      mk(
        `Satılan markalar/tedarikçiler${vendors.length >= MAX_LIST ? ' (ilk 10)' : ''}: ${vendors.map((v) => v.value).join(', ')}.`,
      ),
    );
  }

  const known = products.filter((p) => p.availability !== 'UNKNOWN');
  if (known.length) {
    const inStock = known.filter((p) => p.availability === 'IN_STOCK').length;
    out.push(
      mk(`Stok durumu bilinen ${nf(known.length)} ürünün %${Math.round((inStock / known.length) * 100)}'i stokta.`),
    );
  }

  const newest = products.reduce<Date | null>(
    (m, p) => (p.sourceUpdatedAt && (!m || p.sourceUpdatedAt > m) ? p.sourceUpdatedAt : m),
    null,
  );
  if (newest) out.push(mk(`Katalogdaki en yeni ürün güncellemesi: ${newest.toISOString().slice(0, 10)}.`));

  return out;
}

const SAMPLE = 3000;

/** Tenant'ın tüm bağlantıları için katalog gerçekleri (bağlantı başına ayrı liste, birleştirilmiş). */
export async function catalogFactsForTenant(tenantId: string): Promise<CatalogFact[]> {
  const conns = await prisma.storeConnection.findMany({
    where: { tenantId, status: { not: 'DISCONNECTED' } },
    select: { id: true, storeDomain: true, provider: true },
    orderBy: { createdAt: 'asc' },
  });
  if (conns.length === 0) return [];
  const out: CatalogFact[] = [];
  for (const c of conns) {
    const rows = await prisma.catalogProduct.findMany({
      where: { connectionId: c.id, tenantId, deletedAt: null },
      orderBy: { syncedAt: 'desc' },
      take: SAMPLE,
      select: {
        title: true,
        categories: true,
        productType: true,
        vendor: true,
        priceMin: true,
        priceMax: true,
        currency: true,
        availability: true,
        sourceUpdatedAt: true,
        syncedAt: true,
      },
    });
    out.push(
      ...factsFromProducts(
        rows.map((r) => ({
          ...r,
          priceMin: r.priceMin == null ? null : Number(r.priceMin),
          priceMax: r.priceMax == null ? null : Number(r.priceMax),
        })),
        { connectionId: c.id, storeDomain: c.storeDomain, providerLabel: c.provider },
      ),
    );
  }
  return out;
}

/** Manuel BrandFact + katalog gerçekleri (çalışma zamanı birleşimi; DB'ye yazmaz). */
export async function combinedBrandFacts(tenantId: string): Promise<CombinedBrandFacts> {
  const [manual, catalog] = await Promise.all([
    prisma.brandFact.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
    catalogFactsForTenant(tenantId).catch(() => [] as CatalogFact[]),
  ]);
  const facts: BrandFactEntry[] = [
    ...manual.map((f) => ({ id: f.id, fact: f.fact, source: 'manual' as const, asOf: f.createdAt.toISOString() })),
    ...catalog.map((f) => ({ fact: f.fact, source: 'catalog' as const, asOf: f.asOf, connectionId: f.connectionId })),
  ];
  const catalogAsOf = catalog.reduce<string | null>((m, f) => (!m || f.asOf > m ? f.asOf : m), null);
  return { facts, manualCount: manual.length, catalogCount: catalog.length, catalogAsOf };
}
