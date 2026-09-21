/**
 * Admin kullanıcı/tenant listeleri: `select` ile alan seçimi (passwordHash/oauthSub ASLA yok), Türkçe arama,
 * cursor sayfalama, durum rozeti (Aktif / Deneme / Süresi doldu), 7 gün içinde biten deneme filtresi.
 */
import { describe, expect, it } from 'vitest';
import { createTenant, prisma } from './helpers';
import { listAdminTenants, listAdminUsers, userStatusBadge } from '@/server/admin';

describe('admin › kullanıcılar ve tenant listeleri', () => {
  it('kullanıcı listesi: passwordHash yok, arama e-posta/şirket (İ/ı), cursor 2 sayfa', async () => {
    const a = await createTenant({ email: 'ayse@ornek.com' });
    await prisma.tenant.update({ where: { id: a.tenant.id }, data: { name: 'İstanbul Dijital' } });
    await createTenant({ email: 'burak@baska.com' });
    await createTenant({ email: 'cem@ucuncu.com' });

    const all = await listAdminUsers({ take: 2 });
    expect(all.total).toBe(3);
    expect(all.items).toHaveLength(2);
    expect(all.nextCursor).toBeTruthy();
    for (const u of all.items) {
      expect(Object.keys(u)).not.toContain('passwordHash');
      expect(Object.keys(u)).not.toContain('oauthSub');
      expect(JSON.stringify(u)).not.toMatch(/passwordHash|scrypt|:[a-f0-9]{64}/);
    }
    const page2 = await listAdminUsers({ take: 2, cursor: all.nextCursor });
    expect(page2.items).toHaveLength(1);
    expect(page2.nextCursor).toBeNull();
    const ids = new Set([...all.items, ...page2.items].map((u) => u.id));
    expect(ids.size).toBe(3);

    expect((await listAdminUsers({ q: 'AYSE' })).items.map((u) => u.email)).toEqual(['ayse@ornek.com']);
    expect((await listAdminUsers({ q: 'istanbul' })).items.map((u) => u.email)).toEqual(['ayse@ornek.com']);
    expect((await listAdminUsers({ q: 'yok' })).items).toHaveLength(0);
  });

  it('durum rozeti: ücretli → Aktif; LAUNCH süre içinde → Deneme; süre + ek süre dolmuş → Süresi doldu', () => {
    const now = new Date();
    expect(userStatusBadge({ plan: 'STARTER', trialEndsAt: new Date(now.getTime() - 100 * 86_400_000) }, now).key).toBe(
      'active',
    );
    expect(userStatusBadge({ plan: 'LAUNCH', trialEndsAt: new Date(now.getTime() + 5 * 86_400_000) }, now).key).toBe(
      'trial',
    );
    expect(userStatusBadge({ plan: 'LAUNCH', trialEndsAt: new Date(now.getTime() - 30 * 86_400_000) }, now)).toEqual({
      key: 'expired',
      label: 'Süresi doldu',
    });
  });

  it('tenant listesi: arama, sayfalama ve 7 gün içinde biten deneme filtresi', async () => {
    await createTenant({ trialDaysLeft: 3 });
    const paid = await createTenant({ trialDaysLeft: 3, plan: 'STARTER' });
    const far = await createTenant({ trialDaysLeft: 40 });
    await prisma.tenant.update({
      where: { id: far.tenant.id },
      data: { name: 'Uzak Şirket', website: 'https://Uzak.example' },
    });

    const all = await listAdminTenants({ take: 2 });
    expect(all.total).toBe(3);
    expect(all.nextCursor).toBeTruthy();
    const p2 = await listAdminTenants({ take: 2, cursor: all.nextCursor });
    expect(p2.items).toHaveLength(1);
    expect(p2.nextCursor).toBeNull();

    const ending = await listAdminTenants({ trialEndingDays: 7 });
    expect(ending.items).toHaveLength(1);
    expect(ending.items[0]?.id).not.toBe(paid.tenant.id);
    expect(ending.items[0]?._count.users).toBe(1);

    expect((await listAdminTenants({ q: 'uzak' })).items.map((t) => t.id)).toEqual([far.tenant.id]);
    expect((await listAdminTenants({ q: 'UZAK.EXAMPLE' })).items.map((t) => t.id)).toEqual([far.tenant.id]);
  });
});
