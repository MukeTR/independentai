import { describe, expect, it } from 'vitest';
import { WAF_PAGE } from '../fixtures/site-html-core';
import { chained, chainOf, META_REFRESH_PAGE, SEC_PAGE } from '../fixtures/site-html-a';
import { JS_REDIRECT_RE, META_REFRESH_RE, REDIRECT_AXES, redirectTool, variantInputs, type RedirectArtifacts } from '@/server/site-scan/redirects';
import { verdictLine } from '@/server/site-scan/core';
import { GUIDE_TOPICS } from '@/server/commerce/guides';

const URL_ = 'https://www.ornek.example/';
const T = 'https://www.ornek.example/';
type R = ReturnType<typeof redirectTool.analyze>;
const byTitle = (r: R, t: string) => r.findings.find((f) => f.title === t);

/** Dört varyantı tek hedefe tek adımda gönderen "iyi" site */
function goodArtifacts(): RedirectArtifacts {
  const v = variantInputs(URL_);
  return {
    url: URL_,
    variants: v.map((x) => ({
      ...x,
      artifact: x.input === T ? chained(x.input, []) : chained(x.input, chainOf([x.input, T])),
    })),
  };
}

describe('yonlendirme-zinciri motoru', () => {
  it('variantInputs: http/https × www/çıplak, yol ve sorgu korunur', () => {
    const v = variantInputs('https://Shop.Example.com/urun?x=1');
    expect(v.map((x) => x.input)).toEqual([
      'http://shop.example.com/urun?x=1',
      'https://shop.example.com/urun?x=1',
      'http://www.shop.example.com/urun?x=1',
      'https://www.shop.example.com/urun?x=1',
    ]);
    expect(variantInputs('https://www.a.example/')[0]!.input).toBe('http://a.example/');
  });

  it('ağırlıklar 100; breakdown anahtarları; iyi site 100; diyagram verisi 4 varyant', () => {
    expect(REDIRECT_AXES.reduce((s, a) => s + a.weight, 0)).toBe(100);
    const r = redirectTool.analyze(goodArtifacts(), { url: URL_ });
    expect(Object.keys(r.breakdown).sort()).toEqual(REDIRECT_AXES.map((a) => a.key).sort());
    expect(r.score).toBe(100);
    expect(r.verdict.fail).toBe(0);
    expect(r.extra?.variants).toHaveLength(4);
    expect(r.extra?.variants.find((v) => v.main)?.label).toBe('https://www');
    expect(r.extra?.canonicalTarget).toBe('https://www.ornek.example');
    expect(r.extra?.maxHops).toBe(1);
    for (const f of r.findings) if (f.topic) expect(GUIDE_TOPICS).toContain(f.topic);
  });

  it('3 adımlı zincir warn; 4 adım fail; 302 ile host değişimi warn', () => {
    const a = goodArtifacts();
    a.variants[0]!.artifact = chained(a.variants[0]!.input, chainOf(['http://ornek.example/', 'https://ornek.example/', 'https://www.ornek.example', T]));
    const r3 = redirectTool.analyze(a, { url: URL_ });
    expect(byTitle(r3, 'En uzun zincir')?.status).toBe('warn');
    expect(r3.extra?.maxHops).toBe(3);
    a.variants[0]!.artifact = chained(a.variants[0]!.input, chainOf(['http://ornek.example/', 'https://ornek.example/', 'https://ornek.example/a', 'https://ornek.example/b', T]));
    const r4 = redirectTool.analyze(a, { url: URL_ });
    expect(byTitle(r4, 'En uzun zincir')?.status).toBe('fail');
    const b = goodArtifacts();
    b.variants[1]!.artifact = chained(b.variants[1]!.input, chainOf(['https://ornek.example/', T], 302));
    const r302 = redirectTool.analyze(b, { url: URL_ });
    expect(byTitle(r302, 'Kalıcı yönlendirme kodu (301/308)')?.status).toBe('warn');
    expect(r302.score).toBeLessThan(100);
  });

  it('farklı hostlarda biten varyantlar fail (tek kanonik host yok)', () => {
    const a = goodArtifacts();
    a.variants[1]!.artifact = chained(a.variants[1]!.input, []); // https://ornek.example/ kendisi 200
    const r = redirectTool.analyze(a, { url: URL_ });
    expect(byTitle(r, 'Tek kanonik adres')?.status).toBe('fail');
    expect(r.extra?.canonicalTarget).toBeNull();
  });

  it('http:// varyantı 200 ile http’te kalıyor fail; http yanıt vermiyor warn; DNS’siz www warn notu (fail değil)', () => {
    const a = goodArtifacts();
    a.variants[0]!.artifact = chained(a.variants[0]!.input, []); // http://ornek.example/ 200
    const r = redirectTool.analyze(a, { url: URL_ });
    expect(byTitle(r, 'http:// → https://')?.status).toBe('fail');
    expect(byTitle(r, 'Tek kanonik adres')?.status).toBe('fail');

    const b = goodArtifacts();
    b.variants[0]!.artifact = chained(b.variants[0]!.input, [], { status: 0, error: 'network' });
    b.variants[2]!.artifact = chained(b.variants[2]!.input, [], { status: 0, error: 'timeout' });
    const rb = redirectTool.analyze(b, { url: URL_ });
    expect(byTitle(rb, 'http:// → https://')?.status).toBe('warn');
    expect(byTitle(rb, 'Tek kanonik adres')?.status).toBe('pass');
    expect(byTitle(rb, 'Yanıt vermeyen varyant')?.weight).toBe(0);
    expect(rb.extra?.variants.filter((v) => !v.resolved)).toHaveLength(2);
  });

  it('döngü fail; unsafe hop fail "özel ağa gidiyor ya da 4’ten fazla adım"', () => {
    const a = goodArtifacts();
    a.variants[0]!.artifact = chained(a.variants[0]!.input, [
      { from: 'http://ornek.example/', to: 'https://ornek.example/', status: 301 },
      { from: 'https://ornek.example/', to: 'http://ornek.example/', status: 301 },
    ]);
    const r = redirectTool.analyze(a, { url: URL_ });
    expect(byTitle(r, 'Döngü / güvensiz hop yok')?.status).toBe('fail');
    expect(r.extra?.loop).toBe(true);
    const b = goodArtifacts();
    b.variants[2]!.artifact = chained(b.variants[2]!.input, [], { status: 0, error: 'unsafe' });
    const rb = redirectTool.analyze(b, { url: URL_ });
    expect(byTitle(rb, 'Döngü / güvensiz hop yok')?.status).toBe('fail');
    expect(byTitle(rb, 'Döngü / güvensiz hop yok')?.detail).toMatch(/özel ağa/);
  });

  it('meta refresh / JavaScript yönlendirmesi warn', () => {
    expect(META_REFRESH_RE.test(META_REFRESH_PAGE)).toBe(true);
    expect(JS_REDIRECT_RE.test(META_REFRESH_PAGE)).toBe(true);
    expect(JS_REDIRECT_RE.test(SEC_PAGE)).toBe(false);
    const a = goodArtifacts();
    a.variants[3]!.artifact = chained(a.variants[3]!.input, [], { html: META_REFRESH_PAGE });
    const r = redirectTool.analyze(a, { url: URL_ });
    expect(byTitle(r, 'Sunucu tarafı yönlendirme')?.status).toBe('warn');
    expect(r.extra?.metaRefresh).toBe(true);
    expect(r.extra?.jsRedirect).toBe(true);
  });

  it('sondaki eğik çizgi: varyantlar yalnız / ile ayrışırsa warn; canonical /’siz ise warn', () => {
    const url = 'https://www.ornek.example/hizmetler';
    const v = variantInputs(url);
    const a: RedirectArtifacts = {
      url,
      variants: v.map((x) => ({
        ...x,
        artifact: x.input === url ? chained(x.input, []) : chained(x.input, chainOf([x.input, `${url}/`])),
      })),
    };
    const r = redirectTool.analyze(a, { url });
    expect(byTitle(r, 'Sondaki eğik çizgi tutarlı')?.status).toBe('warn');
    const b = goodArtifacts();
    b.variants[3]!.artifact = chained(b.variants[3]!.input, [], {
      html: SEC_PAGE.replace('<title>', '<link rel="canonical" href="https://www.ornek.example"><title>'),
    });
    const rb = redirectTool.analyze(b, { url: URL_ });
    // "https://www.ornek.example" URL olarak "https://www.ornek.example/" olur → fark yok → pass
    expect(byTitle(rb, 'Sondaki eğik çizgi tutarlı')?.status).toBe('pass');
  });

  it('hiçbir varyant çözülmezse tek kritik bulgu, skor 0', () => {
    const v = variantInputs(URL_);
    const a: RedirectArtifacts = { url: URL_, variants: v.map((x) => ({ ...x, artifact: chained(x.input, [], { status: 0, error: 'network' }) })) };
    const r = redirectTool.analyze(a, { url: URL_ });
    expect(r.score).toBe(0);
    expect(byTitle(r, 'Hiçbir varyant yanıt vermedi')?.status).toBe('fail');
  });

  it('WAF (ana varyant 403 cloudflare): hüküm "taranamadı", zincir verisi yine döner', () => {
    const a = goodArtifacts();
    a.variants[3]!.artifact = chained(a.variants[3]!.input, [], { status: 403, html: WAF_PAGE, headers: { server: 'cloudflare' } });
    const r = redirectTool.analyze(a, { url: URL_ });
    expect(r.waf).toBe(true);
    expect(verdictLine(r)).toBe('Bot koruması nedeniyle taranamadı');
    expect(r.extra?.variants).toHaveLength(4);
  });
});
