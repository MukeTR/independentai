/**
 * SEO/GEO tutarlılık testi (spec §2 W8 / §7.2–7.6). DOM/DB/ağ yok. 9 kapsam:
 *  (1) sitemap STATIC_PAGES yolları → page.tsx var; (2) nav/footer/çözüm/araç/rank/registry(enabled)/sektör href hedefleri
 *  var, #anchor id grep'i; (3) sitemap `lastmod:` alanlarında `new Date(` yok; (4) POSTS(+BATCH_5) slug benzersiz ASCII
 *  kebab, publishedAt ≤ 2026-09-21; (5) SECTORS 9 + görsel + 5 soru/3 kontrol + featuredTool registry'de; (6) JSON-LD
 *  üreticileri geçerli, Organization @id = ORG_ID, aggregateRating hiçbir çıktıda yok; (7) yasak ifade taraması;
 *  (8) llms.txt gövdesinde her enabled /arac/<slug> ve /sektor/<slug>; (9) registry ↔ PUBLIC_SCAN_LIMITS birebir.
 * Registry "sayfa var" kontrolü `enabled` girişlerle sınırlı; `NIGHT_INTEGRATE=1` ile 18 aracın tamamı aranır.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { NAV_PANELS, SOLUTION_LINKS, ECOMMERCE_TOOL_LINKS, RANK_CHECKER_LINKS } from '@/components/nav-data';
import {
  breadcrumbJsonLd,
  faqJsonLd,
  organizationJsonLd,
  serviceJsonLd,
  softwareApplicationJsonLd,
  toolSoftwareApplicationJsonLd,
  webPageJsonLd,
} from '@/components/json-ld';
import { SECTORS } from '@/data/sectors';
import { POSTS } from '@/data/blog-posts';
import { BATCH_5 } from '@/data/blog-posts-batch-5';
import { ORG_ID, SITE_URL, WEBSITE_ID, sectorPath, toolPath } from '@/lib/seo';
import { TOOL_REGISTRY, enabledTools } from '@/lib/tool-registry';
import { PUBLIC_SCAN_LIMITS } from '@/server/commerce/public-scan';
import { buildLlmsTxt } from '@/app/llms.txt/route';

const ROOT = path.resolve(__dirname, '../..');
const APP = path.join(ROOT, 'src/app');
const GROUPS = ['(marketing)', '(home)', '(auth)', ''];
const FULL = process.env.NIGHT_INTEGRATE === '1';
const MAX_PUBLISHED = '2026-09-21';

const FORBIDDEN = [/garanti/i, /hükmed/i, /türkiye.?nin ilk/i, /\bdominate\b/i, /\b6 ay\b/i];

function pageFile(href: string): string | null {
  const clean = (href.split('#')[0] ?? '').split('?')[0]!.replace(/\/+$/, '') || '/';
  const segs = clean === '/' ? [] : clean.slice(1).split('/');
  for (const g of GROUPS) {
    const base = g ? path.join(APP, g) : APP;
    const direct = path.join(base, ...segs, 'page.tsx');
    if (existsSync(direct)) return direct;
    if (segs.length) {
      const parent = path.join(base, ...segs.slice(0, -1));
      if (existsSync(parent)) {
        const dyn = readdirSync(parent).find((d) => /^\[.+\]$/.test(d));
        if (dyn && existsSync(path.join(parent, dyn, 'page.tsx'))) return path.join(parent, dyn, 'page.tsx');
      }
    }
  }
  return null;
}

/** `id="x"` / `id='x'` / `id: 'x'` (veri) / `id={…}` + literal — sayfa ve aynı dizindeki tsx dosyalarında. */
function anchorFound(file: string, hash: string): boolean {
  const dir = path.dirname(file);
  const sources = readdirSync(dir)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => readFileSync(path.join(dir, f), 'utf8'));
  const esc = hash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const literal = new RegExp(`id=["']${esc}["']|id:\\s*["']${esc}["']|id=\\{["']${esc}["']\\}`);
  const dynamic = new RegExp(`id=\\{[^}]+\\}[\\s\\S]*?["']${esc}["']|["']${esc}["'][\\s\\S]*?id=\\{[^}]+\\}`);
  return sources.some((s) => literal.test(s) || dynamic.test(s));
}

function expectHref(href: string, label: string) {
  if (!href.startsWith('/')) return;
  const file = pageFile(href);
  expect(file, `${label}: sayfa yok → ${href}`).not.toBeNull();
  const hash = href.split('#')[1];
  if (hash && file) expect(anchorFound(file, hash), `${label}: anchor yok → ${href}`).toBe(true);
}

describe('(1) sitemap STATIC_PAGES → page.tsx', () => {
  const src = readFileSync(path.join(APP, 'sitemap.ts'), 'utf8');
  const paths = [...src.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]!);
  it('en az 30 yol ve her biri gerçek sayfa', () => {
    expect(paths.length).toBeGreaterThanOrEqual(30);
    for (const p of paths) expectHref(p, 'sitemap');
  });
});

describe('(2) nav / footer / araç / sektör href hedefleri', () => {
  it('NAV_PANELS ve featured', () => {
    for (const panel of NAV_PANELS) {
      for (const s of panel.sections) for (const l of s.links) expectHref(l.href, `nav ${panel.label} › ${s.heading}`);
      if (panel.featured) expectHref(panel.featured.href, `nav featured ${panel.label}`);
    }
  });
  it('FOOTER_LINKS (kaynak grep), SOLUTION/ECOMMERCE/RANK link listeleri', () => {
    const footer = readFileSync(path.join(ROOT, 'src/components/footer.tsx'), 'utf8');
    const hrefs = [...footer.matchAll(/href:\s*'([^']+)'/g)].map((m) => m[1]!);
    expect(hrefs.length).toBeGreaterThan(8);
    for (const h of hrefs) expectHref(h, 'footer');
    for (const l of [...SOLUTION_LINKS, ...ECOMMERCE_TOOL_LINKS, ...RANK_CHECKER_LINKS]) expectHref(l.href, 'link listesi');
  });
  it(`TOOL_REGISTRY ${FULL ? '(tam, NIGHT_INTEGRATE)' : '(yalnız enabled)'} → /arac/<slug>/page.tsx`, () => {
    const tools = FULL ? TOOL_REGISTRY : enabledTools();
    for (const t of tools) expectHref(toolPath(t.slug), `registry ${t.slug}`);
  });
  it('SECTORS → /sektor/[slug]/page.tsx ve /sektor dizini', () => {
    expectHref('/sektor', 'sektör dizini');
    for (const s of SECTORS) expectHref(sectorPath(s.slug), `sektör ${s.slug}`);
  });
});

describe('(3) sitemap lastmod sabit', () => {
  const src = readFileSync(path.join(APP, 'sitemap.ts'), 'utf8');
  it('`lastmod:` satırlarında new Date( yok; new Date() yalnız blog priority', () => {
    for (const line of src.split('\n')) {
      if (/\blastmod:/.test(line)) expect(line, line).not.toMatch(/new Date\(/);
    }
    const bare = src.match(/new Date\(\)/g) ?? [];
    expect(bare.length).toBeLessThanOrEqual(1);
  });
});

describe('(4) blog yazıları', () => {
  const all = [...POSTS, ...BATCH_5];
  it('slug benzersiz, ASCII kebab; publishedAt geçerli ve ≤ 2026-09-21', () => {
    const slugs = all.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const p of all) {
      expect(p.slug, p.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(p.publishedAt, p.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(new Date(p.publishedAt).getTime()), p.slug).toBe(false);
      expect(p.publishedAt <= MAX_PUBLISHED, `${p.slug}: ${p.publishedAt}`).toBe(true);
    }
  });
});

describe('(5) SECTORS bütünlüğü', () => {
  it('9 sektör, görsel dosyası, 5 soru / 3 kontrol, featuredTool registry’de', () => {
    expect(SECTORS).toHaveLength(9);
    for (const s of SECTORS) {
      expect(existsSync(path.join(ROOT, 'public', s.image)), s.image).toBe(true);
      expect(s.showcaseQuestions).toHaveLength(5);
      expect(s.checks).toHaveLength(3);
      expect(TOOL_REGISTRY.some((t) => t.slug === s.featuredTool), s.featuredTool).toBe(true);
      for (const c of s.checks) expect(TOOL_REGISTRY.some((t) => t.slug === c.tool), c.tool).toBe(true);
    }
  });
});

describe('(6) JSON-LD üreticileri', () => {
  const samples: Record<string, unknown>[] = [
    organizationJsonLd(),
    breadcrumbJsonLd([
      { name: 'Ana sayfa', href: '/' },
      { name: 'Sektörler', href: '/sektor' },
    ]),
    faqJsonLd([{ question: 'Soru?', answer: 'Cevap.' }]),
    webPageJsonLd({ path: '/sektor/klinik', name: 'Klinik', description: 'Açıklama', image: '/img/sektor/klinik.webp' }),
    serviceJsonLd({ path: '/sektor/klinik', name: 'Klinik', description: 'Açıklama', serviceType: 'Ölçüm', free: true }),
    toolSoftwareApplicationJsonLd({ path: '/arac/seo-karnesi', name: 'SEO karnesi', description: 'Açıklama' }),
    softwareApplicationJsonLd({ saasMonthlyTry: 2490, trialDays: 14 }),
  ];
  it('JSON.parse geçer, @context var, aggregateRating yok', () => {
    for (const d of samples) {
      const json = JSON.stringify(d);
      const parsed = JSON.parse(json) as Record<string, unknown>;
      expect(parsed['@context']).toBe('https://schema.org');
      expect(json).not.toMatch(/aggregateRating/);
    }
  });
  it('Organization @id = ORG_ID, name Yanıt, alternateName Independent AI; Service/WebPage/Tool Organization’a bağlı', () => {
    const org = organizationJsonLd();
    expect(org['@id']).toBe(ORG_ID);
    expect(org.name).toBe('Yanıt');
    expect(org.alternateName).toBe('Independent AI');
    const svc = samples[4]!;
    expect(svc.provider).toEqual({ '@id': ORG_ID });
    expect((svc.offers as { price: string }).price).toBe('0');
    const page = samples[3]!;
    expect(page.isPartOf).toEqual({ '@id': WEBSITE_ID });
    expect(page.url).toBe(`${SITE_URL}/sektor/klinik`);
    const tool = samples[5]!;
    expect(tool.applicationCategory).toBe('SEO');
    expect((tool.offers as { priceCurrency: string }).priceCurrency).toBe('TRY');
    const crumbs = samples[1]!.itemListElement as { item: string }[];
    expect(crumbs[1]!.item).toBe(`${SITE_URL}/sektor`);
  });
  it('json-ld.tsx kaynağında aggregateRating alanı yazılmıyor', () => {
    const src = readFileSync(path.join(ROOT, 'src/components/json-ld.tsx'), 'utf8');
    expect(src).not.toMatch(/aggregateRating:/);
  });
});

describe('(7) yasak ifadeler (pazarlama dışı yüzeyler)', () => {
  const llms = buildLlmsTxt();
  const sources = {
    'llms.txt': llms,
    'sitemap.ts': readFileSync(path.join(APP, 'sitemap.ts'), 'utf8'),
    'sectors.ts': readFileSync(path.join(ROOT, 'src/data/sectors.ts'), 'utf8'),
    'tool-registry.ts': readFileSync(path.join(ROOT, 'src/lib/tool-registry.ts'), 'utf8'),
    'robots.ts': readFileSync(path.join(APP, 'robots.ts'), 'utf8'),
  };
  it.each(Object.entries(sources))('%s', (_name, text) => {
    for (const re of FORBIDDEN) expect(text).not.toMatch(re);
  });
  it('llms.txt: "Independent AI" yalnız "eski adıyla" bağlamında; kaynaksız yüzde yok', () => {
    for (const m of llms.matchAll(/Independent AI/g)) {
      const before = llms.slice(Math.max(0, m.index! - 20), m.index);
      expect(before, before).toMatch(/eski adıyla\s*$/);
    }
    for (const line of llms.split('\n')) {
      if (/%\d/.test(line)) expect(line, line).toMatch(/TÜİK|Digital 2026|EY|TÜSİAD/);
    }
  });
  it('robots.ts: /rapor ve /share disallow edilmez', () => {
    expect(sources['robots.ts']).not.toMatch(/'\/rapor/);
    expect(sources['robots.ts']).not.toMatch(/'\/share/);
  });
});

describe('(8) llms.txt kapsamı', () => {
  const llms = buildLlmsTxt();
  it('her enabled araç ve her sektör linki gövdede; başlık ve bölümler', () => {
    expect(llms.startsWith('# Yanıt\n')).toBe(true);
    for (const t of enabledTools()) expect(llms, t.slug).toContain(`${SITE_URL}${toolPath(t.slug)}`);
    for (const s of SECTORS) expect(llms, s.slug).toContain(`${SITE_URL}${sectorPath(s.slug)}`);
    for (const h of ['## Önemli sayfalar', '## Ücretsiz araçlar', '## Sektörler', '## Ölçüm yöntemi', '## Sınırlamalar', '## YanitBot'])
      expect(llms).toContain(h);
    expect(llms).toContain('/docs#skorlar');
    expect(llms).toContain('/bot');
  });
  it('yalnız enabled araçlar listelenir (kapalı araç linki yok)', () => {
    for (const t of TOOL_REGISTRY.filter((x) => !x.enabled)) {
      expect(llms, t.slug).not.toContain(`${SITE_URL}${toolPath(t.slug)}`);
    }
  });
  it('route.ts force-static', () => {
    const src = readFileSync(path.join(APP, 'llms.txt/route.ts'), 'utf8');
    expect(src).toMatch(/export const dynamic = 'force-static'/);
  });
});

describe('(9) registry ↔ PUBLIC_SCAN_LIMITS', () => {
  it('kind kümeleri birebir', () => {
    const kinds = TOOL_REGISTRY.filter((t) => t.kind).map((t) => t.kind as string);
    expect(Object.keys(PUBLIC_SCAN_LIMITS).sort()).toEqual([...kinds].sort());
  });
});

describe('lib/seo yardımcıları', () => {
  it('sectorPath/toolPath göreli ve mutlak', () => {
    expect(sectorPath('klinik')).toBe('/sektor/klinik');
    expect(sectorPath('klinik', true)).toBe(`${SITE_URL}/sektor/klinik`);
    expect(toolPath('seo-karnesi')).toBe('/arac/seo-karnesi');
    expect(toolPath('seo-karnesi', true)).toBe(`${SITE_URL}/arac/seo-karnesi`);
  });
});
