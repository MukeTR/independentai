import { describe, expect, it } from 'vitest';
import { uaFamily, visitorHashFor } from '@/server/visitor';

const CHROME = 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const req = (ip: string, ua = CHROME) =>
  new Request('http://localhost/x', { headers: { 'x-forwarded-for': ip, 'user-agent': ua } });

describe('uaFamily', () => {
  it.each([
    [CHROME, 'chrome'],
    ['Mozilla/5.0 (iPhone) AppleWebKit/605 (KHTML, like Gecko) Version/17 Mobile/15E148 Safari/604', 'safari-mobil'],
    ['Mozilla/5.0 (Windows) Gecko/20100101 Firefox/130.0', 'firefox'],
    ['Mozilla/5.0 (Windows) Chrome/128 Safari/537 Edg/128', 'edge'],
    ['Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)', 'bot'],
    ['', 'other'],
    [null, 'other'],
  ])('%s → %s', (ua, expected) => {
    expect(uaFamily(ua)).toBe(expected);
  });
});

describe('visitorHashFor', () => {
  it("aynı IP + aynı tarayıcı ailesi → aynı hash; sürüm farkı hash'i değiştirmez", () => {
    const a = visitorHashFor(req('203.0.113.7'));
    const b = visitorHashFor(req('203.0.113.7', CHROME.replace('128.0', '129.0')));
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
  it('farklı IP veya farklı aile → farklı hash; ham IP hash içinde geçmez', () => {
    const a = visitorHashFor(req('203.0.113.7'));
    expect(visitorHashFor(req('203.0.113.8'))).not.toBe(a);
    expect(visitorHashFor(req('203.0.113.7', 'Firefox/130.0'))).not.toBe(a);
    expect(a).not.toContain('203.0.113');
  });
  it('tuz değişince hash değişir (VISITOR_SALT)', () => {
    const before = visitorHashFor(req('203.0.113.7'));
    const old = process.env.VISITOR_SALT;
    process.env.VISITOR_SALT = 'another-salt-value-16plus';
    try {
      expect(visitorHashFor(req('203.0.113.7'))).not.toBe(before);
    } finally {
      process.env.VISITOR_SALT = old;
    }
  });
});
