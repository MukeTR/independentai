/**
 * Güvenlik başlıkları (`/arac/guvenlik-basliklari`, SECURITY_HEADERS) — HSTS, CSP, XFO/COOP, nosniff/Referrer/Permissions,
 * sürüm sızıntısı, HTTP→HTTPS ve TLS sertifikası (bitiş, hostname, eski TLS). A+–F harf notu (`security-grades.ts`,
 * "yaklaşık" etiketiyle).
 *
 *  - Bütçe: https GET (gövde ≤64 KB, WAF/platform izi için) + http HEAD (yönlendirme) = 2 HTTP isteği; TLS probu
 *    HTTP değildir (≤2 soket, `probeTls`, SSRF: assertPublicUrl + guardedLookup). 10 s.
 *  - Yanlış pozitif kuralları: X-XSS-Protection / Expect-CT VARSA "kaldırın" bilgisi (puan düşürmez); Referrer-Policy,
 *    Permissions-Policy, COOP yoksa bilgi (varsa puan); CSP yok = warn (KOBİ'de nadir, fail değil); TLS probu hata →
 *    warn "ölçülemedi", ASLA fail; http:// yanıt vermiyorsa (port kapalı) warn; WAF → hüküm, skor yok.
 */
import { ScanBudget, type HeadResult } from './budget';
import { defineSiteTool } from './core';
import { parsePage, SCAN_HEADERS, type PageArtifact } from './fetch-page';
import { probeTls, type TlsProbe } from './tls-probe';
import {
  DEPRECATED_HEADERS,
  gradeFor,
  headerRows,
  HSTS_MIN_MAX_AGE,
  leaksVersion,
  parseCsp,
  parseHsts,
  type Grade,
  type HeaderRow,
} from './security-grades';
import type { Artifact, AxisSpec } from '../commerce/scoring';

export type SecurityAxis = 'hsts' | 'csp' | 'framing' | 'misc' | 'leak' | 'tls';

export const SECURITY_AXES: AxisSpec<SecurityAxis>[] = [
  {
    key: 'hsts',
    label: 'HTTPS zorlama (HSTS)',
    weight: 20,
    description: 'Strict-Transport-Security varlığı ve max-age ≥ 180 gün; http:// → https:// yönlendirmesi',
  },
  { key: 'csp', label: 'Content-Security-Policy', weight: 15, description: 'CSP varlığı (yoksa uyarı), unsafe-inline + unsafe-eval, frame-ancestors' },
  { key: 'framing', label: 'Çerçeveleme (XFO / COOP)', weight: 15, description: 'X-Frame-Options ya da frame-ancestors; COOP bilgi' },
  {
    key: 'misc',
    label: 'nosniff / Referrer / Permissions',
    weight: 20,
    description: 'X-Content-Type-Options: nosniff (yoksa uyarı); Referrer-Policy ve Permissions-Policy varsa puan, yoksa bilgi',
  },
  { key: 'leak', label: 'Sürüm sızıntısı', weight: 10, description: 'Server / X-Powered-By içinde sürüm numarası; kullanımdan kalkmış başlıklar bilgi' },
  {
    key: 'tls',
    label: 'TLS sertifikası',
    weight: 20,
    description: 'Bitişe kalan gün (<14 hata, <30 uyarı), hostname eşleşmesi, TLS 1.0/1.1 desteği, zincir doğrulaması; ölçülemezse uyarı',
  },
];

export type SecurityArtifacts = {
  /** Ana istek (https tercih edilir): başlıklar buradan okunur */
  main: Artifact;
  /** http:// varyantı (ana istek https ise); ana istek zaten http ise null */
  httpVariant: HeadResult | null;
  tls: TlsProbe | null;
  url: string;
};

export type SecurityExtra = {
  grade: Grade;
  approximate: true;
  headers: HeaderRow[];
  tls: {
    measured: boolean;
    daysLeft: number | null;
    validTo: string | null;
    issuer: string | null;
    protocol: string | null;
    legacyTls: boolean | null;
    hostnameMatch: boolean | null;
    authorized: boolean | null;
    error: string | null;
  };
  httpsRedirect: boolean | null;
  /** Ana sayfanın (WAF dışı) HTTP durumu */
  status: number;
};

const MAIN_MAX_BYTES = 64 * 1024;

function httpVariantOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return null;
    u.protocol = 'http:';
    return u.toString();
  } catch {
    return null;
  }
}

/** http:// varyantı https'e yönlendi mi (zincirde https hop'u ya da son adres https) */
export function redirectsToHttps(r: { redirects: { to: string }[]; url: string } | null): boolean | null {
  if (!r) return null;
  return r.redirects.some((h) => /^https:\/\//i.test(h.to)) || /^https:\/\//i.test(r.url);
}

export const securityTool = defineSiteTool<SecurityAxis, SecurityArtifacts, SecurityExtra>({
  kind: 'SECURITY_HEADERS',
  axes: SECURITY_AXES,
  collect: async (url, budget: ScanBudget) => {
    const httpUrl = httpVariantOf(url);
    const hostname = new URL(url).hostname;
    const [main, httpVariant, tls] = await Promise.all([
      budget.fetch(url, 10_000, { headers: SCAN_HEADERS, maxBytes: MAIN_MAX_BYTES }),
      httpUrl ? budget.head(httpUrl, 6_000, { headers: SCAN_HEADERS }) : Promise.resolve(null),
      probeTls(hostname, { timeoutMs: 5_000 }).catch((err: unknown) => ({
        ok: false,
        validTo: null,
        validFrom: null,
        daysLeft: null,
        issuer: null,
        subject: null,
        hostnameMatch: null,
        authorized: null,
        authorizationError: null,
        protocol: null,
        legacyTls: null,
        error: err instanceof Error ? err.message : 'TLS probu başarısız',
      })),
    ]);
    return { main, httpVariant, tls, url };
  },
  analyze: ({ main, httpVariant, tls, url }, s) => {
    const page: PageArtifact = parsePage(url, main);
    const h = main.headers;
    const https = /^https:\/\//i.test(page.finalUrl);
    // Ana istek http ise (kullanıcı http verdi ve https'e yönlenmedi) http→https yönlendirmesi ana zincirden okunur
    const httpsRedirect = httpVariant ? redirectsToHttps(httpVariant) : https ? true : redirectsToHttps(main);
    const httpUnreachable = !!httpVariant && (httpVariant.error === 'network' || httpVariant.error === 'timeout');

    const tlsInfo: SecurityExtra['tls'] = {
      measured: !!tls?.ok,
      daysLeft: tls?.daysLeft ?? null,
      validTo: tls?.validTo ?? null,
      issuer: tls?.issuer ?? null,
      protocol: tls?.protocol ?? null,
      legacyTls: tls?.legacyTls ?? null,
      hostnameMatch: tls?.hostnameMatch ?? null,
      authorized: tls?.authorized ?? null,
      error: tls && !tls.ok ? (tls.error ?? 'ölçülemedi') : null,
    };
    const baseExtra = {
      approximate: true as const,
      headers: headerRows(h),
      tls: tlsInfo,
      httpsRedirect,
      status: main.status,
    };

    if (page.waf) {
      s.note(
        'hsts',
        'Bot koruması nedeniyle taranamadı',
        'WAF/challenge sayfası döndü; okunan başlıklar korumaya ait olabilir, kaynak sunucunun değil. Skor üretilmedi.',
        'warn',
        `HTTP ${main.status}`,
      );
      return { page, extra: { ...baseExtra, grade: 'F' } };
    }
    if (main.status === 0 || main.error) {
      s.check(
        'hsts',
        100,
        false,
        'Siteye ulaşılamadı',
        { pass: '', fail: main.error === 'timeout' ? 'Zaman aşımı (10 sn).' : 'Ağ hatası ya da DNS çözümlenemedi; başlıklar okunamadı.' },
        { fix: 'Adresin herkese açık olduğundan emin olun; yeniden deneyin.', topic: 'https' },
      );
      return { page, extra: { ...baseExtra, grade: 'F' } };
    }

    // ── hsts ──
    const hsts = parseHsts(h.get('strict-transport-security'));
    s.check(
      'hsts',
      45,
      hsts.present,
      'Strict-Transport-Security',
      {
        pass: `HSTS var (max-age=${hsts.maxAge ?? '?'}${hsts.includeSubDomains ? '; includeSubDomains' : ''}${hsts.preload ? '; preload' : ''}).`,
        fail: https
          ? 'HSTS başlığı yok — tarayıcı ilk isteği http ile deneyebilir; kafe Wi-Fi’sinde araya girme riski.'
          : 'Site HTTPS sunmuyor; HSTS anlamlı olması için önce HTTPS gerekir.',
      },
      { fix: 'Strict-Transport-Security: max-age=15552000; includeSubDomains başlığını yalnız HTTPS yanıtlarına ekleyin.', topic: 'securityHeaders' },
    );
    if (hsts.present) {
      s.check(
        'hsts',
        25,
        hsts.maxAge != null && hsts.maxAge >= HSTS_MIN_MAX_AGE ? 'pass' : 'warn',
        'HSTS max-age ≥ 180 gün',
        {
          pass: `max-age=${hsts.maxAge} (≥ ${HSTS_MIN_MAX_AGE}).`,
          fail: '',
          warn: `max-age=${hsts.maxAge ?? 'yok'} — 15552000 (180 gün) altında; tarayıcı politikayı kısa süre hatırlar.`,
        },
        { fix: 'max-age değerini en az 15552000 yapın; tüm alt alan adları HTTPS ise includeSubDomains ekleyin.', topic: 'securityHeaders' },
      );
      if (!hsts.includeSubDomains)
        s.note('hsts', 'includeSubDomains yok', 'Alt alan adları (www, shop, api…) HTTPS ise includeSubDomains ekleyin; bilgi.', 'warn');
    }
    s.check(
      'hsts',
      30,
      httpsRedirect === true ? 'pass' : httpUnreachable ? 'warn' : 'fail',
      'HTTP → HTTPS yönlendirmesi',
      {
        pass: 'http:// istekleri https:// sürüme yönleniyor.',
        fail: 'http:// sürümü HTTPS’e yönlenmiyor — ziyaretçi şifresiz sürümde kalabilir; çift içerik riski.',
        warn: 'http:// sürümü yanıt vermedi (80 portu kapalı olabilir); yönlendirme doğrulanamadı.',
      },
      { fix: 'Sunucu/CDN’de 80 → 443 için kalıcı (301) yönlendirme tanımlayın.', topic: 'https' },
    );

    // ── csp ──
    const csp = parseCsp(h.get('content-security-policy'));
    s.check(
      'csp',
      60,
      csp.present ? 'pass' : 'warn',
      'Content-Security-Policy',
      {
        pass: 'CSP var.',
        fail: '',
        warn: 'CSP yok. KOBİ sitelerinde nadirdir; XSS etkisini sınırlamak için Report-Only ile başlanabilir.',
      },
      { fix: "Önce Content-Security-Policy-Report-Only: default-src 'self' ile deneyin; kırılanları görüp zorunlu yapın.", topic: 'securityHeaders' },
    );
    if (csp.present) {
      s.check(
        'csp',
        40,
        csp.unsafeInline && csp.unsafeEval ? 'warn' : csp.wildcardScript ? 'warn' : 'pass',
        'CSP sıkılığı',
        {
          pass: 'script kaynakları kısıtlı (unsafe-inline + unsafe-eval birlikte yok).',
          fail: '',
          warn: csp.wildcardScript
            ? "script-src/default-src '*' — her kaynağa izin; CSP fiilen boş."
            : "unsafe-inline ve unsafe-eval birlikte — CSP'nin XSS koruması büyük ölçüde devre dışı.",
        },
        { fix: 'Satır içi script’leri nonce/hash ile izinli yapın; eval gerektiren kütüphaneleri değiştirin.', topic: 'securityHeaders' },
      );
      if (!csp.frameAncestors)
        s.note('csp', 'frame-ancestors yok', 'CSP içinde frame-ancestors tanımlı değil; clickjacking için XFO’ya güveniliyor. Bilgi.', 'warn');
    }

    // ── framing ──
    const xfo = h.get('x-frame-options');
    s.check(
      'framing',
      100,
      xfo || csp.frameAncestors ? 'pass' : 'warn',
      'X-Frame-Options / frame-ancestors',
      {
        pass: xfo ? `X-Frame-Options: ${xfo}.` : 'CSP frame-ancestors tanımlı.',
        fail: '',
        warn: 'İkisi de yok — siteniz başka bir sitede iframe içinde açılabilir (clickjacking).',
      },
      { fix: 'X-Frame-Options: SAMEORIGIN (ya da CSP frame-ancestors \'self\') ekleyin.', topic: 'securityHeaders' },
    );
    if (!h.get('cross-origin-opener-policy'))
      s.note('framing', 'Cross-Origin-Opener-Policy yok', 'COOP: same-origin, açılan pencerelerin bağlamınıza erişmesini keser. Bilgi; puan düşürmez.', 'warn');

    // ── misc ──
    const nosniff = (h.get('x-content-type-options') ?? '').toLowerCase().includes('nosniff');
    s.check(
      'misc',
      50,
      nosniff ? 'pass' : 'warn',
      'X-Content-Type-Options: nosniff',
      { pass: 'nosniff var.', fail: '', warn: 'nosniff yok — tarayıcı içerik türünü tahmin edebilir (MIME sniffing).' },
      { fix: 'X-Content-Type-Options: nosniff ekleyin.', topic: 'securityHeaders' },
    );
    const referrer = h.get('referrer-policy');
    if (referrer)
      s.check('misc', 25, true, 'Referrer-Policy', { pass: `Referrer-Policy: ${referrer.slice(0, 60)}.`, fail: '' }, { topic: 'securityHeaders' });
    else s.note('misc', 'Referrer-Policy yok', 'strict-origin-when-cross-origin önerilir; bilgi, puan düşürmez.', 'warn');
    const permissions = h.get('permissions-policy');
    if (permissions)
      s.check('misc', 25, true, 'Permissions-Policy', { pass: 'Permissions-Policy var.', fail: '' }, { evidence: permissions.slice(0, 80), topic: 'securityHeaders' });
    else s.note('misc', 'Permissions-Policy yok', 'Kullanmadığınız yetenekleri kapatın: camera=(), microphone=(), geolocation=(). Bilgi.', 'warn');

    // ── leak ──
    const server = h.get('server');
    const powered = h.get('x-powered-by');
    const leaking = [server, powered].filter((v) => leaksVersion(v));
    s.check(
      'leak',
      100,
      leaking.length === 0 ? 'pass' : 'warn',
      'Sunucu sürümü gizli',
      {
        pass: server || powered ? `Sürüm bilgisi yok (${[server, powered].filter(Boolean).join(' · ').slice(0, 60)}).` : 'Server / X-Powered-By başlığı yok.',
        fail: '',
        warn: `Sürüm sızıyor: ${leaking.join(' · ').slice(0, 100)} — bilinen açıklar için hedef listesi olur.`,
      },
      { fix: 'Server ve X-Powered-By başlıklarından sürüm numarasını kaldırın (ServerTokens Prod, expose_php=Off).', evidence: leaking.join(' · ').slice(0, 120) || undefined, topic: 'securityHeaders' },
    );
    const deprecated = DEPRECATED_HEADERS.filter((d) => h.get(d));
    if (deprecated.length)
      s.note(
        'leak',
        'Kullanımdan kalkmış başlık',
        `${deprecated.join(', ')} artık tarayıcılarca yok sayılır; X-XSS-Protection bazı eski tarayıcılarda açık bile yaratır. Kaldırın (puan düşürmez).`,
        'warn',
        deprecated.join(', '),
      );

    // ── tls ──
    if (!tls || !tls.ok) {
      s.check(
        'tls',
        100,
        'warn',
        'TLS sertifikası ölçülemedi',
        { pass: '', fail: '', warn: `Sertifika bilgisi alınamadı (${tls?.error ?? 'probe yok'}); bu bir hata değil, ölçüm yapılamadı.` },
        { fix: 'Sunucunun 443 portunda TLS el sıkışmasına 5 sn içinde yanıt verdiğinden emin olun; yeniden tarayın.', topic: 'tls' },
      );
    } else {
      const d = tls.daysLeft;
      s.check(
        'tls',
        40,
        d == null ? 'warn' : d < 14 ? 'fail' : d < 30 ? 'warn' : 'pass',
        'Sertifika bitişi',
        {
          pass: `${d} gün kaldı (${tls.issuer ?? 'veren bilinmiyor'}).`,
          fail: d != null && d < 0 ? `Sertifikanın süresi ${-d} gün önce doldu — tarayıcı uyarı gösteriyor.` : `${d} gün sonra sertifikanız bitiyor — yenileme otomatik değilse site kapanır.`,
          warn: d == null ? 'Bitiş tarihi okunamadı.' : `${d} gün kaldı; yenilemeyi şimdi planlayın.`,
        },
        { fix: 'Otomatik yenilemeyi (Let’s Encrypt certbot / hosting paneli) doğrulayın.', evidence: tls.validTo ?? undefined, topic: 'tls' },
      );
      s.check(
        'tls',
        30,
        tls.hostnameMatch === false ? 'fail' : 'pass',
        'Sertifika alan adıyla eşleşiyor',
        {
          pass: tls.hostnameMatch == null ? 'Eşleşme doğrulanamadı (subject yok); hata sayılmadı.' : `Sertifika ${tls.subject ?? 'alan adı'} için geçerli.`,
          fail: 'Sertifika bu alan adı için düzenlenmemiş — tarayıcı "bağlantı güvenli değil" gösterir.',
        },
        { fix: 'Çıplak ve www sürümlerini kapsayan (SAN) bir sertifika alın.', evidence: tls.subject ?? undefined, topic: 'tls' },
      );
      if (tls.legacyTls == null)
        s.note('tls', 'Eski TLS desteği ölçülemedi', 'TLS 1.0/1.1 el sıkışması zaman aşımı ya da istemci hatasıyla sonuçlandı; iddia yok.', 'warn');
      else
        s.check(
          'tls',
          20,
          tls.legacyTls ? 'warn' : 'pass',
          'TLS 1.0 / 1.1 kapalı',
          { pass: 'Sunucu eski protokolleri reddediyor.', fail: '', warn: 'Sunucu TLS 1.0/1.1 kabul ediyor — eski, kırılabilir şifreleme.' },
          { fix: 'Yalnızca TLS 1.2 ve 1.3 açık kalsın (Mozilla “intermediate” profili).', topic: 'tls' },
        );
      s.check(
        'tls',
        10,
        tls.authorized === false ? 'warn' : 'pass',
        'Sertifika zinciri',
        {
          pass: tls.authorized == null ? 'Zincir doğrulaması bilinmiyor.' : 'Zincir sistem CA’larıyla doğrulandı.',
          fail: '',
          warn: `Zincir doğrulanamadı (${tls.authorizationError ?? 'bilinmeyen'}) — ara sertifika eksik olabilir; botlar reddedebilir.`,
        },
        { fix: 'Tam zinciri (leaf + intermediate) sunun; SSL Labs ile doğrulayın.', topic: 'tls' },
      );
      if (tls.protocol) s.note('tls', 'Anlaşılan protokol', tls.protocol, 'pass', tls.protocol);
    }

    const score = s.total();
    const grade = gradeFor(score, { hsts: hsts.present, csp: csp.present });
    return { page, extra: { ...baseExtra, grade } };
  },
});
