import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({ values: new Map<string, string>(), fail: false }));

vi.mock('@/server/system-config', () => ({
  getPlainConfigValue: async (key: string) => {
    if (store.fail) throw new Error('db down');
    return store.values.get(key);
  },
  setPlainConfigValue: async (key: string, value: string | null) => {
    if (value === null || value === '') store.values.delete(key);
    else store.values.set(key, value);
  },
}));

import { getOffer, setOfferOverrides, parseOfferNumber, OFFER_CONFIG_KEYS } from '@/server/offer';
import { OFFER, LAUNCH_OFFER, launchOfferOpen, formatTry } from '@independentai/shared';

describe('OFFER (paylaşılan tek kaynak)', () => {
  it('varsayılanlar: 14 gün, ₺2.490/ay, ₺30.000/ay', () => {
    expect(OFFER.trialDays).toBe(14);
    expect(OFFER.saasMonthlyTry).toBe(2490);
    expect(OFFER.agencyFromMonthlyTry).toBe(30000);
    expect(OFFER.fairUse.prompts).toBe(200);
  });
  it('LAUNCH_OFFER geriye uyumlu alias: fairUse aynı, kayıt her zaman açık', () => {
    expect(LAUNCH_OFFER.fairUse).toBe(OFFER.fairUse);
    expect(LAUNCH_OFFER.endsAt).toBeNull();
    expect(LAUNCH_OFFER.trialMonths).toBeGreaterThan(0);
    expect(launchOfferOpen()).toBe(true);
    expect(launchOfferOpen(new Date('2099-01-01'))).toBe(true);
  });
  it('formatTry tr-TR binlik ayırıcıyla ₺ yazar', () => {
    expect(formatTry(2490)).toBe('₺2.490');
    expect(formatTry(30000)).toBe('₺30.000');
    expect(formatTry(0)).toBe('₺0');
  });
});

describe('getOffer (SystemConfig override)', () => {
  beforeEach(() => {
    store.values.clear();
    store.fail = false;
  });

  it('override yoksa OFFER varsayılanlarını döner', async () => {
    const o = await getOffer();
    expect(o).toEqual({
      trialDays: OFFER.trialDays,
      saasMonthlyTry: OFFER.saasMonthlyTry,
      agencyFromMonthlyTry: OFFER.agencyFromMonthlyTry,
      fairUse: OFFER.fairUse,
    });
  });

  it('SystemConfig değerleri sayıya çevrilerek varsayılanı ezer', async () => {
    store.values.set(OFFER_CONFIG_KEYS.trialDays, '30');
    store.values.set(OFFER_CONFIG_KEYS.saasMonthlyTry, '2990');
    store.values.set(OFFER_CONFIG_KEYS.agencyFromMonthlyTry, '45000');
    const o = await getOffer();
    expect(o.trialDays).toBe(30);
    expect(o.saasMonthlyTry).toBe(2990);
    expect(o.agencyFromMonthlyTry).toBe(45000);
    expect(o.fairUse).toBe(OFFER.fairUse);
  });

  it.each([
    ['abc', 'geçersiz metin'],
    ['', 'boş'],
    ['0', 'sınır altı'],
    ['9999', 'sınır üstü'],
    ['-5', 'negatif'],
  ])('geçersiz trialDays override (%s: %s) → varsayılan', async (raw) => {
    store.values.set(OFFER_CONFIG_KEYS.trialDays, raw);
    expect((await getOffer()).trialDays).toBe(OFFER.trialDays);
  });

  it('DB hatasında varsayılana düşer (pazarlama sayfası düşmez)', async () => {
    store.fail = true;
    const o = await getOffer();
    expect(o.trialDays).toBe(OFFER.trialDays);
    expect(o.saasMonthlyTry).toBe(OFFER.saasMonthlyTry);
  });

  it('setOfferOverrides: sayı yazar, null siler, sonuç etkin teklif', async () => {
    let o = await setOfferOverrides({ trialDays: 21, saasMonthlyTry: 1990 }, 'u1');
    expect(o.trialDays).toBe(21);
    expect(o.saasMonthlyTry).toBe(1990);
    expect(o.agencyFromMonthlyTry).toBe(OFFER.agencyFromMonthlyTry);
    expect(store.values.get(OFFER_CONFIG_KEYS.trialDays)).toBe('21');
    o = await setOfferOverrides({ trialDays: null }, 'u1');
    expect(o.trialDays).toBe(OFFER.trialDays);
    expect(store.values.has(OFFER_CONFIG_KEYS.trialDays)).toBe(false);
    // dokunulmayan alan korunur
    expect(o.saasMonthlyTry).toBe(1990);
  });
});

describe('parseOfferNumber', () => {
  it('tam sayıya yuvarlar ve sınırları uygular', () => {
    expect(parseOfferNumber('trialDays', 14)).toBe(14);
    expect(parseOfferNumber('trialDays', '14.4')).toBe(14);
    expect(parseOfferNumber('trialDays', 366)).toBeNull();
    expect(parseOfferNumber('saasMonthlyTry', 0)).toBe(0);
    expect(parseOfferNumber('saasMonthlyTry', -1)).toBeNull();
    expect(parseOfferNumber('agencyFromMonthlyTry', '30000')).toBe(30000);
    expect(parseOfferNumber('agencyFromMonthlyTry', Number.NaN)).toBeNull();
    expect(parseOfferNumber('agencyFromMonthlyTry', {})).toBeNull();
  });
});
