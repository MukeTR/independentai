/**
 * Yönlendirme zinciri (`/arac/yonlendirme-zinciri`, REDIRECTS) — http/https × www/çıplak dört varyantın son adresi,
 * hop sayısı, döngü, HTTP→HTTPS, 302/307 kalıcı amaçlı kullanım, meta refresh / JS yönlendirme ve sondaki eğik
 * çizgi tutarlılığı. Diyagram verisi `extra.variants`.
 *
 *  - Bütçe: 4 istek (her varyant GET, gövde ≤64 KB; meta refresh/JS izi ana varyantın HTML'inden), 12 s.
 *  - Zincir `safeFetch`'in kendi `redirects[]` kaydından okunur (≤4 hop; fazlası `unsafe` hatası — safe-fetch değişmez).
 *  - Yanlış pozitif kuralları: DNS'i olmayan varyant (ör. www.shop.site) fail değil, warn "yanıt vermedi"; http://
 *    port kapalıysa warn; WAF → hüküm (zincir yine gösterilir); `unsafe` hop = fail ("özel ağa gidiyor ya da 4'ten
 *    fazla adım" — ayırt edilemez).
 */
import { ScanBudget } from './budget';
import { defineSiteTool } from './core';
import { parsePage, SCAN_HEADERS, type PageArtifact } from './fetch-page';
import type { Artifact, AxisSpec } from '../commerce/scoring';

export type RedirectAxis = 'canonicalHost' | 'hops' | 'httpsRedirect' | 'loops' | 'slash';

export const REDIRECT_AXES: AxisSpec<RedirectAxis>[] = [
  { key: 'canonicalHost', label: 'Tek kanonik host', weight: 35, description: 'Dört varyant (http/https × www/çıplak) aynı şema + host’ta bitiyor mu' },
  { key: 'hops', label: 'Adım sayısı', weight: 25, description: 'En uzun zincir 0–1 adım iyi, 2–3 uyarı, ≥4 (kesildi) hata; 302/307 ile kalıcı yönlendirme uyarı' },
  { key: 'httpsRedirect', label: 'HTTP → HTTPS', weight: 20, description: 'http:// varyantları https:// sürüme yönleniyor mu' },
  { key: 'loops', label: 'Döngü ve karışık yönlendirme', weight: 10, description: 'Aynı adrese dönen zincir, özel ağa giden hop, meta refresh / JavaScript yönlendirmesi' },
  { key: 'slash', label: 'Sondaki eğik çizgi', weight: 10, description: 'Varyantlar ve canonical arasında / tutarlılığı' },
];

export type VariantLabel = 'http://bare' | 'https://bare' | 'http://www' | 'https://www';

export type RedirectVariant = {
  label: VariantLabel;
  input: string;
  hops: { from: string; to: string; status: number }[];
  finalUrl: string;
  finalStatus: number;
  error: Artifact['error'] | null;
  /** Girilen adres bu varyant mı */
  main: boolean;
  /** Zincir tamamlandı ve son yanıt alındı */
  resolved: boolean;
};

export type RedirectExtra = {
  variants: RedirectVariant[];
  /** Tüm çözülen varyantların ortak hedefi (şema+host); yoksa null */
  canonicalTarget: string | null;
  maxHops: number;
  loop: boolean;
  metaRefresh: boolean;
  jsRedirect: boolean;
};

export type RedirectArtifacts = { url: string; variants: { label: VariantLabel; input: string; artifact: Artifact }[] };

const VARIANT_MAX_BYTES = 64 * 1024;

export function variantInputs(url: string): { label: VariantLabel; input: string }[] {
  const u = new URL(url);
  const bare = u.hostname.toLowerCase().replace(/^www\./, '');
  const www = `www.${bare}`;
  const rest = `${u.pathname}${u.search}`;
  return [
    { label: 'http://bare', input: `http://${bare}${rest}` },
    { label: 'https://bare', input: `https://${bare}${rest}` },
    { label: 'http://www', input: `http://${www}${rest}` },
    { label: 'https://www', input: `https://${www}${rest}` },
  ];
}

function originKey(u: string): string {
  try {
    const x = new URL(u);
    return `${x.protocol}//${x.hostname.toLowerCase()}`;
  } catch {
    return u;
  }
}

function sameUrlIgnoringSlash(a: string, b: string): boolean {
  const norm = (u: string) => {
    try {
      const x = new URL(u);
      x.hash = '';
      if (x.pathname.length > 1) x.pathname = x.pathname.replace(/\/+$/, '');
      return x.toString();
    } catch {
      return u;
    }
  };
  return a !== b && norm(a) === norm(b);
}

function hasLoop(hops: { from: string; to: string }[]): boolean {
  const seen = new Set<string>();
  for (const h of hops) {
    seen.add(h.from);
    if (seen.has(h.to)) return true;
  }
  return false;
}

export const META_REFRESH_RE = /http-equiv\s*=\s*["']?refresh/i;
export const JS_REDIRECT_RE = /location\.(?:href|replace)\s*(?:=|\()/i;

export const redirectTool = defineSiteTool<RedirectAxis, RedirectArtifacts, RedirectExtra>({
  kind: 'REDIRECTS',
  axes: REDIRECT_AXES,
  collect: async (url, budget: ScanBudget) => {
    const inputs = variantInputs(url);
    const artifacts = await Promise.all(
      inputs.map((v) => budget.fetch(v.input, 8_000, { headers: SCAN_HEADERS, maxBytes: VARIANT_MAX_BYTES })),
    );
    return { url, variants: inputs.map((v, i) => ({ ...v, artifact: artifacts[i]! })) };
  },
  analyze: ({ url, variants: raw }, s) => {
    const mainInput = raw.find((v) => v.input === url)?.input ?? raw[1]!.input;
    const variants: RedirectVariant[] = raw.map((v) => {
      const a = v.artifact;
      const resolved = !a.error && a.status > 0;
      return {
        label: v.label,
        input: v.input,
        hops: a.redirects,
        finalUrl: a.url || v.input,
        finalStatus: a.status,
        error: a.error ?? null,
        main: v.input === mainInput,
        resolved,
      };
    });
    const mainVariant = variants.find((v) => v.main) ?? variants[1]!;
    const mainArtifact = raw.find((v) => v.input === mainVariant.input)?.artifact ?? raw[1]!.artifact;
    const page: PageArtifact = parsePage(url, mainArtifact);
    const resolvedList = variants.filter((v) => v.resolved);
    const targets = new Set(resolvedList.map((v) => originKey(v.finalUrl)));
    const maxHops = Math.max(0, ...variants.map((v) => v.hops.length));
    const loop = variants.some((v) => hasLoop(v.hops));
    const unsafe = variants.filter((v) => v.error === 'unsafe');
    const html = mainArtifact.text ?? '';
    const metaRefresh = META_REFRESH_RE.test(html.slice(0, 200_000));
    const jsRedirect = JS_REDIRECT_RE.test(html.slice(0, 200_000));
    const extra: RedirectExtra = {
      variants,
      canonicalTarget: targets.size === 1 ? [...targets][0]! : null,
      maxHops,
      loop,
      metaRefresh,
      jsRedirect,
    };

    if (resolvedList.length === 0) {
      s.check(
        'canonicalHost',
        100,
        false,
        'Hiçbir varyant yanıt vermedi',
        { pass: '', fail: 'Dört adresin hiçbiri çözümlenemedi (DNS / ağ / zaman aşımı); zincir ölçülemedi.' },
        { fix: 'Alan adının çözümlendiğinden ve sunucunun 80/443 portlarında yanıt verdiğinden emin olun.', topic: 'redirectChain' },
      );
      return { page, extra };
    }

    // ── canonicalHost ──
    const finals = resolvedList.map((v) => `${v.label} → ${originKey(v.finalUrl)}`).join(' · ');
    s.check(
      'canonicalHost',
      100,
      targets.size === 1,
      'Tek kanonik adres',
      {
        pass: `Çözülen ${resolvedList.length} varyantın hepsi ${[...targets][0]} adresinde bitiyor.`,
        fail: `Varyantlar ${targets.size} farklı adreste bitiyor — Google ve AI botları aynı siteyi iki ayrı site sayabilir; paylaşım sayaçları bölünür.`,
      },
      { fix: 'Tüm varyantları tek hedefe (ör. https://www.siteniz.com/) 301 ile yönlendirin.', evidence: finals.slice(0, 200), topic: 'redirectChain' },
    );
    const unresolved = variants.filter((v) => !v.resolved && v.error !== 'unsafe');
    if (unresolved.length)
      s.note(
        'canonicalHost',
        'Yanıt vermeyen varyant',
        `${unresolved.map((v) => v.label).join(', ')} çözümlenemedi (DNS kaydı yok ya da port kapalı). Alt alan adlarında www.* olmaması doğaldır; puan düşürmez.`,
        'warn',
      );

    // ── hops ──
    s.check(
      'hops',
      70,
      maxHops <= 1 ? 'pass' : maxHops <= 3 ? 'warn' : 'fail',
      'En uzun zincir',
      {
        pass: maxHops === 0 ? 'Yönlendirme yok; her varyant doğrudan yanıt veriyor.' : 'En fazla 1 adım — ideal.',
        fail: `${maxHops} adım (zincir kesildi) — botlar 3–4 adımdan sonra vazgeçer, her adım gecikme ekler.`,
        warn: `${maxHops} adım — her ek yönlendirme ~100–300 ms ve tarama bütçesi tüketir; tek adıma indirin.`,
      },
      { fix: 'Ara adımları kaldırın: http → https → www yerine doğrudan hedefe tek 301.', evidence: `${maxHops} hop`, topic: 'redirectChain' },
    );
    const temporary = variants.flatMap((v) =>
      v.hops.filter((h) => (h.status === 302 || h.status === 307) && originKey(h.from) !== originKey(h.to)),
    );
    s.check(
      'hops',
      30,
      temporary.length === 0 ? 'pass' : 'warn',
      'Kalıcı yönlendirme kodu (301/308)',
      {
        pass: 'Host/şema değişimleri kalıcı kodla (301/308) yapılıyor ya da yönlendirme yok.',
        fail: '',
        warn: `${temporary.length} host/şema değişimi 302/307 ile — botlar eski adresi tutmaya devam eder, PageRank aktarımı gecikir.`,
      },
      { fix: 'Kalıcı yönlendirmelerde 301 (ya da 308) kullanın.', evidence: temporary.map((h) => `${h.status} ${h.from}`).join(' · ').slice(0, 160), topic: 'redirectChain' },
    );

    // ── httpsRedirect ──
    const httpVariants = variants.filter((v) => v.label.startsWith('http://'));
    const httpStuck = httpVariants.filter((v) => v.resolved && /^http:\/\//i.test(v.finalUrl) && v.finalStatus < 400);
    const httpDead = httpVariants.filter((v) => !v.resolved && v.error !== 'unsafe');
    s.check(
      'httpsRedirect',
      100,
      httpStuck.length > 0 ? 'fail' : httpDead.length === httpVariants.length ? 'warn' : 'pass',
      'http:// → https://',
      {
        pass: 'http:// varyantları HTTPS’e yönleniyor.',
        fail: `${httpStuck.map((v) => v.label).join(', ')} HTTPS’e gitmeden ${httpStuck[0]?.finalStatus} döndü — ziyaretçi şifresiz sürümde kalıyor; çift içerik.`,
        warn: 'http:// varyantları yanıt vermedi (80 portu kapalı olabilir); yönlendirme doğrulanamadı.',
      },
      { fix: 'Sunucu/CDN’de 80 → 443 için 301 tanımlayın.', evidence: httpStuck.map((v) => v.finalUrl).join(' · ').slice(0, 160) || undefined, topic: 'https' },
    );

    // ── loops ──
    s.check(
      'loops',
      60,
      loop || unsafe.length > 0 ? 'fail' : 'pass',
      'Döngü / güvensiz hop yok',
      {
        pass: 'Zincirlerde tekrar eden adres ya da özel ağa giden adım yok.',
        fail: loop
          ? 'Yönlendirme döngüsü: zincir daha önce geçtiği adrese dönüyor — tarayıcı "çok fazla yönlendirme" hatası verir.'
          : `${unsafe.map((v) => v.label).join(', ')}: yönlendirme özel ağa gidiyor ya da 4’ten fazla adım — takip edilemedi.`,
      },
      { fix: 'Yönlendirme kurallarını sadeleştirin; hedefin herkese açık ve tek olduğundan emin olun.', topic: 'redirectChain' },
    );
    s.check(
      'loops',
      40,
      metaRefresh || jsRedirect ? 'warn' : 'pass',
      'Sunucu tarafı yönlendirme',
      {
        pass: 'Sayfada meta refresh / JavaScript yönlendirme izi yok.',
        fail: '',
        warn: `${[metaRefresh ? 'meta refresh' : '', jsRedirect ? 'JavaScript location' : ''].filter(Boolean).join(' + ')} ile yönlendirme — botlar bunu izlemeyebilir; sinyal aktarımı yok.`,
      },
      { fix: 'Yönlendirmeyi sunucu/CDN düzeyinde 301 ile yapın; meta refresh ve JS yönlendirmesini kaldırın.', topic: 'redirectChain' },
    );

    // ── slash ──
    const finalsList = resolvedList.map((v) => v.finalUrl);
    let slashMismatch = false;
    for (let i = 0; i < finalsList.length && !slashMismatch; i++)
      for (let j = i + 1; j < finalsList.length; j++)
        if (sameUrlIgnoringSlash(finalsList[i]!, finalsList[j]!)) {
          slashMismatch = true;
          break;
        }
    const canonical = page.canonical;
    const canonSlash = !!canonical && /^https?:\/\//i.test(canonical) && sameUrlIgnoringSlash(canonical, mainVariant.finalUrl);
    s.check(
      'slash',
      100,
      slashMismatch || canonSlash ? 'warn' : 'pass',
      'Sondaki eğik çizgi tutarlı',
      {
        pass: 'Varyantlar ve canonical aynı / biçiminde.',
        fail: '',
        warn: canonSlash
          ? `Canonical (${canonical}) ile son adres yalnız sondaki / ile ayrışıyor — iki adres ayrı sayfa sayılabilir.`
          : 'Varyantlar yalnız sondaki / ile ayrışan adreslerde bitiyor — tek biçim seçin.',
      },
      { fix: 'Tek kural belirleyin (/ ile ya da /’siz), diğerini 301 ile yönlendirin; canonical aynı biçimde olsun.', topic: 'redirectChain' },
    );

    return { page, extra };
  },
});
