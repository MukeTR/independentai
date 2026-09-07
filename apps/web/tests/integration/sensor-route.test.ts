import { describe, expect, it } from 'vitest';
import { GET, HEAD, OPTIONS } from '@/app/sensor/v1.js/route';
import { SENSOR_ETAG, SENSOR_VERSION } from '@/generated/sensor-v1';
import { call } from './helpers';

/**
 * `/sensor/v1.js` — müşterinin sitesine giden tek dosya.
 *
 * Bu uç herkese açıktır (kimlik doğrulama yok); doğrulanan şey içerik türü, sniff koruması,
 * önbellek sözleşmesi ve ETag ile 304 davranışıdır.
 */
describe('GET /sensor/v1.js', () => {
  it('200 ile derlenmiş SDK dosyasını doğru içerik türünde döner', async () => {
    const res = await call(GET, { url: '/sensor/v1.js' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/javascript; charset=utf-8');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('cache-control')).toBe('public, max-age=300, stale-while-revalidate=86400');
    expect(res.headers.get('etag')).toBe(SENSOR_ETAG);
    expect(res.headers.get('x-sensor-version')).toBe(SENSOR_VERSION);
    expect(res.text.startsWith('"use strict";')).toBe(true);
    expect(res.text.length).toBeGreaterThan(1_000);
    // Gizlilik sözü paket üzerinde de geçerli.
    expect(res.text).not.toContain('document.cookie');
    expect(res.text).not.toContain('localStorage');
    expect(res.text).not.toContain('eval(');
  });

  it('aynı ETag ile 304 döner (gövde yok)', async () => {
    const res = await call(GET, { url: '/sensor/v1.js', headers: { 'if-none-match': SENSOR_ETAG } });
    expect(res.status).toBe(304);
    expect(res.text).toBe('');
  });

  it('farklı ETag ile yeniden 200 döner', async () => {
    const res = await call(GET, { url: '/sensor/v1.js', headers: { 'if-none-match': '"eskisurum"' } });
    expect(res.status).toBe(200);
  });

  it('HEAD gövdesiz 200, OPTIONS 204 döner', async () => {
    const head = await call(HEAD, { method: 'HEAD', url: '/sensor/v1.js' });
    expect(head.status).toBe(200);
    expect(head.text).toBe('');
    expect(head.headers.get('content-type')).toBe('application/javascript; charset=utf-8');

    const options = await call(OPTIONS, { method: 'OPTIONS', url: '/sensor/v1.js' });
    expect(options.status).toBe(204);
    expect(options.headers.get('access-control-allow-methods')).toBe('GET, HEAD, OPTIONS');
  });
});
