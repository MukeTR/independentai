/**
 * Schema denetimi (`/arac/schema-denetimi`, SCHEMA_AUDIT) — JSON-LD sözdizimi, Organization/LocalBusiness kimliği,
 * sayfa tipi şemalarının Google zorunlu/önerilen alanları, tutarlılık ve zenginlik. LLM yok; 2 istek (sayfa +
 * iletişim/hakkımızda adayı — Organization çoğu sitede oradadır).
 *  - Sözdizimi: her <script type="application/ld+json"> bloğu ayrı JSON.parse; hata = fail. @context yok = fail.
 *  - Microdata (`itemtype=`) yalnız sayılır: "algılandı, denetlenmedi" bilgi notu.
 *  - `aggregateRating` varsa puan düşürmez; "gerçek yorum kanıtı gerekir" bilgi notu.
 *  - Şablon: sektöre göre alt tip, sayfadan okunan ad/URL/telefon/logo dışında `[DOLDURUN]` (schema-requirements.ts).
 */
import { hasType, hostnameOf, openTags, str, tagBodies, type JsonLdNode } from '../commerce/html-analysis';
import type { ScanBudget } from './budget';
import { defineSiteTool } from './core';
import { collectPageArtifact, parsePage, SCAN_HEADERS, type PageArtifact } from './fetch-page';
import { hasOrganizationSchema, jsonLdTypesOf, ORGANIZATION_TYPES } from './quick-checks';
import {
  LOCAL_BUSINESS_EXTRA,
  ORGANIZATION_REQUIREMENTS,
  requirementForType,
  schemaTemplate,
  type SchemaTemplate,
  type TypeRequirement,
} from './schema-requirements';
import { isSectorSlug } from '@/lib/tool-registry';

export type SchemaAxis = 'syntax' | 'organization' | 'pageType' | 'consistency' | 'richness';

export const SCHEMA_AXES = [
  { key: 'syntax' as const, label: 'Sözdizimi', weight: 20, description: 'JSON-LD blokları geçerli mi, @context var mı' },
  {
    key: 'organization' as const,
    label: 'Organization / LocalBusiness',
    weight: 30,
    description: 'Kim olduğunuzu söyleyen düğüm: name, url, logo, telephone, address, sameAs',
  },
  {
    key: 'pageType' as const,
    label: 'Sayfa tipi',
    weight: 25,
    description: 'Product / Article / FAQPage / Course / Hotel … için Google zorunlu ve önerilen alanlar',
  },
  { key: 'consistency' as const, label: 'Tutarlılık', weight: 15, description: 'Çelişen Organization adları, farklı host’a işaret eden url' },
  { key: 'richness' as const, label: 'Zenginlik', weight: 10, description: 'WebSite, BreadcrumbList, sameAs, birden çok tip' },
];

export type SchemaArtifacts = { page: PageArtifact; secondary: PageArtifact | null };

export type SchemaMissing = { type: string; required: string[]; recommended: string[] };

export type SchemaExtra = {
  blocks: number;
  parseErrors: number;
  types: string[];
  orgType: string | null;
  orgName: string | null;
  missing: SchemaMissing[];
  microdataCount: number;
  hasAggregateRating: boolean;
  secondaryUrl: string | null;
  template: SchemaTemplate;
  richResultTypes: string[];
};

const SECONDARY_LINK = /\b(iletisim|iletişim|contact|hakkimizda|hakkımızda|about|kurumsal|biz-kimiz)\b/i;

/** Ham JSON-LD blokları: parse sonucu + hata sayısı (extractJsonLd hataları sessizce atlar; burada sayılır). */
export function parseJsonLdBlocks(html: string): { blocks: number; errors: number; nodes: JsonLdNode[]; noContext: number } {
  const bodies = tagBodies(html, 'script', { filter: (a) => /type=["']application\/ld\+json["']/i.test(a) });
  let errors = 0;
  let noContext = 0;
  const nodes: JsonLdNode[] = [];
  for (const b of bodies) {
    const raw = b.body.trim();
    if (!raw) {
      errors += 1;
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      try {
        parsed = JSON.parse(raw.replace(/^<!--|-->$/g, '').replace(/^\/\/<!\[CDATA\[|\/\/\]\]>$/g, ''));
      } catch {
        errors += 1;
        continue;
      }
    }
    const roots = Array.isArray(parsed) ? parsed : [parsed];
    for (const r of roots) {
      if (!r || typeof r !== 'object') {
        errors += 1;
        continue;
      }
      const o = r as JsonLdNode;
      if (!('@context' in o)) noContext += 1;
      if (Array.isArray(o['@graph'])) {
        for (const g of o['@graph'] as unknown[]) if (g && typeof g === 'object') nodes.push(g as JsonLdNode);
        if (o['@type']) nodes.push(o);
      } else nodes.push(o);
    }
  }
  return { blocks: bodies.length, errors, nodes, noContext };
}

function get(node: JsonLdNode, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = node;
  for (const p of parts) {
    if (cur == null) return undefined;
    if (Array.isArray(cur)) cur = cur[0];
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as JsonLdNode)[p];
  }
  return cur;
}

function present(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0 && v.some(present);
  if (typeof v === 'object') return Object.keys(v as object).length > 0;
  return true;
}

function orgNodes(nodes: JsonLdNode[]): JsonLdNode[] {
  return nodes.filter((n) => ORGANIZATION_TYPES.some((t) => hasType(n, t)));
}

function typeOf(n: JsonLdNode): string {
  const t = n['@type'];
  return str(Array.isArray(t) ? t[0] : t).replace(/^https?:\/\/schema\.org\//, '');
}

function hasAggregateRating(nodes: JsonLdNode[]): boolean {
  const seen = new Set<unknown>();
  const walk = (v: unknown, d: number): boolean => {
    if (d < 0 || !v || typeof v !== 'object' || seen.has(v)) return false;
    seen.add(v);
    if (Array.isArray(v)) return v.some((x) => walk(x, d));
    const o = v as JsonLdNode;
    if ('aggregateRating' in o || hasType(o, 'AggregateRating')) return true;
    return Object.values(o).some((x) => walk(x, d - 1));
  };
  return walk(nodes, 4);
}

export function microdataCount(html: string): number {
  return openTags(html, 'div').filter((t) => /\bitemtype=/i.test(t.attrs)).length +
    openTags(html, 'span').filter((t) => /\bitemtype=/i.test(t.attrs)).length +
    openTags(html, 'section').filter((t) => /\bitemtype=/i.test(t.attrs)).length +
    openTags(html, 'article').filter((t) => /\bitemtype=/i.test(t.attrs)).length;
}

async function fetchSecondary(page: PageArtifact, budget: ScanBudget): Promise<PageArtifact | null> {
  if (budget.exhausted) return null;
  const candidate = page.links.find((l) => l.internal && SECONDARY_LINK.test(l.url) && !/[#?]/.test(l.url));
  if (!candidate) return null;
  const a = await budget.fetch(candidate.url, 8_000, { headers: SCAN_HEADERS });
  return parsePage(candidate.url, a);
}

export const schemaAuditTool = defineSiteTool<SchemaAxis, SchemaArtifacts, SchemaExtra>({
  kind: 'SCHEMA_AUDIT',
  axes: SCHEMA_AXES,
  collect: async (url, budget) => {
    const page = await collectPageArtifact(url, budget);
    const secondary = page.reachable ? await fetchSecondary(page, budget) : null;
    return { page, secondary };
  },
  analyze: ({ page, secondary }, s, ctx) => {
    const html = page.html;
    const primary = parseJsonLdBlocks(html);
    const sec = secondary?.reachable ? parseJsonLdBlocks(secondary.html) : null;
    const allNodes = [...primary.nodes, ...(sec?.nodes ?? [])];
    const types = jsonLdTypesOf(allNodes);
    const sector = isSectorSlug(ctx.input.sector) ? ctx.input.sector : null;

    // ── Sözdizimi ──
    if (page.reachable) {
      s.check(
        'syntax',
        40,
        primary.blocks > 0,
        'JSON-LD bloğu var',
        {
          pass: `${primary.blocks} blok bulundu.`,
          fail: 'Sayfada <script type="application/ld+json"> yok; yapay zekâ ve Google sizi yalnızca serbest metinden tanır.',
        },
        { fix: 'Ana sayfaya Organization + WebSite JSON-LD ekleyin', topic: 'organizationSchema' },
      );
      s.check(
        'syntax',
        40,
        primary.blocks === 0 ? 'fail' : primary.errors === 0 ? 'pass' : 'fail',
        'JSON.parse hatası yok',
        {
          pass: 'Tüm bloklar geçerli JSON.',
          fail:
            primary.blocks === 0
              ? 'Denetlenecek blok yok.'
              : `${primary.errors} blok JSON olarak çözülemedi (virgül, tırnak veya yorum satırı).`,
        },
        {
          fix: 'Bozuk JSON-LD bloğunu Rich Results Test ile bulup düzeltin',
          evidence: primary.errors ? `${primary.errors}/${primary.blocks} blok hatalı` : undefined,
          topic: 'organizationSchema',
        },
      );
      s.check(
        'syntax',
        20,
        primary.blocks === 0 ? 'fail' : primary.noContext === 0 ? 'pass' : 'fail',
        '@context tanımlı',
        {
          pass: 'Her kök düğümde @context var.',
          fail: primary.blocks === 0 ? 'Denetlenecek blok yok.' : `${primary.noContext} kök düğümde @context yok; ayrıştırıcılar şemayı yok sayar.`,
        },
        { fix: 'Her JSON-LD kökünde "@context": "https://schema.org" bulunsun', topic: 'organizationSchema' },
      );
      const md = microdataCount(html);
      if (md > 0) s.note('syntax', 'Microdata algılandı', `${md} itemtype özniteliği var; bu araç yalnız JSON-LD denetler.`, 'warn');
    } else {
      s.check('syntax', 100, 'fail', 'Sayfa okunamadı', { pass: '', fail: 'Sayfa gövdesi alınamadı; şema denetlenemedi.' });
    }

    // ── Organization ──
    const orgs = orgNodes(allNodes);
    const org = orgs[0] ?? null;
    const orgType = org ? typeOf(org) : null;
    const isLocal = org ? !hasType(org, 'Organization') && !hasType(org, 'Corporation') : false;
    s.check(
      'organization',
      40,
      !!org,
      'Organization / LocalBusiness düğümü',
      {
        pass: `${orgType} bulundu${secondary && sec?.nodes.some((n) => orgNodes([n]).length) && !orgNodes(primary.nodes).length ? ' (iletişim/hakkımızda sayfasında)' : ''}.`,
        fail: 'Kim olduğunuzu söyleyen bir Organization/LocalBusiness düğümü yok; asistanlar adınızı, adresinizi ve telefonunuzu tahmin eder.',
      },
      { fix: 'Aşağıdaki şablonu doldurup ana sayfaya ekleyin', topic: 'organizationSchema' },
    );
    for (const r of ORGANIZATION_REQUIREMENTS.required) {
      s.check(
        'organization',
        15,
        !!org && present(get(org, r.field)),
        `Organization.${r.field}`,
        { pass: `${r.field}: ${str(get(org ?? {}, r.field)).slice(0, 80) || 'var'}`, fail: `${r.field} yok — ${r.why}.` },
        { fix: `Organization düğümüne ${r.field} ekleyin`, topic: 'organizationSchema' },
      );
    }
    for (const r of ORGANIZATION_REQUIREMENTS.recommended) {
      s.check(
        'organization',
        6,
        !org ? 'fail' : present(get(org, r.field)) ? 'pass' : 'warn',
        `Organization.${r.field}`,
        { pass: `${r.field} var.`, fail: 'Organization düğümü yok.', warn: `${r.field} yok — ${r.why}.` },
        { fix: `Organization düğümüne ${r.field} ekleyin`, topic: 'organizationSchema' },
      );
    }
    if (org && isLocal) {
      for (const r of LOCAL_BUSINESS_EXTRA) {
        if (r.field === 'address') continue; // yukarıda önerilen olarak zaten var
        s.check(
          'organization',
          3,
          present(get(org, r.field)) ? 'pass' : 'warn',
          `${orgType}.${r.field}`,
          { pass: `${r.field} var.`, fail: '', warn: `${r.field} yok — ${r.why}.` },
          { fix: `${orgType} düğümüne ${r.field} ekleyin`, topic: 'organizationSchema' },
        );
      }
    }

    // ── Sayfa tipi ──
    const missing: SchemaMissing[] = [];
    const richResultTypes: string[] = [];
    const typed: { req: TypeRequirement; node: JsonLdNode }[] = [];
    for (const n of primary.nodes) {
      const req = requirementForType(typeOf(n));
      if (req && !typed.some((t) => t.req.type === req.type)) typed.push({ req, node: n });
    }
    if (typed.length === 0) {
      s.check(
        'pageType',
        100,
        'warn',
        'Sayfa tipi şeması',
        {
          pass: '',
          fail: '',
          warn: 'Product / Article / FAQPage / Course / Hotel / WebSite gibi bir sayfa tipi düğümü yok; yalnız kimlik şeması var ya da hiç yok.',
        },
        { fix: 'Sayfanın türüne uygun şema ekleyin (SSS için FAQPage, ana sayfa için WebSite + BreadcrumbList)', topic: 'faq' },
      );
    } else {
      for (const { req, node } of typed) {
        const reqMissing = req.required.filter((r) => !present(get(node, r.field))).map((r) => r.field);
        const recMissing = req.recommended.filter((r) => !present(get(node, r.field))).map((r) => r.field);
        if (req.richResult) richResultTypes.push(req.type);
        missing.push({ type: req.type, required: reqMissing, recommended: recMissing });
        s.check(
          'pageType',
          60,
          reqMissing.length === 0,
          `${req.label}: Google zorunlu alanlar`,
          {
            pass: `${req.required.map((r) => r.field).join(', ')} tam.`,
            fail: `Eksik zorunlu alan: ${reqMissing.join(', ')} — Google bu düğümü zengin sonuç için kullanmaz.`,
          },
          { fix: `${req.type} düğümüne ${reqMissing.join(', ')} ekleyin`, evidence: reqMissing.join(', ') || undefined, topic: req.type === 'Product' ? 'productSchema' : req.type === 'FAQPage' ? 'faq' : req.type === 'BreadcrumbList' ? 'breadcrumb' : 'organizationSchema' },
        );
        if (req.recommended.length) {
          s.check(
            'pageType',
            40,
            recMissing.length === 0 ? 'pass' : recMissing.length < req.recommended.length ? 'warn' : 'fail',
            `${req.label}: önerilen alanlar`,
            {
              pass: 'Önerilen alanlar tam.',
              fail: `Önerilen alanların hiçbiri yok: ${recMissing.join(', ')}.`,
              warn: `Eksik önerilen alan: ${recMissing.join(', ')}.`,
            },
            { fix: `${req.type} düğümüne ${recMissing.join(', ')} ekleyin`, topic: req.type === 'Product' ? 'productSchema' : 'organizationSchema' },
          );
        }
      }
    }

    // ── Tutarlılık ──
    const orgNames = [...new Set(orgs.map((n) => str(n.name)).filter(Boolean))];
    s.check(
      'consistency',
      50,
      orgNames.length <= 1 ? 'pass' : 'warn',
      'Tek Organization adı',
      {
        pass: orgNames[0] ? `Ad: ${orgNames[0]}` : 'Çelişen ad yok.',
        fail: '',
        warn: `Birden çok Organization farklı ad taşıyor: ${orgNames.slice(0, 3).join(' · ')} — asistan hangisini seçeceğini bilemez.`,
      },
      { fix: 'Tüm sayfalarda aynı Organization adını ve @id değerini kullanın', topic: 'organizationSchema' },
    );
    const badHost = allNodes
      .map((n) => str(n.url))
      .filter((u) => /^https?:\/\//i.test(u))
      .find((u) => hostnameOf(u).replace(/^www\./, '') !== page.hostname.replace(/^www\./, ''));
    s.check(
      'consistency',
      50,
      badHost ? 'warn' : 'pass',
      'Şema url alanı bu siteye işaret ediyor',
      { pass: 'url alanları aynı host.', fail: '', warn: `Şemadaki url farklı bir host’a gidiyor: ${badHost?.slice(0, 80)}` },
      { fix: 'Şema url/@id alanlarını kanonik alan adınızla güncelleyin', topic: 'canonical' },
    );

    // ── Zenginlik ──
    const hasWebSite = allNodes.some((n) => hasType(n, 'WebSite'));
    const hasBreadcrumb = allNodes.some((n) => hasType(n, 'BreadcrumbList'));
    const sameAs = org ? present(org.sameAs) : false;
    s.check('richness', 30, hasWebSite, 'WebSite düğümü', { pass: 'Var.', fail: 'Yok — site adı ve arama kutusu bilgisi eksik.' }, { fix: 'WebSite JSON-LD ekleyin', topic: 'organizationSchema' });
    s.check('richness', 25, hasBreadcrumb ? 'pass' : 'warn', 'BreadcrumbList', { pass: 'Var.', fail: '', warn: 'Yok — sayfa hiyerarşisi şemada görünmüyor.' }, { fix: 'BreadcrumbList ekleyin', topic: 'breadcrumb' });
    s.check('richness', 25, sameAs, 'sameAs profilleri', { pass: 'Var.', fail: 'Yok — sosyal/dizin profilleri kimliği doğrular.' }, { fix: 'Organization.sameAs dizisine sosyal profilleri ekleyin', topic: 'organizationSchema' });
    s.check('richness', 20, types.length >= 2 ? 'pass' : 'warn', 'Birden çok şema tipi', { pass: `${types.length} tip: ${types.slice(0, 6).join(', ')}`, fail: '', warn: types.length ? `Tek tip: ${types[0]}` : 'Tip yok.' }, { fix: 'Kimlik (Organization) + sayfa tipi (WebSite/FAQPage/…) birlikte kullanın', topic: 'organizationSchema' });

    const aggregate = hasAggregateRating(allNodes);
    if (aggregate)
      s.note(
        'consistency',
        'aggregateRating bulundu',
        'Yıldız puanı yalnız sitede görünen gerçek yorumlara dayanmalıdır; kanıtı olmayan puanlar Google spam politikasına girer.',
        'warn',
      );

    const template = schemaTemplate(sector, {
      name: org ? str(org.name) : (page.og['site_name'] ?? null),
      url: page.origin ? `${page.origin}/` : null,
      telephone: org ? str(org.telephone) : null,
      logo: org ? str(org.logo) : null,
    });

    return {
      page,
      extra: {
        blocks: primary.blocks + (sec?.blocks ?? 0),
        parseErrors: primary.errors + (sec?.errors ?? 0),
        types,
        orgType,
        orgName: org ? str(org.name) || null : null,
        missing,
        microdataCount: page.reachable ? microdataCount(html) : 0,
        hasAggregateRating: aggregate,
        secondaryUrl: secondary?.url ?? null,
        template,
        richResultTypes,
      },
    };
  },
});
