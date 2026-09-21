/**
 * Kırık link bulucu (BROKEN_LINKS, /arac/kirik-link-bulucu) — W2.
 *
 *  Akış: robots.txt (nezaket) → aynı host BFS derinlik 2 ≤ 40 sayfa (crawl-queue) → her sayfadan a/img/link/script
 *  hedefleri (`mailto:`/`tel:`/`javascript:`/`data:` atlanır) → taranmış sayfalar durumlarıyla eşlenir, kalanlar
 *  HEAD (405/501 → 4 KB GET) ile kontrol edilir; iç sayfa → kaynak → dış link öncelik sırası. Bütçe (≤120 istek,
 *  5 MB, 25 s) dolunca kalan hedefler "kontrol edilmedi" → `partial:true` + "ilk N link kontrol edildi".
 *
 *  Kurallar: 4xx/5xx/DNS = fail satırı; zaman aşımı = warn ("yavaş ya da bot koruması"); dış 403 = warn; özel ağa
 *  giden hedef kontrol edilmez. Eksenler: iç 40 · dış 20 · görsel/script 20 · yoğunluk 20 (kırık/kontrol edilen:
 *  >%5 fail, >%1 warn). "En çok kırık 5 sayfa" ve satır bazında kaynak sayfa + link metni döner.
 */
import { decodeEntities, openTags } from '../commerce/html-analysis';
import type { Artifact } from '../commerce/scoring';
import type { HeadResult, ScanBudget } from './budget';
import { defineSiteTool } from './core';
import { crawlSite, type CrawlResult } from './crawl-queue';
import { PARSE_LIMIT, SCAN_HEADERS, type PageArtifact } from './fetch-page';
import { urlKey } from './sitemap-parse';

export type BrokenLinkAxis = 'internal' | 'external' | 'assets' | 'density';

export const BROKEN_LINKS_AXES: { key: BrokenLinkAxis; label: string; weight: number; description: string }[] = [
  {
    key: 'internal',
    label: 'İç linkler',
    weight: 40,
    description: 'Aynı sitedeki sayfa linkleri: 4xx/5xx, bağlantı hatası, zaman aşımı',
  },
  {
    key: 'external',
    label: 'Dış linkler',
    weight: 20,
    description: 'Başka sitelere giden linkler (HEAD; 405’te kısa GET); 403 uyarı sayılır',
  },
  { key: 'assets', label: 'Görsel / script / CSS', weight: 20, description: 'img, script ve stylesheet kaynakları' },
  { key: 'density', label: 'Yoğunluk', weight: 20, description: 'Kırık link oranı: >%5 kritik, >%1 uyarı' },
];

export const LINK_CHECK_MAX = 120;
export const LINK_ROWS_MAX = 200;
const SKIP_SCHEME = /^(mailto|tel|javascript|data|sms|whatsapp|ftp|file|blob):/i;
const LINK_REL_ASSET = /\b(stylesheet|icon|apple-touch-icon|preload|modulepreload|manifest)\b/i;

export type LinkTargetKind = 'internal' | 'external' | 'asset';
export type LinkTag = 'a' | 'img' | 'link' | 'script';
export type LinkSource = { page: string; text: string; tag: LinkTag };
export type LinkTarget = { url: string; kind: LinkTargetKind; sources: LinkSource[] };
export type LinkState = 'ok' | 'broken' | 'warn' | 'unchecked';
export type LinkCheck = LinkTarget & {
  status: number;
  state: LinkState;
  /** Kısa Türkçe neden ("404", "DNS/bağlantı hatası", "zaman aşımı" …) */
  reason: string;
  method: 'tarama' | 'HEAD' | 'GET' | '—';
};

export type BrokenLinksArtifacts = {
  start: PageArtifact | null;
  crawl: CrawlResult;
  targets: LinkTarget[];
  checks: LinkCheck[];
};

export type LinkRow = {
  url: string;
  kind: LinkTargetKind;
  state: LinkState;
  status: number;
  reason: string;
  sourcePage: string;
  sourceText: string;
  tag: LinkTag;
  /** Aynı hedefe işaret eden kaynak sayısı */
  sourceCount: number;
};

export type BrokenLinksExtra = {
  totals: {
    targets: number;
    checked: number;
    ok: number;
    broken: number;
    warn: number;
    unchecked: number;
    internal: number;
    external: number;
    assets: number;
  };
  pagesCrawled: number;
  crawlDepth: number;
  robotsBlocked: number;
  /** Kırık/uyarı satırları (en çok LINK_ROWS_MAX) */
  rows: LinkRow[];
  /** En çok kırık link içeren 5 sayfa */
  topPages: { url: string; broken: number; warn: number }[];
  density: number;
  /** "İlk N link kontrol edildi" (partial'da) */
  checkedNote: string | null;
};

function attr(attrs: string, name: string): string | null {
  const m = attrs.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return m?.[1] != null ? decodeEntities(m[1]).trim() : null;
}

function resolve(raw: string, base: string): string | null {
  if (!raw || raw.startsWith('#') || SKIP_SCHEME.test(raw)) return null;
  try {
    const u = new URL(raw, base);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

/** Bir sayfadaki tüm link hedefleri: a (PageArtifact.links) + img/script/link kaynakları. SAF. */
export function extractLinkTargets(page: PageArtifact): { url: string; kind: LinkTargetKind; source: LinkSource }[] {
  const out: { url: string; kind: LinkTargetKind; source: LinkSource }[] = [];
  const base = page.finalUrl;
  for (const l of page.links) {
    out.push({
      url: l.url,
      kind: l.internal ? 'internal' : 'external',
      source: { page: base, text: l.text.slice(0, 80), tag: 'a' },
    });
  }
  const html = page.html.length > PARSE_LIMIT ? page.html.slice(0, PARSE_LIMIT) : page.html;
  for (const t of openTags(html, 'img')) {
    const src = attr(t.attrs, 'src');
    const u = src ? resolve(src, base) : null;
    if (u) out.push({ url: u, kind: 'asset', source: { page: base, text: attr(t.attrs, 'alt') ?? '', tag: 'img' } });
  }
  for (const t of openTags(html, 'script')) {
    const src = attr(t.attrs, 'src');
    const u = src ? resolve(src, base) : null;
    if (u) out.push({ url: u, kind: 'asset', source: { page: base, text: '', tag: 'script' } });
  }
  for (const t of openTags(html, 'link')) {
    const rel = attr(t.attrs, 'rel') ?? '';
    if (!LINK_REL_ASSET.test(rel)) continue;
    const href = attr(t.attrs, 'href');
    const u = href ? resolve(href, base) : null;
    if (u) out.push({ url: u, kind: 'asset', source: { page: base, text: rel, tag: 'link' } });
  }
  return out;
}

/** Tüm taranan sayfalardan tekil hedef listesi (kaynaklar birleştirilir; keşif sırası korunur). */
export function collectTargets(crawl: CrawlResult): LinkTarget[] {
  const map = new Map<string, LinkTarget>();
  for (const cp of crawl.pages) {
    if (!cp.page.reachable) continue;
    for (const t of extractLinkTargets(cp.page)) {
      const key = urlKey(t.url);
      const cur = map.get(key);
      if (cur) {
        if (cur.sources.length < 20) cur.sources.push(t.source);
        if (cur.kind === 'external' && t.kind === 'internal') cur.kind = 'internal';
      } else map.set(key, { url: t.url, kind: t.kind, sources: [t.source] });
    }
  }
  return [...map.values()];
}

function stateOfStatus(status: number, kind: LinkTargetKind): { state: LinkState; reason: string } {
  if (status >= 200 && status < 400) return { state: 'ok', reason: String(status) };
  if (status === 403) return kind === 'external' ? { state: 'warn', reason: '403 — bot koruması olabilir' } : { state: 'broken', reason: '403' };
  if (status === 429) return { state: 'warn', reason: '429 — hız sınırı' };
  if (status >= 400) return { state: 'broken', reason: String(status) };
  return { state: 'broken', reason: 'yanıt yok' };
}

function fromArtifact(a: Artifact | HeadResult, kind: LinkTargetKind): { state: LinkState; reason: string } {
  if (a.error === 'budget') return { state: 'unchecked', reason: 'bütçe doldu' };
  if (a.error === 'unsafe') return { state: 'unchecked', reason: 'özel ağ adresi' };
  if (a.error === 'timeout') return { state: 'warn', reason: 'zaman aşımı — yavaş ya da bot koruması' };
  if (a.error === 'network') return { state: 'broken', reason: 'DNS / bağlantı hatası' };
  return stateOfStatus(a.status, kind);
}

const KIND_ORDER: Record<LinkTargetKind, number> = { internal: 0, asset: 1, external: 2 };

/**
 * Hedefleri kontrol eder: taranmış sayfalar durumlarıyla eşlenir; kalanlar HEAD (405/501 → 4 KB GET).
 * Öncelik iç → kaynak → dış; bütçe dolunca kalanlar `unchecked`.
 */
export async function checkTargets(
  targets: LinkTarget[],
  crawl: CrawlResult,
  budget: ScanBudget,
  opts: { concurrency?: number; timeoutMs?: number; maxChecks?: number } = {},
): Promise<LinkCheck[]> {
  const crawled = new Map<string, Artifact>();
  for (const cp of crawl.pages) {
    crawled.set(urlKey(cp.url), cp.page.page);
    if (cp.page.finalUrl !== cp.url) crawled.set(urlKey(cp.page.finalUrl), cp.page.page);
  }
  const ordered = targets
    .map((t, i) => ({ t, i }))
    .sort((a, b) => KIND_ORDER[a.t.kind] - KIND_ORDER[b.t.kind] || a.i - b.i)
    .map((x) => x.t);
  const results = new Map<string, LinkCheck>();
  const pending: LinkTarget[] = [];
  for (const t of ordered) {
    const a = crawled.get(urlKey(t.url));
    if (a) {
      const r = fromArtifact(a, t.kind);
      results.set(t.url, { ...t, status: a.status, state: r.state, reason: r.reason, method: 'tarama' });
    } else pending.push(t);
  }
  const maxChecks = opts.maxChecks ?? LINK_CHECK_MAX;
  const timeout = opts.timeoutMs ?? 6_000;
  const init = { headers: SCAN_HEADERS };
  let cursor = 0;
  let performed = 0;
  const worker = async () => {
    while (cursor < pending.length) {
      const t = pending[cursor];
      cursor += 1;
      if (!t) break;
      if (budget.exhausted || performed >= maxChecks) {
        results.set(t.url, { ...t, status: 0, state: 'unchecked', reason: 'bütçe doldu', method: '—' });
        continue;
      }
      performed += 1;
      const h = await budget.head(t.url, timeout, init);
      let status = h.status;
      let method: LinkCheck['method'] = 'HEAD';
      let r = fromArtifact(h, t.kind);
      if ((h.status === 405 || h.status === 501) && !budget.exhausted) {
        const g = await budget.fetch(t.url, timeout, { ...init, maxBytes: 4096 });
        method = 'GET';
        status = g.status;
        r = fromArtifact(g, t.kind);
      }
      results.set(t.url, { ...t, status, state: r.state, reason: r.reason, method });
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency ?? 8) }, worker));
  return targets.map((t) => results.get(t.url) ?? { ...t, status: 0, state: 'unchecked', reason: 'bütçe doldu', method: '—' });
}

function short(u: string, n = 80): string {
  return u.length > n ? `${u.slice(0, n - 1)}…` : u;
}

export function buildExtra(a: BrokenLinksArtifacts, partial: boolean): BrokenLinksExtra {
  const totals = {
    targets: a.checks.length,
    checked: 0,
    ok: 0,
    broken: 0,
    warn: 0,
    unchecked: 0,
    internal: 0,
    external: 0,
    assets: 0,
  };
  const perPage = new Map<string, { broken: number; warn: number }>();
  const rows: LinkRow[] = [];
  for (const c of a.checks) {
    if (c.kind === 'internal') totals.internal += 1;
    else if (c.kind === 'external') totals.external += 1;
    else totals.assets += 1;
    if (c.state === 'unchecked') {
      totals.unchecked += 1;
      continue;
    }
    totals.checked += 1;
    if (c.state === 'ok') totals.ok += 1;
    else {
      if (c.state === 'broken') totals.broken += 1;
      else totals.warn += 1;
      for (const s of c.sources) {
        const p = perPage.get(s.page) ?? { broken: 0, warn: 0 };
        if (c.state === 'broken') p.broken += 1;
        else p.warn += 1;
        perPage.set(s.page, p);
      }
      const first = c.sources[0];
      if (rows.length < LINK_ROWS_MAX)
        rows.push({
          url: c.url,
          kind: c.kind,
          state: c.state,
          status: c.status,
          reason: c.reason,
          sourcePage: first?.page ?? '',
          sourceText: first?.text ?? '',
          tag: first?.tag ?? 'a',
          sourceCount: c.sources.length,
        });
    }
  }
  rows.sort((x, y) => (x.state === y.state ? 0 : x.state === 'broken' ? -1 : 1));
  const topPages = [...perPage.entries()]
    .map(([url, v]) => ({ url, ...v }))
    .sort((x, y) => y.broken - x.broken || y.warn - x.warn || x.url.localeCompare(y.url))
    .slice(0, 5);
  const density = totals.checked ? totals.broken / totals.checked : 0;
  const maxDepth = a.crawl.pages.reduce((m, p) => Math.max(m, p.depth), 0);
  return {
    totals,
    pagesCrawled: a.crawl.pages.length,
    crawlDepth: maxDepth,
    robotsBlocked: a.crawl.robotsBlocked.length,
    rows,
    topPages,
    density,
    checkedNote: partial ? `İlk ${totals.checked} link kontrol edildi; ${totals.unchecked} hedef bütçe nedeniyle atlandı.` : null,
  };
}

export const brokenLinksTool = defineSiteTool<BrokenLinkAxis, BrokenLinksArtifacts, BrokenLinksExtra>({
  kind: 'BROKEN_LINKS',
  axes: BROKEN_LINKS_AXES,
  collect: async (url, budget) => {
    const crawl = await crawlSite(url, budget, { maxPages: 40, maxDepth: 2, pageTimeoutMs: 8_000 });
    const start = crawl.pages[0]?.page ?? null;
    const targets = start && start.reachable ? collectTargets(crawl) : [];
    const checks = targets.length ? await checkTargets(targets, crawl, budget) : [];
    return { start, crawl, targets, checks };
  },
  analyze: (a, s) => {
    const start = a.start;
    if (!start || !start.reachable) {
      const why = start?.waf
        ? 'Ana sayfa bot koruması nedeniyle okunamadı.'
        : `Ana sayfa çekilemedi (${start?.page.status || start?.page.error || 'yanıt yok'}).`;
      s.check('internal', 100, false, 'Ana sayfa erişimi', { pass: 'Ana sayfa okundu.', fail: why }, {
        fix: 'Sitenizin herkese açık olduğundan ve YanitBot’u engellemediğinden emin olun.',
        topic: 'brokenLinks',
      });
      return { page: start, partial: false, extra: buildExtra(a, false) };
    }
    const partial = a.crawl.skipped > 0 || a.checks.some((c) => c.state === 'unchecked');
    const extra = buildExtra(a, partial);
    const by = (kind: LinkTargetKind, state: LinkState) => a.checks.filter((c) => c.kind === kind && c.state === state);
    const ev = (list: LinkCheck[]) =>
      list
        .slice(0, 3)
        .map((c) => `${short(c.url, 60)} (${c.reason})`)
        .join(' · ') || undefined;

    const brokenInt = by('internal', 'broken');
    const warnInt = by('internal', 'warn');
    s.check(
      'internal',
      70,
      brokenInt.length === 0,
      'Kırık iç linkler',
      {
        pass: `${extra.totals.internal} iç linkin hiçbiri kırık değil.`,
        fail: `${brokenInt.length} iç link 4xx/5xx ya da bağlantı hatası veriyor; ziyaretçi ve botlar ölü sayfaya düşüyor.`,
      },
      { fix: 'Kırık iç linkleri doğru adrese güncelleyin ya da eski adresi 301 ile yönlendirin.', evidence: ev(brokenInt), topic: 'brokenLinks' },
    );
    s.check(
      'internal',
      30,
      warnInt.length === 0 ? 'pass' : 'warn',
      'Yavaş ya da bot korumalı iç sayfalar',
      {
        pass: 'İç linklerde zaman aşımı yok.',
        fail: `${warnInt.length} iç link zaman aşımı/403/429 verdi — yavaş sayfa ya da bot koruması olabilir.`,
      },
      { fix: 'Yavaş sayfaların yanıt süresini düşürün; bot korumasının kendi sitenizin linklerini engellemediğini doğrulayın.', evidence: ev(warnInt), topic: 'performance' },
    );

    const brokenExt = by('external', 'broken');
    const warnExt = by('external', 'warn');
    s.check(
      'external',
      70,
      extra.totals.external === 0 ? 'pass' : brokenExt.length === 0,
      'Kırık dış linkler',
      {
        pass: extra.totals.external === 0 ? 'Dış link yok.' : `${extra.totals.external} dış linkin hiçbiri kırık değil.`,
        fail: `${brokenExt.length} dış link kapanmış ya da 4xx/5xx dönüyor.`,
      },
      { fix: 'Kapanmış dış kaynakları kaldırın ya da güncel adrese değiştirin.', evidence: ev(brokenExt), topic: 'brokenLinks' },
    );
    s.check(
      'external',
      30,
      warnExt.length === 0 ? 'pass' : 'warn',
      'Dış linklerde 403 / zaman aşımı',
      {
        pass: 'Dış linklerde erişim uyarısı yok.',
        fail: `${warnExt.length} dış link 403/429/zaman aşımı verdi — bot koruması olabilir; tarayıcıdan elle kontrol edin.`,
      },
      { fix: 'Bu linkleri tarayıcıda açıp gerçekten çalıştığını doğrulayın; çalışmıyorsa kaldırın.', evidence: ev(warnExt), topic: 'brokenLinks' },
    );

    const brokenAssets = by('asset', 'broken');
    s.check(
      'assets',
      100,
      extra.totals.assets === 0 ? 'pass' : brokenAssets.length === 0,
      'Görsel, script ve CSS kaynakları',
      {
        pass: extra.totals.assets === 0 ? 'Kontrol edilecek kaynak bulunamadı.' : `${extra.totals.assets} kaynağın hepsi yükleniyor.`,
        fail: `${brokenAssets.length} kaynak (img/script/css) bulunamıyor; sayfa eksik ya da bozuk görünüyor.`,
      },
      { fix: 'Eksik görsel/script dosyalarını geri yükleyin ya da yollarını düzeltin; CDN adreslerini kontrol edin.', evidence: ev(brokenAssets), topic: 'brokenLinks' },
    );

    const d = extra.density;
    s.check(
      'density',
      100,
      d > 0.05 ? 'fail' : d > 0.01 ? 'warn' : 'pass',
      'Kırık link oranı',
      {
        pass: `Kontrol edilen ${extra.totals.checked} hedefin %${(d * 100).toFixed(1)}’i kırık.`,
        warn: `Kontrol edilen ${extra.totals.checked} hedefin %${(d * 100).toFixed(1)}’i kırık (>%1).`,
        fail: `Kontrol edilen ${extra.totals.checked} hedefin %${(d * 100).toFixed(1)}’i kırık (>%5) — bakım eksikliği sinyali.`,
      },
      { fix: 'Kırık linkleri düzenli tarayın; kaldırılan sayfaları 301 ile yönlendirin.', topic: 'brokenLinks' },
    );

    if (partial) s.note('density', 'Kısmi tarama', extra.checkedNote ?? 'Bütçe dolduğu için tüm hedefler kontrol edilemedi.', 'warn');
    if (a.crawl.robotsBlocked.length)
      s.note('internal', 'robots.txt ile atlanan sayfalar', `${a.crawl.robotsBlocked.length} sayfa robots.txt kuralı gereği taranmadı.`, 'pass', short(a.crawl.robotsBlocked[0] ?? '', 60));
    if (a.checks.some((c) => c.state === 'unchecked' && c.reason === 'özel ağ adresi'))
      s.note('external', 'Özel ağ adresleri', 'Yerel/özel ağa işaret eden linkler güvenlik gereği kontrol edilmedi.', 'warn');

    return { page: start, partial, extra };
  },
});
