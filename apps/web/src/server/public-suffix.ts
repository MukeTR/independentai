/**
 * Kamu son ekleri (public suffix) — kısa liste; tam PSL gerekmez.
 *  - `isPublicSuffix('com.tr')` → true: bu ad tek başına bir site değildir (yasaklanamaz, eTLD+1 sayılmaz).
 *  - `etldPlusOne('shop.acme.com.tr')` → `acme.com.tr`; `a.b.acme.com` → `acme.com`.
 *  - `registrableLabelCount(hostname)`: hostname'in kayıt edilebilir alan adı olması için gereken etiket sayısı
 *    (2, iki seviyeli son ekte 3) — blocklist aday listesi bu sınırın altına inmez.
 * Ortak modül: blocklist.ts ve agency-signal.ts buradan okur (liste tek yerde).
 */

export const TWO_LEVEL_SUFFIX: ReadonlySet<string> = new Set([
  'com.tr',
  'net.tr',
  'org.tr',
  'gov.tr',
  'edu.tr',
  'bel.tr',
  'av.tr',
  'dr.tr',
  'k12.tr',
  'pol.tr',
  'tsk.tr',
  'gen.tr',
  'web.tr',
  'name.tr',
  'info.tr',
  'biz.tr',
  'tv.tr',
  'bbs.tr',
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'me.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.jp',
  'ne.jp',
  'or.jp',
  'com.br',
  'co.il',
  'org.il',
  'com.cn',
  'net.cn',
  'co.nz',
  'co.za',
  'com.mx',
  'com.ar',
  'com.sa',
  'com.eg',
  'co.in',
  'com.ua',
  'com.ru',
  'co.kr',
  'com.sg',
  'com.hk',
  'com.my',
  'com.pk',
  'com.ng',
  'co.id',
  'com.ph',
  'com.vn',
]);

function labelsOf(hostname: string): string[] {
  return hostname.toLowerCase().replace(/\.$/, '').split('.').filter(Boolean);
}

/** Verilen ad tam olarak bir kamu son eki mi (`tr`, `com`, `com.tr`, `co.uk` …)? */
export function isPublicSuffix(hostname: string): boolean {
  const labels = labelsOf(hostname);
  if (labels.length === 0) return false;
  if (labels.length === 1) return true; // düz TLD
  if (labels.length === 2) return TWO_LEVEL_SUFFIX.has(labels.join('.'));
  return false;
}

/** Kayıt edilebilir alan adı için gereken etiket sayısı: 2, iki seviyeli son ekte 3. */
export function registrableLabelCount(hostname: string): number {
  const labels = labelsOf(hostname);
  if (labels.length >= 2 && TWO_LEVEL_SUFFIX.has(labels.slice(-2).join('.'))) return 3;
  return 2;
}

/** eTLD+1 — `shop.acme.com.tr` → `acme.com.tr`, `a.b.acme.com` → `acme.com`. */
export function etldPlusOne(hostname: string): string {
  const labels = labelsOf(hostname);
  if (labels.length <= 2) return labels.join('.');
  const last2 = labels.slice(-2).join('.');
  return TWO_LEVEL_SUFFIX.has(last2) ? labels.slice(-3).join('.') : last2;
}
