import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { isBlockedIp, parsePublicUrl, safeFetch, assertPublicUrl, UnsafeUrlError } from '@/server/safe-fetch';

describe('isBlockedIp', () => {
  it.each([
    ['127.0.0.1', 4],
    ['10.1.2.3', 4],
    ['172.16.0.1', 4],
    ['172.31.255.255', 4],
    ['192.168.1.1', 4],
    ['169.254.169.254', 4],
    ['100.64.0.1', 4],
    ['0.0.0.0', 4],
    ['224.0.0.1', 4],
    ['::1', 6],
    ['::', 6],
    ['fe80::1', 6],
    ['fc00::1', 6],
    ['fd12::1', 6],
    ['::ffff:127.0.0.1', 6],
    ['::ffff:7f00:1', 6],
    ['64:ff9b::7f00:1', 6],
    ['ff02::1', 6],
  ])('%s engellenir', (ip, fam) => {
    expect(isBlockedIp(ip, fam)).toBe(true);
  });

  it.each([
    ['8.8.8.8', 4],
    ['1.1.1.1', 4],
    ['172.32.0.1', 4],
    ['2606:4700:4700::1111', 6],
    ['::ffff:8.8.8.8', 6],
  ])('%s izinli', (ip, fam) => {
    expect(isBlockedIp(ip, fam)).toBe(false);
  });
});

describe('parsePublicUrl', () => {
  it.each([
    'ftp://example.com',
    'file:///etc/passwd',
    'http://localhost/',
    'http://127.0.0.1/',
    'http://[::1]/',
    'http://user:pass@example.com/',
    'http://example.com:8080/',
    'http://metadata.google.internal/',
    'http://foo.local/',
    'http://0x7f000001/',
    'http://2130706433/',
    'http://169.254.169.254/latest/meta-data',
    'javascript:alert(1)',
  ])('%s reddedilir', (u) => {
    expect(() => parsePublicUrl(u)).toThrow(UnsafeUrlError);
  });
  it('geçerli public URL kabul edilir', () => {
    expect(parsePublicUrl('https://example.com/a?b=1').hostname).toBe('example.com');
    expect(parsePublicUrl('http://example.com:80/').hostname).toBe('example.com');
  });
});

describe('safeFetch (yerel sunucu)', () => {
  it('loopback sunucuya bağlanmayı DNS/IP düzeyinde reddeder', async () => {
    await expect(safeFetch('http://127.0.0.1:1/')).rejects.toThrow(UnsafeUrlError);
    // "localhost" host adı da bloklu
    await expect(safeFetch('http://localhost/')).rejects.toThrow(UnsafeUrlError);
  });

  it('özel ağa çözümlenen host adını lookup aşamasında engeller', async () => {
    // localtest.me → 127.0.0.1 çözümlenir (public DNS). Ağ yoksa ENOTFOUND → Unsafe hatası bekliyoruz.
    await expect(assertPublicUrl('http://localtest.me/')).rejects.toThrow(UnsafeUrlError);
  });

  it('yönlendirmeyi özel adrese takip etmez', async () => {
    const srv = createServer((req, res) => {
      res.writeHead(302, { location: 'http://127.0.0.1:1/secret' });
      res.end();
    });
    await new Promise<void>((r) => srv.listen(0, '127.0.0.1', () => r()));
    // Sunucunun kendisi loopback olduğu için ilk hop zaten reddedilir — bu, redirect hedefinden bağımsız
    // olarak zincirin hiçbir noktasında özel ağa gidilmediğini kanıtlar.
    const port = (srv.address() as { port: number }).port;
    await expect(safeFetch(`http://127.0.0.1:${port}/`)).rejects.toThrow(UnsafeUrlError);
    srv.close();
  });
});
