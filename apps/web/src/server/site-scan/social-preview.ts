/**
 * WhatsApp önizleme (`/arac/whatsapp-onizleme`, SOCIAL_PREVIEW) — "müşterinize attığınız link böyle görünüyor".
 * OG temel (title/description/url), og:image (mutlak, https, erişilebilir, image/*, boyut), Twitter Card,
 * fallback (title/description), tutarlılık. Mockup verisi `extra.preview` ile döner (WhatsApp/LinkedIn/X/Google).
 *
 *  - Bütçe: 3 istek (sayfa + ≤2 görsel HEAD), 12 s. Görselin gövdesi OKUNMAZ (MF-1): boyut yalnız Content-Length'ten,
 *    piksel ölçümü yok ("1200×630 önerilir" bilgi notu).
 *  - Yanlış pozitif kuralları: og:image yokken title varsa "WhatsApp metin kartı gösterir" bilgisi; Content-Length
 *    yoksa "boyut bilinmiyor" (puan düşürmez); twitter:image ≠ og:image bilgi; WAF → hüküm, skor yok.
 */
import { ScanBudget, type HeadResult } from './budget';
import { defineSiteTool } from './core';
import { collectPageArtifact, headResource, type PageArtifact } from './fetch-page';
import { hostnameOf, tokenOverlap } from '../commerce/html-analysis';
import type { AxisSpec } from '../commerce/scoring';

export type SocialAxis = 'ogBasic' | 'ogImage' | 'twitter' | 'fallback' | 'consistency';

export const SOCIAL_AXES: AxisSpec<SocialAxis>[] = [
  { key: 'ogBasic', label: 'Open Graph temel', weight: 30, description: 'og:title, og:description, og:url; og:type/site_name/locale bilgi' },
  {
    key: 'ogImage',
    label: 'Paylaşım görseli (og:image)',
    weight: 30,
    description: 'Var, mutlak https adres, HEAD 200 + image/*, boyut ≤300 KB (8 MB üstü hata)',
  },
  { key: 'twitter', label: 'Twitter / X kartı', weight: 15, description: 'twitter:card, twitter:title/description; twitter:image farkı bilgi' },
  { key: 'fallback', label: 'Yedek alanlar', weight: 15, description: 'OG yoksa kullanılan <title> ve meta description' },
  { key: 'consistency', label: 'Tutarlılık', weight: 10, description: 'og:title ↔ title benzerliği, og:url host, açıklama uzunluğu' },
];

export type ImageStatus = 'ok' | 'missing' | 'relative' | 'unreachable' | 'notImage' | 'unsafe' | 'unknown';

export type SocialExtra = {
  preview: {
    title: string | null;
    description: string | null;
    image: string | null;
    imageStatus: ImageStatus;
    imageBytes: number | null;
    imageType: string | null;
    siteName: string;
    url: string;
    hostname: string;
    /** Görsel yok ama başlık var → metin kartı */
    textCard: boolean;
  };
  twitter: { card: string | null; title: string | null; description: string | null; image: string | null };
  missing: string[];
};

export type SocialArtifacts = { page: PageArtifact; ogHead: HeadResult | null; twHead: HeadResult | null };

const IMG_WARN_BYTES = 300 * 1024;
const IMG_FAIL_BYTES = 8 * 1024 * 1024;
const DESC_LONG = 200;

export function ogImageOf(page: PageArtifact): string | null {
  return page.og['image'] || page.og['image:secure_url'] || page.og['image:url'] || null;
}

const absolute = (u: string | null): u is string => !!u && /^https?:\/\//i.test(u);

export const socialTool = defineSiteTool<SocialAxis, SocialArtifacts, SocialExtra>({
  kind: 'SOCIAL_PREVIEW',
  axes: SOCIAL_AXES,
  collect: async (url, budget: ScanBudget) => {
    const page = await collectPageArtifact(url, budget);
    const og = ogImageOf(page);
    const tw = page.twitter['image'] || page.twitter['image:src'] || null;
    const [ogHead, twHead] = await Promise.all([
      absolute(og) ? headResource(og, 4_000, budget) : Promise.resolve(null),
      absolute(tw) && tw !== og ? headResource(tw, 4_000, budget) : Promise.resolve(null),
    ]);
    return { page, ogHead, twHead };
  },
  analyze: ({ page, ogHead }, s) => {
    const og = page.og;
    const tw = page.twitter;
    const title = page.title;
    const desc = page.metaTags['description'] ?? null;
    const ogImage = ogImageOf(page);
    const twImage = tw['image'] || tw['image:src'] || null;

    // Görsel durumu (mockup + kontroller ortak)
    let imageStatus: ImageStatus = 'missing';
    if (ogImage) {
      if (!absolute(ogImage)) imageStatus = 'relative';
      else if (ogHead?.error === 'unsafe') imageStatus = 'unsafe';
      else if (ogHead && ogHead.status >= 400) imageStatus = 'unreachable';
      else if (ogHead && ogHead.status > 0 && ogHead.contentType && !/^image\//i.test(ogHead.contentType))
        imageStatus = 'notImage';
      else if (ogHead && ogHead.status > 0) imageStatus = 'ok';
      else imageStatus = 'unknown';
    }
    const previewTitle = og['title'] || tw['title'] || title || null;
    const previewDesc = og['description'] || tw['description'] || desc || null;
    const previewImage = imageStatus === 'ok' || imageStatus === 'unknown' ? ogImage : absolute(twImage) ? twImage : null;
    const missing = ['title', 'description', 'url', 'image'].filter((k) => !og[k] && !(k === 'image' && ogImage));
    const extra: SocialExtra = {
      preview: {
        title: previewTitle,
        description: previewDesc,
        image: previewImage,
        imageStatus,
        imageBytes: ogHead?.contentLength ?? null,
        imageType: ogHead?.contentType?.split(';')[0]?.trim() ?? null,
        siteName: og['site_name'] || page.hostname,
        url: og['url'] || page.finalUrl,
        hostname: page.hostname,
        textCard: !previewImage && !!previewTitle,
      },
      twitter: { card: tw['card'] ?? null, title: tw['title'] ?? null, description: tw['description'] ?? null, image: twImage },
      missing: missing.map((k) => `og:${k}`),
    };

    if (page.waf) {
      s.note(
        'ogBasic',
        'Bot koruması nedeniyle taranamadı',
        'Site WAF/challenge sayfası döndürdü; WhatsApp ve LinkedIn botları da aynı engele takılabilir. Skor üretilmedi.',
        'warn',
        `HTTP ${page.page.status}`,
      );
      return { page, extra };
    }
    if (!page.reachable) {
      s.check(
        'fallback',
        100,
        false,
        'Sayfa alınamadı',
        { pass: 'Sayfa 200 döndü.', fail: `Sayfaya ulaşılamadı (${page.page.error ?? `HTTP ${page.page.status}`}); önizleme üretilemez.` },
        { fix: 'Sayfanın herkese açık ve 200 döndüğünden emin olun.', topic: 'https' },
      );
      return { page, extra };
    }

    // ── ogBasic ──
    s.check(
      'ogBasic',
      35,
      !!og['title'],
      'og:title',
      { pass: 'og:title var.', fail: 'og:title yok — WhatsApp <title> etiketine düşer; LinkedIn kart başlığını boş bırakabilir.' },
      { fix: 'Her sayfaya og:title ekleyin (title ile aynı olabilir, marka adı sonda).', evidence: og['title']?.slice(0, 100), topic: 'socialMeta' },
    );
    s.check(
      'ogBasic',
      35,
      !!og['description'],
      'og:description',
      { pass: 'og:description var.', fail: 'og:description yok — kartta açıklama satırı boş kalır ya da rastgele metin görünür.' },
      { fix: 'Sayfayı 1–2 cümlede anlatan og:description ekleyin.', evidence: og['description']?.slice(0, 120), topic: 'socialMeta' },
    );
    s.check(
      'ogBasic',
      30,
      !!og['url'],
      'og:url',
      { pass: 'og:url var.', fail: 'og:url yok — paylaşımlar parametreli/kopya adreslerde ayrı sayılır, önbellek karışır.' },
      { fix: 'og:url olarak sayfanın canonical adresini yazın.', topic: 'socialMeta' },
    );
    const infoMissing = ['type', 'site_name', 'locale'].filter((k) => !og[k]);
    if (infoMissing.length)
      s.note(
        'ogBasic',
        'İsteğe bağlı OG alanları',
        `Eksik: ${infoMissing.map((k) => `og:${k}`).join(', ')}. LinkedIn site adını, Facebook dili buradan okur; puan düşürmez.`,
        'warn',
      );

    // ── ogImage ──
    if (!ogImage) {
      s.check(
        'ogImage',
        100,
        false,
        'og:image',
        { pass: 'og:image var.', fail: 'og:image yok — WhatsApp yalnızca metin kartı gösterir, LinkedIn/X kartı görselsiz kalır.' },
        { fix: 'Tam adresli (https://…) 1200×630 bir og:image ekleyin.', topic: 'ogImage' },
      );
      if (title)
        s.note('ogImage', 'Metin kartı', 'Görsel olmadığı için WhatsApp başlık + açıklama + alan adından oluşan metin kartı gösterir.', 'warn');
    } else {
      s.check(
        'ogImage',
        40,
        imageStatus !== 'relative',
        'og:image tam adres',
        {
          pass: 'og:image mutlak adres.',
          fail: `og:image göreli (${ogImage.slice(0, 80)}) — WhatsApp ve LinkedIn göreli adresi çözümlemez, görsel çıkmaz.`,
        },
        { fix: 'og:image değerini https://alanadi/… biçiminde tam yazın.', evidence: ogImage.slice(0, 120), topic: 'ogImage' },
      );
      if (imageStatus !== 'relative') {
        s.check(
          'ogImage',
          15,
          /^https:\/\//i.test(ogImage) ? 'pass' : 'warn',
          'og:image HTTPS',
          { pass: 'Görsel https:// ile sunuluyor.', fail: '', warn: 'Görsel http:// — bazı istemciler karışık içeriği yüklemez.' },
          { fix: 'Görsel adresini https:// yapın; og:image:secure_url ekleyin.', topic: 'ogImage' },
        );
        const reach =
          imageStatus === 'unsafe'
            ? 'fail'
            : imageStatus === 'unreachable'
              ? 'fail'
              : imageStatus === 'notImage'
                ? 'fail'
                : 'pass';
        s.check(
          'ogImage',
          25,
          reach,
          'Görsel erişilebilir ve image/*',
          {
            pass:
              imageStatus === 'unknown'
                ? 'Görsel adresi tam; erişim doğrulanamadı (HEAD yanıtı yok).'
                : `Görsel HTTP ${ogHead?.status}, ${ogHead?.contentType?.split(';')[0] ?? 'image'}.`,
            fail:
              imageStatus === 'unsafe'
                ? 'Görsel adresi özel ağa/erişime kapalı bir adrese işaret ediyor.'
                : imageStatus === 'notImage'
                  ? `Görsel adresi ${ogHead?.contentType?.split(';')[0]} döndürüyor (HTML/yönlendirme?); istemciler görsel olarak yüklemez.`
                  : `Görsel HTTP ${ogHead?.status} döndü — kart görselsiz kalır.`,
          },
          {
            fix: 'Görsel adresi tarayıcıda doğrudan açılmalı: 200 dönmeli, Content-Type image/* olmalı, giriş/bot koruması istememeli.',
            evidence: ogHead ? `HTTP ${ogHead.status} · ${ogHead.contentType ?? '?'}` : undefined,
            topic: 'ogImage',
          },
        );
        const len = ogHead?.contentLength ?? null;
        if (len == null) {
          s.note('ogImage', 'Görsel boyutu bilinmiyor', 'Sunucu Content-Length göndermedi; boyut kontrolü yapılamadı (puan düşürmez).', 'warn');
        } else {
          s.check(
            'ogImage',
            20,
            len > IMG_FAIL_BYTES ? 'fail' : len > IMG_WARN_BYTES ? 'warn' : 'pass',
            'Görsel boyutu',
            {
              pass: `${Math.round(len / 1024)} KB — WhatsApp için uygun.`,
              fail: `${Math.round(len / 1024 / 1024)} MB — 8 MB üstü görselleri hiçbir istemci önizlemez.`,
              warn: `${Math.round(len / 1024)} KB — 300 KB üstünde WhatsApp önizleme üretmeyebilir.`,
            },
            { fix: 'Görseli 1200×630 px ve 300 KB altına sıkıştırın (JPEG/WebP).', evidence: `${len} bayt`, topic: 'ogImage' },
          );
        }
        s.note('ogImage', 'Piksel ölçüsü ölçülmedi', '1200×630 px (1,91:1) önerilir; og:image:width / og:image:height ile bildirin. Görsel gövdesi indirilmez.', 'warn');
      }
    }

    // ── twitter ──
    s.check(
      'twitter',
      60,
      tw['card'] ? 'pass' : 'warn',
      'twitter:card',
      {
        pass: `twitter:card=${tw['card']}.`,
        fail: '',
        warn: 'twitter:card yok — X (Twitter) çoğu zaman OG’ye düşer ama büyük görsel kartı için summary_large_image gerekir.',
      },
      { fix: '<meta name="twitter:card" content="summary_large_image"> ekleyin.', topic: 'socialMeta' },
    );
    s.check(
      'twitter',
      40,
      tw['title'] || tw['description'] ? 'pass' : 'warn',
      'twitter:title / twitter:description',
      { pass: 'Twitter başlık/açıklama var.', fail: '', warn: 'Twitter alanları yok; X kartı og:* değerlerini kullanır (genelde yeterli).' },
      { fix: 'twitter:title ve twitter:description ekleyin (og ile aynı olabilir).', topic: 'socialMeta' },
    );
    if (twImage && ogImage && twImage !== ogImage)
      s.note('twitter', 'twitter:image ≠ og:image', 'X’te farklı bir görsel çıkar; bilinçli değilse ikisini eşitleyin.', 'warn', twImage.slice(0, 100));

    // ── fallback ──
    s.check(
      'fallback',
      50,
      !!title,
      '<title> (yedek başlık)',
      { pass: 'Title var; OG yoksa kart başlığı buradan gelir.', fail: 'Title yok — OG da yoksa kart tamamen boş görünür.' },
      { fix: 'Head içine <title> ekleyin.', topic: 'title' },
    );
    s.check(
      'fallback',
      50,
      !!desc,
      'meta description (yedek açıklama)',
      { pass: 'Meta description var.', fail: 'Meta description yok — OG açıklaması da yoksa kartta açıklama çıkmaz.' },
      { fix: 'Meta description ekleyin.', topic: 'metaDescription' },
    );

    // ── consistency ──
    const sim = og['title'] && title ? tokenOverlap(og['title'], title) : null;
    s.check(
      'consistency',
      40,
      sim == null ? 'warn' : sim >= 0.3 ? 'pass' : 'warn',
      'og:title ↔ title uyumu',
      {
        pass: 'Paylaşım başlığı sayfa başlığıyla uyumlu.',
        fail: '',
        warn: sim == null ? 'Karşılaştırılamadı (biri eksik).' : 'og:title ile <title> çok farklı; müşteri tıklayınca başka bir sayfaya geldiğini sanabilir.',
      },
      { fix: 'og:title ve title aynı ana ifadeyi taşısın.', topic: 'socialMeta' },
    );
    const ogUrlHost = og['url'] ? hostnameOf(og['url']).replace(/^www\./, '') : null;
    s.check(
      'consistency',
      30,
      ogUrlHost == null ? 'warn' : ogUrlHost === page.hostname.replace(/^www\./, '') ? 'pass' : 'warn',
      'og:url bu siteyi gösteriyor',
      {
        pass: 'og:url aynı alan adında.',
        fail: '',
        warn: ogUrlHost == null ? 'og:url yok.' : `og:url farklı bir host’a işaret ediyor (${ogUrlHost}); paylaşım sayaçları o adrese yazılır.`,
      },
      { fix: 'og:url olarak bu sayfanın canonical adresini kullanın.', evidence: og['url']?.slice(0, 120), topic: 'socialMeta' },
    );
    const d = og['description'] ?? '';
    s.check(
      'consistency',
      30,
      !d || d.length <= DESC_LONG ? 'pass' : 'warn',
      'Açıklama uzunluğu (kart)',
      {
        pass: d ? `${d.length} karakter — kartta sığar.` : 'og:description yok (yedek alan kullanılır).',
        fail: '',
        warn: `${d.length} karakter; WhatsApp ~2 satırdan sonra keser, ana mesaj ilk 80 karakterde olsun.`,
      },
      { fix: 'og:description’ı 200 karakterin altına indirin; ilk cümle ana faydayı söylesin.', topic: 'socialMeta' },
    );

    return { page, extra };
  },
});
