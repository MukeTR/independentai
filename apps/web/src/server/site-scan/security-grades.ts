/**
 * Güvenlik başlıkları: sabit tablo + harf notu + saf başlık ayrıştırıcıları (`guvenlik-basliklari`).
 *  - `HEADER_GRADES`: hangi başlık, ne için, önerilen değer, eksikse durum. Kaynak: Scott Helme'in securityheaders.com
 *    notlama yaklaşımı (yaklaşık; birebir kopya değil) + OWASP Secure Headers Project önerileri.
 *  - Harf notu: A+ (skor ≥90 ve HSTS+CSP var), A ≥80, B ≥65, C ≥50, D ≥35, E ≥20, F. "Yaklaşık" etiketiyle gösterilir.
 *  - SAF: ağ yok; `Headers` nesnesi üzerinden çalışır (birim test edilebilir).
 */
export type SecurityHeaderKey =
  | 'strict-transport-security'
  | 'content-security-policy'
  | 'x-frame-options'
  | 'x-content-type-options'
  | 'referrer-policy'
  | 'permissions-policy'
  | 'cross-origin-opener-policy';

export type HeaderGrade = {
  key: SecurityHeaderKey;
  label: string;
  /** Eksikse bulgu durumu */
  missing: 'fail' | 'warn' | 'info';
  recommended: string;
  why: string;
};

export const HEADER_GRADES: readonly HeaderGrade[] = [
  {
    key: 'strict-transport-security',
    label: 'Strict-Transport-Security (HSTS)',
    missing: 'fail',
    recommended: 'max-age=15552000; includeSubDomains',
    why: 'Tarayıcıya "bu siteye yalnızca HTTPS ile bağlan" der; sahte ağlarda araya girme riskini azaltır.',
  },
  {
    key: 'content-security-policy',
    label: 'Content-Security-Policy (CSP)',
    missing: 'warn',
    recommended: "default-src 'self'; frame-ancestors 'none'",
    why: 'Hangi kaynakların yüklenebileceğini kısıtlar; XSS ve içerik enjeksiyonunun etkisini sınırlar.',
  },
  {
    key: 'x-frame-options',
    label: 'X-Frame-Options / frame-ancestors',
    missing: 'warn',
    recommended: 'SAMEORIGIN',
    why: 'Sitenizin başka bir sitede iframe içinde açılmasını (clickjacking) engeller.',
  },
  {
    key: 'x-content-type-options',
    label: 'X-Content-Type-Options',
    missing: 'warn',
    recommended: 'nosniff',
    why: 'Tarayıcının içerik türünü "tahmin etmesini" kapatır; yanlış türde çalıştırma saldırılarını önler.',
  },
  {
    key: 'referrer-policy',
    label: 'Referrer-Policy',
    missing: 'info',
    recommended: 'strict-origin-when-cross-origin',
    why: 'Başka sitelere geçerken hangi adres bilgisinin sızacağını belirler.',
  },
  {
    key: 'permissions-policy',
    label: 'Permissions-Policy',
    missing: 'info',
    recommended: 'camera=(), microphone=(), geolocation=()',
    why: 'Kullanmadığınız tarayıcı yeteneklerini (kamera, mikrofon, konum) kapatır.',
  },
  {
    key: 'cross-origin-opener-policy',
    label: 'Cross-Origin-Opener-Policy (COOP)',
    missing: 'info',
    recommended: 'same-origin',
    why: 'Açılan pencerelerin sitenizin bağlamına erişmesini engeller.',
  },
] as const;

/** Kullanımdan kalkmış — varsa "kaldırın" bilgisi (puan düşürmez). */
export const DEPRECATED_HEADERS = ['x-xss-protection', 'expect-ct', 'public-key-pins'] as const;

/** HSTS için önerilen en düşük max-age (180 gün). */
export const HSTS_MIN_MAX_AGE = 15_552_000;

export type Grade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export function gradeFor(score: number, flags: { hsts: boolean; csp: boolean }): Grade {
  if (score >= 90 && flags.hsts && flags.csp) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  if (score >= 20) return 'E';
  return 'F';
}

export type HstsInfo = { present: boolean; maxAge: number | null; includeSubDomains: boolean; preload: boolean };

export function parseHsts(value: string | null): HstsInfo {
  if (!value) return { present: false, maxAge: null, includeSubDomains: false, preload: false };
  const m = value.match(/max-age\s*=\s*"?(\d+)/i);
  return {
    present: true,
    maxAge: m ? Number(m[1]) : null,
    includeSubDomains: /includesubdomains/i.test(value),
    preload: /preload/i.test(value),
  };
}

export type CspInfo = {
  present: boolean;
  unsafeInline: boolean;
  unsafeEval: boolean;
  frameAncestors: boolean;
  /** default-src ya da script-src '*' — her kaynağa izin */
  wildcardScript: boolean;
};

/** script-src yoksa default-src geçerlidir; frame-ancestors yalnız CSP'de olabilir. */
export function parseCsp(value: string | null): CspInfo {
  if (!value) return { present: false, unsafeInline: false, unsafeEval: false, frameAncestors: false, wildcardScript: false };
  const directives = new Map<string, string>();
  for (const part of value.split(';')) {
    const t = part.trim();
    if (!t) continue;
    const sp = t.indexOf(' ');
    const name = (sp === -1 ? t : t.slice(0, sp)).toLowerCase();
    const rest = sp === -1 ? '' : t.slice(sp + 1);
    if (!directives.has(name)) directives.set(name, rest);
  }
  const script = directives.get('script-src') ?? directives.get('default-src') ?? '';
  return {
    present: true,
    unsafeInline: /'unsafe-inline'/i.test(script),
    unsafeEval: /'unsafe-eval'/i.test(script),
    frameAncestors: directives.has('frame-ancestors'),
    wildcardScript: /(^|\s)\*(\s|$)/.test(script),
  };
}

const VERSION_RE = /\d+\.\d+/;

/** `Server` / `X-Powered-By` içinde sürüm numarası var mı (ör. Apache/2.4.29, PHP/7.2). */
export function leaksVersion(value: string | null): boolean {
  return !!value && VERSION_RE.test(value);
}

export type HeaderRow = {
  key: string;
  label: string;
  present: boolean;
  /** Kısaltılmış değer (≤120 kr) */
  value: string | null;
  status: 'pass' | 'warn' | 'fail' | 'info';
};

function short(s: string, n = 120): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/** Tablo satırları — kullanıcıya gösterilen başlık envanteri (durum, eksikse tablo varsayılanı). */
export function headerRows(headers: Headers): HeaderRow[] {
  const rows: HeaderRow[] = [];
  for (const g of HEADER_GRADES) {
    let v = headers.get(g.key);
    // XFO yoksa CSP frame-ancestors da kabul edilir
    if (!v && g.key === 'x-frame-options' && parseCsp(headers.get('content-security-policy')).frameAncestors)
      v = "CSP frame-ancestors";
    rows.push({
      key: g.key,
      label: g.label,
      present: !!v,
      value: v ? short(v) : null,
      status: v ? 'pass' : g.missing,
    });
  }
  for (const d of DEPRECATED_HEADERS) {
    const v = headers.get(d);
    if (v) rows.push({ key: d, label: d, present: true, value: short(v), status: 'info' });
  }
  return rows;
}
