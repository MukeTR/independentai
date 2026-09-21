import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { requireSuperAdmin } from '@/server/authz';
import { audit } from '@/server/audit';
import { getOffer, setOfferOverrides, parseOfferNumber, OFFER_CONFIG_KEYS, type OfferField } from '@/server/offer';

/** Süper admin: etkin teklif ve fiyatlar (varsayılan + override). */
export const GET = route('admin.offer_get', async () => {
  await requireSuperAdmin();
  return NextResponse.json(await getOffer());
});

/**
 * Süper admin: teklif/fiyat override'ları. Gövde: { trialDays?, saasMonthlyTry?, agencyFromMonthlyTry? }.
 * Sayı → override; null → varsayılana dön. Geçersiz/sınır dışı değer 400.
 */
export const PATCH = route('admin.offer_update', async (req) => {
  const actor = await requireSuperAdmin();
  const body = await readJson<Partial<Record<OfferField, unknown>>>(req);
  const patch: Partial<Record<OfferField, number | null>> = {};
  for (const field of Object.keys(OFFER_CONFIG_KEYS) as OfferField[]) {
    if (!(field in body)) continue;
    const raw = body[field];
    if (raw === null || raw === '') {
      patch[field] = null;
      continue;
    }
    const v = parseOfferNumber(field, raw);
    if (v === null) throw new ClientError(`Geçersiz değer: ${field}`);
    patch[field] = v;
  }
  if (Object.keys(patch).length === 0) throw new ClientError('Değiştirilecek alan yok');
  const offer = await setOfferOverrides(patch, actor.userId);
  await audit({ action: 'admin.offer_update', actorUserId: actor.userId, meta: patch, req });
  return NextResponse.json(offer);
});
