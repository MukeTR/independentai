/**
 * Ticari niyetli izleme sorusu önerileri (Faz D) — LLM YOK, deterministik.
 *
 * Kaynak: bağlı katalog (kategori, ürün tipi, marka/vendor), Tenant/Brand adı ve Competitor tablosu.
 * Kalıplar TR/EN; kategori değerleri `normalize.ts` PROMPT_CATEGORY_VALUES ile uyumludur
 * (discovery | comparison | review | how_to), böylece öneri doğrudan `/api/prompts` ile eklenebilir.
 * Tekrarlar (Türkçe harf duyarsız) ve zaten izlenen sorular elenir; en fazla 30 öneri.
 */
import { prisma } from '../prisma';
import { foldKey, type PROMPT_CATEGORY_VALUES } from '../normalize';

export type PromptLanguage = 'tr' | 'en';
export type PromptCategory = (typeof PROMPT_CATEGORY_VALUES)[number];

export type PromptSuggestion = {
  text: string;
  language: PromptLanguage;
  category: PromptCategory;
  rationale: string;
};

export type CommercePromptInput = {
  brandName: string;
  /** Sıklığa göre azalan sıralı (ilk = en çok ürün) */
  categories: string[];
  productTypes: string[];
  vendors: string[];
  competitors: string[];
  /** Zaten izlenen sorular (elenir) */
  existing?: string[];
  languages?: PromptLanguage[];
  max?: number;
};

export const MAX_SUGGESTIONS = 30;

type Template = {
  category: PromptCategory;
  tr: (v: Vars) => string | null;
  en: (v: Vars) => string | null;
  rationale: string;
};
type Vars = { brand: string; category?: string; type?: string; competitor?: string };

const lower = (s: string) => s.toLocaleLowerCase('tr');

const TEMPLATES: Template[] = [
  {
    category: 'discovery',
    tr: (v) => (v.category ? `En iyi ${lower(v.category)} markaları hangileri?` : null),
    en: (v) => (v.category ? `What are the best ${lower(v.category)} brands?` : null),
    rationale: 'Kategori keşfi: AI "en iyi X" listelerinde anılıyor musunuz?',
  },
  {
    category: 'discovery',
    tr: (v) => (v.category ? `${cap(v.category)} nereden alınır?` : null),
    en: (v) => (v.category ? `Where should I buy ${lower(v.category)} online?` : null),
    rationale: 'Satın alma niyeti: AI mağaza önerirken sizi sayıyor mu?',
  },
  {
    category: 'review',
    tr: (v) => (v.type ? `${v.brand} ${lower(v.type)} yorumları nasıl?` : `${v.brand} yorumları nasıl?`),
    en: (v) => (v.type ? `${v.brand} ${lower(v.type)} reviews` : `${v.brand} reviews`),
    rationale: 'İtibar: AI markanız hakkında ne söylüyor?',
  },
  {
    category: 'comparison',
    tr: (v) => (v.competitor ? `${v.brand} vs ${v.competitor}: hangisi daha iyi?` : null),
    en: (v) => (v.competitor ? `${v.brand} vs ${v.competitor}: which is better?` : null),
    rationale: 'Rakip karşılaştırması: AI kimi tercih ediyor?',
  },
  {
    category: 'how_to',
    tr: (v) => (v.category ? `${cap(v.category)} nasıl seçilir?` : null),
    en: (v) => (v.category ? `How to choose ${lower(v.category)}?` : null),
    rationale: 'Rehber niyeti: karar aşamasındaki kullanıcıya kaynak gösteriliyor musunuz?',
  },
  {
    category: 'discovery',
    tr: (v) => (v.type ? `Uygun fiyatlı ${lower(v.type)} önerisi` : null),
    en: (v) => (v.type ? `Affordable ${lower(v.type)} recommendations` : null),
    rationale: 'Fiyat odaklı keşif.',
  },
  {
    category: 'review',
    tr: (v) => `${v.brand} güvenilir mi?`,
    en: (v) => `Is ${v.brand} a trustworthy store?`,
    rationale: 'Güven sorusu: halüsinasyon riski yüksek alan.',
  },
];

function cap(s: string): string {
  const t = s.trim();
  return t ? t.charAt(0).toLocaleUpperCase('tr') + t.slice(1) : t;
}

function clean(s: string): string {
  return s.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** Saf üretim: aynı girdi → aynı çıktı (sıra dahil). */
export function buildCommercePrompts(input: CommercePromptInput): PromptSuggestion[] {
  const brand = clean(input.brandName);
  if (!brand) return [];
  const languages = input.languages?.length ? input.languages : (['tr'] as PromptLanguage[]);
  const max = Math.min(input.max ?? MAX_SUGGESTIONS, MAX_SUGGESTIONS);
  const categories = uniqueClean(input.categories).slice(0, 8);
  const types = uniqueClean(input.productTypes).slice(0, 6);
  const competitors = uniqueClean(input.competitors).slice(0, 5);
  const seen = new Set((input.existing ?? []).map((e) => foldKey(e)));
  const out: PromptSuggestion[] = [];

  // Değişken kombinasyonları: kategori/tip/rakip eksenleri sırayla dolaşılır (round-robin) ki
  // ilk 30 öneri tek kategoriye yığılmasın.
  const varsList: Vars[] = [];
  const maxLen = Math.max(categories.length, types.length, competitors.length, 1);
  for (let i = 0; i < maxLen; i++) {
    varsList.push({ brand, category: categories[i], type: types[i], competitor: competitors[i] });
  }

  outer: for (let i = 0; i < varsList.length; i++) {
    const v = varsList[i]!;
    for (const t of TEMPLATES) {
      for (const lang of languages) {
        const text = clean((lang === 'tr' ? t.tr(v) : t.en(v)) ?? '');
        if (text.length < 5 || text.length > 500) continue;
        const key = foldKey(text);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ text, language: lang, category: t.category, rationale: t.rationale });
        if (out.length >= max) break outer;
      }
    }
  }
  return out;
}

function uniqueClean(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const c = clean(v ?? '');
    if (!c || c.length > 80) continue;
    const k = foldKey(c);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

function rankByCount(values: string[]): string[] {
  const counts = new Map<string, { label: string; n: number }>();
  for (const v of values) {
    const c = clean(v ?? '');
    if (!c) continue;
    const k = foldKey(c);
    const cur = counts.get(k);
    if (cur) cur.n += 1;
    else counts.set(k, { label: c, n: 1 });
  }
  return [...counts.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, 'tr')).map((x) => x.label);
}

export type CommercePromptSuggestions = {
  suggestions: PromptSuggestion[];
  source: {
    brandName: string;
    products: number;
    categories: number;
    productTypes: number;
    competitors: number;
    hasCatalog: boolean;
  };
};

export async function suggestCommercePrompts(
  tenantId: string,
  opts: { languages?: PromptLanguage[]; max?: number } = {},
): Promise<CommercePromptSuggestions> {
  const [tenant, ownBrand, competitors, prompts, products] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    prisma.brand.findFirst({ where: { tenantId, isOwn: true }, orderBy: { createdAt: 'asc' }, select: { name: true } }),
    prisma.competitor.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      select: { name: true },
      take: 20,
    }),
    prisma.prompt.findMany({ where: { tenantId }, select: { text: true } }),
    prisma.catalogProduct.findMany({
      where: { tenantId, deletedAt: null },
      select: { categories: true, productType: true, vendor: true },
      take: 3000,
      orderBy: { syncedAt: 'desc' },
    }),
  ]);
  const brandName = ownBrand?.name || tenant?.name || '';
  const categories = rankByCount(products.flatMap((p) => p.categories));
  const productTypes = rankByCount(products.map((p) => p.productType ?? ''));
  const vendors = rankByCount(products.map((p) => p.vendor ?? ''));
  const suggestions = buildCommercePrompts({
    brandName,
    categories: categories.length ? categories : productTypes,
    productTypes,
    vendors,
    competitors: competitors.map((c) => c.name),
    existing: prompts.map((p) => p.text),
    languages: opts.languages,
    max: opts.max,
  });
  return {
    suggestions,
    source: {
      brandName,
      products: products.length,
      categories: categories.length,
      productTypes: productTypes.length,
      competitors: competitors.length,
      hasCatalog: products.length > 0,
    },
  };
}
