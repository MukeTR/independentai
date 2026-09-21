#!/usr/bin/env node
/**
 * Blog içerik denetimi — apps/web/src/data/blog-posts*.ts içindeki POSTS dizisini
 * tarar ve docs/BLOG_AUDIT.md raporunu üretir.
 *
 * Bağımlılık yok. TS dosyalarını geçici bir dizine kopyalayıp import yollarına
 * `.ts` uzantısı ekler ve Node 22.18+ ile gelen yerleşik tip-soyma (type
 * stripping) özelliğiyle doğrudan import eder. Eski Node sürümlerinde
 * `npx tsx scripts/blog-audit.mjs` ile de çalışır (tsx aynı dosyayı çözer).
 *
 * Kullanım:
 *   node scripts/blog-audit.mjs                      # rapor -> docs/BLOG_AUDIT.md
 *   node scripts/blog-audit.mjs --out /tmp/a.md      # farklı rapor yolu
 *   node scripts/blog-audit.mjs --json /tmp/a.json   # sayaçları JSON olarak yaz
 *   node scripts/blog-audit.mjs --compare before.json # önce/sonra tablosu ekle
 *   node scripts/blog-audit.mjs --today 2026-09-06   # "bugün" tarihini sabitle
 *   node scripts/blog-audit.mjs --data /yol/dizin     # farklı veri dizini (önce/sonra kıyası)
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Ayarlar
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = parseArgs(process.argv.slice(2));
const DATA_DIR = args.data ? path.resolve(ROOT, args.data) : path.join(ROOT, 'apps/web/src/data');
const DATA_FILES = [
  'blog-posts.ts',
  'blog-posts-batch-1.ts',
  'blog-posts-batch-2.ts',
  'blog-posts-batch-3.ts',
  'blog-posts-batch-4.ts',
];
const OUT = path.resolve(ROOT, args.out ?? 'docs/BLOG_AUDIT.md');
const JSON_OUT = args.json ? path.resolve(ROOT, args.json) : null;
const COMPARE = args.compare ? path.resolve(ROOT, args.compare) : null;
const TODAY = args.today ?? new Date().toISOString().slice(0, 10);

const THIN_WORDS = 350;
const MAX_UNSOURCED = 30;
const NEAR_JACCARD = 0.5; // başlık token kümesi kesişimi
const NEAR_SIM = 0.8; // normalize başlık Levenshtein benzerliği

/**
 * Bu geçişte veri dosyalarına uygulanan güvenli düzeltmelerin kaydı.
 * Rapor yeniden üretildiğinde kaybolmasın diye burada tutulur.
 */
const APPLIED_FIXES = [
  {
    date: '2026-09-06',
    slug: 'chatgpt-markanizi-neden-onermiyor',
    file: 'apps/web/src/data/blog-posts-batch-1.ts',
    before: 'GPT-4 örneğin Nisan 2023 kesimi ile çalışıyor olabilir.',
    after: 'GPT-5 ailesi örneğin kendi kesim tarihinden sonrasını doğrudan bilmez.',
    why: 'Eski nesil model + 2023 eğitim kesimi bilgisi bayattı',
  },
  {
    date: '2026-09-06',
    slug: 'llmler-markalari-hangi-kaynaklara-gore-oneriyor',
    file: 'apps/web/src/data/blog-posts-batch-1.ts',
    before: 'GPT-4 örneğin Nisan 2023 kesimi ile eğitilmiş olabilir; sonrası bilgisi yok.',
    after:
      'GPT-5 ailesi örneğin kendi kesim tarihine kadarki veriyle eğitilmiştir; sonrasının bilgisi eğitim verisinde yok.',
    why: 'Eski nesil model + 2023 eğitim kesimi bilgisi bayattı',
  },
  {
    date: '2026-09-06',
    slug: 'perplexity-seo-nedir',
    file: 'apps/web/src/data/blog-posts-batch-2.ts',
    before: 'Yol haritamızda Q2 2026 için Perplexity entegrasyonu var.',
    after: 'Yol haritamızda Perplexity entegrasyonu planlanıyor.',
    why: 'Q2 2026 geçti; Perplexity hâlâ yol haritasında (izlenmiyor)',
  },
];

/** Kesinlikle eskimiş / emekli model adları (hata). */
const STALE_MODEL_PATTERNS = [
  { re: /gemini[- ]?1\.5/i, label: 'Gemini 1.5 (kapatıldı)', fix: 'Gemini 2.5 Flash / 2.5 Pro' },
  { re: /gemini[- ]?2\.0/i, label: 'Gemini 2.0 (kapatıldı)', fix: 'Gemini 2.5 Flash' },
  { re: /gpt-?3\.5/i, label: 'GPT-3.5 (emekli)', fix: 'GPT-4o mini / GPT-5' },
  { re: /claude[- ]?(2|3|3\.5)\b/i, label: 'Claude 2/3/3.5 (emekli)', fix: 'Claude Haiku 4.5 / Sonnet 4.6' },
  { re: /text-davinci/i, label: 'text-davinci (emekli)', fix: 'GPT-4o mini / GPT-5' },
  { re: /\bbard\b/i, label: 'Bard (Gemini oldu)', fix: 'Gemini' },
];

/** Eskimeye yüz tutmuş referanslar (uyarı) — otomatik düzeltme yapılmaz. */
const SOFT_MODEL_PATTERNS = [
  { re: /\bgpt-?4\b(?![o.-])/i, label: 'GPT-4 (eski nesil; GPT-4o mini / GPT-5 güncel)' },
  { re: /nisan 2023 kesimi/i, label: 'Nisan 2023 eğitim kesimi (eski GPT-4 bilgisi)' },
  { re: /\bgemini[- ]?pro\b(?![- ]?(2|3))/i, label: 'Gemini Pro (sürümsüz, eski adlandırma)' },
];

/** Perplexity / Grok izlendiği izlenimi veren cümleler (ürün: roadmap). */
const ROADMAP_ENGINES = /(perplexity|grok)/i;
const TRACKING_CLAIM =
  /(izliyoruz|izleniyor|takip ediyoruz|ölçüyoruz|destekliyoruz|entegrasyonu var|entegre ettik|panelde görüyorsunuz|paneld[ea] görün)/i;

/** Sitedeki iç sayfa yolları. */
const INTERNAL_LINK_RE =
  /(^|[\s("'])\/(blog\/[a-z0-9-]+|blog\b|features|pricing|use-cases|how-it-works|docs(\/[a-z0-9-]+)?|resources\/[a-z0-9-]+)\b|independentai\.space\/[a-z0-9/.-]*/i;

/** "Şu an" anlamı taşıyan işaretler — eski yıl + bu kelimeler = bayat "güncel" iddia. */
const PRESENT_MARKERS =
  /(itibarıyla|itibariyle|itibaren|artık|şu an|şu anda|bugün|henüz|hâlâ|hala|güncel|bu yıl|geçen yıl|yakında|önümüzdeki|planl|yol harita)/i;
const PRESENT_VERB = /\S+yor(lar)?(uz|sunuz|um|sun)?[.,;:!?)\s"']/;

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

/** Türkçe'ye duyarlı küçük harf + noktalama temizliği. */
function normalizeTr(s) {
  return s
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/[’'"`]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TR_STOPWORDS = new Set([
  've',
  'ile',
  'için',
  'mi',
  'mı',
  'mu',
  'mü',
  'bir',
  'bu',
  'da',
  'de',
  'ne',
  'neden',
  'nasıl',
  'nedir',
  'ya',
  'vs',
  'ya da',
  'ki',
  'gibi',
  'en',
  'daha',
  'çok',
  'az',
]);

function tokens(s) {
  return normalizeTr(s)
    .split(' ')
    .filter((t) => t && !TR_STOPWORDS.has(t));
}

function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function similarity(a, b) {
  const d = levenshtein(a, b);
  return 1 - d / Math.max(a.length, b.length, 1);
}

/** Gövde bloklarını (kaynak, metin) çiftleri olarak düzleştirir. */
function textUnits(post) {
  const units = [{ where: 'excerpt', text: post.excerpt ?? '' }];
  for (const [i, b] of (post.body ?? []).entries()) {
    if (b.type === 'ul') {
      for (const [j, it] of (b.items ?? []).entries()) units.push({ where: `body[${i}].items[${j}]`, text: it });
    } else if (typeof b.text === 'string') {
      units.push({ where: `body[${i}]`, text: b.text });
    }
  }
  return units;
}

function sentences(text) {
  return text
    .split(/(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ0-9"“(])/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

function wordCount(post) {
  return (post.body ?? []).reduce((acc, b) => {
    if (b.type === 'ul') return acc + (b.items ?? []).join(' ').split(/\s+/).filter(Boolean).length;
    if (typeof b.text === 'string') return acc + b.text.split(/\s+/).filter(Boolean).length;
    return acc;
  }, 0);
}

function snippet(text, re, width = 150) {
  if (!re) return clip(text, width);
  const m = re.exec(text);
  if (!m) return clip(text, width);
  const start = Math.max(0, m.index - Math.floor(width / 2));
  const s = text.slice(start, start + width);
  return (start > 0 ? '…' : '') + s + (start + width < text.length ? '…' : '');
}

function clip(text, width = 150) {
  return text.length > width ? text.slice(0, width) + '…' : text;
}

function mdCell(s) {
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function table(headers, rows) {
  if (!rows.length) return '_Yok._\n';
  const head = `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n`;
  return head + rows.map((r) => `| ${r.map(mdCell).join(' | ')} |`).join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Veri yükleme — TS dosyalarını geçici dizine kopyala, import yollarını .ts yap
// ---------------------------------------------------------------------------

async function loadPosts() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-audit-'));
  try {
    for (const f of DATA_FILES) {
      const src = fs.readFileSync(path.join(DATA_DIR, f), 'utf8');
      const patched = src.replace(/from '(\.\/blog-posts[^']*)'/g, (m, p) =>
        p.endsWith('.ts') ? m : `from '${p}.ts'`,
      );
      fs.writeFileSync(path.join(tmp, f), patched);
    }
    const mod = await import(pathToFileURL(path.join(tmp, 'blog-posts.ts')).href);
    if (!Array.isArray(mod.POSTS)) throw new Error('POSTS dizisi bulunamadı');
    return mod.POSTS;
  } catch (err) {
    console.error('[blog-audit] TS verisi yüklenemedi. Node >= 22.18 (yerleşik tip soyma) gerekir;');
    console.error('             alternatif: `npx tsx scripts/blog-audit.mjs`');
    throw err;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Denetimler
// ---------------------------------------------------------------------------

function audit(posts) {
  const issues = {
    duplicateSlugs: [],
    duplicateTitles: [],
    nearDuplicateTitles: [],
    thin: [],
    staleModels: [],
    softModels: [],
    roadmapClaims: [],
    yearClaims: [],
    badDates: [],
    noInternalLinks: [],
    unsourced: [],
  };

  // 1) Yinelenen slug
  const bySlug = new Map();
  for (const p of posts) bySlug.set(p.slug, (bySlug.get(p.slug) ?? 0) + 1);
  for (const [slug, n] of bySlug) if (n > 1) issues.duplicateSlugs.push({ slug, count: n });

  // 2) Yinelenen / yakın-yinelenen başlık
  const normTitles = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    norm: normalizeTr(p.title),
    toks: tokens(p.title),
  }));
  const seenNorm = new Map();
  for (const t of normTitles) {
    if (seenNorm.has(t.norm)) issues.duplicateTitles.push({ a: seenNorm.get(t.norm), b: t.slug, title: t.title });
    else seenNorm.set(t.norm, t.slug);
  }
  for (let i = 0; i < normTitles.length; i++) {
    for (let j = i + 1; j < normTitles.length; j++) {
      const a = normTitles[i];
      const b = normTitles[j];
      if (a.norm === b.norm) continue;
      const jac = jaccard(a.toks, b.toks);
      const sim = similarity(a.norm, b.norm);
      if (jac >= NEAR_JACCARD || sim >= NEAR_SIM) {
        issues.nearDuplicateTitles.push({
          a: a.slug,
          b: b.slug,
          titleA: a.title,
          titleB: b.title,
          jaccard: jac.toFixed(2),
          sim: sim.toFixed(2),
        });
      }
    }
  }

  // Slug bazlı yakın-başlık kümesi (thin öneri için)
  const nearDupSlugs = new Set();
  for (const d of issues.nearDuplicateTitles) {
    nearDupSlugs.add(d.a);
    nearDupSlugs.add(d.b);
  }

  for (const p of posts) {
    const units = textUnits(p);
    const wc = wordCount(p);
    const allText = units.map((u) => u.text).join('\n') + '\n' + p.title;

    // 3) İnce içerik
    if (wc < THIN_WORDS) {
      let rec;
      if (nearDupSlugs.has(p.slug)) rec = 'birleştir (yakın başlıklı yazı var)';
      else if (wc < 150) rec = 'genişlet; yakın vadede mümkün değilse noindex';
      else rec = 'genişlet (350+ kelime, özgün veri/örnek ekle)';
      issues.thin.push({ slug: p.slug, words: wc, title: p.title, rec });
    }

    // 4) Eski model adları
    for (const u of units.concat([{ where: 'title', text: p.title }])) {
      for (const pat of STALE_MODEL_PATTERNS) {
        if (pat.re.test(u.text))
          issues.staleModels.push({
            slug: p.slug,
            where: u.where,
            label: pat.label,
            fix: pat.fix,
            snippet: snippet(u.text, pat.re),
          });
      }
      for (const pat of SOFT_MODEL_PATTERNS) {
        if (pat.re.test(u.text))
          issues.softModels.push({ slug: p.slug, where: u.where, label: pat.label, snippet: snippet(u.text, pat.re) });
      }
    }

    // 4b) Perplexity/Grok "izliyoruz" iddiası
    for (const u of units) {
      for (const s of sentences(u.text)) {
        if (
          ROADMAP_ENGINES.test(s) &&
          TRACKING_CLAIM.test(s) &&
          !/(yol harita|planl|henüz|manuel|kendiniz|şimdilik)/i.test(s)
        ) {
          issues.roadmapClaims.push({ slug: p.slug, where: u.where, snippet: clip(s) });
        }
      }
    }

    // 5) Eski yıl "güncel" iddiası + geçmişte kalmış "gelecek" tarihler
    const todayYear = Number(TODAY.slice(0, 4));
    const todayQ = Math.ceil(Number(TODAY.slice(5, 7)) / 3);
    for (const u of units) {
      for (const s of sentences(u.text)) {
        const yearM = s.match(/\b(202[0-5])\b/);
        if (yearM && Number(yearM[1]) < todayYear && (PRESENT_MARKERS.test(s) || PRESENT_VERB.test(s + ' '))) {
          issues.yearClaims.push({
            slug: p.slug,
            where: u.where,
            year: yearM[1],
            kind: 'eski yıl, şimdiki zaman',
            snippet: clip(s),
          });
          continue;
        }
        // "Q2 2026 için ... planlıyoruz" gibi, artık geçmişte kalan gelecek vaatleri
        const qM = s.match(
          /\b(?:Q([1-4])\s*(\d{4})|(\d{4})\s*Q([1-4])|(\d{4})\s+(ilk|birinci|ikinci)\s+(çeyre|yarı))/i,
        );
        if (qM && /(yol harita|planl|için|yakında|hedef)/i.test(s)) {
          const yr = Number(qM[2] ?? qM[3] ?? qM[5]);
          const q = qM[1] ? Number(qM[1]) : qM[4] ? Number(qM[4]) : qM[6] ? (/(ilk|birinci)/i.test(qM[6]) ? 1 : 2) : 0;
          if (yr < todayYear || (yr === todayYear && q && q < todayQ)) {
            issues.yearClaims.push({
              slug: p.slug,
              where: u.where,
              year: `${yr} Q${q}`,
              kind: 'geçmişte kalmış gelecek vaadi',
              snippet: clip(s),
            });
          }
        }
      }
    }

    // 6) Tarih geçerliliği
    const d = p.publishedAt;
    const valid =
      /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d;
    if (!valid) issues.badDates.push({ slug: p.slug, publishedAt: d, reason: 'geçersiz tarih' });
    else if (d > TODAY) issues.badDates.push({ slug: p.slug, publishedAt: d, reason: 'gelecek tarih' });

    // 7) İç link
    if (!INTERNAL_LINK_RE.test(allText)) issues.noInternalLinks.push({ slug: p.slug, title: p.title, words: wc });

    // 8) Kaynaksız sayısal iddialar
    for (const u of units) {
      const sents = sentences(u.text);
      for (const [k, s] of sents.entries()) {
        // Sayıya bitişik yüzde ("%43", "25 %", "yüzde 40") — "(0-100%)" gibi tanımlar hariç
        const hasPct = /(%\s?\d|\d\s?%(?!\))|yüzde\s+\d)/i.test(s);
        // Araştırma/rapor sözcüğü + iddia niteliğinde bir sayı (birimli sayı veya yıl)
        const researchWord =
          /\b(araştırma(sı|ya|da|lar|ları|sına|sında)?|çalışma(sı|da|ya|lar|ları|sında)?|rapor(u|una|unda|lar|ları)?|anket(i|e|ler|leri)?|istatistik(ler|leri)?|verilerine göre|verisine göre)\b/iu.test(
            s,
          );
        const claimNumber =
          /\d+([.,]\d+)?\s?(milyon|milyar|bin|kat|x\b|kişi|firma|kullanıcı|site|sorgu|marka|şirket|ülke)|\b(19|20)\d{2}\b/i.test(
            s,
          );
        const hasResearch = researchWord && claimNumber;
        if (!hasPct && !hasResearch) continue;
        // Emir kipi / yönerge cümleleri iddia değil ("raporu alın", "ayırın")
        if (!hasPct && /(alın|ayırın|hazırlayın|yazın|üretin|tanımlayın|yapın)\.?$/i.test(s)) continue;
        const near = [sents[k - 1], s, sents[k + 1]].filter(Boolean).join(' ');
        const hasLink = /https?:\/\/|www\.|kaynak:|\(kaynak/i.test(near);
        if (hasLink) continue;
        const named =
          /(Gartner|Statista|McKinsey|Forrester|Nielsen|Pew|Semrush|SEMrush|Ahrefs|BrightEdge|Similarweb|OpenAI|Google|Anthropic|Deloitte|PwC|IDC|HubSpot|Bain|BCG|Stanford|MIT|Harvard|Ipsos|YouGov|TÜİK|Deloitte)/.test(
            s,
          );
        const self =
          /(kendi (test|ölç|veri|analiz|gözlem)|müşterilerimiz|test ettik|ölçtük|gözlemledik|panelimiz)/i.test(s);
        const score = (hasPct ? 2 : 0) + (hasResearch ? 2 : 0) + (named ? -1 : 0) + (self ? -1 : 0);
        issues.unsourced.push({
          slug: p.slug,
          where: u.where,
          score,
          tag: named ? 'isimli kaynak, link yok' : self ? 'kendi verisi' : 'kaynaksız',
          snippet: clip(s, 170),
        });
      }
    }
  }

  issues.unsourced.sort((a, b) => b.score - a.score);
  issues.thin.sort((a, b) => a.words - b.words);

  return issues;
}

function counts(issues, posts) {
  return {
    posts: posts.length,
    duplicateSlugs: issues.duplicateSlugs.length,
    duplicateTitles: issues.duplicateTitles.length,
    nearDuplicateTitles: issues.nearDuplicateTitles.length,
    thin: issues.thin.length,
    staleModels: issues.staleModels.length,
    softModels: issues.softModels.length,
    roadmapClaims: issues.roadmapClaims.length,
    yearClaims: issues.yearClaims.length,
    badDates: issues.badDates.length,
    noInternalLinks: issues.noInternalLinks.length,
    unsourced: issues.unsourced.length,
  };
}

const COUNT_LABELS = {
  posts: 'Toplam yazı',
  duplicateSlugs: 'Yinelenen slug',
  duplicateTitles: 'Yinelenen başlık (birebir)',
  nearDuplicateTitles: 'Yakın-yinelenen başlık çifti',
  thin: `İnce içerik (< ${THIN_WORDS} kelime)`,
  staleModels: 'Eski/emekli model adı (hata)',
  softModels: 'Eskimeye yüz tutmuş model referansı (uyarı)',
  roadmapClaims: 'Perplexity/Grok "izliyoruz" iddiası',
  yearClaims: 'Bayat yıl iddiası / geçmişte kalmış vaat',
  badDates: 'Geçersiz veya gelecek publishedAt',
  noInternalLinks: 'Gövdede iç link yok',
  unsourced: 'Kaynaksız sayısal iddia (toplam cümle)',
};

// ---------------------------------------------------------------------------
// Rapor
// ---------------------------------------------------------------------------

function renderReport(posts, issues, before) {
  const c = counts(issues, posts);
  const lines = [];
  lines.push('# Blog içerik denetimi');
  lines.push('');
  lines.push(
    `Üretim: \`node scripts/blog-audit.mjs\` · Tarih: ${TODAY} · Kaynak: \`apps/web/src/data/blog-posts*.ts\``,
  );
  lines.push('');
  lines.push('## Özet');
  lines.push('');
  if (before) {
    lines.push(
      table(
        ['Kontrol', 'Önce', 'Sonra'],
        Object.keys(COUNT_LABELS).map((k) => [COUNT_LABELS[k], before[k] ?? '—', c[k]]),
      ),
    );
  } else {
    lines.push(
      table(
        ['Kontrol', 'Adet'],
        Object.keys(COUNT_LABELS).map((k) => [COUNT_LABELS[k], c[k]]),
      ),
    );
  }
  lines.push('');
  lines.push(
    '> Not: Blog gövdesi düz metin blokları (`p`/`h2`/`ul`…) olarak render edilir; gövde içinde tıklanabilir link desteği yoktur.',
  );
  lines.push(
    '> "İç link yok" kontrolü metinde geçen `/blog/…`, `/features`, `/pricing`, `/resources/…` yollarını arar. Şablon tarafında',
  );
  lines.push(
    '> `getRelatedPosts()` her yazıya 6 ilgili yazı bağladığı için crawl grafiği bağlıdır; ancak gövde-içi bağlamsal link sıfırdır.',
  );
  lines.push('');

  lines.push('## 1. Yinelenen slug');
  lines.push('');
  lines.push(
    table(
      ['Slug', 'Adet'],
      issues.duplicateSlugs.map((d) => [d.slug, d.count]),
    ),
  );
  lines.push('');

  lines.push('## 2. Yinelenen / yakın-yinelenen başlık');
  lines.push('');
  lines.push('### Birebir (normalize edilmiş)');
  lines.push('');
  lines.push(
    table(
      ['Slug A', 'Slug B', 'Başlık'],
      issues.duplicateTitles.map((d) => [d.a, d.b, d.title]),
    ),
  );
  lines.push('');
  lines.push(`### Yakın (token Jaccard ≥ ${NEAR_JACCARD} veya Levenshtein benzerliği ≥ ${NEAR_SIM})`);
  lines.push('');
  lines.push(
    table(
      ['Slug A', 'Slug B', 'Başlık A', 'Başlık B', 'Jaccard', 'Benzerlik'],
      issues.nearDuplicateTitles.map((d) => [d.a, d.b, d.titleA, d.titleB, d.jaccard, d.sim]),
    ),
  );
  lines.push('');

  lines.push(`## 3. İnce içerik (< ${THIN_WORDS} kelime)`);
  lines.push('');
  lines.push('AI dolgu metniyle şişirilmedi; öneri sütunu editoryal karar içindir. Slug değiştirilmez (indeksli).');
  lines.push('');
  lines.push(
    table(
      ['Slug', 'Kelime', 'Başlık', 'Öneri'],
      issues.thin.map((t) => [t.slug, t.words, t.title, t.rec]),
    ),
  );
  lines.push('');

  lines.push('## 4. Model referansları');
  lines.push('');
  lines.push('### Eski / emekli model adları (hata — otomatik düzeltme kapsamı)');
  lines.push('');
  lines.push(
    table(
      ['Slug', 'Konum', 'Sorun', 'Önerilen', 'Alıntı'],
      issues.staleModels.map((s) => [s.slug, s.where, s.label, s.fix, s.snippet]),
    ),
  );
  lines.push('');
  lines.push('### Eskimeye yüz tutmuş referanslar (uyarı — elle gözden geçir)');
  lines.push('');
  lines.push(
    table(
      ['Slug', 'Konum', 'Sorun', 'Alıntı'],
      issues.softModels.map((s) => [s.slug, s.where, s.label, s.snippet]),
    ),
  );
  lines.push('');
  lines.push('### Perplexity / Grok "izliyoruz" iddiaları (ürün: yol haritası)');
  lines.push('');
  lines.push(
    table(
      ['Slug', 'Konum', 'Alıntı'],
      issues.roadmapClaims.map((s) => [s.slug, s.where, s.snippet]),
    ),
  );
  lines.push('');

  lines.push('## 5. Bayat yıl iddiaları (listelenir, otomatik düzeltilmez)');
  lines.push('');
  lines.push(
    `Eski bir yıl (≤ ${Number(TODAY.slice(0, 4)) - 1}) şimdiki zamanla ("itibarıyla", "-yor" …) sunuluyor ya da geçmişte kalmış bir çeyrek hedef olarak veriliyor.`,
  );
  lines.push('');
  lines.push(
    table(
      ['Slug', 'Konum', 'Yıl', 'Tür', 'Alıntı'],
      issues.yearClaims.map((y) => [y.slug, y.where, y.year, y.kind, y.snippet]),
    ),
  );
  lines.push('');

  lines.push('## 6. Geçersiz veya gelecek tarihli publishedAt');
  lines.push('');
  lines.push(
    table(
      ['Slug', 'publishedAt', 'Neden'],
      issues.badDates.map((d) => [d.slug, d.publishedAt, d.reason]),
    ),
  );
  lines.push('');

  lines.push('## 7. Gövdede iç link olmayan yazılar');
  lines.push('');
  lines.push(
    table(
      ['Slug', 'Başlık', 'Kelime'],
      issues.noInternalLinks.map((n) => [n.slug, n.title, n.words]),
    ),
  );
  lines.push('');

  lines.push(`## 8. Kaynaksız sayısal iddialar (ilk ${MAX_UNSOURCED} / toplam ${issues.unsourced.length})`);
  lines.push('');
  lines.push(
    'Cümlede `%` ya da "araştırma/çalışma/rapor/anket" geçiyor, sayı var, yakınında link veya "kaynak:" yok. Uyarı niteliğindedir.',
  );
  lines.push('');
  lines.push(
    table(
      ['Slug', 'Konum', 'Etiket', 'Alıntı'],
      issues.unsourced.slice(0, MAX_UNSOURCED).map((u) => [u.slug, u.where, u.tag, u.snippet]),
    ),
  );
  lines.push('');

  lines.push('## Uygulanan güvenli düzeltmeler');
  lines.push('');
  lines.push(
    'Slug değişmedi, yazı silinmedi, gövde yeniden yazılmadı; yalnızca eskimiş model adı / geçmişte kalmış vaat cümleleri güncellendi.',
  );
  lines.push('');
  lines.push(
    table(
      ['Tarih', 'Slug', 'Dosya', 'Önce', 'Sonra', 'Neden'],
      APPLIED_FIXES.map((f) => [f.date, f.slug, f.file, f.before, f.after, f.why]),
    ),
  );
  lines.push('');
  lines.push('## Öneriler');
  lines.push('');
  lines.push(
    `- **İnce içerik (${c.thin} yazı):** yakın başlıklı olanları tek yazıda birleştirip eski slug'dan 301 verin; 150 kelime altı ve birleşmeyecekler için genişletme takvimi yoksa \`robots: noindex\` düşünün. Slug'lara dokunmayın.`,
  );
  lines.push(
    `- **Gövde-içi link (${c.noInternalLinks} yazı):** \`BlogBody\`'ye bir \`link\` alanı ya da satır-içi \`[metin](/yol)\` desteği eklenmeden gövde içinden bağlamsal iç link verilemiyor. Bu şablon işi; içerik işi değil.`,
  );
  lines.push(
    `- **Kaynaksız iddialar (${c.unsourced} cümle):** yüzdeli iddialara kaynak adı + yıl ekleyin ya da "kendi panel verimize göre" diye netleştirin; link desteği gelince URL ekleyin.`,
  );
  lines.push(
    `- **Bayat yıl iddiaları (${c.yearClaims}):** "2025 itibarıyla … soruyor" gibi cümleleri "2025'ten bu yana" / "2026 itibarıyla" biçimine editör elden geçirsin.`,
  );
  lines.push(
    '- **Model adları:** yeni yazılarda sürümlü model adı yerine ürün adı (ChatGPT, Claude, Gemini) kullanın; sürüm gerekiyorsa güncel olanı yazın (GPT-5 / GPT-4o mini, Claude Haiku 4.5 / Sonnet 4.6, Gemini 2.5 Flash / Pro).',
  );
  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Çalıştır
// ---------------------------------------------------------------------------

const posts = await loadPosts();
const issues = audit(posts);
const c = counts(issues, posts);

let before = null;
if (COMPARE && fs.existsSync(COMPARE)) before = JSON.parse(fs.readFileSync(COMPARE, 'utf8'));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, renderReport(posts, issues, before));
if (JSON_OUT) {
  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify(c, null, 2));
}

console.log(`Blog denetimi — ${posts.length} yazı (${TODAY})`);
for (const k of Object.keys(COUNT_LABELS)) {
  if (k === 'posts') continue;
  const b = before ? `${before[k] ?? '—'} → ` : '';
  console.log(`  ${COUNT_LABELS[k].padEnd(48)} ${b}${c[k]}`);
}
console.log(`Rapor: ${path.relative(ROOT, OUT)}`);
