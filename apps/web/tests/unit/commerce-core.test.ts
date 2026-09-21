import { describe, it, expect } from 'vitest';
import { normalizeStoreDomain } from '@/server/commerce/types';
import { CommerceError, fromHttpStatus, normalizeCommerceError, USER_MESSAGES } from '@/server/commerce/errors';
import { contentHashOf } from '@/server/commerce/catalog-sync';
import { detectPlatform } from '@/server/commerce/platform-detect';
import { agencyRoleToTenantRole } from '@/server/authz';
import { computeAgencyEntitlement } from '@/server/entitlement';
import { sanitizePayload } from '@/server/realtime';
import { redactForLog } from '@/server/commerce/credentials';

describe('normalizeStoreDomain', () => {
  it('şema ve yolu atar, küçük harfe çevirir', () => {
    expect(normalizeStoreDomain('https://My-Shop.myshopify.com/admin')).toBe('my-shop.myshopify.com');
  });
  it('geçersiz adresi reddeder', () => {
    for (const bad of ['localhost', '127.0.0.1', 'a', 'shop', 'http://', 'sh op.com', '-bad.com']) {
      expect(() => normalizeStoreDomain(bad), bad).toThrow();
    }
  });
});

describe('CommerceError', () => {
  it('HTTP durumunu koda çevirir ve retry bilgisini taşır', () => {
    expect(fromHttpStatus(401, 'SHOPIFY').code).toBe('AUTH_INVALID');
    expect(fromHttpStatus(403, 'IKAS').code).toBe('SCOPE_MISSING');
    expect(fromHttpStatus(404, 'IKAS').code).toBe('NOT_FOUND');
    const rl = fromHttpStatus(429, 'SHOPIFY', '7');
    expect(rl.code).toBe('RATE_LIMITED');
    expect(rl.retryable).toBe(true);
    expect(rl.retryAfterMs).toBe(7000);
    expect(fromHttpStatus(503, 'TICIMAX').retryable).toBe(true);
    expect(fromHttpStatus(401, 'SHOPIFY').retryable).toBe(false);
  });
  it('bilinmeyen hatayı sızıntısız normalize eder', () => {
    const e = normalizeCommerceError(new Error('fetch failed: ECONNREFUSED 10.0.0.1'), 'TICIMAX');
    expect(e.code).toBe('NETWORK');
    expect(e.message).toBe(USER_MESSAGES.NETWORK);
    expect(e.message).not.toMatch(/10\.0\.0\.1/);
    const same = new CommerceError('UNSUPPORTED', 'x');
    expect(normalizeCommerceError(same, 'IKAS')).toBe(same);
  });
});

describe('contentHashOf', () => {
  const base = {
    externalId: 'p1',
    title: 'A',
    categories: ['x', 'y'],
    availability: 'IN_STOCK' as const,
    priceMin: 1,
    priceMax: 2,
    currency: 'TRY',
  };
  it('alan sırası ve kategori sırası bağımsız, içerik bağımlı', () => {
    expect(contentHashOf(base)).toBe(contentHashOf({ ...base, categories: ['y', 'x'] }));
    expect(contentHashOf(base)).not.toBe(contentHashOf({ ...base, title: 'B' }));
    expect(contentHashOf(base)).not.toBe(contentHashOf({ ...base, priceMax: 3 }));
  });
  it('sourceUpdatedAt/externalId değişimi hash’i değiştirmez (yalnızca içerik)', () => {
    expect(contentHashOf({ ...base, sourceUpdatedAt: new Date(0) })).toBe(
      contentHashOf({ ...base, sourceUpdatedAt: new Date(1) }),
    );
  });
});

describe('detectPlatform', () => {
  it('Shopify/ikas/Ticimax sinyallerini tanır, sinyalsizde UNKNOWN', () => {
    expect(
      detectPlatform(
        '<script src="https://cdn.shopify.com/s/files/1/x.js"></script><script>window.Shopify = {}</script>',
      ).platform,
    ).toBe('SHOPIFY');
    expect(detectPlatform('<img src="https://cdn.myikas.com/images/a.png"> <div data-ikas="x">').platform).toBe('IKAS');
    expect(
      detectPlatform('<img src="/Uploads/UrunResimleri/a.jpg"><script src="/Scripts/ticimax/a.js">').platform,
    ).toBe('TICIMAX');
    const u = detectPlatform('<html><body>Merhaba</body></html>');
    expect(u.platform).toBe('UNKNOWN');
    expect(u.connectorAvailable).toBe(false);
  });
  it('alan adı ipucunu kullanır', () => {
    expect(detectPlatform('<html></html>', new Headers(), 'https://demo.myshopify.com').platform).toBe('SHOPIFY');
  });
});

describe('ajans rol ve plan', () => {
  it('ajans rolü tenant rolüne map edilir', () => {
    expect(agencyRoleToTenantRole('OWNER')).toBe('OWNER');
    expect(agencyRoleToTenantRole('ADMIN')).toBe('ADMIN');
    expect(agencyRoleToTenantRole('STRATEGIST')).toBe('ADMIN');
    expect(agencyRoleToTenantRole('ANALYST')).toBe('VIEWER');
  });
  it('koltuk/müşteri limitleri ve deneme durumu', () => {
    const future = new Date(Date.now() + 30 * 86_400_000);
    const e = computeAgencyEntitlement({ plan: 'LAUNCH', trialEndsAt: future, seats: 5, clients: 3 });
    expect(e.active).toBe(true);
    expect(e.seatsLeft).toBe(0);
    expect(e.clientsLeft).toBe(7);
    expect(e.whiteLabel).toBe(false);
    const expired = computeAgencyEntitlement({
      plan: 'LAUNCH',
      trialEndsAt: new Date(Date.now() - 400 * 86_400_000),
      seats: 0,
      clients: 0,
    });
    expect(expired.active).toBe(false);
    const paid = computeAgencyEntitlement({ plan: 'STUDIO', trialEndsAt: new Date(0), seats: 0, clients: 0 });
    expect(paid.active).toBe(true);
    expect(paid.whiteLabel).toBe(true);
  });
});

describe('güvenli payload/log', () => {
  it('sanitizePayload yasak alanları atar ve uzun metni kısaltır', () => {
    const out = sanitizePayload({
      status: 'ok',
      responseText: 'gizli',
      accessToken: 'x',
      email: 'a@b.c',
      summary: 'a'.repeat(500),
      nested: { a: 1 },
    });
    expect(out).not.toHaveProperty('responseText');
    expect(out).not.toHaveProperty('accessToken');
    expect(out).not.toHaveProperty('email');
    expect(out).not.toHaveProperty('nested');
    expect((out.summary as string).length).toBe(200);
  });
  it('redactForLog kimlik bilgisi anahtarlarını maskeler', () => {
    const r = redactForLog({ clientSecret: 's', uyeKodu: 'u', storeDomain: 'x.com' }) as Record<string, unknown>;
    expect(r.clientSecret).toBe('[redacted]');
    expect(r.uyeKodu).toBe('[redacted]');
    expect(r.storeDomain).toBe('x.com');
  });
});
