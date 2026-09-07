import { describe, expect, it } from 'vitest';
import {
  cleanAliases,
  cleanName,
  cleanPromptText,
  cleanWebsite,
  foldKey,
  normalizeEmail,
  validatePassword,
} from '@/server/normalize';
import { computeEntitlement } from '@/server/entitlement';
import { ClientError } from '@/server/errors';

describe('normalize', () => {
  it('foldKey Türkçe katlar ve boşlukları sadeleştirir', () => {
    expect(foldKey('  İSTANBUL   Yazılım ')).toBe('istanbul yazılım');
    expect(foldKey('KARPANEL')).toBe(foldKey('karpanel'));
  });
  it('cleanName sınırları uygular', () => {
    expect(cleanName('  Acme   Corp ')).toBe('Acme Corp');
    expect(() => cleanName('')).toThrow(ClientError);
    expect(() => cleanName('a'.repeat(81))).toThrow(ClientError);
    expect(() => cleanName('<script>')).toThrow(ClientError);
  });
  it('cleanAliases tekrarları ve ana adı eler', () => {
    expect(cleanAliases(['acme', 'ACME', 'acme.com', ' ', 'Acme Corp'], 'Acme')).toEqual(['acme.com', 'Acme Corp']);
    expect(() =>
      cleanAliases(
        Array.from({ length: 25 }, (_, i) => `a${i}`),
        'x',
      ),
    ).toThrow(ClientError);
  });
  it('cleanWebsite şema ekler ve host küçültür', () => {
    expect(cleanWebsite('Example.COM/path/')).toBe('https://example.com/path');
    expect(cleanWebsite('')).toBeNull();
    expect(() => cleanWebsite('javascript:alert(1)')).toThrow(ClientError);
    expect(() => cleanWebsite('http://user:pw@example.com')).toThrow(ClientError);
  });
  it('e-posta normalize ve şifre kuralları', () => {
    expect(normalizeEmail('  Ali@Example.COM ')).toBe('ali@example.com');
    expect(() => normalizeEmail('not-an-email')).toThrow(ClientError);
    expect(validatePassword('sifre1234')).toBe('sifre1234');
    expect(() => validatePassword('kisa1')).toThrow(ClientError);
    expect(() => validatePassword('sadeceharfler')).toThrow(ClientError);
  });
  it('prompt uzunluk sınırı', () => {
    expect(() => cleanPromptText('abc')).toThrow(ClientError);
    expect(cleanPromptText('  en iyi   POS ')).toBe('en iyi POS');
  });
});

describe('computeEntitlement', () => {
  const day = 86_400_000;
  it('deneme devam ederken aktif', () => {
    const e = computeEntitlement({ plan: 'LAUNCH', trialEndsAt: new Date(Date.now() + 10 * day) });
    expect(e.active).toBe(true);
    expect(e.trialDaysLeft).toBe(10);
  });
  it('deneme + ek süre dolunca salt-okunur; ödemeli plan etkilenmez', () => {
    const expired = new Date(Date.now() - 30 * day);
    expect(computeEntitlement({ plan: 'LAUNCH', trialEndsAt: expired })).toMatchObject({
      active: false,
      reason: 'trial_expired',
      trialDaysLeft: 0,
    });
    expect(computeEntitlement({ plan: 'STARTER', trialEndsAt: expired }).active).toBe(true);
  });
  it('ek süre içinde hâlâ aktif', () => {
    const e = computeEntitlement({ plan: 'LAUNCH', trialEndsAt: new Date(Date.now() - 2 * day) });
    expect(e.active).toBe(true);
    expect(e.trialDaysLeft).toBe(0);
    expect(e.graceDaysLeft).toBeGreaterThan(0);
  });
});
