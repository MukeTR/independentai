#!/usr/bin/env node
/**
 * Gece programı REGISTRY doğrulayıcı — `.registry/<W>.json` dosyalarını (PROGRAM_SPEC §2.9 sözleşmesi) denetler.
 * Uygulama (nav-data / footer / sitemap / dock / changelog …) INTEGRATE adımında ELLE yapılır; bu script yalnız
 * doğrular ve okunur bir özet basar.
 *
 * Kullanım:
 *   node scripts/apply-registry.mjs --check .registry/W1.json [.registry/W2.json …]
 *   node scripts/apply-registry.mjs --check --root ../iai-w1 .registry/W1.json   # başka worktree'de sayfa arar
 *   node scripts/apply-registry.mjs --check --json .registry/*.json               # makine okunur çıktı
 *
 * Kontroller:
 *   1. Şema: yalnız bilinen anahtarlar; her girişte zorunlu alanlar ve tipler.
 *   2. href/path hedefi: app/(marketing)|(home)|app/<yol>/page.tsx var mı (anchor #… atılır; /arac/<slug> ve
 *      /sektor/<slug> gibi dinamik yollar için önce birebir, sonra [slug] klasörü denenir).
 *   3. registryEnable slug'ları apps/web/src/lib/tool-registry.ts TOOL_REGISTRY içinde var mı.
 *   4. docsIndex dosyaları var mı; blogInlineTools.toolSlug registry'de mi; capabilities.status geçerli mi.
 * Çıkış kodu: hata varsa 1.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--') && !a.includes('=')));
const rootIdx = args.indexOf('--root');
const ROOT = rootIdx !== -1 && args[rootIdx + 1] ? path.resolve(process.cwd(), args[rootIdx + 1]) : REPO_ROOT;
const files = args.filter((a, i) => !a.startsWith('--') && !(rootIdx !== -1 && i === rootIdx + 1));

if (!flags.has('--check') || files.length === 0) {
  console.error('Kullanım: node scripts/apply-registry.mjs --check [--root <repo>] [--json] <dosya.json …>');
  process.exit(2);
}

const APP_DIR = path.join(ROOT, 'apps/web/src/app');
const REGISTRY_TS = path.join(ROOT, 'apps/web/src/lib/tool-registry.ts');

// ── Şema ────────────────────────────────────────────────────────────────────
const KNOWN_KEYS = new Set([
  'work',
  'nav',
  'footer',
  'sitemap',
  'dock',
  'dashboardTools',
  'registryEnable',
  'adminNav',
  'layoutSlots',
  'blogInlineTools',
  'blogSpread',
  'capabilities',
  'llmsTxt',
  'docsIndex',
  'changelog',
]);

const str = (v) => typeof v === 'string' && v.trim().length > 0;
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const strOrNull = (v) => v === null || v === undefined || typeof v === 'string';

/** Alan → doğrulayıcı; `?` opsiyonel */
const SHAPES = {
  nav: { panel: str, section: str, href: str, title: str, description: str, 'badge?': strOrNull },
  footer: { column: str, href: str, label: str },
  sitemap: {
    path: str,
    priority: (v) => num(v) && v >= 0 && v <= 1,
    change: (v) => ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'].includes(v),
    lastmod: (v) => str(v) && /^[A-Z_]+$|^\d{4}-\d{2}-\d{2}$/.test(v),
  },
  dock: { href: str, label: str, desc: str, icon: str, cat: str },
  dashboardTools: { slug: str, icon: str, category: str },
  adminNav: { href: str, label: str, icon: str, order: num },
  layoutSlots: {
    layout: (v) => ['home', 'marketing', 'dashboard', 'admin', 'pricing'].includes(v),
    component: str,
    'props?': (v) => v == null || (typeof v === 'object' && !Array.isArray(v)),
    import: str,
  },
  blogInlineTools: { slug: str, toolSlug: str, title: str, body: str },
  capabilities: {
    key: str,
    label: str,
    status: (v) => ['live', 'beta', 'roadmap'].includes(v),
    'note?': strOrNull,
  },
  llmsTxt: { section: str, href: str, label: str, 'note?': strOrNull },
  docsIndex: { file: str, title: str },
  changelog: { type: (v) => ['NEW', 'IMPROVED', 'FIXED'].includes(v), item: str },
};

function checkShape(kind, entry, idx, errors) {
  const shape = SHAPES[kind];
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    errors.push(`${kind}[${idx}]: nesne olmalı`);
    return;
  }
  for (const [rawKey, validate] of Object.entries(shape)) {
    const optional = rawKey.endsWith('?');
    const key = optional ? rawKey.slice(0, -1) : rawKey;
    const v = entry[key];
    if (v === undefined) {
      if (!optional) errors.push(`${kind}[${idx}]: '${key}' eksik`);
      continue;
    }
    if (!validate(v)) errors.push(`${kind}[${idx}]: '${key}' geçersiz (${JSON.stringify(v)})`);
  }
  const allowed = new Set(Object.keys(shape).map((k) => k.replace(/\?$/, '')));
  for (const k of Object.keys(entry)) if (!allowed.has(k)) errors.push(`${kind}[${idx}]: bilinmeyen alan '${k}'`);
}

// ── Sayfa varlığı ──────────────────────────────────────────────────────────
const ROUTE_GROUPS = ['(marketing)', '(home)', ''];

function pageExists(href) {
  const clean = href.split('#')[0].split('?')[0].replace(/\/+$/, '') || '/';
  const segs = clean === '/' ? [] : clean.slice(1).split('/');
  for (const group of ROUTE_GROUPS) {
    const base = group ? path.join(APP_DIR, group) : APP_DIR;
    if (fs.existsSync(path.join(base, ...segs, 'page.tsx'))) return true;
    // dinamik segment: son parça [slug]/[token] vb.
    if (segs.length) {
      const parent = path.join(base, ...segs.slice(0, -1));
      if (fs.existsSync(parent)) {
        const dyn = fs.readdirSync(parent).find((d) => /^\[.+\]$/.test(d));
        if (dyn && fs.existsSync(path.join(parent, dyn, 'page.tsx'))) return true;
      }
    }
  }
  return false;
}

function anchorExists(href) {
  const [p, hash] = href.split('#');
  if (!hash) return true;
  const clean = (p || '/').split('?')[0].replace(/\/+$/, '') || '/';
  const segs = clean === '/' ? [] : clean.slice(1).split('/');
  for (const group of ROUTE_GROUPS) {
    const base = group ? path.join(APP_DIR, group) : APP_DIR;
    const file = path.join(base, ...segs, 'page.tsx');
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, 'utf8');
    if (new RegExp(`id=["'{]\\s*["']?${hash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?`).test(src)) return true;
    // bileşene devredilmiş olabilir: aynı dizindeki tsx dosyaları
    const dir = path.dirname(file);
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.tsx') || f === 'page.tsx') continue;
      if (fs.readFileSync(path.join(dir, f), 'utf8').includes(`"${hash}"`)) return true;
    }
    return 'unknown';
  }
  return 'unknown';
}

// ── Registry slug'ları ─────────────────────────────────────────────────────
function registrySlugs() {
  if (!fs.existsSync(REGISTRY_TS)) return null;
  const src = fs.readFileSync(REGISTRY_TS, 'utf8');
  const out = new Set();
  for (const m of src.matchAll(/^\s*slug:\s*'([a-z0-9-]+)'/gm)) out.add(m[1]);
  return out;
}

// ── Ana döngü ──────────────────────────────────────────────────────────────
const slugs = registrySlugs();
const report = [];
let totalErrors = 0;

for (const file of files) {
  const abs = path.resolve(process.cwd(), file);
  const errors = [];
  const warnings = [];
  const counts = {};
  let json;
  try {
    json = JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (err) {
    errors.push(`JSON okunamadı: ${err.message}`);
    report.push({ file, errors, warnings, counts });
    totalErrors += errors.length;
    continue;
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) errors.push('kök nesne olmalı');
  else {
    if (!/^W[0-9]+$|^INT$|^PREP$/.test(json.work ?? '')) errors.push("'work' W<N> biçiminde olmalı");
    for (const key of Object.keys(json)) if (!KNOWN_KEYS.has(key)) errors.push(`bilinmeyen anahtar '${key}'`);

    for (const kind of Object.keys(SHAPES)) {
      const list = json[kind];
      if (list === undefined) continue;
      if (!Array.isArray(list)) {
        errors.push(`'${kind}' dizi olmalı`);
        continue;
      }
      counts[kind] = list.length;
      list.forEach((e, i) => checkShape(kind, e, i, errors));
    }

    // href hedefleri
    const hrefKinds = [
      ['nav', 'href'],
      ['footer', 'href'],
      ['sitemap', 'path'],
      ['dock', 'href'],
      ['adminNav', 'href'],
      ['llmsTxt', 'href'],
    ];
    for (const [kind, field] of hrefKinds) {
      for (const [i, e] of (Array.isArray(json[kind]) ? json[kind] : []).entries()) {
        const href = e?.[field];
        if (!str(href)) continue;
        if (!href.startsWith('/')) {
          errors.push(`${kind}[${i}]: '${field}' kök göreli olmalı (${href})`);
          continue;
        }
        if (!pageExists(href)) errors.push(`${kind}[${i}]: sayfa yok → ${href} (page.tsx bulunamadı)`);
        else if (anchorExists(href) === 'unknown') warnings.push(`${kind}[${i}]: anchor doğrulanamadı → ${href}`);
      }
    }

    // registryEnable
    if (json.registryEnable !== undefined) {
      if (!Array.isArray(json.registryEnable)) errors.push("'registryEnable' dizi olmalı");
      else {
        counts.registryEnable = json.registryEnable.length;
        for (const s of json.registryEnable) {
          if (!str(s)) errors.push(`registryEnable: geçersiz slug ${JSON.stringify(s)}`);
          else if (slugs && !slugs.has(s)) errors.push(`registryEnable: '${s}' TOOL_REGISTRY'de yok`);
          else if (!pageExists(`/arac/${s}`)) errors.push(`registryEnable: '${s}' için /arac/${s}/page.tsx yok`);
        }
      }
    }
    if (!slugs) warnings.push('tool-registry.ts okunamadı; slug kontrolü atlandı');

    // dashboardTools
    for (const [i, e] of (Array.isArray(json.dashboardTools) ? json.dashboardTools : []).entries()) {
      if (str(e?.slug) && slugs && !slugs.has(e.slug)) errors.push(`dashboardTools[${i}]: '${e.slug}' registry'de yok`);
    }
    // blogInlineTools
    for (const [i, e] of (Array.isArray(json.blogInlineTools) ? json.blogInlineTools : []).entries()) {
      if (str(e?.toolSlug) && slugs && !slugs.has(e.toolSlug))
        errors.push(`blogInlineTools[${i}]: toolSlug '${e.toolSlug}' registry'de yok`);
    }
    // docsIndex
    for (const [i, e] of (Array.isArray(json.docsIndex) ? json.docsIndex : []).entries()) {
      if (str(e?.file) && !fs.existsSync(path.join(ROOT, e.file)))
        errors.push(`docsIndex[${i}]: dosya yok → ${e.file}`);
    }
    // blogSpread
    if (json.blogSpread !== undefined) {
      if (!Array.isArray(json.blogSpread) || !json.blogSpread.every((b) => /^BATCH_\d+$/.test(b)))
        errors.push("'blogSpread' BATCH_<N> listesi olmalı");
      else counts.blogSpread = json.blogSpread.length;
    }
    // layoutSlots import yolu
    for (const [i, e] of (Array.isArray(json.layoutSlots) ? json.layoutSlots : []).entries()) {
      if (str(e?.import) && e.import.startsWith('@/')) {
        const rel = e.import.slice(2);
        const base = path.join(ROOT, 'apps/web/src', rel);
        if (!['.tsx', '.ts', '/index.tsx', '/index.ts'].some((ext) => fs.existsSync(base + ext)))
          errors.push(`layoutSlots[${i}]: import bulunamadı → ${e.import}`);
      }
    }
  }
  totalErrors += errors.length;
  report.push({ file, work: json?.work, errors, warnings, counts });
}

if (flags.has('--json')) {
  console.log(JSON.stringify({ ok: totalErrors === 0, root: ROOT, report }, null, 2));
} else {
  for (const r of report) {
    const status = r.errors.length ? 'HATA' : 'OK';
    const summary = Object.entries(r.counts)
      .map(([k, v]) => `${k}×${v}`)
      .join(' · ');
    console.log(`[${status}] ${r.file}${r.work ? ` (${r.work})` : ''} — ${summary || 'giriş yok'}`);
    for (const e of r.errors) console.log(`   ✗ ${e}`);
    for (const w of r.warnings) console.log(`   ! ${w}`);
  }
  console.log(totalErrors === 0 ? '\nTüm registry dosyaları geçerli.' : `\n${totalErrors} hata.`);
}
process.exit(totalErrors === 0 ? 0 : 1);
