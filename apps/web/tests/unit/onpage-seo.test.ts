import { describe, expect, it } from 'vitest';
import {
  GOOD_PAGE,
  GOOD_ROBOTS,
  GOOD_URL,
  LEGACY_PAGE,
  LEGACY_URL,
  POOR_PAGE,
  POOR_URL,
  WAF_PAGE,
  WAF_URL,
  pageOf,
} from '../fixtures/site-html-core';
import {
  SEO_BLOCK_ROBOTS,
  SEO_CANON_PAGE,
  SEO_CANON_URL,
  SEO_SKIP_PAGE,
  SEO_SKIP_URL,
  head,
} from '../fixtures/site-html-a';
import { canonicalNeedsHead, hasFavicon, SEO_AXES, seoTool } from '@/server/site-scan/onpage-seo';
import { snippetWidth, textWidthPx, TITLE_LIMIT_PX } from '@/server/site-scan/snippet-width';
import { verdictLine } from '@/server/site-scan/core';
import { GUIDE_TOPICS } from '@/server/commerce/guides';

const byTitle = (r: ReturnType<typeof seoTool.analyze>, t: string) => r.findings.find((f) => f.title === t);

describe('seo-karnesi motoru', () => {
  it('eksen ağırlıkları 100; breakdown anahtarları eksenlerle birebir', () => {
    expect(SEO_AXES.reduce((s, a) => s + a.weight, 0)).toBe(100);
    const r = seoTool.analyze({ page: pageOf(GOOD_URL, GOOD_PAGE, { robots: GOOD_ROBOTS }), canonicalHead: null }, { url: GOOD_URL });
    expect(Object.keys(r.breakdown).sort()).toEqual(SEO_AXES.map((a) => a.key).sort());
    expect(r.kind).toBe('ONPAGE_SEO');
    for (const f of r.findings) if (f.topic) expect(GUIDE_TOPICS).toContain(f.topic);
  });

  it('GOOD > POOR; iyi sayfa ≥85, zayıf sayfa <40 ve kritik bulgular', () => {
    const good = seoTool.analyze({ page: pageOf(GOOD_URL, GOOD_PAGE, { robots: GOOD_ROBOTS }), canonicalHead: null }, { url: GOOD_URL });
    const poor = seoTool.analyze({ page: pageOf(POOR_URL, POOR_PAGE, { robots: null }), canonicalHead: null }, { url: POOR_URL });
    expect(good.score).toBeGreaterThanOrEqual(85);
    expect(poor.score).toBeLessThan(40);
    expect(good.score).toBeGreaterThan(poor.score);
    expect(poor.verdict.fail).toBeGreaterThanOrEqual(4);
    expect(verdictLine(poor)).toMatch(/kritik/);
    expect(poor.recommendations.length).toBeGreaterThan(0);
    expect(good.extra?.snippet.title).toContain('İyi Site');
  });

  it('çoklu H1 = warn (fail değil); H1 yok = fail', () => {
    const poor = seoTool.analyze({ page: pageOf(POOR_URL, POOR_PAGE), canonicalHead: null }, { url: POOR_URL });
    expect(byTitle(poor, 'H1 başlığı')?.status).toBe('warn');
    const noH1 = pageOf(GOOD_URL, GOOD_PAGE.replace(/<h1>.*<\/h1>/, ''));
    const r = seoTool.analyze({ page: noH1, canonicalHead: null }, { url: GOOD_URL });
    expect(byTitle(r, 'H1 başlığı')?.status).toBe('fail');
  });

  it('başlık atlaması (H1→H3) warn; noindex fail; göreli canonical warn; kısa gövde JS uyarısı; favicon bilgi', () => {
    const r = seoTool.analyze({ page: pageOf(SEO_SKIP_URL, SEO_SKIP_PAGE), canonicalHead: null }, { url: SEO_SKIP_URL });
    expect(byTitle(r, 'Başlık sırası (H1 → H2 → H3)')?.status).toBe('warn');
    expect(byTitle(r, 'noindex yok')?.status).toBe('fail');
    expect(byTitle(r, 'noindex yok')?.topic).toBe('noindex');
    expect(byTitle(r, 'Canonical adres')?.status).toBe('warn');
    expect(byTitle(r, 'Gövde metni')?.status).toBe('warn');
    expect(byTitle(r, 'Gövde metni')?.topic).toBe('jsRendering');
    expect(byTitle(r, 'Sayfa başlığı (title)')?.status).toBe('warn'); // "Hizmetler" < 10 kr
    const fav = byTitle(r, 'Favicon bildirilmemiş');
    expect(fav?.weight).toBe(0);
    expect(r.extra?.favicon).toBe(false);
  });

  it('canonical farklı host + http şeması fail; robots.txt engeli fail; lang≠tr bilgi (puan yok); favicon var', () => {
    const page = pageOf(SEO_CANON_URL, SEO_CANON_PAGE, { robots: SEO_BLOCK_ROBOTS });
    const r = seoTool.analyze({ page, canonicalHead: head('http://baska-site.example/urun', 200) }, { url: SEO_CANON_URL });
    expect(byTitle(r, 'Canonical adres')?.status).toBe('fail');
    expect(byTitle(r, 'robots.txt bu sayfaya izin veriyor')?.status).toBe('fail');
    expect(byTitle(r, 'robots.txt bu sayfaya izin veriyor')?.evidence).toBe('Disallow: /urun');
    const langNote = byTitle(r, 'Sayfa dili Türkçe değil');
    expect(langNote?.weight).toBe(0);
    expect(byTitle(r, '<html lang>')?.status).toBe('pass');
    expect(r.extra?.favicon).toBe(true);
    expect(hasFavicon('<link rel="shortcut icon" href="/f.ico">')).toBe(true);
    expect(hasFavicon('<link rel="stylesheet" href="/a.css">')).toBe(false);
  });

  it('canonical HEAD: kendisi → HEAD gerekmez; farklı adres 404 → fail; ağ hatası → warn', () => {
    const self = pageOf(GOOD_URL, GOOD_PAGE);
    expect(canonicalNeedsHead(self)).toBeNull();
    const other = pageOf(GOOD_URL, GOOD_PAGE.replace('href="https://iyi-site.example/"', 'href="https://iyi-site.example/ana"'));
    expect(canonicalNeedsHead(other)).toBe('https://iyi-site.example/ana');
    const r404 = seoTool.analyze({ page: other, canonicalHead: head('https://iyi-site.example/ana', 404) }, { url: GOOD_URL });
    expect(byTitle(r404, 'Canonical adres')?.status).toBe('fail');
    const rNet = seoTool.analyze({ page: other, canonicalHead: head('https://iyi-site.example/ana', 0, { error: 'network' }) }, { url: GOOD_URL });
    expect(byTitle(rNet, 'Canonical adres')?.status).toBe('warn');
    const rOk = seoTool.analyze({ page: other, canonicalHead: head('https://iyi-site.example/ana', 200) }, { url: GOOD_URL });
    expect(byTitle(rOk, 'Canonical adres')?.status).toBe('pass');
  });

  it('legacyCharset: uzunluk kontrolleri warn, varlık kontrolleri korunur, kodlama bulgusu warn', () => {
    const page = pageOf(LEGACY_URL, LEGACY_PAGE, { headers: { 'content-type': 'text/html; charset=windows-1254' } });
    expect(page.legacyCharset).toBe(true);
    const r = seoTool.analyze({ page, canonicalHead: null }, { url: LEGACY_URL });
    expect(r.legacyCharset).toBe(true);
    expect(byTitle(r, 'Sayfa başlığı (title)')?.status).toBe('warn');
    expect(byTitle(r, 'Meta açıklama (description)')?.status).toBe('warn');
    expect(byTitle(r, 'Gövde metni')?.status).toBe('warn');
    expect(byTitle(r, 'Modern kodlama (UTF-8)')?.status).toBe('warn');
    expect(byTitle(r, 'Modern kodlama (UTF-8)')?.topic).toBe('charset');
    expect(byTitle(r, 'H1 başlığı')?.status).toBe('pass');
    expect(byTitle(r, 'Mobil viewport')?.status).toBe('pass');
  });

  it('WAF: skor yerine hüküm, puanlı bulgu yok', () => {
    const page = pageOf(WAF_URL, WAF_PAGE, { status: 403, headers: { server: 'cloudflare' } });
    const r = seoTool.analyze({ page, canonicalHead: null }, { url: WAF_URL });
    expect(r.waf).toBe(true);
    expect(verdictLine(r)).toBe('Bot koruması nedeniyle taranamadı');
    expect(r.findings.filter((f) => f.weight > 0)).toHaveLength(0);
  });

  it('erişilemeyen sayfa (404): tek kritik bulgu, skor 0', () => {
    const page = pageOf(GOOD_URL, '', { status: 404 });
    const r = seoTool.analyze({ page, canonicalHead: null }, { url: GOOD_URL });
    expect(r.score).toBe(0);
    expect(byTitle(r, 'Sayfa alınamadı')?.status).toBe('fail');
  });

  it('snippet-width: uzun title kesilir bilgisi (puan düşürmez), piksel genişliği monoton', () => {
    expect(textWidthPx('iii', 20)).toBeLessThan(textWidthPx('MMM', 20));
    const long = 'A'.repeat(60);
    const sw = snippetWidth(long, null);
    expect(sw.titlePx).toBeGreaterThan(TITLE_LIMIT_PX);
    expect(sw.titleTruncated).toBe(true);
    const page = pageOf(GOOD_URL, GOOD_PAGE.replace(/<title>.*<\/title>/, `<title>${'Endüstriyel mutfak '.repeat(3)}Ankara</title>`));
    const r = seoTool.analyze({ page, canonicalHead: null }, { url: GOOD_URL });
    const note = byTitle(r, 'Title Google’da kesilebilir');
    expect(note?.weight).toBe(0);
    expect(r.extra?.snippet.titleTruncated).toBe(true);
  });
});
