/**
 * Pazarlama kopyası dürüstlük testi (W7).
 *
 * Kaynak dosyaları (kodun kendisini) tarar; render etmez. Amaç: landing ve pazarlama sayfalarında
 * yasak ifadeler (garanti, "Türkiye'nin ilk", eski marka, "6 ay", "13 GEO", "hükmed…"), yanlış TÜİK yılı,
 * etiketsiz temsili veri ve kodda karşılığı olmayan vaatler yeniden sızmasın.
 *
 * Allowlist (spec §2 W7): legal/*, blog/*, about sayfasındaki "eski adıyla Independent AI" cümlesi,
 * tüzel kişi yazımı "Yanıt (Independent AI)" (contact/legal; sabah kararı #11) ve sürüm notlarındaki
 * "kaldırıldı" bağlamı.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { CAPABILITIES } from '@independentai/shared';
import { SAAS_ITEMS, AGENCY_ITEMS } from '@/components/landing/two-paths-data';

const ROOT = path.resolve(__dirname, '../../src');
const SCAN_DIRS = ['app/(marketing)', 'app/(home)', 'components/landing', 'components/marketing'];
const EXCLUDED_DIRS = [path.join('app', '(marketing)', 'legal'), path.join('app', '(marketing)', 'blog')];

type Source = { rel: string; text: string; lines: string[] };

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

function loadSources(): Source[] {
  const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
  return files
    .map((full) => ({ rel: path.relative(ROOT, full), text: readFileSync(full, 'utf8') }))
    .filter((s) => !EXCLUDED_DIRS.some((ex) => s.rel.startsWith(ex)))
    .map((s) => ({ ...s, lines: s.text.split('\n') }));
}

const SOURCES = loadSources();

function src(rel: string): Source {
  const s = SOURCES.find((x) => x.rel === rel);
  if (!s) throw new Error(`Kaynak bulunamadı: ${rel}`);
  return s;
}

function has(rel: string): boolean {
  return existsSync(path.join(ROOT, rel));
}

/** Yorum satırları (`*`, `//`, `/*`, `{/*`) atılmış kaynak: görünür etiket kontrolleri yalnız JSX/metin satırlarında arar. */
function codeOnly(s: Source): string {
  return s.lines.filter((l) => !/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(l)).join('\n');
}

type Rule = {
  name: string;
  re: RegExp;
  /** Satır bu ifadeyi içeriyorsa ihlal sayılmaz (olumsuzlama / tarihçe bağlamı). */
  exemptLine?: RegExp;
  /**
   * Eşleşmeden başlayan ≤40 karakterlik pencerede (eşleşme + sonrası) bu ifade varsa ihlal sayılmaz.
   * Olumsuzlama kelimeye bitişik olmalı ("garanti vermiyoruz", "garantili iş yok"); aynı satırdaki
   * uzak bir "yok" ("…garantisi veriyoruz; riskiniz yok") muafiyet sağlamaz.
   */
  exemptAdjacent?: RegExp;
};

const ADJACENT_WINDOW = 40;

const RULES: Rule[] = [
  { name: '"6 ay" (eski lansman teklifi)', re: /\b6 ay(?![a-zA-ZğüşıöçĞÜŞİÖÇ])/g, exemptLine: /kaldırıldı/ },
  {
    name: '"Independent AI" (eski marka)',
    re: /Independent AI/g,
    exemptLine: /eski adıyla Independent AI|Yanıt \(Independent AI\)/,
  },
  {
    name: '"garanti" (vaat dili)',
    re: /garanti/gi,
    exemptAdjacent:
      /^garanti\S*(\s+\S+)?\s+(yok|yoktur|değil|değildir|vermiyoruz|vermeyiz|vermez|etmiyoruz|sunmuyoruz|yazmama\S*|iddiası yok|sözü yok)\b|^garantisi[”"'’]?\s+gibi ifadelerden kaçının/i,
  },
  { name: '"Türkiye\'nin ilk" (klişe)', re: /Türkiye['’]nin ilk/gi },
  { name: '"13 GEO" (yanlış araç sayısı)', re: /13 GEO/g },
  { name: '"hükmed…" (klişe)', re: /hükmed/gi },
];

function findViolations(rule: Rule, sources: Source[] = SOURCES): string[] {
  const out: string[] = [];
  for (const s of sources) {
    s.lines.forEach((line, i) => {
      if (rule.exemptLine && rule.exemptLine.test(line)) return;
      const re = new RegExp(rule.re.source, rule.re.flags.includes('g') ? rule.re.flags : rule.re.flags + 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(line))) {
        if (rule.exemptAdjacent) {
          const window = line.slice(m.index, m.index + m[0].length + ADJACENT_WINDOW);
          if (rule.exemptAdjacent.test(window)) continue;
        }
        out.push(`${s.rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
      }
    });
  }
  return out;
}

describe('yasak ifadeler (pazarlama + landing kaynakları)', () => {
  it('tarama kapsamı boş değil', () => {
    expect(SOURCES.length).toBeGreaterThan(20);
    expect(SOURCES.some((s) => s.rel.includes('legal'))).toBe(false);
    expect(SOURCES.some((s) => s.rel.includes(path.join('(marketing)', 'blog')))).toBe(false);
  });

  for (const rule of RULES) {
    it(`yok: ${rule.name}`, () => {
      expect(findViolations(rule)).toEqual([]);
    });
  }

  it('garanti kuralı: olumlu vaat, uzaktaki "yok" ile muaf olmaz; bitişik olumsuzlama muaf', () => {
    const garanti = RULES.find((r) => r.re.source === 'garanti')!;
    const fake = (text: string): Source => ({ rel: 'fake.tsx', text, lines: text.split('\n') });
    expect(findViolations(garanti, [fake('Sonuç garantisi veriyoruz; riskiniz yok.')])).toHaveLength(1);
    expect(findViolations(garanti, [fake('Sıralama garantisi sunuyoruz, kaybedecek bir şeyiniz yok.')])).toHaveLength(
      1,
    );
    expect(findViolations(garanti, [fake('Garanti vermiyoruz; ölçer ve gösteririz.')])).toEqual([]);
    expect(findViolations(garanti, [fake('Sonuç sözü ya da “garantili” iş yok.')])).toEqual([]);
    expect(findViolations(garanti, [fake('“hasta garantisi” gibi ifadelerden kaçının.')])).toEqual([]);
  });

  it('mailto yok — "Ekiple görüş" ve satış bağlantıları /contact#sales’e gider (contact W6’nın)', () => {
    const own = SOURCES.filter((s) => !s.rel.startsWith(path.join('app', '(marketing)', 'contact')));
    expect(findViolations({ name: 'mailto', re: /mailto:/g }, own)).toEqual([]);
  });

  it('Yanıt Agency anlatımında "PR" iddiası yok', () => {
    const targets = [
      src(path.join('app', '(marketing)', 'yanit-agency', 'page.tsx')),
      src(path.join('components', 'landing', 'two-paths.tsx')),
      src(path.join('components', 'landing', 'two-paths-data.ts')),
      src(path.join('components', 'landing', 'case-study.tsx')),
    ];
    expect(findViolations({ name: 'PR', re: /\bPR\b|dijital pr/g }, targets)).toEqual([]);
    expect(findViolations({ name: 'Dijital PR', re: /Dijital PR/gi }, targets)).toEqual([]);
  });
});

describe('TÜİK yıl çifti (%92,3 → 2026, %19,2 → 2025)', () => {
  function windows(re: RegExp): { where: string; near: string }[] {
    const out: { where: string; near: string }[] = [];
    for (const s of SOURCES) {
      let m: RegExpExecArray | null;
      const r = new RegExp(re.source, 'g');
      while ((m = r.exec(s.text))) {
        const near = s.text.slice(Math.max(0, m.index - 120), m.index + m[0].length + 120);
        out.push({ where: `${s.rel}@${m.index}`, near });
      }
    }
    return out;
  }

  it('%92,3 her geçtiği yerde 120 karakter içinde 2026 var, "TÜİK 2025" yok', () => {
    for (const w of windows(/(?<![\d,])92,3(?!\d)/)) {
      expect(w.near, w.where).toMatch(/2026/);
      expect(w.near, w.where).not.toMatch(/TÜİK 2025/);
    }
  });

  it('%19,2 her geçtiği yerde 120 karakter içinde 2025 var, "TÜİK 2026" yok', () => {
    for (const w of windows(/(?<![\d,])19,2(?!\d)/)) {
      expect(w.near, w.where).toMatch(/2025/);
      expect(w.near, w.where).not.toMatch(/TÜİK 2026/);
    }
  });
});

describe('temsili veri etiketleri (landing bileşenleri)', () => {
  const REPRESENTATIVE = [
    'case-study',
    'method-reveal',
    'task-board',
    'problem-action',
    'two-paths',
    'feature-bento',
    'index-teaser',
    'ceo-screen',
    'hero-scan',
  ];

  for (const name of REPRESENTATIVE) {
    it(`${name}.tsx görünür "temsili" etiketi taşır (yorum satırları sayılmaz)`, () => {
      expect(codeOnly(src(path.join('components', 'landing', `${name}.tsx`)))).toMatch(/temsili/i);
    });
  }

  it('case-study: "Temsili senaryo — gerçek vaka değil" + .example alan adı; gerçek vaka iddiası yok', () => {
    const t = src(path.join('components', 'landing', 'case-study.tsx')).text;
    expect(t).toMatch(/Temsili senaryo/);
    expect(t).toMatch(/gerçek vaka değil/i);
    expect(t).toMatch(/\.example\b/);
    expect(t).not.toMatch(/Müşterimiz ilk sırada/);
    expect(t).not.toMatch(/elle yaptık/i);
  });

  it('method-reveal: .example alan adları, uydurma otorite puanı yok', () => {
    const t = src(path.join('components', 'landing', 'method-reveal.tsx')).text;
    expect(t).toMatch(/\.example\b/);
    expect(t).not.toMatch(/otorite \{|auth:\s*\d/);
    expect(t).not.toMatch(/\.(com|net|org)\b/);
  });

  it('demo alan adı .example (acme.com değil)', () => {
    const t = src(path.join('components', 'landing', 'demo.ts')).text;
    expect(t).toMatch(/domain:\s*'[a-z0-9-]+\.example'/);
  });

  for (const name of ['task-board', 'problem-action', 'two-paths', 'feature-bento']) {
    it(`${name}.tsx "Yapılacaklar · yakında" rozeti taşır (Task modeli kodda yok; yorum satırları sayılmaz)`, () => {
      expect(codeOnly(src(path.join('components', 'landing', `${name}.tsx`)))).toMatch(/yakında/);
    });
  }
});

describe('two-paths: kodda olmayan özellik vaadi yok', () => {
  const byKey = new Map(CAPABILITIES.map((c) => [c.key, c.status]));

  it('SaaS listesi yalnız tanımlı yeteneklere işaret eder', () => {
    expect(SAAS_ITEMS.length).toBeGreaterThanOrEqual(5);
    for (const item of SAAS_ITEMS) {
      const status = byKey.get(item.capability);
      expect(status, `${item.label} → ${item.capability}`).toBeDefined();
      expect(['live', 'beta'], `${item.label} → ${item.capability} (${status})`).toContain(status);
    }
  });

  it('Agency listesi hizmet dilinde; PR/garanti yok', () => {
    expect(AGENCY_ITEMS.length).toBeGreaterThanOrEqual(4);
    for (const label of AGENCY_ITEMS) {
      expect(label).not.toMatch(/\bPR\b|garanti/i);
    }
  });
});

describe('sayfalar ve anchor kimlikleri (§7.1)', () => {
  function expectId(rel: string, id: string) {
    const t = src(rel).text;
    const literal = new RegExp(`id=["']${id}["']`);
    const data = new RegExp(`id:\\s*'${id}'`);
    expect(literal.test(t) || data.test(t), `${rel} → #${id}`).toBe(true);
  }

  it('/features → #tracking #analytics #detection #tools #reports', () => {
    for (const id of ['tracking', 'analytics', 'detection', 'tools', 'reports'])
      expectId(path.join('app', '(marketing)', 'features', 'page.tsx'), id);
  });

  it('/use-cases → #saas #ecommerce #agency #enterprise', () => {
    for (const id of ['saas', 'ecommerce', 'agency', 'enterprise'])
      expectId(path.join('app', '(marketing)', 'use-cases', 'page.tsx'), id);
  });

  it('/about → #mission #team', () => {
    for (const id of ['mission', 'team']) expectId(path.join('app', '(marketing)', 'about', 'page.tsx'), id);
  });

  it('/solutions/agencies → #on-analiz #ortaklik + Yanıt Agency yönlendirmesi', () => {
    const rel = path.join('app', '(marketing)', 'solutions', 'agencies', 'page.tsx');
    for (const id of ['on-analiz', 'ortaklik']) expectId(rel, id);
    expect(src(rel).text).toMatch(/\/yanit-agency/);
    expect(src(rel).text).toMatch(/register\?src=partner/);
  });

  it('/contact → #sales #press (W6 sahibi; yalnız doğrulanır)', () => {
    for (const id of ['sales', 'press']) expectId(path.join('app', '(marketing)', 'contact', 'page.tsx'), id);
  });

  it('/docs → #skorlar bölümü ve public /api/tools belgesi', () => {
    const rel = path.join('app', '(marketing)', 'docs', 'page.tsx');
    expectId(rel, 'skorlar');
    expect(src(rel).text).toMatch(/\/api\/tools\//);
  });

  it('/features: Yanıt Agency fiyatı statik OFFER değil, getOffer() üzerinden (tek kaynak)', () => {
    const rel = path.join('app', '(marketing)', 'features', 'page.tsx');
    const t = src(rel).text;
    expect(t).toMatch(/getOffer/);
    expect(t).toMatch(/offer\.agencyFromMonthlyTry/);
    expect(t).not.toMatch(/OFFER\.agencyFromMonthlyTry/);
    expect(t).not.toMatch(/OFFER\.saasMonthlyTry|OFFER\.trialDays/);
  });

  it('pazarlama sayfalarında admin ayarlı teklif alanları statik OFFER ile yazılmaz (trialDays/saas/agency)', () => {
    for (const s of SOURCES) {
      expect(s.text, s.rel).not.toMatch(/OFFER\.(trialDays|saasMonthlyTry|agencyFromMonthlyTry)\b/);
    }
  });

  it('/yanit-agency: OFFER üzerinden fiyat, teklifle, garanti yok, CTA /contact?src=agency', () => {
    const rel = path.join('app', '(marketing)', 'yanit-agency', 'page.tsx');
    expect(has(rel)).toBe(true);
    const t = src(rel).text;
    expect(t).toMatch(/agencyFromMonthlyTry/);
    expect(t).toMatch(/getOffer/);
    expect(t).toMatch(/teklif/i);
    expect(t).toMatch(/\/contact\?src=agency/);
    expect(t).toMatch(/buildMetadata/);
  });

  it('/bot: YanitBot açıklaması (UA, robots, iletişim) — kodla tutarlı vaatler', () => {
    const rel = path.join('app', '(marketing)', 'bot', 'page.tsx');
    expect(has(rel)).toBe(true);
    const t = src(rel).text;
    expect(t).toMatch(/YanitBot/);
    expect(t).toMatch(/robots\.txt/);
    expect(t).toMatch(/User-agent/i);
    expect(t).toMatch(/buildMetadata/);
    // Kimliğin iki yazımı da (site adresi ve /bot ekli) sayfada belgelenir.
    expect(t).toMatch(/YanitBot\/1\.0/);
    // robots.txt uyumu kodda yok → "yakında"; kesin yol UA engeli.
    expect(t).toMatch(/robots\.txt uyumu · yakında/);
    expect(t).not.toMatch(/robots\.txt yeter/);
    // Bütçe/önbellek rakamları spec §3.4 / W1-W2 kabulüyle aynı.
    expect(t).toMatch(/120 istek \/ 5 MB \/ 25 saniye/);
    expect(t).not.toMatch(/200 istek|20 MB/);
    expect(t).toMatch(/10 dakikaya kadar/);
    expect(t).not.toMatch(/24 saat içinde döneriz/);
  });

  it('rank checker sayfaları FAQ JSON-LD taşır', () => {
    expect(src(path.join('components', 'marketing', 'rank-checker-page.tsx')).text).toMatch(/FaqJsonLd/);
  });

  it('final-cta ve two-paths Yanıt Agency yolunu /yanit-agency ya da /contact#sales ile bağlar', () => {
    expect(src(path.join('components', 'landing', 'final-cta.tsx')).text).toMatch(/\/yanit-agency/);
    expect(src(path.join('components', 'landing', 'two-paths.tsx')).text).toMatch(/\/yanit-agency/);
  });

  it('story.tsx: yasaklı site yönlendirmesi için işaretli yuva (INTEGRATE bağlar)', () => {
    const t = src(path.join('components', 'landing', 'story.tsx')).text;
    expect(t).toMatch(/BlockedSiteHintSlot/);
    expect(t).toMatch(/blocked-redirect/);
  });
});

describe('yetim bileşenler silindi', () => {
  for (const name of ['tool-bento', 'mock-dashboard', 'counter', 'prompt-card-mock']) {
    it(`components/marketing/${name}.tsx yok ve import edilmiyor`, () => {
      expect(has(path.join('components', 'marketing', `${name}.tsx`))).toBe(false);
      const importers = SOURCES.filter((s) => s.text.includes(`marketing/${name}'`));
      expect(importers.map((s) => s.rel)).toEqual([]);
    });
  }
});
