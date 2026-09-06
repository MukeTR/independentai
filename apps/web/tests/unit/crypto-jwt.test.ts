import { describe, expect, it, vi } from 'vitest';
import { encrypt, decrypt, maskKey, maskWebhook } from '@/server/crypto';
import { signSession, verifySession } from '@/server/jwt';
import { hashPassword, verifyPassword } from '@/server/password';
import { sanitize, sanitizeText, maskEmail } from '@/server/logger';
import { handleRouteError, ClientError, RateLimitedError, UnauthorizedError } from '@/server/errors';
import { hashToken } from '@/server/auth-tokens';

describe('crypto', () => {
  it('AES-GCM gidiş-dönüş ve kurcalama tespiti', () => {
    const c = encrypt('https://hooks.slack.com/services/T1/B2/xyz');
    expect(decrypt(c)).toBe('https://hooks.slack.com/services/T1/B2/xyz');
    const tampered = Buffer.from(c, 'base64');
    tampered[tampered.length - 1] = (tampered[tampered.length - 1] ?? 0) ^ 0xff;
    expect(() => decrypt(tampered.toString('base64'))).toThrow();
  });
  it('maskeler ham değeri göstermez', () => {
    expect(maskKey('sk-proj-abcdefghijklmnop1234')).toMatch(/^sk-pr●+1234$/);
    expect(maskWebhook('https://hooks.slack.com/services/T123/B456/secretsecret')).not.toContain('secretsecret');
  });
});

describe('jwt', () => {
  it('imzalar, doğrular ve sv taşır', async () => {
    const t = await signSession({ userId: 'u1', tenantId: 't1', email: 'a@b.co', sv: 3 });
    expect(await verifySession(t)).toMatchObject({ userId: 'u1', tenantId: 't1', sv: 3 });
  });
  it('kurcalanmış token reddedilir', async () => {
    const t = await signSession({ userId: 'u1', tenantId: 't1', email: 'a@b.co', sv: 1 });
    await expect(verifySession(t.slice(0, -2) + 'xx')).rejects.toThrow();
  });
  it('kısa JWT_SECRET reddedilir', async () => {
    const prev = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'kisa';
    await expect(signSession({ userId: 'u', tenantId: 't', email: 'e', sv: 1 })).rejects.toThrow(/32/);
    process.env.JWT_SECRET = prev;
  });
});

describe('password', () => {
  it('scrypt hash ve sabit zamanlı doğrulama', () => {
    const h = hashPassword('sifre1234');
    expect(verifyPassword('sifre1234', h)).toBe(true);
    expect(verifyPassword('sifre1235', h)).toBe(false);
    expect(verifyPassword('x', 'bozuk')).toBe(false);
  });
});

describe('logger sanitize', () => {
  it('sır ve e-postaları maskeler', () => {
    const out = sanitize({
      apiKey: 'sk-proj-123456789012',
      note: 'Bearer abc.def.ghi ve ali@example.com',
      nested: { password: 'p' },
    }) as Record<string, unknown>;
    expect(out.apiKey).toBe('[redacted]');
    expect(String(out.note)).not.toContain('abc.def');
    expect(String(out.note)).toContain('a***@example.com');
    expect((out.nested as Record<string, unknown>).password).toBe('[redacted]');
    expect(sanitizeText('https://hooks.slack.com/services/T1/B2/zzz')).not.toContain('zzz');
    expect(maskEmail('ayse@firma.com')).toBe('a***@firma.com');
  });
});

describe('handleRouteError', () => {
  it('AppError → doğru durum, kod ve requestId; iç hata → generic 500', async () => {
    const r1 = handleRouteError(new ClientError('geçersiz'), { requestId: 'rid' });
    expect(r1.status).toBe(400);
    expect(await r1.json()).toMatchObject({ message: 'geçersiz', code: 'bad_request', requestId: 'rid' });
    const r2 = handleRouteError(new RateLimitedError('yavaş', 30));
    expect(r2.status).toBe(429);
    expect(r2.headers.get('retry-after')).toBe('30');
    expect(handleRouteError(new UnauthorizedError()).status).toBe(401);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r3 = handleRouteError(new Error('DB password=abc sızdı'));
    expect(r3.status).toBe(500);
    const body = await r3.json();
    expect(JSON.stringify(body)).not.toContain('abc');
    spy.mockRestore();
  });
});

describe('auth tokens', () => {
  it('hash deterministik ve düz metinden farklı', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe('abc');
  });
});
