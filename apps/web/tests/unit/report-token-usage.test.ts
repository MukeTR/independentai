/**
 * Kalıcı rapor yardımcıları — token ↔ URL gidiş-dönüşü, yeniden tarama yolu, hüküm cümlesi, kalan gün,
 * WhatsApp metni ve JSON gövdesinde gizli alan bulunmaması. DB yok (prisma mock).
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/server/prisma', () => ({ prisma: {} }));

import { signReportToken, verifyReportToken } from '@/server/report-token';
import {
  daysLeft,
  publicReportJson,
  reportPath,
  reportUrlFor,
  rescanPath,
  verdictCounts,
  verdictLine,
  whatsappShareHref,
  whatsappShareText,
  type PublicReport,
} from '@/server/public-report';
import { toolBySlug } from '@/lib/tool-registry';

const ID = 'cm1abc2def3ghi4jkl5mno6p';

describe('rapor bağlantısı', () => {
  it('reportUrlFor → /rapor/<token>; token URL’den geri doğrulanır', () => {
    const token = signReportToken(ID);
    const url = reportUrlFor(token);
    expect(url).toMatch(/^https:\/\/[^/]+\/rapor\/[A-Za-z0-9_-]+$/);
    expect(url.endsWith(reportPath(token))).toBe(true);
    const back = url.split('/rapor/')[1];
    expect(verifyReportToken(back)).toBe(ID);
  });

  it('cache-hit sözleşmesi: aynı scanId → aynı reportUrl', () => {
    expect(reportUrlFor(signReportToken(ID))).toBe(reportUrlFor(signReportToken(ID)));
  });
});

describe('rescanPath', () => {
  const crawler = toolBySlug('ai-crawler-testi')!;
  it('araç + hostname → /arac/<slug>?url=', () => {
    expect(rescanPath(crawler, 'firma.example')).toBe('/arac/ai-crawler-testi?url=firma.example');
  });
  it('sektör varsa ?sektor= eklenir', () => {
    expect(rescanPath(crawler, 'firma.example', 'klinik')).toBe(
      '/arac/ai-crawler-testi?url=firma.example&sektor=klinik',
    );
  });
  it('araç yoksa hub', () => {
    expect(rescanPath(null, 'firma.example')).toBe('/arac?url=firma.example');
  });
  it('hostname URL-kodlanır', () => {
    expect(rescanPath(crawler, 'ç.example')).toContain('url=%C3%A7.example');
  });
});

describe('hüküm', () => {
  it.each([
    [[], 'Kontrol sonucu yok'],
    [[{ status: 'fail' }, { status: 'warn' }, { status: 'pass' }, { status: 'pass' }], '1 kritik, 1 uyarı, 2 tamam'],
    [[{ status: 'fail' }, { status: 'fail' }, { status: 'fail' }], '3 kritik, 0 uyarı, 0 tamam'],
  ])('verdictLine(%j) → %s', (findings, expected) => {
    expect(verdictLine(findings as never)).toBe(expected);
  });
  it('bilinmeyen status sayılmaz', () => {
    const c = verdictCounts([{ status: 'x' }, { status: 'pass' }] as never);
    expect(c).toEqual({ fail: 0, warn: 0, pass: 1, total: 1 });
  });
});

describe('daysLeft', () => {
  const now = new Date('2026-09-21T12:00:00Z');
  it('yukarı yuvarlar', () => {
    expect(daysLeft(new Date('2026-09-22T11:00:00Z'), now)).toBe(1);
    expect(daysLeft(new Date('2026-10-21T12:00:00Z'), now)).toBe(30);
    expect(daysLeft(new Date('2026-09-21T12:00:01Z'), now)).toBe(1);
  });
  it('geçmişse 0', () => {
    expect(daysLeft(new Date('2026-09-20T12:00:00Z'), now)).toBe(0);
    expect(daysLeft(now, now)).toBe(0);
  });
});

describe('WhatsApp paylaşımı', () => {
  it('metin: hostname, araç, skor, hüküm, bağlantı; kişisel veri yok', () => {
    const text = whatsappShareText({
      hostname: 'firma.example',
      toolTitle: 'SEO karnesi',
      score: 41,
      verdict: '3 kritik, 4 uyarı, 9 tamam',
      reportUrl: 'https://independentai.space/rapor/abc',
    });
    expect(text).toBe(
      'firma.example — SEO karnesi: 41/100 · 3 kritik, 4 uyarı, 9 tamam. Rapor: https://independentai.space/rapor/abc',
    );
  });
  it('skor yoksa skor parçası atlanır', () => {
    const text = whatsappShareText({
      hostname: 'a.example',
      toolTitle: 'X',
      score: null,
      verdict: 'v',
      reportUrl: 'u',
    });
    expect(text).toBe('a.example — X: v. Rapor: u');
  });
  it('wa.me href kodlanır', () => {
    const href = whatsappShareHref('a b & c');
    expect(href).toBe('https://wa.me/?text=a%20b%20%26%20c');
  });
});

describe('publicReportJson', () => {
  it('gizli alan yok; beklenen alanlar var', () => {
    const report: PublicReport = {
      scanId: ID,
      token: signReportToken(ID),
      reportUrl: reportUrlFor(signReportToken(ID)),
      kind: 'CRAWLER',
      tool: toolBySlug('ai-crawler-testi') ?? null,
      toolTitle: 'AI crawler testi',
      hostname: 'firma.example',
      score: 55,
      sector: null,
      meta: { waf: false },
      partial: false,
      waf: false,
      views: 3,
      createdAt: new Date('2026-09-21T00:00:00Z'),
      expiresAt: new Date('2026-10-21T00:00:00Z'),
      result: { url: 'https://firma.example/', score: 55, findings: [{ status: 'pass' }] } as never,
    };
    const json = publicReportJson(report);
    const text = JSON.stringify(json);
    expect(text).not.toMatch(/visitorHash|tenantId|urlHash|scanId/);
    expect(json.tool?.slug).toBe('ai-crawler-testi');
    expect(json.tool?.path).toBe('/arac/ai-crawler-testi');
    expect(json.verdict).toBe('0 kritik, 0 uyarı, 1 tamam');
    expect(json.rescanPath).toBe('/arac/ai-crawler-testi?url=firma.example');
    expect(json.createdAt).toBe('2026-09-21T00:00:00.000Z');
    expect(typeof json.daysLeft).toBe('number');
  });
});
