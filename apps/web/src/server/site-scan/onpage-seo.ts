/**
 * SEO karnesi (`/arac/seo-karnesi`, ONPAGE_SEO) — tek sayfanın "Google ve ChatGPT sizi tek cümlede nasıl tanıyor"
 * fotoğrafı: title/description (uzunluk + SERP piksel tahmini), başlık hiyerarşisi, indekslenebilirlik (noindex,
 * canonical, robots.txt, canonical HEAD), OG temel, teknik temel (viewport, HTTPS, gövde metni), dil/kodlama.
 *
 *  - Bütçe: 3 istek (sayfa, robots.txt, canonical HEAD — yalnız canonical farklı bir adresse), 15 s.
 *  - Yanlış pozitif kuralları: çoklu H1 = warn (fail değil); `lang` tr değil = bilgi; `legacyCharset` → uzunluk
 *    kontrolleri warn (gövde UTF-8 olarak çözüldüğünden karakter sayısı güvenilmez); WAF → hüküm, skor yok.
 *  - SAF analiz `seoTool.analyze(artifacts)`; ağ yalnız `collect` içinde, ScanBudget üzerinden.
 */
import { ScanBudget, type HeadResult } from './budget';
import { defineSiteTool } from './core';
import { collectPageArtifact, headResource, type PageArtifact } from './fetch-page';
import { snippetWidth, DESCRIPTION_LIMIT_PX, TITLE_LIMIT_PX } from './snippet-width';
import { hostnameOf, openTags, parseRobots, resolveBotAccess } from '../commerce/html-analysis';
import type { AxisSpec } from '../commerce/scoring';

export type SeoAxis = 'meta' | 'headings' | 'indexability' | 'social' | 'technical' | 'language';

export const SEO_AXES: AxisSpec<SeoAxis>[] = [
  {
    key: 'meta',
    label: 'Başlık ve açıklama',
    weight: 25,
    description: 'title ve meta description varlığı, uzunluk aralığı (10–70 / 50–170 kr), SERP piksel tahmini',
  },
  {
    key: 'headings',
    label: 'Başlık hiyerarşisi',
    weight: 15,
    description: 'Tek H1 (çoklu H1 yalnız uyarı), H1→H3 atlaması yok, en az bir H2 alt başlık',
  },
  {
    key: 'indexability',
    label: 'İndekslenebilirlik',
    weight: 20,
    description: 'meta robots / X-Robots-Tag noindex, canonical (mutlak, aynı host, aynı şema, 200 döner), robots.txt engeli',
  },
  {
    key: 'social',
    label: 'Sosyal / OG temel',
    weight: 15,
    description: 'og:title, og:description, og:image varlığı (ayrıntı: WhatsApp önizleme aracı)',
  },
  {
    key: 'technical',
    label: 'Teknik temel',
    weight: 15,
    description: 'viewport, HTTPS, HTTP 200, gövde metni (JavaScript bağımlılığı izi), favicon',
  },
  {
    key: 'language',
    label: 'Dil ve kodlama',
    weight: 10,
    description: '<html lang>, charset bildirimi, eski kodlama (ISO-8859-9 / windows-1254)',
  },
];

export type SeoArtifacts = { page: PageArtifact; canonicalHead: HeadResult | null };

export type SeoExtra = {
  /** "Sizi tek cümlede nasıl tanımlıyor?" kutusu */
  snippet: {
    title: string | null;
    description: string | null;
    url: string;
    titlePx: number;
    descriptionPx: number;
    titleTruncated: boolean;
    descriptionTruncated: boolean;
    titleLimitPx: number;
    descriptionLimitPx: number;
  };
  h1: string[];
  canonical: string | null;
  favicon: boolean;
};

const TITLE_MIN = 10;
const TITLE_MAX = 70;
const DESC_MIN = 50;
const DESC_MAX = 170;
const BODY_MIN_CHARS = 200;

function normalizeForCompare(u: string): string {
  try {
    const x = new URL(u);
    x.hash = '';
    x.hostname = x.hostname.toLowerCase().replace(/^www\./, '');
    if (x.pathname.length > 1) x.pathname = x.pathname.replace(/\/+$/, '');
    return x.toString();
  } catch {
    return u;
  }
}

/** Canonical mutlak ve sayfanın kendisinden farklıysa HEAD gerekir. */
export function canonicalNeedsHead(page: PageArtifact): string | null {
  const c = page.canonical;
  if (!c || !/^https?:\/\//i.test(c)) return null;
  if (normalizeForCompare(c) === normalizeForCompare(page.finalUrl)) return null;
  return c;
}

export function hasFavicon(html: string): boolean {
  return openTags(html.slice(0, 400_000), 'link').some((t) =>
    /(?:^|\s)rel\s*=\s*["']?(?:[^"'>]*\s)?(?:icon|shortcut icon|apple-touch-icon)(?:\s|["']|$)/i.test(t.attrs),
  );
}

export const seoTool = defineSiteTool<SeoAxis, SeoArtifacts, SeoExtra>({
  kind: 'ONPAGE_SEO',
  axes: SEO_AXES,
  collect: async (url, budget: ScanBudget) => {
    const page = await collectPageArtifact(url, budget, { robots: true });
    const c = canonicalNeedsHead(page);
    const canonicalHead = c ? await headResource(c, 5_000, budget) : null;
    return { page, canonicalHead };
  },
  analyze: ({ page, canonicalHead }, s) => {
    const legacy = page.legacyCharset;
    const title = page.title;
    const desc = page.metaTags['description'] ?? null;
    const sw = snippetWidth(title, desc);
    const extra: SeoExtra = {
      snippet: {
        title,
        description: desc,
        url: page.finalUrl,
        titlePx: sw.titlePx,
        descriptionPx: sw.descriptionPx,
        titleTruncated: sw.titleTruncated,
        descriptionTruncated: sw.descriptionTruncated,
        titleLimitPx: TITLE_LIMIT_PX,
        descriptionLimitPx: DESCRIPTION_LIMIT_PX,
      },
      h1: page.headings.h1.slice(0, 5),
      canonical: page.canonical,
      favicon: page.html ? hasFavicon(page.html) : false,
    };

    if (page.waf) {
      s.note(
        'technical',
        'Bot koruması nedeniyle taranamadı',
        'Site WAF/challenge sayfası döndürdü; skor üretilmedi. Cloudflare "Bot Fight Mode" veya benzeri koruma YanitBot’u engelliyor.',
        'warn',
        `HTTP ${page.page.status}`,
      );
      return { page, extra };
    }
    if (!page.reachable) {
      s.check(
        'technical',
        100,
        false,
        'Sayfa alınamadı',
        {
          pass: 'Sayfa 200 döndü.',
          fail:
            page.page.error === 'timeout'
              ? 'Sayfa zaman aşımına uğradı (12 sn); sunucu çok yavaş ya da erişilemiyor.'
              : page.page.error
                ? 'Sayfaya ulaşılamadı (ağ hatası ya da DNS).'
                : `Sayfa HTTP ${page.page.status} döndü; gövde yok.`,
        },
        { fix: 'Sayfanın herkese açık ve 200 döndüğünden emin olun; ardından yeniden tarayın.', topic: 'https' },
      );
      return { page, extra };
    }

    /** Uzunluk kontrolleri: eski kodlamada karakter sayısı güvenilmez → warn */
    const lengthStatus = (ok: boolean): 'pass' | 'warn' => (legacy ? 'warn' : ok ? 'pass' : 'warn');
    const legacyNote = legacy ? ' (eski kodlama nedeniyle uzunluk yaklaşık)' : '';

    // ── meta ──
    if (!title) {
      s.check(
        'meta',
        60,
        false,
        'Sayfa başlığı (title)',
        { pass: 'Title var.', fail: 'Sayfanın <title> etiketi yok — Google ve AI asistanları sayfayı adlandıramaz.' },
        { fix: 'Head içine 10–70 karakterlik, sayfayı tek cümlede anlatan bir <title> yazın.', topic: 'title' },
      );
    } else {
      const okLen = title.length >= TITLE_MIN && title.length <= TITLE_MAX;
      s.check(
        'meta',
        60,
        lengthStatus(okLen),
        'Sayfa başlığı (title)',
        {
          pass: `Title ${title.length} karakter — aralıkta.`,
          fail: '',
          warn: okLen
            ? `Title ${title.length} karakter${legacyNote}.`
            : `Title ${title.length} karakter; önerilen ${TITLE_MIN}–${TITLE_MAX}${legacyNote}.`,
        },
        {
          fix: 'Title’ı 10–70 karakter aralığına getirin; marka adını sona koyun.',
          evidence: title.slice(0, 120),
          topic: 'title',
        },
      );
      if (sw.titleTruncated)
        s.note(
          'meta',
          'Title Google’da kesilebilir',
          `Yaklaşık ${sw.titlePx} px; masaüstü sonuçlarda ≈${TITLE_LIMIT_PX} px sonrası "…" ile kesilir (tahmini, cihaza göre değişir).`,
          'warn',
          `${sw.titlePx} px`,
        );
    }
    if (!desc) {
      s.check(
        'meta',
        40,
        false,
        'Meta açıklama (description)',
        {
          pass: 'Meta description var.',
          fail: 'Meta description yok — Google ve paylaşım kartları sayfadan rastgele bir cümle seçer.',
        },
        {
          fix: 'Sayfayı 50–170 karakterde özetleyen bir meta description yazın (ne satıyorsunuz, kime, nerede).',
          topic: 'metaDescription',
        },
      );
    } else {
      const okLen = desc.length >= DESC_MIN && desc.length <= DESC_MAX;
      s.check(
        'meta',
        40,
        lengthStatus(okLen),
        'Meta açıklama (description)',
        {
          pass: `Açıklama ${desc.length} karakter — aralıkta.`,
          fail: '',
          warn: okLen
            ? `Açıklama ${desc.length} karakter${legacyNote}.`
            : `Açıklama ${desc.length} karakter; önerilen ${DESC_MIN}–${DESC_MAX}${legacyNote}.`,
        },
        {
          fix: 'Açıklamayı 50–170 karakter aralığına getirin; ilk cümle ana faydayı söylesin.',
          evidence: desc.slice(0, 160),
          topic: 'metaDescription',
        },
      );
      if (sw.descriptionTruncated)
        s.note(
          'meta',
          'Açıklama Google’da kesilebilir',
          `Yaklaşık ${sw.descriptionPx} px; iki satır ≈${DESCRIPTION_LIMIT_PX} px sonrası kesilir (tahmini).`,
          'warn',
          `${sw.descriptionPx} px`,
        );
    }

    // ── headings ──
    const h1 = page.headings.h1;
    s.check(
      'headings',
      50,
      h1.length === 0 ? 'fail' : h1.length > 1 ? 'warn' : 'pass',
      'H1 başlığı',
      {
        pass: 'Tek H1 var.',
        fail: 'Sayfada H1 yok — ana konu tarayıcıya ve AI’ya söylenmiyor.',
        warn: `${h1.length} adet H1 var. Google bunu cezalandırmaz; ana konu netliği için tek H1 önerilir.`,
      },
      {
        fix:
          h1.length === 0
            ? 'Sayfanın ana konusunu söyleyen tek bir H1 ekleyin.'
            : 'Diğer H1’leri H2’ye çevirin; tek ana başlık kalsın.',
        evidence: h1[0]?.slice(0, 100),
        topic: 'h1',
      },
    );
    const skipped = page.headings.h2.length === 0 && page.headings.h3.length > 0;
    s.check(
      'headings',
      30,
      skipped ? 'warn' : 'pass',
      'Başlık sırası (H1 → H2 → H3)',
      {
        pass: 'Başlık seviyeleri atlanmıyor.',
        fail: '',
        warn: 'H2 olmadan H3 kullanılmış; sıra atlanınca sayfa özeti yanlış kurulur.',
      },
      { fix: 'H3’leri H2’ye yükseltin ya da aralarına H2 bölüm başlıkları ekleyin.', topic: 'h1' },
    );
    s.check(
      'headings',
      20,
      page.headings.h2.length > 0 ? 'pass' : 'warn',
      'H2 alt başlıklar',
      {
        pass: `${page.headings.h2.length} H2 var — bölümler ayrışıyor.`,
        fail: '',
        warn: 'Hiç H2 yok; AI asistanları sayfayı bölümlere ayırıp alıntılayamaz.',
      },
      { fix: 'Her ana bölüme (hizmetler, fiyat, SSS, iletişim) bir H2 verin.', topic: 'h1' },
    );

    // ── indexability ──
    const robotsMeta = `${page.robotsMeta ?? ''} ${page.xRobotsTag ?? ''}`.toLowerCase();
    const noindex = /\bnoindex\b/.test(robotsMeta);
    s.check(
      'indexability',
      40,
      !noindex,
      'noindex yok',
      {
        pass: 'Sayfa indekslenebilir (noindex yok).',
        fail: 'Sayfa noindex ile işaretli — Google ve cevap motorları bu sayfayı listelemez.',
      },
      {
        fix: 'Yayındaki sayfalardan meta robots / X-Robots-Tag noindex değerini kaldırın.',
        evidence: (page.robotsMeta ?? page.xRobotsTag ?? '').slice(0, 80),
        topic: 'noindex',
      },
    );
    const canon = page.canonical;
    let canonStatus: 'pass' | 'warn' | 'fail' = 'pass';
    let canonDetail = '';
    let canonFix = 'Her sayfaya kendisini gösteren mutlak (https://…) bir canonical ekleyin.';
    if (!canon) {
      canonStatus = 'warn';
      canonDetail = 'Canonical etiketi yok; parametreli kopyalar ayrı sayfa sayılabilir.';
    } else if (!/^https?:\/\//i.test(canon)) {
      canonStatus = 'warn';
      canonDetail = `Canonical göreli (${canon.slice(0, 80)}); bazı botlar göreli canonical’ı yok sayar.`;
      canonFix = 'Canonical’ı tam adres (https://alanadi/yol) olarak yazın.';
    } else {
      const canonHost = hostnameOf(canon).replace(/^www\./, '');
      const pageHost = page.hostname.replace(/^www\./, '');
      const canonScheme = canon.slice(0, canon.indexOf(':'));
      const pageScheme = page.finalUrl.slice(0, page.finalUrl.indexOf(':'));
      if (canonHost !== pageHost) {
        canonStatus = 'fail';
        canonDetail = `Canonical farklı bir host’u gösteriyor (${canonHost}); bu sayfa indekste o siteye devrolur.`;
        canonFix = 'Canonical’ı bu sitenin kendi adresine çevirin (başka alan adı yalnız bilinçli kopyada kullanılır).';
      } else if (canonScheme.toLowerCase() !== pageScheme.toLowerCase()) {
        canonStatus = 'fail';
        canonDetail = `Canonical ${canonScheme}:// derken sayfa ${pageScheme}:// — şema çelişkisi.`;
        canonFix = 'Canonical şemasını yayındaki şemayla (https) eşitleyin.';
      } else if (canonicalHead && canonicalHead.status > 0 && canonicalHead.status !== 200) {
        canonStatus = 'fail';
        canonDetail = `Canonical adresi HTTP ${canonicalHead.status} döndü; botlar geçersiz hedefi yok sayar.`;
        canonFix = 'Canonical hedefi 200 dönen gerçek bir sayfa olsun; yönlendirme zinciri olmasın.';
      } else if (canonicalHead && canonicalHead.error && canonicalHead.error !== 'budget') {
        canonStatus = 'warn';
        canonDetail = 'Canonical adresine ulaşılamadı (ağ hatası/zaman aşımı); doğrulanamadı.';
      } else {
        canonDetail = canonicalHead ? 'Canonical başka bir sayfayı gösteriyor ve 200 dönüyor.' : 'Canonical sayfanın kendisi.';
      }
    }
    s.check(
      'indexability',
      35,
      canonStatus,
      'Canonical adres',
      { pass: canonDetail, fail: canonDetail, warn: canonDetail },
      { fix: canonFix, evidence: canon?.slice(0, 120), topic: 'canonical' },
    );
    const robots = page.robots;
    const robotsFound = !!robots?.ok && robots.text.length > 0 && !/<html/i.test(robots.text.slice(0, 300));
    let robotsBlocked = false;
    let robotsRule: string | null = null;
    if (robotsFound) {
      const access = resolveBotAccess(parseRobots(robots!.text), 'Googlebot', page.path || '/');
      robotsBlocked = !access.allowed;
      robotsRule = access.rule;
    }
    s.check(
      'indexability',
      25,
      !robotsBlocked,
      'robots.txt bu sayfaya izin veriyor',
      {
        pass: robotsFound ? 'robots.txt bu yolu engellemiyor.' : 'robots.txt yok — varsayılan olarak her şey açık.',
        fail: `robots.txt bu sayfayı engelliyor (${robotsRule ?? 'Disallow'}); Google sayfayı taramaz.`,
      },
      { fix: 'İlgili Disallow satırını kaldırın ya da yolu daraltın.', evidence: robotsRule ?? undefined, topic: 'robots' },
    );

    // ── social ──
    const og = page.og;
    const ogMissing = ['title', 'description', 'image'].filter((k) => !og[k]);
    s.check(
      'social',
      100,
      ogMissing.length === 0 ? 'pass' : 'warn',
      'Open Graph temel etiketleri',
      {
        pass: 'og:title, og:description ve og:image var.',
        fail: '',
        warn: `Eksik: ${ogMissing.map((k) => `og:${k}`).join(', ')}. WhatsApp/LinkedIn kartı boş ya da yanlış görünür.`,
      },
      {
        fix: 'Eksik og:* etiketlerini ekleyin; ayrıntılı kontrol için WhatsApp önizleme aracını kullanın.',
        topic: ogMissing.includes('image') ? 'ogImage' : 'socialMeta',
      },
    );

    // ── technical ──
    s.check(
      'technical',
      30,
      page.viewport,
      'Mobil viewport',
      { pass: 'viewport meta var.', fail: 'viewport meta yok — mobilde sayfa küçültülerek gösterilir; Google mobil öncelikli indeksler.' },
      { fix: '<meta name="viewport" content="width=device-width, initial-scale=1"> ekleyin.', topic: 'performance' },
    );
    const https = /^https:\/\//i.test(page.finalUrl);
    s.check(
      'technical',
      25,
      https,
      'HTTPS',
      { pass: 'Sayfa HTTPS ile sunuluyor.', fail: 'Sayfa HTTP ile sunuluyor; tarayıcılar "güvenli değil" gösterir.' },
      { fix: 'TLS sertifikası kurun ve HTTP’yi 301 ile HTTPS’e yönlendirin.', topic: 'https' },
    );
    s.check(
      'technical',
      15,
      page.page.status === 200,
      'HTTP durumu',
      { pass: 'HTTP 200.', fail: `HTTP ${page.page.status} — sayfa "başarılı" sayılmıyor.` },
      { fix: 'Sayfanın 200 döndüğünden emin olun.', topic: 'https' },
    );
    const textLen = page.text.trim().length;
    s.check(
      'technical',
      30,
      legacy ? 'warn' : textLen >= BODY_MIN_CHARS ? 'pass' : 'warn',
      'Gövde metni',
      {
        pass: `Ham HTML’de ${textLen.toLocaleString('tr-TR')} karakter görünür metin var.`,
        fail: '',
        warn: legacy
          ? `Eski kodlama nedeniyle metin uzunluğu yaklaşık (${textLen.toLocaleString('tr-TR')} kr).`
          : `Ham HTML’de yalnız ${textLen} karakter metin var; içerik JavaScript’e bağımlı olabilir — AI botlarının çoğu JS çalıştırmaz.`,
      },
      { fix: 'Ana içeriği sunucu tarafında (SSR/SSG) HTML’e basın; JS yalnız etkileşim için kalsın.', topic: 'jsRendering' },
    );
    if (!extra.favicon)
      s.note(
        'technical',
        'Favicon bildirilmemiş',
        'Google sonuçlarında ve paylaşım kartlarında site simgesi boş kalır. <link rel="icon"> ekleyin.',
        'warn',
      );

    // ── language ──
    s.check(
      'language',
      50,
      !!page.lang,
      '<html lang>',
      { pass: `lang="${page.lang}".`, fail: '' },
      { fix: '<html lang="tr"> ekleyin; çok dilli sitede her sürüm kendi dil kodunu taşısın.', topic: 'languageSignals' },
    );
    if (page.lang && !/^tr\b/i.test(page.lang))
      s.note('language', 'Sayfa dili Türkçe değil', `lang="${page.lang}" — Türkçe içerikse tr olarak işaretleyin.`, 'warn', page.lang);
    s.check(
      'language',
      30,
      !!page.charset,
      'Karakter kodlaması bildirimi',
      { pass: `charset=${page.charset}.`, fail: '' },
      { fix: 'Content-Type başlığında ve <meta charset="utf-8"> ile kodlamayı bildirin.', topic: 'charset' },
    );
    s.check(
      'language',
      20,
      legacy ? 'warn' : 'pass',
      'Modern kodlama (UTF-8)',
      {
        pass: 'UTF-8 (ya da eski kodlama izi yok).',
        fail: '',
        warn: `Eski kodlama (${page.charset}); Türkçe karakterler botlarda bozuk okunabilir.`,
      },
      { fix: 'Sayfayı UTF-8’e taşıyın (dosya + veritabanı + Content-Type).', topic: 'charset' },
    );

    return { page, extra };
  },
});
