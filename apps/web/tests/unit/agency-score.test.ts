import { describe, expect, it } from 'vitest';
import {
  AGENCY_THRESHOLDS,
  AGENCY_WEIGHTS,
  etldPlusOne,
  isAgencyCandidate,
  scoreAgencySignals,
  showsAgencyBand,
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
});
