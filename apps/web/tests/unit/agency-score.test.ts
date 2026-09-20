import { describe, expect, it } from 'vitest';
import {
  AGENCY_BAND_HIDDEN_STATUSES,
  AGENCY_PROTECTED_STATUSES,
  AGENCY_THRESHOLDS,
  AGENCY_WEIGHTS,
  etldPlusOne,
  isAgencyCandidate,
  scoreAgencySignals,
  showsAgencyBand,
  websiteHostOf,
} from '@/server/agency-signal';

describe('scoreAgencySignals', () => {
  it('sinyal yoksa 0', () => {
    expect(scoreAgencySignals({ subject: 'VISITOR' })).toEqual({ score: 0, reasons: [] });
  });
  it.each([
    [1, 0],
    [2, 15],
    [3, 30],
    [4, 30],
    [5, 45],
    [12, 45],
  ])('many_hosts kademeli: %d host → %d', (hosts, expected) => {
    const r = scoreAgencySignals({ subject: 'VISITOR', distinctHosts30d: hosts });
    expect(r.score).toBe(expected);
    if (expected) expect(r.reasons[0]?.key).toBe('many_hosts');
  });
  it('e-posta anahtar kelimesi yalnız TENANT için ve yerel/alan adında aranır', () => {
    expect(scoreAgencySignals({ subject: 'TENANT', email: 'ayse@dijitalajans.com' }).score).toBe(
      AGENCY_WEIGHTS.email_keyword,
    );
    expect(scoreAgencySignals({ subject: 'TENANT', email: 'seo.ekibi@firma.com' }).score).toBe(
      AGENCY_WEIGHTS.email_keyword,
    );
    expect(scoreAgencySignals({ subject: 'VISITOR', email: 'ayse@dijitalajans.com' }).score).toBe(0);
    expect(scoreAgencySignals({ subject: 'TENANT', email: 'ayse@klinik.com' }).score).toBe(0);
  });
  it('website_mismatch: kendi sitesi dışında ≥2 eTLD+1', () => {
    const base = { subject: 'TENANT' as const, websiteHost: 'www.firma.com.tr' };
    expect(scoreAgencySignals({ ...base, scannedHosts: ['shop.firma.com.tr', 'a.example'] }).score).toBe(0);
    expect(scoreAgencySignals({ ...base, scannedHosts: ['a.example', 'b.example', 'x.a.example'] }).score).toBe(
      AGENCY_WEIGHTS.website_mismatch,
    );
  });
  it('industry_agency 40, many_competitors 10, compare_heavy 10, many_sectors 15, preanalysis_used 10', () => {
    expect(scoreAgencySignals({ subject: 'TENANT', industry: 'ajans' }).score).toBe(40);
    expect(scoreAgencySignals({ subject: 'TENANT', industry: 'saas' }).score).toBe(0);
    expect(scoreAgencySignals({ subject: 'TENANT', competitorCount: 15 }).score).toBe(10);
    expect(scoreAgencySignals({ subject: 'TENANT', foreignBrands: 3 }).score).toBe(10);
    expect(scoreAgencySignals({ subject: 'TENANT', competitorCount: 14, foreignBrands: 2 }).score).toBe(0);
    expect(scoreAgencySignals({ subject: 'VISITOR', compareScans7d: 3 }).score).toBe(10);
    expect(scoreAgencySignals({ subject: 'VISITOR', distinctSectors: 2 }).score).toBe(15);
    expect(scoreAgencySignals({ subject: 'VISITOR', preanalysisUsed: true }).score).toBe(10);
    expect(scoreAgencySignals({ subject: 'TENANT', preanalysisUsed: true }).score).toBe(0);
  });
  it('toplam 100 ile sınırlı; beyan → 100', () => {
    const r = scoreAgencySignals({
      subject: 'TENANT',
      distinctHosts30d: 9,
      distinctSectors: 3,
      email: 'x@agency.co',
      industry: 'ajans',
      competitorCount: 30,
    });
    expect(r.score).toBe(100);
    expect(r.reasons.reduce((a, x) => a + x.weight, 0)).toBeGreaterThan(100);
    expect(scoreAgencySignals({ subject: 'VISITOR', declared: true }).score).toBe(100);
  });
  it('eşikler: ≥50 aday; band yalnız TENANT ≥70', () => {
    expect(AGENCY_THRESHOLDS).toEqual({ candidate: 50, band: 70 });
    expect(isAgencyCandidate(49)).toBe(false);
    expect(isAgencyCandidate(50)).toBe(true);
    expect(showsAgencyBand('TENANT', 70)).toBe(true);
    expect(showsAgencyBand('VISITOR', 95)).toBe(false);
  });
  it('etldPlusOne', () => {
    expect(etldPlusOne('shop.acme.com.tr')).toBe('acme.com.tr');
    expect(etldPlusOne('a.b.acme.com')).toBe('acme.com');
    expect(etldPlusOne('acme.com')).toBe('acme.com');
  });
  it('etldPlusOne — many_hosts eTLD+1 sayar: alt alan adları tek site', () => {
    const hosts = ['shop.acme.com.tr', 'blog.acme.com.tr', 'acme.com.tr', 'www.other.example'];
    expect(new Set(hosts.map(etldPlusOne)).size).toBe(2);
  });
  it('websiteHostOf', () => {
    expect(websiteHostOf('https://www.firma.com.tr/')).toBe('firma.com.tr');
    expect(websiteHostOf('firma.com')).toBe('firma.com');
    expect(websiteHostOf('')).toBeNull();
    expect(websiteHostOf(null)).toBeNull();
    expect(websiteHostOf('localhost')).toBeNull();
  });
});

describe('skor kombinasyonları — eşik davranışı (spec §5.3)', () => {
  it.each<[string, Parameters<typeof scoreAgencySignals>[0], number, boolean, boolean]>([
    ['ziyaretçi: 2 site', { subject: 'VISITOR', distinctHosts30d: 2 }, 15, false, false],
    ['ziyaretçi: 3 site → 30 (aday değil)', { subject: 'VISITOR', distinctHosts30d: 3 }, 30, false, false],
    [
      'ziyaretçi: 3 site + 2 sektör → 45',
      { subject: 'VISITOR', distinctHosts30d: 3, distinctSectors: 2 },
      45,
      false,
      false,
    ],
    ['ziyaretçi: 5 site → 45', { subject: 'VISITOR', distinctHosts30d: 5 }, 45, false, false],
    [
      'ziyaretçi: 5 site + 2 sektör → 60 aday, band yok (VISITOR)',
      { subject: 'VISITOR', distinctHosts30d: 5, distinctSectors: 2 },
      60,
      true,
      false,
    ],
    [
      'ziyaretçi: 5 site + ön-analiz + kıyas → 65',
      { subject: 'VISITOR', distinctHosts30d: 5, preanalysisUsed: true, compareScans7d: 3 },
      65,
      true,
      false,
    ],
    [
      'hesap: e-posta + 3 site → 50 aday',
      { subject: 'TENANT', email: 'x@dijitalajans.com', distinctHosts30d: 3 },
      50,
      true,
      false,
    ],
    [
      'hesap: sektör ajans + 2 site → 55 aday, band yok',
      { subject: 'TENANT', industry: 'ajans', distinctHosts30d: 2 },
      55,
      true,
      false,
    ],
    [
      'hesap: sektör ajans + 3 site → 70 band',
      { subject: 'TENANT', industry: 'ajans', distinctHosts30d: 3 },
      70,
      true,
      true,
    ],
    [
      'hesap: 5 site + uyuşmazlık + e-posta → 80 band',
      {
        subject: 'TENANT',
        distinctHosts30d: 5,
        websiteHost: 'firma.com',
        scannedHosts: ['a.example', 'b.example'],
        email: 'ali@reklamevi.com',
      },
      80,
      true,
      true,
    ],
    ['hesap: yalnız 15 rakip → 10', { subject: 'TENANT', competitorCount: 15 }, 10, false, false],
    ['hesap: beyan → 100 band', { subject: 'TENANT', declared: true }, 100, true, true],
    ['ofis IP yanlış pozitifi: 4 site, sektör yok → 30', { subject: 'TENANT', distinctHosts30d: 4 }, 30, false, false],
  ])('%s', (_label, input, expected, candidate, band) => {
    const r = scoreAgencySignals(input);
    expect(r.score).toBe(expected);
    expect(isAgencyCandidate(r.score)).toBe(candidate);
    expect(showsAgencyBand(input.subject, r.score)).toBe(band);
  });

  it('reason ağırlıkları AGENCY_WEIGHTS tavanını aşmaz; her reason evidence taşır', () => {
    const r = scoreAgencySignals({
      subject: 'TENANT',
      distinctHosts30d: 7,
      distinctSectors: 4,
      email: 'seo@growthstudio.co',
      websiteHost: 'growthstudio.co',
      scannedHosts: ['a.example', 'b.example', 'c.example'],
      competitorCount: 20,
      foreignBrands: 5,
      industry: 'ajans',
      compareScans7d: 9,
    });
    for (const x of r.reasons) {
      expect(x.weight).toBeLessThanOrEqual(AGENCY_WEIGHTS[x.key]);
      expect(x.evidence.length).toBeGreaterThan(0);
    }
    expect(new Set(r.reasons.map((x) => x.key)).size).toBe(r.reasons.length);
    expect(r.score).toBe(100);
  });

  it('korunan ve band-gizleyen statü kümeleri', () => {
    expect([...AGENCY_PROTECTED_STATUSES].sort()).toEqual(['DECLARED', 'DISMISSED']);
    expect([...AGENCY_BAND_HIDDEN_STATUSES].sort()).toEqual(['CONVERTED', 'DECLARED', 'DISMISSED']);
  });
});
