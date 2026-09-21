import { describe, expect, it } from 'vitest';
import { signReportToken, verifyReportToken } from '@/server/report-token';

const ID = 'cm1abc2def3ghi4jkl5mno6p';

describe('report token', () => {
  it('imzala → doğrula gidiş-dönüş; URL-güvenli', () => {
    const t = signReportToken(ID);
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(verifyReportToken(t)).toBe(ID);
  });
  it('deterministik: aynı scanId aynı token (cache-hit aynı bağlantı)', () => {
    expect(signReportToken(ID)).toBe(signReportToken(ID));
  });
  it('kurcalanmış/bozuk token null', () => {
    const t = signReportToken(ID);
    const tampered = Buffer.from(
      Buffer.from(t, 'base64url').toString('utf8').replace(ID, 'cm1abc2def3ghi4jkl5mno6q'),
    ).toString('base64url');
    expect(verifyReportToken(tampered)).toBeNull();
    expect(verifyReportToken(t.slice(0, -2) + 'zz')).toBeNull();
    expect(verifyReportToken('')).toBeNull();
    expect(verifyReportToken('not base64!!')).toBeNull();
    expect(verifyReportToken(Buffer.from('noDotHere', 'utf8').toString('base64url'))).toBeNull();
    expect(verifyReportToken(42)).toBeNull();
  });
  it('sır değişince eski token geçersiz', () => {
    const t = signReportToken(ID);
    const old = process.env.REPORT_TOKEN_SECRET;
    process.env.REPORT_TOKEN_SECRET = 'rotated-secret-value-32-characters!!';
    try {
      expect(verifyReportToken(t)).toBeNull();
    } finally {
      process.env.REPORT_TOKEN_SECRET = old;
    }
  });
  it('geçersiz scanId imzalanmaz', () => {
    expect(() => signReportToken('a.b')).toThrow();
    expect(() => signReportToken('')).toThrow();
  });
});
