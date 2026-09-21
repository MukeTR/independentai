/**
 * robots.txt ve sitemap kontrolü (ROBOTS_SITEMAP, /arac/robots-sitemap-kontrol) — W2.
 *
 *  İstekler (≤16): sayfa + robots.txt + sitemap (+ sitemapindex'te ≤3 alt) + örneklem 10 URL HEAD (ilk 5 + son 5).
 *  robots: `parseRobots` (RFC 9309) + satır düzeyi sözdizimi taraması (bilinmeyen direktif, grup dışı kural).
 *  Felaket kuralları: `*` grubunda `/` engeli (Allow/Disallow en uzun eşleşme, eşitlikte Allow) = fail; CSS/JS/
 *  wp-content/assets engeli = warn. Sitemap: 200 + XML parse hatası fail; `.gz`/gzip gövde okunmaz → warn; >50 000
 *  URL ya da 10 MB kesildi warn; lastmod oranı <%50 bilgi; farklı host / http URL warn; örneklem 4xx/5xx oranı
 *  >%20 fail, >0 warn; sitemap URL'si robots ile engelli fail. Bot matrisi burada YOK → /arac/ai-crawler-testi.
 */
import { parseRobots, resolveBotAccess, sameHost, type ParsedRobots, type RobotsRule } from '../commerce/html-analysis';
import type { HeadResult, ScanBudget } from './budget';
import { defineSiteTool } from './core';
import { collectPageArtifact, SCAN_HEADERS, type PageArtifact } from './fetch-page';
import { collectSitemap, sampleEntries, type SitemapCollection } from './sitemap-parse';

export type RobotsSitemapAxis = 'robotsSyntax' | 'catastrophic' | 'sitemapValid' | 'sample' | 'consistency';

export const ROBOTS_SITEMAP_AXES: { key: RobotsSitemapAxis; label: string; weight: number; description: string }[] = [
  { key: 'robotsSyntax', label: 'robots.txt sözdizimi', weight: 25, description: 'Erişim, bilinmeyen direktif, grup yapısı' },
  { key: 'catastrophic', label: 'Felaket kuralları', weight: 25, description: 'Genel Disallow: /, CSS/JS engeli' },
  { key: 'sitemapValid', label: 'Sitemap geçerliliği', weight: 25, description: 'Sitemap: satırı, erişim, XML, boyut' },
  { key: 'sample', label: 'Örneklem', weight: 15, description: 'Sitemap’ten 10 URL: 4xx/5xx oranı' },
  { key: 'consistency', label: 'Tutarlılık', weight: 10, description: 'Farklı host / http URL, robots ile engelli sitemap URL’si' },
];

const KNOWN_DIRECTIVES = new Set(['user-agent', 'allow', 'disallow', 'sitemap', 'crawl-delay', 'host', 'clean-param']);
const ASSET_BLOCK_RE = /\.css|\.js\b|\/wp-content|\/wp-includes|\/assets|\/static|\/_next/i;

export type RobotsSyntaxReport = {
  status: number;
  present: boolean;
  lines: number;
  groups: number;
  sitemaps: string[];
  unknownDirectives: string[];
  /** User-agent'tan önce gelen kurallar (yok sayılır) */
  orphanRules: number;
  starGroup: boolean;
  rootBlocked: boolean;
  assetBlocks: string[];
};

/** SAF: parseRobots + satır düzeyi denetim. */
export function inspectRobots(text: string | null, status: number): { parsed: ParsedRobots | null; report: RobotsSyntaxReport } {
  if (text == null || status !== 200) {
    return {
      parsed: null,
      report: {
        status,
        present: false,
        lines: 0,
        groups: 0,
        sitemaps: [],
        unknownDirectives: [],
        orphanRules: 0,
        starGroup: false,
        rootBlocked: false,
        assetBlocks: [],
      },
    };
  }
  const parsed = parseRobots(text);
  const unknown = new Set<string>();
  let orphan = 0;
  let seenAgent = false;
  let lines = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    lines += 1;
    const idx = line.indexOf(':');
    if (idx === -1) {
      unknown.add(line.slice(0, 40));
      continue;
    }
    const key = line.slice(0, idx).trim().toLowerCase();
    if (!KNOWN_DIRECTIVES.has(key)) {
      unknown.add(line.slice(0, idx).trim());
      continue;
    }
    if (key === 'user-agent') seenAgent = true;
    else if ((key === 'allow' || key === 'disallow') && !seenAgent) orphan += 1;
  }
  const star = parsed.groups.find((g) => g.agents.includes('*')) ?? null;
  const rootBlocked = !resolveBotAccess(parsed, 'yanitbot-generic', '/').allowed;
  const assetBlocks: string[] = [];
  const rules: RobotsRule[] = star ? star.rules : parsed.groups.flatMap((g) => g.rules);
  for (const r of rules) if (r.type === 'disallow' && r.path && ASSET_BLOCK_RE.test(r.path)) assetBlocks.push(r.path);
  return {
    parsed,
    report: {
      status,
      present: true,
      lines,
      groups: parsed.groups.length,
      sitemaps: parsed.sitemaps,
      unknownDirectives: [...unknown].slice(0, 10),
      orphanRules: orphan,
      starGroup: !!star,
      rootBlocked,
      assetBlocks: assetBlocks.slice(0, 10),
    },
  };
}

export type SampleResult = { url: string; status: number; ok: boolean; error?: string };

export type RobotsSitemapArtifacts = {
  page: PageArtifact;
  robots: { parsed: ParsedRobots | null; report: RobotsSyntaxReport };
  sitemap: SitemapCollection;
  sample: SampleResult[];
};

export type RobotsSitemapExtra = {
  robots: RobotsSyntaxReport;
  sitemap: {
    url: string;
    source: 'robots' | 'default';
    status: number;
    kind: 'urlset' | 'sitemapindex' | 'invalid' | 'gzip' | 'missing';
    urlCount: number;
    childCount: number;
    childrenSkipped: number;
    gzip: boolean;
    truncated: boolean;
    lastmodRatio: number;
    foreignHosts: string[];
    httpUrls: number;
    blockedUrls: string[];
    reason: string | null;
  };
  sample: SampleResult[];
};

async function headSample(urls: string[], budget: ScanBudget): Promise<SampleResult[]> {
  const out: SampleResult[] = new Array(urls.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < urls.length) {
      const i = cursor;
      cursor += 1;
      const url = urls[i];
      if (!url) break;
      if (budget.exhausted) {
        out[i] = { url, status: 0, ok: false, error: 'budget' };
        continue;
      }
      const h: HeadResult = await budget.head(url, 5_000, { headers: SCAN_HEADERS });
      out[i] = { url, status: h.status, ok: h.status > 0 && h.status < 400, ...(h.error ? { error: h.error } : {}) };
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return out;
}

export const robotsSitemapTool = defineSiteTool<RobotsSitemapAxis, RobotsSitemapArtifacts, RobotsSitemapExtra>({
  kind: 'ROBOTS_SITEMAP',
  axes: ROBOTS_SITEMAP_AXES,
  collect: async (url, budget) => {
    const page = await collectPageArtifact(url, budget, { robots: true });
    const robots = inspectRobots(page.robots?.ok ? page.robots.text : null, page.robots?.status ?? 0);
    const sitemap = await collectSitemap(page.origin, budget, { robots: robots.parsed });
    const picks = sampleEntries(sitemap.entries, 10).map((e) => e.loc);
    const sample = picks.length ? await headSample(picks, budget) : [];
    return { page, robots, sitemap, sample };
  },
  analyze: ({ page, robots, sitemap, sample }, s) => {
    const r = robots.report;
    const host = page.hostname;
    const https = page.finalUrl.startsWith('https:');

    // ── robots sözdizimi ──
    s.check(
      'robotsSyntax',
      40,
      r.present ? 'pass' : 'warn',
      'robots.txt erişimi',
      {
        pass: `robots.txt 200 döndü (${r.lines} satır, ${r.groups} grup).`,
        fail: `robots.txt ${r.status || 'yanıt'} döndü — her şey açık varsayılır; Sitemap bildirimi de yapılamaz.`,
      },
      { fix: 'Sitenin köküne en azından “User-agent: *” + “Allow: /” + “Sitemap:” satırlarını içeren bir robots.txt koyun.', topic: 'robots' },
    );
    s.check(
      'robotsSyntax',
      30,
      r.unknownDirectives.length === 0 ? 'pass' : 'warn',
      'Bilinmeyen direktif',
      {
        pass: 'Tüm satırlar tanınan direktifler (User-agent, Allow, Disallow, Sitemap, Crawl-delay).',
        fail: `${r.unknownDirectives.length} tanınmayan satır: botlar bunları yok sayar.`,
      },
      { fix: 'Tanınmayan satırları kaldırın; noindex için sayfa içi meta robots kullanın.', evidence: r.unknownDirectives.slice(0, 3).join(' · ') || undefined, topic: 'robots' },
    );
    s.check(
      'robotsSyntax',
      30,
      !r.present ? 'warn' : r.orphanRules > 0 || !r.starGroup ? 'warn' : 'pass',
      'Grup yapısı',
      {
        pass: '“User-agent: *” grubu var; kurallar bir gruba bağlı.',
        fail: !r.present
          ? 'robots.txt yok.'
          : r.orphanRules > 0
            ? `${r.orphanRules} kural User-agent satırından önce geliyor ve yok sayılıyor.`
            : '“User-agent: *” grubu yok; adı geçmeyen botlar için kural tanımsız.',
      },
      { fix: 'Her Allow/Disallow satırını bir User-agent grubunun altına alın; “User-agent: *” grubu ekleyin.', topic: 'robots' },
    );

    // ── felaket kuralları ──
    s.check(
      'catastrophic',
      60,
      !r.rootBlocked,
      'Genel “Disallow: /”',
      {
        pass: 'Sitenin kökü genel botlara açık.',
        fail: '“User-agent: *” altında “Disallow: /” — arama motorları ve AI botları sitenin tamamını atlıyor.',
      },
      { fix: '“Disallow: /” satırını kaldırın; yalnızca /admin, /sepet gibi özel yolları engelleyin.', topic: 'sitemapHealth' },
    );
    s.check(
      'catastrophic',
      40,
      r.assetBlocks.length === 0 ? 'pass' : 'warn',
      'CSS / JS / tema dosyaları engeli',
      {
        pass: 'CSS, JS ve tema dizinleri engelli değil.',
        fail: `${r.assetBlocks.length} kural CSS/JS/tema dizinini engelliyor; botlar sayfayı olduğu gibi göremez.`,
      },
      { fix: 'CSS/JS ve wp-content/assets engellerini kaldırın; yalnızca gizli yolları kapatın.', evidence: r.assetBlocks.slice(0, 3).join(' · ') || undefined, topic: 'sitemapHealth' },
    );
    s.note('catastrophic', 'AI bot erişimi', 'GPTBot, ClaudeBot, PerplexityBot gibi botların bot bazında erişimi bu araçta tekrar edilmez → /arac/ai-crawler-testi.', 'pass');

    // ── sitemap ──
    s.check(
      'sitemapValid',
      20,
      r.sitemaps.length > 0 ? 'pass' : 'warn',
      'robots.txt’te Sitemap: satırı',
      { pass: `${r.sitemaps.length} sitemap bildirilmiş.`, fail: 'robots.txt’te Sitemap: satırı yok; botlar sitemap’i tahmin etmek zorunda.' },
      { fix: 'robots.txt sonuna “Sitemap: https://siteniz.com/sitemap.xml” satırı ekleyin.', evidence: r.sitemaps[0], topic: 'sitemap' },
    );
    const root = sitemap.root;
    const parsed = sitemap.parsed;
    const smStatus = root?.status ?? 0;
    let kind: RobotsSitemapExtra['sitemap']['kind'] = 'missing';
    let smState: 'pass' | 'warn' | 'fail' = 'fail';
    let smDetail = '';
    if (sitemap.gzip) {
      kind = 'gzip';
      smState = 'warn';
      smDetail = 'Sıkıştırılmış (.gz) sitemap desteklenmiyor; içerik doğrulanamadı. Düz XML sürümünü de sunun.';
    } else if (root?.error === 'budget') {
      smState = 'warn';
      smDetail = 'Bütçe dolduğu için sitemap çekilemedi.';
    } else if (smStatus === 200 && parsed && parsed.kind !== 'invalid') {
      kind = parsed.kind;
      smState = 'pass';
      smDetail =
        parsed.kind === 'sitemapindex'
          ? `Sitemap index: ${parsed.children.length} alt sitemap (${sitemap.children.length} okundu, ${sitemap.entries.length} URL).`
          : `Geçerli urlset: ${sitemap.entries.length} URL.`;
    } else if (smStatus === 200) {
      kind = 'invalid';
      smDetail = `Sitemap 200 döndü ama XML ayrıştırılamadı: ${parsed?.reason ?? 'bilinmeyen biçim'}.`;
    } else {
      smDetail = `Sitemap ${smStatus || root?.error || 'yanıt'} döndü (${sitemap.url}).`;
    }
    s.check(
      'sitemapValid',
      50,
      smState,
      'Sitemap erişimi ve XML geçerliliği',
      { pass: smDetail, fail: smDetail, warn: smDetail },
      { fix: 'Geçerli bir XML sitemap yayınlayın; .gz kullanıyorsanız düz XML kopyasını da verin.', evidence: sitemap.url, topic: 'sitemap' },
    );
    const tooBig = sitemap.truncated || sitemap.entries.length >= 50_000;
    s.check(
      'sitemapValid',
      30,
      kind === 'urlset' || kind === 'sitemapindex' ? (tooBig ? 'warn' : 'pass') : 'warn',
      'Sitemap boyutu',
      {
        pass: `${sitemap.entries.length} URL; 50 000 / 10 MB sınırının altında.`,
        fail: kind === 'urlset' || kind === 'sitemapindex' ? 'Sitemap 50 000 URL ya da 10 MB sınırını aşıyor (kesildi); sitemapindex ile bölün.' : 'Boyut ölçülemedi (sitemap okunamadı).',
      },
      { fix: 'Büyük sitemap’i sitemapindex + ≤50 000 URL’lik parçalara bölün.', topic: 'sitemap' },
    );
    const lastmodRatio = sitemap.entries.length ? sitemap.lastmodCount / sitemap.entries.length : 0;
    if (sitemap.entries.length && lastmodRatio < 0.5)
      s.note('sitemapValid', 'lastmod alanı', `URL’lerin yalnızca %${Math.round(lastmodRatio * 100)}’inde lastmod var; botlar değişikliği fark etmekte zorlanır.`, 'warn');
    if (sitemap.childrenSkipped > 0)
      s.note('sitemapValid', 'Okunmayan alt sitemap’ler', `${sitemap.childrenSkipped} alt sitemap okunmadı (en çok 3 alt sitemap kontrol edilir).`, 'pass');

    // ── örneklem ──
    const done = sample.filter((x) => x.error !== 'budget');
    const bad = done.filter((x) => x.status >= 400 || x.error === 'network');
    const badRatio = done.length ? bad.length / done.length : 0;
    s.check(
      'sample',
      100,
      !done.length ? 'warn' : badRatio > 0.2 ? 'fail' : bad.length > 0 ? 'warn' : 'pass',
      'Örneklem URL’leri (ilk 5 + son 5)',
      {
        pass: `${done.length} örnek URL’nin hepsi 2xx/3xx döndü.`,
        warn: !done.length ? 'Örneklem alınamadı (sitemap okunamadı ya da bütçe doldu).' : `${done.length} örnekten ${bad.length}’i 4xx/5xx döndü.`,
        fail: `${done.length} örnekten ${bad.length}’i 4xx/5xx döndü (>%20) — sitemap ölü sayfa listeliyor.`,
      },
      { fix: 'Sitemap’ten silinmiş/yönlenen URL’leri çıkarın; yalnızca 200 dönen kanonik adresleri listeleyin.', evidence: bad.slice(0, 3).map((b) => `${b.url} (${b.status || b.error})`).join(' · ') || undefined, topic: 'sitemap' },
    );

    // ── tutarlılık ──
    const foreign = new Set<string>();
    let httpUrls = 0;
    for (const e of sitemap.entries) {
      if (!sameHost(e.loc, page.finalUrl)) {
        try {
          foreign.add(new URL(e.loc).hostname);
        } catch {
          /* geçersiz */
        }
      }
      if (https && /^http:\/\//i.test(e.loc)) httpUrls += 1;
    }
    s.check(
      'consistency',
      50,
      !sitemap.entries.length ? 'warn' : foreign.size === 0 && httpUrls === 0 ? 'pass' : 'warn',
      'Farklı host / http URL’ler',
      {
        pass: 'Tüm sitemap URL’leri bu host ve https.',
        fail: !sitemap.entries.length ? 'Sitemap okunamadığı için kontrol edilemedi.' : `${foreign.size} farklı host, ${httpUrls} http:// adres — botlar bunları yok sayar ya da çift içerik görür.`,
      },
      { fix: 'Sitemap’te yalnızca bu hostun https kanonik adreslerini listeleyin.', evidence: [...foreign].slice(0, 3).join(' · ') || undefined, topic: 'sitemap' },
    );
    const blocked: string[] = [];
    if (robots.parsed) {
      for (const e of sitemap.entries.slice(0, 500)) {
        let path = '/';
        try {
          const u = new URL(e.loc);
          path = u.pathname + u.search;
        } catch {
          continue;
        }
        if (!resolveBotAccess(robots.parsed, 'yanitbot-generic', path).allowed) blocked.push(e.loc);
        if (blocked.length >= 10) break;
      }
    }
    s.check(
      'consistency',
      50,
      blocked.length === 0,
      'Sitemap URL’si robots ile engelli',
      { pass: 'Sitemap’teki adresler robots.txt ile çelişmiyor.', fail: `${blocked.length}+ sitemap adresi robots.txt tarafından engelleniyor — botlar çelişki görür.` },
      { fix: 'Engelli adresleri sitemap’ten çıkarın ya da robots kuralını daraltın.', evidence: blocked.slice(0, 3).join(' · ') || undefined, topic: 'sitemapHealth' },
    );

    const extra: RobotsSitemapExtra = {
      robots: r,
      sitemap: {
        url: sitemap.url,
        source: sitemap.source,
        status: smStatus,
        kind,
        urlCount: sitemap.entries.length,
        childCount: sitemap.children.length,
        childrenSkipped: sitemap.childrenSkipped,
        gzip: sitemap.gzip,
        truncated: sitemap.truncated,
        lastmodRatio,
        foreignHosts: [...foreign].slice(0, 10),
        httpUrls,
        blockedUrls: blocked,
        reason: parsed?.reason ?? null,
      },
      sample,
    };
    void host;
    return { page, extra };
  },
});
