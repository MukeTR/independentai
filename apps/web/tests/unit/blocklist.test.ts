import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Row = { id: string; hostname: string; redirectUrl: string };
const db = vi.hoisted(() => ({ rows: [] as Row[], fail: false, calls: 0, hits: [] as string[] }));

vi.mock('@/server/prisma', () => ({
  prisma: {
    blockedSite: {
      findMany: async ({ where }: { where: { hostname: { in: string[] } } }) => {
        db.calls += 1;
        if (db.fail) throw new Error('db down');
        return db.rows.filter((r) => where.hostname.in.includes(r.hostname));
      },
      updateMany: async ({ where }: { where: { id: string } }) => {
        db.hits.push(where.id);
        return { count: 1 };
      },
    },
  },
}));

import {
  clearBlocklistCache,
  findBlockedSite,
  hostnameCandidates,
  isAllowedRedirectUrl,
  normalizeHostname,
  recordBlockedHit,
} from '@/server/blocklist';

const YT = 'https://www.youtube.com/watch?v=abc';

beforeEach(() => {
  db.rows = [];
  db.fail = false;
  db.calls = 0;
  db.hits = [];
  clearBlocklistCache();
});
afterEach(() => vi.useRealTimers());

describe('normalizeHostname', () => {
  it.each([
    ['Acme.COM', 'acme.com'],
    ['https://www.acme.com/yol?x=1#f', 'acme.com'],
    ['www.shop.acme.com.tr', 'shop.acme.com.tr'],
    ['  acme.com.  ', 'acme.com'],
    ['türkçe.com', 'xn--trke-2oa7j.com'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeHostname(input)).toBe(expected);
  });
  it.each(['', 'acme', 'acme.com:8080', 'a b.com', 'user@acme.com', 'http://', '127.0.0.1', 42, null])(
    'geçersiz: %s',
    (input) => {
      expect(normalizeHostname(input)).toBeNull();
    },
  );
});

describe('isAllowedRedirectUrl', () => {
  it.each([YT, 'https://youtube.com/@kanal', 'https://youtu.be/abc?t=10'])('izinli: %s', (u) => {
    expect(isAllowedRedirectUrl(u)).toBe(true);
  });
  it.each([
    'http://www.youtube.com/watch?v=abc',
    'https://m.youtube.com/watch?v=abc',
    'https://youtube.com.evil.example/x',
    'https://evil.example/?u=https://youtube.com',
    'https://user:pw@youtube.com/x',
    'https://youtube.com:8443/x',
    'javascript:alert(1)',
    '',
    42,
  ])('reddedilir: %s', (u) => {
    expect(isAllowedRedirectUrl(u)).toBe(false);
  });
});

describe('hostnameCandidates', () => {
  it('üst alan adlarını TLD hariç üretir', () => {
    expect(hostnameCandidates('a.b.acme.com')).toEqual(['a.b.acme.com', 'b.acme.com', 'acme.com']);
    expect(hostnameCandidates('acme.com')).toEqual(['acme.com']);
  });
});

describe('findBlockedSite', () => {
  it('tam ve üst alan adı eşleşir; en özgül kayıt seçilir; www. ve büyük harf normalize edilir', async () => {
    db.rows = [
      { id: 'p', hostname: 'acme.com', redirectUrl: YT },
      { id: 'c', hostname: 'shop.acme.com', redirectUrl: 'https://youtu.be/x' },
    ];
    expect((await findBlockedSite('www.Shop.Acme.com'))?.id).toBe('c');
    expect((await findBlockedSite('blog.acme.com'))?.id).toBe('p');
    expect(await findBlockedSite('acme.org')).toBeNull();
  });
  it('allowlist dışı redirectUrl kayıtları yok sayılır', async () => {
    db.rows = [{ id: 'x', hostname: 'acme.com', redirectUrl: 'https://evil.example/' }];
    expect(await findBlockedSite('acme.com')).toBeNull();
  });
  it("60 sn önbellek: aynı host tekrar DB'ye gitmez, süre dolunca gider", async () => {
    vi.useFakeTimers();
    db.rows = [{ id: 'p', hostname: 'acme.com', redirectUrl: YT }];
    await findBlockedSite('acme.com');
    await findBlockedSite('acme.com');
    expect(db.calls).toBe(1);
    vi.advanceTimersByTime(61_000);
    await findBlockedSite('acme.com');
    expect(db.calls).toBe(2);
  });
  it('DB hatasında null döner (tarama engellenmez) ve hata önbelleğe alınmaz', async () => {
    db.fail = true;
    expect(await findBlockedSite('acme.com')).toBeNull();
    db.fail = false;
    db.rows = [{ id: 'p', hostname: 'acme.com', redirectUrl: YT }];
    expect((await findBlockedSite('acme.com'))?.id).toBe('p');
  });
  it('recordBlockedHit hits++ çağırır', async () => {
    await recordBlockedHit('p');
    expect(db.hits).toEqual(['p']);
  });
});
