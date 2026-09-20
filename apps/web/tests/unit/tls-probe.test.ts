import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeCert = {
  valid_to?: string;
  valid_from?: string;
  issuer?: Record<string, string>;
  subject?: Record<string, string>;
  subjectaltname?: string;
};

const tlsState = vi.hoisted(() => ({
  connects: [] as Record<string, unknown>[],
  /** Her bağlantı için senaryo: 'ok' | 'error' | 'timeout'; ikinci (legacy) bağlantı için ayrı */
  first: 'ok' as 'ok' | 'error' | 'timeout',
  legacy: 'error' as 'ok' | 'error' | 'timeout' | 'throw',
  /** İkinci bağlantının 'error' senaryosunda yayılan hata (varsayılan: sunucu bağlantıyı kapattı) */
  legacyError: new Error('ECONNRESET') as Error,
  cert: {} as FakeCert,
  protocol: 'TLSv1.3',
  authorized: true,
  identityError: undefined as Error | undefined,
}));

class FakeSocket extends EventEmitter {
  authorized = tlsState.authorized;
  authorizationError: string | null = tlsState.authorized ? null : 'SELF_SIGNED_CERT_IN_CHAIN';
  destroyed = false;
  getPeerCertificate() {
    return tlsState.cert;
  }
  getProtocol() {
    return tlsState.protocol;
  }
  end() {}
  destroy() {
    this.destroyed = true;
  }
}

vi.mock('node:tls', () => ({
  connect: (opts: Record<string, unknown>) => {
    tlsState.connects.push(opts);
    const isLegacy = opts.maxVersion === 'TLSv1.1';
    const mode = isLegacy ? tlsState.legacy : tlsState.first;
    if (mode === 'throw')
      throw Object.assign(new Error('no protocols available'), { code: 'ERR_SSL_NO_PROTOCOLS_AVAILABLE' });
    const s = new FakeSocket();
    setTimeout(() => {
      if (mode === 'ok') s.emit('secureConnect');
      else if (mode === 'error') s.emit('error', isLegacy ? tlsState.legacyError : new Error('ECONNRESET'));
      else s.emit('timeout');
    }, 1);
    return s;
  },
  checkServerIdentity: () => tlsState.identityError,
}));

const guard = vi.hoisted(() => ({ assert: vi.fn(async () => new URL('https://iyi-site.example/')) }));
vi.mock('@/server/safe-fetch', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return { ...mod, assertPublicUrl: guard.assert, guardedLookup: function guardedLookup() {} };
});

import { LEGACY_HANDSHAKE, classifyLegacyError, probeTls } from '@/server/site-scan/tls-probe';

const DAY = 86_400_000;

beforeEach(() => {
  tlsState.connects.length = 0;
  tlsState.first = 'ok';
  tlsState.legacy = 'error';
  tlsState.legacyError = new Error('ECONNRESET');
  tlsState.protocol = 'TLSv1.3';
  tlsState.authorized = true;
  tlsState.identityError = undefined;
  tlsState.cert = {
    valid_to: new Date(Date.now() + 45 * DAY).toUTCString(),
    valid_from: new Date(Date.now() - 30 * DAY).toUTCString(),
    issuer: { O: "Let's Encrypt", CN: 'R11' },
    subject: { CN: 'iyi-site.example' },
    subjectaltname: 'DNS:iyi-site.example, DNS:www.iyi-site.example',
  };
  guard.assert.mockClear();
});

describe('probeTls', () => {
  it('başarılı el sıkışma: ok, daysLeft, issuer, hostnameMatch, protocol; eski TLS reddi → legacyTls:false; ≤2 bağlantı', async () => {
    const r = await probeTls('iyi-site.example');
    expect(r.ok).toBe(true);
    expect(r.daysLeft).toBeGreaterThanOrEqual(44);
    expect(r.daysLeft).toBeLessThanOrEqual(45);
    expect(r.issuer).toBe("Let's Encrypt");
    expect(r.subject).toBe('iyi-site.example');
    expect(r.hostnameMatch).toBe(true);
    expect(r.authorized).toBe(true);
    expect(r.protocol).toBe('TLSv1.3');
    expect(r.legacyTls).toBe(false);
    expect(r.error).toBeUndefined();
    expect(tlsState.connects).toHaveLength(2);
    expect(guard.assert).toHaveBeenCalledWith('https://iyi-site.example/');
    // güvenlik seçenekleri
    const first = tlsState.connects[0]!;
    expect(first.servername).toBe('iyi-site.example');
    expect(first.port).toBe(443);
    expect(first.rejectUnauthorized).toBe(false);
    expect(typeof first.lookup).toBe('function');
    // İkinci el sıkışma: Node 22'de yalnız maxVersion yetmez (DEFAULT_MIN_VERSION=TLSv1.2 + seclevel) — min + seclevel şart
    const second = tlsState.connects[1]!;
    expect(second.minVersion).toBe('TLSv1');
    expect(second.maxVersion).toBe('TLSv1.1');
    expect(second.ciphers).toBe('DEFAULT:@SECLEVEL=0');
    expect(second.rejectUnauthorized).toBe(false);
    expect(typeof second.lookup).toBe('function');
    expect(LEGACY_HANDSHAKE).toEqual({ minVersion: 'TLSv1', maxVersion: 'TLSv1.1', ciphers: 'DEFAULT:@SECLEVEL=0' });
  });

  it('eski TLS kabul ediliyorsa legacyTls:true; zaman aşımında null', async () => {
    tlsState.legacy = 'ok';
    expect((await probeTls('iyi-site.example')).legacyTls).toBe(true);
    tlsState.legacy = 'timeout';
    expect((await probeTls('iyi-site.example', { timeoutMs: 50 })).legacyTls).toBeNull();
  });

  it('sunucu alert 70 (protocol version) → legacyTls:false; istemci tarafı ERR_SSL_NO_PROTOCOLS_AVAILABLE → null', async () => {
    tlsState.legacyError = Object.assign(
      new Error('error:0A00042E:SSL routines:ssl3_read_bytes:tlsv1 alert protocol version:SSL alert number 70'),
      { code: 'ERR_SSL_TLSV1_ALERT_PROTOCOL_VERSION' },
    );
    expect((await probeTls('iyi-site.example')).legacyTls).toBe(false);
    tlsState.legacyError = Object.assign(
      new Error('error:0A0000BF:SSL routines:tls_setup_handshake:no protocols available'),
      {
        code: 'ERR_SSL_NO_PROTOCOLS_AVAILABLE',
      },
    );
    const r = await probeTls('iyi-site.example');
    expect(r.ok).toBe(true);
    expect(r.legacyTls).toBeNull();
    // senkron kurulum hatası (connect fırlatır) → ölçülemedi, ilk sonuç korunur
    tlsState.legacy = 'throw';
    const r2 = await probeTls('iyi-site.example');
    expect(r2.ok).toBe(true);
    expect(r2.daysLeft).not.toBeNull();
    expect(r2.legacyTls).toBeNull();
  });

  it.each<[string, string | undefined, false | null]>([
    ['tlsv1 alert protocol version: SSL alert number 70', 'ERR_SSL_TLSV1_ALERT_PROTOCOL_VERSION', false],
    ['sslv3 alert handshake failure', 'ERR_SSL_SSLV3_ALERT_HANDSHAKE_FAILURE', false],
    ['read ECONNRESET', 'ECONNRESET', false],
    ['socket hang up', 'ECONNRESET', false],
    ['unsupported protocol', 'ERR_SSL_UNSUPPORTED_PROTOCOL', false],
    ['no protocols available', 'ERR_SSL_NO_PROTOCOLS_AVAILABLE', null],
    ['Zaman aşımı', undefined, null],
    ['getaddrinfo ENOTFOUND x', 'ENOTFOUND', null],
    ['connect ECONNREFUSED 1.2.3.4:443', 'ECONNREFUSED', null],
    ['Özel/dahili adreslere erişilemez', 'EBLOCKED', null],
    ['wrong version number', 'ERR_SSL_WRONG_VERSION_NUMBER', null],
  ])('classifyLegacyError(%s, %s) → %s', (msg, code, expected) => {
    expect(classifyLegacyError(Object.assign(new Error(msg), code ? { code } : {}))).toBe(expected);
  });

  it('hostname uyuşmazlığı ve yetkisiz zincir raporlanır (ok yine true — sertifika okundu)', async () => {
    tlsState.identityError = new Error("Hostname/IP does not match certificate's altnames");
    tlsState.authorized = false;
    const r = await probeTls('iyi-site.example');
    expect(r.ok).toBe(true);
    expect(r.hostnameMatch).toBe(false);
    expect(r.authorized).toBe(false);
    expect(r.authorizationError).toBe('SELF_SIGNED_CERT_IN_CHAIN');
  });

  it('bağlantı hatası → ok:false + error; ikinci bağlantı denenmez', async () => {
    tlsState.first = 'error';
    const r = await probeTls('iyi-site.example');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('ECONNRESET');
    expect(r.daysLeft).toBeNull();
    expect(tlsState.connects).toHaveLength(1);
  });

  it('zaman aşımı → ok:false', async () => {
    tlsState.first = 'timeout';
    const r = await probeTls('iyi-site.example', { timeoutMs: 50 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Zaman aşımı/);
  });

  it('SSRF: assertPublicUrl reddederse hiç bağlanmaz', async () => {
    guard.assert.mockRejectedValueOnce(new Error('Özel/dahili adreslere erişilemez'));
    const r = await probeTls('ic-ag.example');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/erişilemez/);
    expect(tlsState.connects).toHaveLength(0);
  });

  it('geçersiz alan adı → ok:false, bağlantı yok', async () => {
    expect((await probeTls('localhost')).ok).toBe(false);
    expect(tlsState.connects).toHaveLength(0);
  });

  it('sertifika tarihi okunamazsa daysLeft null', async () => {
    tlsState.cert = { issuer: { CN: 'X' } };
    const r = await probeTls('iyi-site.example');
    expect(r.ok).toBe(true);
    expect(r.daysLeft).toBeNull();
    expect(r.hostnameMatch).toBeNull();
  });
});
