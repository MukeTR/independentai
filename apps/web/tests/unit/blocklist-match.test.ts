/**
 * Yasaklı site eşleşmesi (12 vaka) + admin girdi doğrulaması (kamu son eki, YouTube allowlist, not).
 * DB mock'lu; ağ yok.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = { id: string; hostname: string; redirectUrl: string };
const db = vi.hoisted(() => ({ rows: [] as Row[] }));

vi.mock('@/server/prisma', () => ({
  prisma: {
    blockedSite: {
      findMany: async ({ where }: { where: { hostname: { in: string[] } } }) =>
        db.rows.filter((r) => where.hostname.in.includes(r.hostname)),
      updateMany: async () => ({ count: 1 }),
    },
  },
}));

import { clearBlocklistCache, findBlockedSite } from '@/server/blocklist';
import {
  isPublicSuffixHostname,
  parseBlockedSiteInput,
  parseBlockedSitePatch,
  PUBLIC_SUFFIX_HOSTNAMES,
  REDIRECT_URL_MESSAGE,
} from '@/server/blocked-sites-admin';

const YT = 'https://www.youtube.com/watch?v=abc';
const P: Row = { id: 'p', hostname: 'acme.com', redirectUrl: YT };
const C: Row = { id: 'c', hostname: 'shop.acme.com', redirectUrl: 'https://youtu.be/x' };
const TR: Row = { id: 't', hostname: 'firma.com.tr', redirectUrl: YT };
const IDN: Row = { id: 'i', hostname: 'xn--trke-2oa7j.com', redirectUrl: YT };

beforeEach(() => {
  db.rows = [];
  clearBlocklistCache();
});

describe('findBlockedSite — 12 eşleşme vakası', () => {
  it.each<[string, string, Row[], string | null]>([
    ['tam eşleşme', 'acme.com', [P], 'p'],
    ['www. atılır', 'www.acme.com', [P], 'p'],
    ['alt alan adı', 'shop.acme.com', [P], 'p'],
    ['derin alt alan adı', 'a.b.acme.com', [P], 'p'],
    ['büyük harf', 'ACME.COM', [P], 'p'],
    ['tam URL (şema/yol/sorgu)', 'https://acme.com/urun?x=1#f', [P], 'p'],
    ['son ek benzerliği eşleşmez', 'notacme.com', [P], null],
    ['hostname başka alanın alt etiketi olsa da eşleşmez', 'acme.com.evil.example', [P], null],
    ['en özgül kayıt kazanır', 'www.shop.acme.com', [P, C], 'c'],
    ['üst kayıt kardeş alt alan adını yakalar', 'blog.acme.com', [P, C], 'p'],
    ['com.tr alt alan adı (etldPlusOne değil, tam üst zincir)', 'magaza.firma.com.tr', [TR], 't'],
    ['IDN girdisi punycode kaydıyla eşleşir', 'Türkçe.com', [IDN], 'i'],
  ])('%s: %s', async (_label, input, rows, expectedId) => {
    db.rows = rows;
    const hit = await findBlockedSite(input);
    expect(hit?.id ?? null).toBe(expectedId);
  });

  it('acme.org / boş / geçersiz girdi eşleşmez', async () => {
    db.rows = [P];
    expect(await findBlockedSite('acme.org')).toBeNull();
    expect(await findBlockedSite('')).toBeNull();
    expect(await findBlockedSite('acme')).toBeNull();
  });
});

describe('kamu son eki listesi', () => {
  it.each(['com.tr', 'net.tr', 'org.tr', 'gov.tr', 'edu.tr', 'co.uk', 'github.io', 'myshopify.com'])(
    '%s kamu son eki',
    (h) => {
      expect(PUBLIC_SUFFIX_HOSTNAMES.has(h)).toBe(true);
      expect(isPublicSuffixHostname(h)).toBe(true);
      expect(isPublicSuffixHostname(`www.${h}`)).toBe(true);
    },
  );
  it.each(['firma.com.tr', 'acme.com', 'shop.acme.co.uk', 'kanal.github.io'])('%s tekil alan adı', (h) => {
    expect(isPublicSuffixHostname(h)).toBe(false);
  });
});

describe('parseBlockedSiteInput', () => {
  it('normalize eder ve notu kırpar', () => {
    expect(parseBlockedSiteInput({ hostname: 'https://WWW.Acme.com/x', redirectUrl: YT, note: '  spam  ' })).toEqual({
      hostname: 'acme.com',
      redirectUrl: YT,
      note: 'spam',
    });
    expect(parseBlockedSiteInput({ hostname: 'acme.com', redirectUrl: 'https://youtu.be/q?t=3' }).note).toBeNull();
  });
  it.each([
    ['https://vimeo.com/1', REDIRECT_URL_MESSAGE],
    ['http://www.youtube.com/watch?v=abc', REDIRECT_URL_MESSAGE],
    ['https://m.youtube.com/watch?v=abc', REDIRECT_URL_MESSAGE],
    ['https://youtube.com.evil.example/', REDIRECT_URL_MESSAGE],
    ['', 'boş olamaz'],
  ])('yönlendirme reddi: %s', (redirectUrl, msg) => {
    expect(() => parseBlockedSiteInput({ hostname: 'acme.com', redirectUrl })).toThrow(msg);
  });
  it.each([
    ['com.tr', 'kamu son eki'],
    ['www.co.uk', 'kamu son eki'],
    ['acme', 'Geçersiz alan adı'],
    ['acme.com:8080', 'Geçersiz alan adı'],
    ['a b.com', 'Geçersiz alan adı'],
    ['', 'boş olamaz'],
    [42, 'boş olamaz'],
  ])('alan adı reddi: %s', (hostname, msg) => {
    expect(() => parseBlockedSiteInput({ hostname, redirectUrl: YT })).toThrow(msg);
  });
  it('not 300 karakteri aşamaz; PATCH boş gövde reddedilir', () => {
    expect(() => parseBlockedSiteInput({ hostname: 'acme.com', redirectUrl: YT, note: 'x'.repeat(301) })).toThrow(
      '300',
    );
    expect(() => parseBlockedSitePatch({})).toThrow('Güncellenecek alan yok');
    expect(parseBlockedSitePatch({ note: null })).toEqual({ note: null });
    expect(parseBlockedSitePatch({ hostname: 'Shop.Acme.com' })).toEqual({ hostname: 'shop.acme.com' });
  });
});
