import { describe, expect, it } from 'vitest';
import { visibilityOf, shareOfVoiceOf, avgOwnPosition, recommendRate, type MetricRun } from '@independentai/shared';

const runs: MetricRun[] = [
  {
    status: 'SUCCESS',
    mentions: [
      { isOwnBrand: true, isCompetitor: false, position: 1, mentionType: 'RECOMMENDED', mentionName: 'K' },
      { isOwnBrand: false, isCompetitor: true, position: 2, mentionName: 'A' },
    ],
  },
  {
    status: 'SUCCESS',
    mentions: [
      { isOwnBrand: false, isCompetitor: true, position: 1, mentionName: 'A' },
      { isOwnBrand: false, isCompetitor: true, position: 2, mentionName: 'B' },
    ],
  },
  { status: 'ERROR', mentions: [] },
  {
    status: 'SUCCESS',
    mentions: [{ isOwnBrand: true, isCompetitor: false, position: 3, mentionType: 'LISTED', mentionName: 'K' }],
  },
];

describe('metrics (tek kaynak)', () => {
  it('hatalı run paydaya girmez', () => {
    // 3 geçerli run, 2'sinde marka var → 67
    expect(visibilityOf(runs)).toBe(67);
  });
  it('SoV: kendi (2) / (kendi 2 + rakip 3) = 40', () => {
    expect(shareOfVoiceOf(runs)).toBe(40);
  });
  it('ortalama pozisyon ve öneri oranı', () => {
    expect(avgOwnPosition(runs)).toBe(2);
    expect(recommendRate(runs)).toBe(50);
  });
  it('boş veri sıfır/null döner', () => {
    expect(visibilityOf([])).toBe(0);
    expect(shareOfVoiceOf([])).toBe(0);
    expect(avgOwnPosition([])).toBeNull();
  });
  it('eski kayıtlar (status yok) errorMessage ile ayrılır', () => {
    expect(
      visibilityOf([
        { errorMessage: 'x', mentions: [] },
        { errorMessage: null, mentions: [{ isOwnBrand: true, isCompetitor: false }] },
      ]),
    ).toBe(100);
  });
});
