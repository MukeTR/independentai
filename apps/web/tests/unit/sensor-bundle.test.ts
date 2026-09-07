import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

/**
 * Derlenmiş sensör paketinin sözleşmesi.
 *
 * Bu test, SDK'nın gizlilik ve boyut sözünü **çıktı üzerinde** doğrular: kaynakta doğru yazmak
 * yetmez, müşterinin sitesine giden baytlarda çerez/localStorage/eval bulunmamalıdır.
 * Dosya `pnpm --filter @independentai/web build:sensor` ile üretilir ve depoya commit edilir.
 */
const BUNDLE_PATH = path.resolve(__dirname, '../../src/generated/sensor-v1.bundle.js');
const SOURCE_PATH = path.resolve(__dirname, '../../sdk/sensor.ts');
const GZIP_BUDGET = 5 * 1024;

describe('sensor bundle', () => {
  it('derlenmiş dosya mevcut', () => {
    expect(existsSync(BUNDLE_PATH)).toBe(true);
  });

  const code = existsSync(BUNDLE_PATH) ? readFileSync(BUNDLE_PATH, 'utf8') : '';

  it('gzip boyutu 5 KB altında', () => {
    const gzip = gzipSync(Buffer.from(code, 'utf8'), { level: 9 }).length;
    expect(gzip).toBeGreaterThan(0);
    expect(gzip).toBeLessThan(GZIP_BUDGET);
  });

  it('eval kullanmıyor', () => {
    expect(code).not.toContain('eval(');
    expect(code).not.toContain('new Function');
  });

  it('çerez okumuyor/yazmıyor', () => {
    expect(code).not.toContain('document.cookie');
    expect(code).not.toContain('.cookie');
  });

  it('localStorage kullanmıyor (yalnızca sessionStorage)', () => {
    expect(code).not.toContain('localStorage');
    expect(code).toContain('sessionStorage');
  });

  it('parmak izi / session replay yüzeyi yok', () => {
    for (const banned of [
      'getContext',
      'toDataURL',
      'AudioContext',
      'MediaDevices',
      'innerText',
      'textContent',
      'value=',
    ]) {
      expect(code).not.toContain(banned);
    }
  });

  it('strict modda ve IIFE olarak paketlenmiş', () => {
    expect(code.startsWith('"use strict";')).toBe(true);
    expect(code.trimEnd().endsWith(')();')).toBe(true);
  });

  it('gönderim yolları ve SDK sürümü paket içinde', () => {
    const version = /SDK_VERSION\s*=\s*'([^']+)'/.exec(readFileSync(SOURCE_PATH, 'utf8'))?.[1];
    expect(version).toBeTruthy();
    expect(code).toContain(`"${version}"`);
    expect(code).toContain('/api/collect/v1/');
    expect(code).toContain('sendBeacon');
  });
});
