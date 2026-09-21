/**
 * guvenlik-basliklari: saf analiz (fixture başlık setleri + sahte TLS probe) ve `vi.mock('node:tls')` +
 * `vi.mock('@/server/safe-fetch')` ile uçtan uca `run` (TLS başarı / başarısızlık → warn, asla fail).
 */
import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WAF_PAGE } from '../fixtures/site-html-core';
import {
  artifact,
  head,
  SEC_GOOD_HEADERS,
  SEC_GOOD_URL,
  SEC_PAGE,
  SEC_POOR_HEADERS,
  SEC_POOR_URL,
  SEC_WEAK_HEADERS,
  SEC_WEAK_URL,
  tlsFailed,
  tlsOk,
} from '../fixtures/site-html-a';

// ── node:tls mock (tls-probe.test.ts kalıbı) ──
const tlsState = vi.hoisted(() => ({
  first: 'ok' as 'ok' | 'error',
  legacy: 'error' as 'ok' | 'error',
  daysLeft: 60,
}));
class FakeSocket extends EventEmitter {
  authorized = true;
  authorizationError: string | null = null;
  getPeerCertificate() {
    return {
      valid_to: new Date(Date.now() + tlsState.daysLeft * 86_400_000).toUTCString(),
      valid_from: new Date(Date.now() - 30 * 86_400_000).toUTCString(),
      issuer: { O: "Let's Encrypt" },
      subject: { CN: 'guvenli-site.example' },
      subjectaltname: 'DNS:guvenli-site.example',
    };
  }
  getProtocol() {
    return 'TLSv1.3';
  }
  end() {}
  destroy() {}
}
vi.mock('node:tls', () => ({
  connect: (opts: Record<string, unknown>) => {
    const isLegacy = opts.maxVersion === 'TLSv1.1';
    const mode = isLegacy ? tlsState.legacy : tlsState.first;
    const s = new FakeSocket();
    setTimeout(() => {
      if (mode === 'ok') s.emit('secureConnect');
      else s.emit('error', new Error('ECONNRESET'));
    }, 1);
    return s;
  },
  checkServerIdentity: () => undefined,
}));

// ── safe-fetch mock: https GET → başlık seti; http HEAD → https'e 301 ──
const net = vi.hoisted(() => ({ calls: [] as { url: string; method: string }[], headers: {} as Record<string, string> }));
vi.mock('@/server/safe-fetch', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    assertPublicUrl: async (u: string) => new URL(u),
    guardedLookup: function guardedLookup() {},
    safeFetch: async (rawUrl: string, init: { method?: string } = {}) => {
      net.calls.push({ url: rawUrl, method: init.method ?? 'GET' });
      const u = new URL(rawUrl);
      if (u.protocol === 'http:') {
        const to = `https://${u.host}${u.pathname}`;
        return { status: 200, ok: true, url: to, headers: new Headers(net.headers), text: '', truncated: false, redirects: [{ from: rawUrl, to, status: 301 }] };
      }
      return { status: 200, ok: true, url: rawUrl, headers: new Headers({ 'content-type': 'text/html', ...net.headers }), text: SEC_PAGE, truncated: false, redirects: [] };
    },
  };
});

import { SECURITY_AXES, securityTool, redirectsToHttps } from '@/server/site-scan/security-headers';
import { gradeFor, headerRows, leaksVersion, parseCsp, parseHsts } from '@/server/site-scan/security-grades';
import { verdictLine } from '@/server/site-scan/core';
import { GUIDE_TOPICS } from '@/server/commerce/guides';

type R = ReturnType<typeof securityTool.analyze>;
const byTitle = (r: R, t: string) => r.findings.find((f) => f.title === t);
const httpsPage = (url: string, headers: Record<string, string>, status = 200) =>
  artifact(url, SEC_PAGE, { status, headers: { 'content-type': 'text/html; charset=utf-8', ...headers } });
const httpRedirect = (url: string) => {
  const h = head(url.replace(/^https:/, 'http:'), 200);
  return { ...h, url, redirects: [{ from: url.replace(/^https:/, 'http:'), to: url, status: 301 }] };
};

beforeEach(() => {
  net.calls.length = 0;
  net.headers = { ...SEC_GOOD_HEADERS };
  tlsState.first = 'ok';
  tlsState.legacy = 'error';
  tlsState.daysLeft = 60;
});

describe('güvenlik başlıkları — saf yardımcılar', () => {
  it('parseHsts / parseCsp / leaksVersion / gradeFor', () => {
    expect(parseHsts('max-age=31536000; includeSubDomains; preload')).toEqual({ present: true, maxAge: 31536000, includeSubDomains: true, preload: true });
    expect(parseHsts(null).present).toBe(false);
    const csp = parseCsp("default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'");
    expect(csp).toMatchObject({ present: true, unsafeInline: true, unsafeEval: true, frameAncestors: true, wildcardScript: false });
    expect(parseCsp("default-src *").wildcardScript).toBe(true);
    expect(leaksVersion('Apache/2.4.29 (Ubuntu)')).toBe(true);
    expect(leaksVersion('nginx')).toBe(false);
    expect(leaksVersion(null)).toBe(false);
    expect(gradeFor(95, { hsts: true, csp: true })).toBe('A+');
    expect(gradeFor(95, { hsts: true, csp: false })).toBe('A');
    expect(gradeFor(70, { hsts: true, csp: true })).toBe('B');
    expect(gradeFor(55, { hsts: false, csp: false })).toBe('C');
    expect(gradeFor(40, { hsts: false, csp: false })).toBe('D');
    expect(gradeFor(25, { hsts: false, csp: false })).toBe('E');
    expect(gradeFor(5, { hsts: false, csp: false })).toBe('F');
  });

  it('headerRows: 7 satır + kullanımdan kalkmış başlık; XFO yoksa frame-ancestors kabul', () => {
    const rows = headerRows(new Headers(SEC_POOR_HEADERS));
    expect(rows.filter((r) => r.key !== 'x-xss-protection')).toHaveLength(7);
    expect(rows.find((r) => r.key === 'x-xss-protection')?.status).toBe('info');
    expect(rows.find((r) => r.key === 'strict-transport-security')?.status).toBe('fail');
    const good = headerRows(new Headers({ 'content-security-policy': "frame-ancestors 'self'" }));
    expect(good.find((r) => r.key === 'x-frame-options')?.present).toBe(true);
  });

  it('redirectsToHttps', () => {
    expect(redirectsToHttps(null)).toBeNull();
    expect(redirectsToHttps({ url: 'http://a.example/', redirects: [] })).toBe(false);
    expect(redirectsToHttps({ url: 'https://a.example/', redirects: [{ to: 'https://a.example/' }] })).toBe(true);
  });
});

describe('guvenlik-basliklari motoru — saf analiz', () => {
  it('ağırlıklar 100; breakdown anahtarları; iyi set A+ ≥90; rehber konuları geçerli', () => {
    expect(SECURITY_AXES.reduce((s, a) => s + a.weight, 0)).toBe(100);
    const r = securityTool.analyze(
      { main: httpsPage(SEC_GOOD_URL, SEC_GOOD_HEADERS), httpVariant: httpRedirect(SEC_GOOD_URL), tls: tlsOk(), url: SEC_GOOD_URL },
      { url: SEC_GOOD_URL },
    );
    expect(Object.keys(r.breakdown).sort()).toEqual(SECURITY_AXES.map((a) => a.key).sort());
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.extra?.grade).toBe('A+');
    expect(r.extra?.approximate).toBe(true);
    expect(r.extra?.headers).toHaveLength(7);
    for (const f of r.findings) if (f.topic) expect(GUIDE_TOPICS).toContain(f.topic);
  });

  it('GOOD > WEAK > POOR; zayıf set: HSTS fail, sürüm sızıntısı warn, X-XSS-Protection bilgi (puan yok)', () => {
    const good = securityTool.analyze({ main: httpsPage(SEC_GOOD_URL, SEC_GOOD_HEADERS), httpVariant: httpRedirect(SEC_GOOD_URL), tls: tlsOk(), url: SEC_GOOD_URL });
    const weak = securityTool.analyze({ main: httpsPage(SEC_WEAK_URL, SEC_WEAK_HEADERS), httpVariant: httpRedirect(SEC_WEAK_URL), tls: tlsOk(), url: SEC_WEAK_URL });
    const poor = securityTool.analyze({ main: httpsPage(SEC_POOR_URL, SEC_POOR_HEADERS), httpVariant: httpRedirect(SEC_POOR_URL), tls: tlsOk(), url: SEC_POOR_URL });
    expect(good.score).toBeGreaterThan(weak.score);
    expect(weak.score).toBeGreaterThan(poor.score);
    expect(byTitle(poor, 'Strict-Transport-Security')?.status).toBe('fail');
    expect(byTitle(poor, 'Sunucu sürümü gizli')?.status).toBe('warn');
    expect(byTitle(poor, 'Content-Security-Policy')?.status).toBe('warn'); // KOBİ'de nadir, fail değil
    const dep = byTitle(poor, 'Kullanımdan kalkmış başlık');
    expect(dep?.weight).toBe(0);
    expect(dep?.evidence).toBe('x-xss-protection');
    expect(['E', 'F', 'D']).toContain(poor.extra?.grade);
    // Referrer / Permissions yoksa bilgi (puan düşürmez)
    expect(byTitle(poor, 'Referrer-Policy yok')?.weight).toBe(0);
    expect(byTitle(poor, 'Permissions-Policy yok')?.weight).toBe(0);
    expect(byTitle(poor, 'Referrer-Policy')).toBeUndefined();
  });

  it('zayıf set: HSTS max-age kısa warn, CSP unsafe-inline+eval warn, XFO/frame-ancestors yok warn, Expect-CT bilgi', () => {
    const weak = securityTool.analyze({ main: httpsPage(SEC_WEAK_URL, SEC_WEAK_HEADERS), httpVariant: httpRedirect(SEC_WEAK_URL), tls: tlsOk(), url: SEC_WEAK_URL });
    expect(byTitle(weak, 'HSTS max-age ≥ 180 gün')?.status).toBe('warn');
    expect(byTitle(weak, 'CSP sıkılığı')?.status).toBe('warn');
    expect(byTitle(weak, 'X-Frame-Options / frame-ancestors')?.status).toBe('warn');
    expect(byTitle(weak, 'X-Content-Type-Options: nosniff')?.status).toBe('pass');
    expect(byTitle(weak, 'Kullanımdan kalkmış başlık')?.evidence).toBe('expect-ct');
  });

  it('TLS: probe ok:false → warn "ölçülemedi", ASLA fail; daysLeft 10 fail; 20 warn; hostnameMatch false fail; legacyTls true warn', () => {
    const base = { main: httpsPage(SEC_GOOD_URL, SEC_GOOD_HEADERS), httpVariant: httpRedirect(SEC_GOOD_URL), url: SEC_GOOD_URL };
    const failed = securityTool.analyze({ ...base, tls: tlsFailed('Zaman aşımı') });
    const f = byTitle(failed, 'TLS sertifikası ölçülemedi');
    expect(f?.status).toBe('warn');
    expect(failed.findings.filter((x) => x.category === 'tls' && x.status === 'fail')).toHaveLength(0);
    expect(failed.extra?.tls.measured).toBe(false);
    expect(failed.extra?.tls.error).toBe('Zaman aşımı');
    const nullProbe = securityTool.analyze({ ...base, tls: null });
    expect(byTitle(nullProbe, 'TLS sertifikası ölçülemedi')?.status).toBe('warn');

    expect(byTitle(securityTool.analyze({ ...base, tls: tlsOk({ daysLeft: 10 }) }), 'Sertifika bitişi')?.status).toBe('fail');
    expect(byTitle(securityTool.analyze({ ...base, tls: tlsOk({ daysLeft: 20 }) }), 'Sertifika bitişi')?.status).toBe('warn');
    expect(byTitle(securityTool.analyze({ ...base, tls: tlsOk({ daysLeft: -3 }) }), 'Sertifika bitişi')?.detail).toMatch(/doldu/);
    expect(byTitle(securityTool.analyze({ ...base, tls: tlsOk({ hostnameMatch: false }) }), 'Sertifika alan adıyla eşleşiyor')?.status).toBe('fail');
    expect(byTitle(securityTool.analyze({ ...base, tls: tlsOk({ legacyTls: true }) }), 'TLS 1.0 / 1.1 kapalı')?.status).toBe('warn');
    const nullLegacy = securityTool.analyze({ ...base, tls: tlsOk({ legacyTls: null }) });
    expect(byTitle(nullLegacy, 'TLS 1.0 / 1.1 kapalı')).toBeUndefined();
    expect(byTitle(nullLegacy, 'Eski TLS desteği ölçülemedi')?.weight).toBe(0);
    expect(byTitle(securityTool.analyze({ ...base, tls: tlsOk({ authorized: false, authorizationError: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' }) }), 'Sertifika zinciri')?.status).toBe('warn');
  });

  it('HTTP→HTTPS: yönlenmiyor fail; http yanıt vermiyor warn; ana istek http ise zincirden okunur', () => {
    const base = { main: httpsPage(SEC_GOOD_URL, SEC_GOOD_HEADERS), tls: tlsOk(), url: SEC_GOOD_URL };
    const stuck = securityTool.analyze({ ...base, httpVariant: head('http://guvenli-site.example/', 200) });
    expect(byTitle(stuck, 'HTTP → HTTPS yönlendirmesi')?.status).toBe('fail');
    expect(stuck.extra?.httpsRedirect).toBe(false);
    const dead = securityTool.analyze({ ...base, httpVariant: head('http://guvenli-site.example/', 0, { error: 'network' }) });
    expect(byTitle(dead, 'HTTP → HTTPS yönlendirmesi')?.status).toBe('warn');
    const httpMain = artifact('http://guvenli-site.example/', SEC_PAGE, { headers: SEC_GOOD_HEADERS, finalUrl: 'https://guvenli-site.example/' });
    const viaChain = securityTool.analyze({ main: { ...httpMain, redirects: [{ from: 'http://guvenli-site.example/', to: 'https://guvenli-site.example/', status: 301 }] }, httpVariant: null, tls: tlsOk(), url: 'http://guvenli-site.example/' });
    expect(byTitle(viaChain, 'HTTP → HTTPS yönlendirmesi')?.status).toBe('pass');
  });

  it('WAF: hüküm, puanlı bulgu yok, not F; erişilemeyen site tek kritik bulgu', () => {
    const waf = securityTool.analyze({ main: artifact(SEC_GOOD_URL, WAF_PAGE, { status: 403, headers: { server: 'cloudflare' } }), httpVariant: null, tls: tlsOk(), url: SEC_GOOD_URL });
    expect(waf.waf).toBe(true);
    expect(verdictLine(waf)).toBe('Bot koruması nedeniyle taranamadı');
    expect(waf.findings.filter((f) => f.weight > 0)).toHaveLength(0);
    const dead = securityTool.analyze({ main: artifact(SEC_GOOD_URL, '', { status: 0, error: 'network' }), httpVariant: null, tls: null, url: SEC_GOOD_URL });
    expect(byTitle(dead, 'Siteye ulaşılamadı')?.status).toBe('fail');
    expect(dead.score).toBe(0);
  });
});

describe('guvenlik-basliklari motoru — run (node:tls + safe-fetch mock)', () => {
  it('TLS başarılı: sertifika bilgisi ekstra alanda; 2 HTTP isteği (https GET + http HEAD); A+', async () => {
    const r = await securityTool.run(SEC_GOOD_URL);
    expect(r.stats.requests).toBe(2);
    expect(net.calls.map((c) => c.method).sort()).toEqual(['GET', 'HEAD']);
    expect(r.extra?.tls.measured).toBe(true);
    expect(r.extra?.tls.daysLeft).toBe(60);
    expect(r.extra?.tls.legacyTls).toBe(false);
    expect(r.extra?.tls.issuer).toBe("Let's Encrypt");
    expect(r.extra?.httpsRedirect).toBe(true);
    expect(r.extra?.grade).toBe('A+');
    expect(r.partial).toBe(false);
  });

  it('TLS başarısız (ilk el sıkışma hata): warn "ölçülemedi", tls ekseninde fail yok, skor düşer ama F olmaz', async () => {
    tlsState.first = 'error';
    const r = await securityTool.run(SEC_GOOD_URL);
    expect(r.extra?.tls.measured).toBe(false);
    expect(r.findings.find((f) => f.title === 'TLS sertifikası ölçülemedi')?.status).toBe('warn');
    expect(r.findings.filter((f) => f.category === 'tls' && f.status === 'fail')).toHaveLength(0);
    expect(r.breakdown.tls).toBe(50);
    expect(r.extra?.grade).not.toBe('F');
  });

  it('eski TLS kabul ediliyor → warn', async () => {
    tlsState.legacy = 'ok';
    const r = await securityTool.run(SEC_GOOD_URL);
    expect(r.extra?.tls.legacyTls).toBe(true);
    expect(r.findings.find((f) => f.title === 'TLS 1.0 / 1.1 kapalı')?.status).toBe('warn');
  });
});
