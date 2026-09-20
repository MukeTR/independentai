import { describe, expect, it } from 'vitest';
import { call, createTenant, loginAs, logout, prisma } from './helpers';
import { GET as getOfferRoute, PATCH as patchOffer } from '@/app/api/admin/offer/route';
import { POST as register } from '@/app/api/auth/register/route';
import { OFFER } from '@independentai/shared';
import { getOffer, OFFER_CONFIG_KEYS } from '@/server/offer';

describe('admin › teklif ve fiyat (PATCH /api/admin/offer)', () => {
  it('oturum yoksa 401; sıradan OWNER için 403 ve DB değişmez', async () => {
    logout();
    expect((await call(patchOffer, { method: 'PATCH', body: { trialDays: 30 } })).status).toBe(401);
    const { user } = await createTenant();
    await loginAs(user);
    expect((await call(patchOffer, { method: 'PATCH', body: { trialDays: 30 } })).status).toBe(403);
    expect((await call(getOfferRoute)).status).toBe(403);
    expect(await prisma.systemConfig.count()).toBe(0);
    expect((await getOffer()).trialDays).toBe(OFFER.trialDays);
  });

  it('süper admin: 200, düz metin (şifresiz) SystemConfig satırı, audit kaydı, getOffer yeni değeri döner', async () => {
    const { user } = await createTenant({ superAdmin: true });
    await loginAs(user);
    const before = await call(getOfferRoute);
    expect(before.status).toBe(200);
    expect(before.json.trialDays).toBe(OFFER.trialDays);

    const r = await call(patchOffer, {
      method: 'PATCH',
      body: { trialDays: 30, saasMonthlyTry: 2990, agencyFromMonthlyTry: 45000 },
    });
    expect(r.status).toBe(200);
    expect(r.json.trialDays).toBe(30);
    expect(r.json.saasMonthlyTry).toBe(2990);
    expect(r.json.agencyFromMonthlyTry).toBe(45000);

    const row = await prisma.systemConfig.findUnique({ where: { key: OFFER_CONFIG_KEYS.trialDays } });
    expect(row?.value).toBe('30');
    expect(row?.encrypted).toBe(false);
    expect(row?.updatedBy).toBe(user.id);
    expect(await prisma.auditLog.count({ where: { action: 'admin.offer_update', actorUserId: user.id } })).toBe(1);

    const effective = await getOffer();
    expect(effective.trialDays).toBe(30);
    expect(effective.saasMonthlyTry).toBe(2990);

    // null → varsayılana dön (satır silinir), diğer alanlar korunur
    const reset = await call(patchOffer, { method: 'PATCH', body: { trialDays: null } });
    expect(reset.status).toBe(200);
    expect(reset.json.trialDays).toBe(OFFER.trialDays);
    expect(reset.json.saasMonthlyTry).toBe(2990);
    expect(await prisma.systemConfig.count({ where: { key: OFFER_CONFIG_KEYS.trialDays } })).toBe(0);
  });

  it('geçersiz gövde 400 ve kayıt yok', async () => {
    const { user } = await createTenant({ superAdmin: true });
    await loginAs(user);
    expect((await call(patchOffer, { method: 'PATCH', body: { trialDays: 'abc' } })).status).toBe(400);
    expect((await call(patchOffer, { method: 'PATCH', body: { trialDays: 400 } })).status).toBe(400);
    expect((await call(patchOffer, { method: 'PATCH', body: { saasMonthlyTry: -1 } })).status).toBe(400);
    expect((await call(patchOffer, { method: 'PATCH', body: {} })).status).toBe(400);
    expect(await prisma.systemConfig.count()).toBe(0);
  });

  it('yeni kayıtta trialEndsAt = şimdi + etkin trialDays (override uygulanır)', async () => {
    const { user: admin } = await createTenant({ superAdmin: true });
    await loginAs(admin);
    expect((await call(patchOffer, { method: 'PATCH', body: { trialDays: 21 } })).status).toBe(200);
    logout();

    const res = await call(register, {
      method: 'POST',
      body: { companyName: 'Deneme Ltd', email: 'deneme-offer@test.local', password: 'sifre1234' },
      headers: { 'x-forwarded-for': '198.51.100.77' },
    });
    expect(res.status).toBe(201);
    const tenant = await prisma.tenant.findFirstOrThrow({ where: { name: 'Deneme Ltd' } });
    const days = (tenant.trialEndsAt.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(20.9);
    expect(days).toBeLessThanOrEqual(21);
  });
});
