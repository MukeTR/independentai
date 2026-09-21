import { describe, expect, it } from 'vitest';
import { GOOD_PAGE, GOOD_URL, POOR_PAGE, POOR_URL, WAF_PAGE, WAF_URL, pageOf } from '../fixtures/site-html-core';
import {
  SOCIAL_HTTP_IMG_PAGE,
  SOCIAL_HTTP_IMG_URL,
  SOCIAL_NO_IMG_PAGE,
  SOCIAL_NO_IMG_URL,
  SOCIAL_POOR_PAGE,
  SOCIAL_POOR_URL,
  head,
} from '../fixtures/site-html-a';
import { ogImageOf, SOCIAL_AXES, socialTool } from '@/server/site-scan/social-preview';
import { verdictLine } from '@/server/site-scan/core';
import { GUIDE_TOPICS } from '@/server/commerce/guides';

const OG = 'https://iyi-site.example/img/og.jpg';
const byTitle = (r: ReturnType<typeof socialTool.analyze>, t: string) => r.findings.find((f) => f.title === t);

describe('whatsapp-onizleme motoru', () => {
  it('ağırlıklar 100; breakdown anahtarları; rehber konuları geçerli', () => {
    expect(SOCIAL_AXES.reduce((s, a) => s + a.weight, 0)).toBe(100);
    const r = socialTool.analyze(
      { page: pageOf(GOOD_URL, GOOD_PAGE), ogHead: head(OG, 200, { contentType: 'image/jpeg', contentLength: 120_000 }), twHead: null },
      { url: GOOD_URL },
    );
    expect(Object.keys(r.breakdown).sort()).toEqual(SOCIAL_AXES.map((a) => a.key).sort());
    for (const f of r.findings) if (f.topic) expect(GUIDE_TOPICS).toContain(f.topic);
  });

  it('GOOD > POOR; iyi sayfa ≥85; mockup verisi doludur', () => {
    const good = socialTool.analyze(
      { page: pageOf(GOOD_URL, GOOD_PAGE), ogHead: head(OG, 200, { contentType: 'image/jpeg', contentLength: 120_000 }), twHead: null },
      { url: GOOD_URL },
    );
    const poor = socialTool.analyze({ page: pageOf(POOR_URL, POOR_PAGE), ogHead: null, twHead: null }, { url: POOR_URL });
    expect(good.score).toBeGreaterThanOrEqual(85);
    expect(good.score).toBeGreaterThan(poor.score);
    expect(poor.score).toBeLessThan(30);
    expect(good.extra?.preview).toMatchObject({
      title: 'İyi Site — endüstriyel mutfak ekipmanı',
      image: OG,
      imageStatus: 'ok',
      imageBytes: 120_000,
      siteName: 'İyi Site',
      hostname: 'iyi-site.example',
      textCard: false,
    });
    expect(good.extra?.missing).toEqual([]);
  });

  it('göreli og:image fail; og:description/og:url eksik fail; twitter yok warn; fallback title/description pass', () => {
    const r = socialTool.analyze({ page: pageOf(SOCIAL_POOR_URL, SOCIAL_POOR_PAGE), ogHead: null, twHead: null }, { url: SOCIAL_POOR_URL });
    expect(byTitle(r, 'og:image tam adres')?.status).toBe('fail');
    expect(byTitle(r, 'og:description')?.status).toBe('fail');
    expect(byTitle(r, 'og:url')?.status).toBe('fail');
    expect(byTitle(r, 'og:title')?.status).toBe('pass');
    expect(byTitle(r, 'twitter:card')?.status).toBe('warn');
    expect(byTitle(r, '<title> (yedek başlık)')?.status).toBe('pass');
    expect(byTitle(r, 'meta description (yedek açıklama)')?.status).toBe('pass');
    expect(r.extra?.preview.imageStatus).toBe('relative');
    expect(r.extra?.preview.image).toBeNull();
    expect(r.extra?.preview.description).toMatch(/Paylaşım Zayıf firması/); // og:description yok → meta description
    expect(r.extra?.missing).toEqual(['og:description', 'og:url']);
  });

  it('http:// görsel warn; uzun og:description warn; twitter:image ≠ og:image bilgi; 400 KB görsel warn', () => {
    const r = socialTool.analyze(
      {
        page: pageOf(SOCIAL_HTTP_IMG_URL, SOCIAL_HTTP_IMG_PAGE),
        ogHead: head('http://http-gorsel.example/img/og.jpg', 200, { contentType: 'image/jpeg', contentLength: 400 * 1024 }),
        twHead: head('https://http-gorsel.example/img/tw.jpg', 200, { contentType: 'image/jpeg' }),
      },
      { url: SOCIAL_HTTP_IMG_URL },
    );
    expect(byTitle(r, 'og:image HTTPS')?.status).toBe('warn');
    expect(byTitle(r, 'Görsel boyutu')?.status).toBe('warn');
    expect(byTitle(r, 'Açıklama uzunluğu (kart)')?.status).toBe('warn');
    const note = byTitle(r, 'twitter:image ≠ og:image');
    expect(note?.weight).toBe(0);
  });

  it('görsel HEAD 404 / HTML content-type / unsafe → fail; Content-Length yok → bilgi; 9 MB → fail', () => {
    const page = pageOf(GOOD_URL, GOOD_PAGE);
    const r404 = socialTool.analyze({ page, ogHead: head(OG, 404), twHead: null }, { url: GOOD_URL });
    expect(byTitle(r404, 'Görsel erişilebilir ve image/*')?.status).toBe('fail');
    expect(r404.extra?.preview.imageStatus).toBe('unreachable');
    const rHtml = socialTool.analyze({ page, ogHead: head(OG, 200, { contentType: 'text/html' }), twHead: null }, { url: GOOD_URL });
    expect(byTitle(rHtml, 'Görsel erişilebilir ve image/*')?.status).toBe('fail');
    expect(rHtml.extra?.preview.imageStatus).toBe('notImage');
    const rUnsafe = socialTool.analyze({ page, ogHead: head(OG, 0, { error: 'unsafe' }), twHead: null }, { url: GOOD_URL });
    expect(rUnsafe.extra?.preview.imageStatus).toBe('unsafe');
    const rNoLen = socialTool.analyze({ page, ogHead: head(OG, 200, { contentType: 'image/png' }), twHead: null }, { url: GOOD_URL });
    expect(byTitle(rNoLen, 'Görsel boyutu')).toBeUndefined();
    expect(byTitle(rNoLen, 'Görsel boyutu bilinmiyor')?.weight).toBe(0);
    const rBig = socialTool.analyze(
      { page, ogHead: head(OG, 200, { contentType: 'image/png', contentLength: 9 * 1024 * 1024 }), twHead: null },
      { url: GOOD_URL },
    );
    expect(byTitle(rBig, 'Görsel boyutu')?.status).toBe('fail');
  });

  it('og:image yok + title var → fail + "metin kartı" bilgisi; preview.textCard', () => {
    const r = socialTool.analyze({ page: pageOf(SOCIAL_NO_IMG_URL, SOCIAL_NO_IMG_PAGE), ogHead: null, twHead: null }, { url: SOCIAL_NO_IMG_URL });
    expect(byTitle(r, 'og:image')?.status).toBe('fail');
    expect(byTitle(r, 'Metin kartı')?.weight).toBe(0);
    expect(r.extra?.preview.textCard).toBe(true);
    expect(r.breakdown.ogImage).toBe(0);
    expect(r.breakdown.ogBasic).toBe(100);
  });

  it('ogImageOf: og:image > secure_url > image:url', () => {
    expect(ogImageOf(pageOf(GOOD_URL, GOOD_PAGE))).toBe(OG);
    expect(ogImageOf(pageOf(GOOD_URL, '<meta property="og:image:secure_url" content="https://x.example/a.png">'))).toBe('https://x.example/a.png');
  });

  it('WAF: hüküm, puanlı bulgu yok', () => {
    const r = socialTool.analyze(
      { page: pageOf(WAF_URL, WAF_PAGE, { status: 403, headers: { server: 'cloudflare' } }), ogHead: null, twHead: null },
      { url: WAF_URL },
    );
    expect(r.waf).toBe(true);
    expect(verdictLine(r)).toBe('Bot koruması nedeniyle taranamadı');
    expect(r.findings.filter((f) => f.weight > 0)).toHaveLength(0);
  });
});
