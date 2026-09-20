/**
 * Teklif ve fiyat — sunucu tarafı tek okuma noktası.
 *
 * Varsayılanlar `@independentai/shared` OFFER'dan gelir; süper admin Sistem sayfasından SystemConfig ile
 * geçersiz kılabilir (düz metin anahtarlar, şifreleme yok):
 *   offer.trialDays · pricing.saasMonthlyTry · pricing.agencyFromMonthlyTry
 * Geçersiz/boş değer → varsayılan. DB erişilemezse de varsayılan (pazarlama sayfası düşmez).
 */
import { cache } from 'react';
import { OFFER, type Offer } from '@independentai/shared';
import { getPlainConfigValue, setPlainConfigValue } from './system-config';

export const OFFER_CONFIG_KEYS = {
  trialDays: 'offer.trialDays',
  saasMonthlyTry: 'pricing.saasMonthlyTry',
  agencyFromMonthlyTry: 'pricing.agencyFromMonthlyTry',
} as const;

export type OfferField = keyof typeof OFFER_CONFIG_KEYS;

/** Alan sınırları — admin formu ve API aynı kuralı kullanır. */
export const OFFER_BOUNDS: Record<OfferField, { min: number; max: number; label: string }> = {
  trialDays: { min: 1, max: 365, label: 'Deneme süresi (gün)' },
  saasMonthlyTry: { min: 0, max: 1_000_000, label: 'Yanıt aylık fiyat (₺)' },
  agencyFromMonthlyTry: { min: 0, max: 10_000_000, label: 'Yanıt Agency başlangıç fiyatı (₺/ay)' },
};

/** Tam sayıya çevir; sınır dışı/geçersiz → null. */
export function parseOfferNumber(field: OfferField, raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return null;
  const v = Math.round(n);
  const b = OFFER_BOUNDS[field];
  if (v < b.min || v > b.max) return null;
  return v;
}

/** Etkin teklif: SystemConfig override'ları + OFFER varsayılanları. İstek başına memoize (Header + CtaBlock + sayfa aynı render'da tek okuma). */
export const getOffer = cache(async function getOffer(): Promise<Offer> {
  let trialDays: string | undefined;
  let saas: string | undefined;
  let agency: string | undefined;
  try {
    [trialDays, saas, agency] = await Promise.all([
      getPlainConfigValue(OFFER_CONFIG_KEYS.trialDays),
      getPlainConfigValue(OFFER_CONFIG_KEYS.saasMonthlyTry),
      getPlainConfigValue(OFFER_CONFIG_KEYS.agencyFromMonthlyTry),
    ]);
  } catch {
    // DB erişilemezse varsayılan teklif; pazarlama sayfası düşmez.
  }
  return {
    trialDays: parseOfferNumber('trialDays', trialDays) ?? OFFER.trialDays,
    saasMonthlyTry: parseOfferNumber('saasMonthlyTry', saas) ?? OFFER.saasMonthlyTry,
    agencyFromMonthlyTry: parseOfferNumber('agencyFromMonthlyTry', agency) ?? OFFER.agencyFromMonthlyTry,
    fairUse: OFFER.fairUse,
  };
});

/** Admin: alanları yaz. `null` → override'ı sil (varsayılana dön). Dönen değer: etkin teklif. */
export async function setOfferOverrides(
  patch: Partial<Record<OfferField, number | null>>,
  userId: string,
): Promise<Offer> {
  for (const field of Object.keys(OFFER_CONFIG_KEYS) as OfferField[]) {
    if (!(field in patch)) continue;
    const v = patch[field];
    await setPlainConfigValue(OFFER_CONFIG_KEYS[field], v === null || v === undefined ? null : String(v), userId);
  }
  return getOffer();
}
