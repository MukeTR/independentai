/**
 * TLS probu — MOCK'SUZ yerel doğrulama (ağ yok, yalnız loopback): gerçek OpenSSL/Node protokol davranışını ölçer.
 *  - Sertifika testte `openssl` ile üretilir (depoda özel anahtar yok); openssl yoksa paket atlanır.
 *  - Eski sunucu (minVersion TLSv1 + SECLEVEL=0) → legacyTls:true; modern sunucu (≥TLSv1.2) → false (alert 70);
 *    kapalı port → ok:false. `connect` enjeksiyonu yalnız host/port'u 127.0.0.1'e çevirir (SSRF lookup IP'de çalışmaz).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { connect as tlsConnect, createServer, type Server } from 'node:tls';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { probeTls } from '@/server/site-scan/tls-probe';

const HOST = 'yerel.test';

function makeCert(): { key: Buffer; cert: Buffer } | null {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yanit-tls-'));
  const key = path.join(dir, 'key.pem');
  const cert = path.join(dir, 'cert.pem');
  try {
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-keyout',
        key,
        '-out',
        cert,
        '-days',
        '2',
        '-subj',
        `/CN=${HOST}`,
        '-addext',
        `subjectAltName=DNS:${HOST}`,
      ],
      { stdio: 'ignore', timeout: 20_000 },
    );
    return { key: fs.readFileSync(key), cert: fs.readFileSync(cert) };
  } catch {
    return null;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const pem = makeCert();

function listen(server: Server): Promise<number> {
  return new Promise((resolve) => {
    server.on('tlsClientError', () => {
      /* protokol reddi beklenen durum */
    });
    server.listen(0, '127.0.0.1', () => resolve((server.address() as { port: number }).port));
  });
}

/** Test enjeksiyonu: probeTls'nin verdiği seçenekleri korur, yalnız hedefi loopback'e çevirir. */
const connectTo = (port: number): typeof tlsConnect =>
  ((opts: Record<string, unknown>) =>
    tlsConnect({ ...opts, host: '127.0.0.1', port, lookup: undefined } as never)) as unknown as typeof tlsConnect;

const assertPublic = async () => undefined;

describe.skipIf(!pem)('probeTls — yerel TLS sunucuları (mock yok)', () => {
  let legacy: Server;
  let modern: Server;
  let legacyPort = 0;
  let modernPort = 0;

  beforeAll(async () => {
    legacy = createServer({ ...pem!, minVersion: 'TLSv1', ciphers: 'DEFAULT:@SECLEVEL=0' }, (s) => s.end());
    modern = createServer({ ...pem!, minVersion: 'TLSv1.2' }, (s) => s.end());
    legacyPort = await listen(legacy);
    modernPort = await listen(modern);
  });

  afterAll(async () => {
    await Promise.all([
      new Promise((r) => legacy.close(() => r(null))),
      new Promise((r) => modern.close(() => r(null))),
    ]);
  });

  it('eski protokolü kabul eden sunucu → legacyTls:true; sertifika alanları gerçek sertifikadan', async () => {
    const r = await probeTls(HOST, { assertPublic, connect: connectTo(legacyPort), timeoutMs: 3000 });
    expect(r.error).toBeUndefined();
    expect(r.ok).toBe(true);
    expect(r.legacyTls).toBe(true);
    expect(r.protocol).toMatch(/^TLSv1\.[23]$/);
    expect(r.hostnameMatch).toBe(true);
    expect(r.subject).toBe(HOST);
    expect(r.authorized).toBe(false); // kendinden imzalı
    expect(r.authorizationError).toMatch(/SELF_SIGNED/);
    expect(r.daysLeft).toBeGreaterThanOrEqual(0);
    expect(r.daysLeft).toBeLessThanOrEqual(2);
  });

  it('modern sunucu (≥TLSv1.2) → legacyTls:false (alert 70 protocol version), ok:true', async () => {
    const r = await probeTls(HOST, { assertPublic, connect: connectTo(modernPort), timeoutMs: 3000 });
    expect(r.ok).toBe(true);
    expect(r.legacyTls).toBe(false);
    expect(r.protocol).toMatch(/^TLSv1\.[23]$/);
  });

  it('kapalı port → ok:false + hata, legacyTls null', async () => {
    const tmp = createServer({ ...pem! });
    const port = await listen(tmp);
    await new Promise((r) => tmp.close(() => r(null)));
    const r = await probeTls(HOST, { assertPublic, connect: connectTo(port), timeoutMs: 2000 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/ECONNREFUSED/);
    expect(r.legacyTls).toBeNull();
  });
});
