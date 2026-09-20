/**
 * Duyurular: admin CRUD (401/403, POST 201 + audit, PATCH aç/kapa, DELETE) ve public GET görünürlük kuralları
 * (enabled:false, endsAt geçmiş, startsAt gelecek → görünmez; yerleşim ayrımı; geçersiz yerleşim 400; limit 429).
 */
import { describe, expect, it } from 'vitest';
import { call, createTenant, loginAs, logout, prisma } from './helpers';
import { GET as listAdmin, POST as createAnn } from '@/app/api/admin/announcements/route';
import { PATCH as patchAnn, DELETE as deleteAnn } from '@/app/api/admin/announcements/[id]/route';
import { GET as publicAnn } from '@/app/api/public/announcements/route';

type Item = { id: string; text: string; updatedAt: string; placement: string; tone: string };
const items = (r: { json: Record<string, never> }) => (r.json as unknown as { items: Item[] }).items;

describe('admin › duyurular', () => {
  it('oturum yoksa 401; OWNER 403; public GET herkese açık (boş liste)', async () => {
    logout();
    expect((await call(createAnn, { method: 'POST', body: { text: 'x' } })).status).toBe(401);
    const { user } = await createTenant();
    await loginAs(user);
    expect((await call(createAnn, { method: 'POST', body: { text: 'x' } })).status).toBe(403);
    expect((await call(listAdmin)).status).toBe(403);
    expect(await prisma.announcement.count()).toBe(0);
    logout();
    const pub = await call(publicAnn, { headers: { 'x-forwarded-for': '198.51.100.30' } });
    expect(pub.status).toBe(200);
    expect(items(pub)).toEqual([]);
  });

  it('süper admin POST → 201 + audit; public GET görünür; enabled:false / endsAt geçmiş / startsAt gelecek → görünmez', async () => {
    const { user } = await createTenant({ superAdmin: true });
    await loginAs(user);
    const created = await call(createAnn, {
      method: 'POST',
      body: {
        text: 'Yeni: 11 ücretsiz site aracı',
        tone: 'PROMO',
        placement: 'LANDING',
        href: '/arac',
        ctaLabel: 'İncele',
        enabled: true,
      },
    });
    expect(created.status).toBe(201);
    const c = created.json as unknown as Item & { live: boolean };
    expect(c.live).toBe(true);
    expect(await prisma.auditLog.count({ where: { action: 'admin.announcement_create', targetId: c.id } })).toBe(1);
    expect(created.text).not.toContain('createdById');

    const pub = await call(publicAnn, {
      url: '/api/public/announcements?placement=LANDING',
      headers: { 'x-forwarded-for': '198.51.100.31' },
    });
    expect(items(pub).map((x) => x.id)).toEqual([c.id]);
    expect(pub.text).not.toMatch(/createdById|enabled/);
    // Başka yerleşimde görünmez
    const tools = await call(publicAnn, {
      url: '/api/public/announcements?placement=TOOLS',
      headers: { 'x-forwarded-for': '198.51.100.31' },
    });
    expect(items(tools)).toEqual([]);

    // Kapat → görünmez; PATCH audit
    const off = await call(patchAnn, { method: 'PATCH', body: { enabled: false }, params: { id: c.id } });
    expect(off.status).toBe(200);
    expect((off.json as unknown as { live: boolean }).live).toBe(false);
    expect(items(await call(publicAnn, { headers: { 'x-forwarded-for': '198.51.100.32' } }))).toEqual([]);
    expect(await prisma.auditLog.count({ where: { action: 'admin.announcement_update', targetId: c.id } })).toBe(1);

    // Aç ama endsAt geçmiş → görünmez
    await call(patchAnn, {
      method: 'PATCH',
      body: { enabled: true, endsAt: new Date(Date.now() - 60_000).toISOString() },
      params: { id: c.id },
    });
    expect(items(await call(publicAnn, { headers: { 'x-forwarded-for': '198.51.100.33' } }))).toEqual([]);
    // endsAt gelecek, startsAt gelecek → görünmez
    await call(patchAnn, {
      method: 'PATCH',
      body: {
        startsAt: new Date(Date.now() + 3_600_000).toISOString(),
        endsAt: new Date(Date.now() + 7_200_000).toISOString(),
      },
      params: { id: c.id },
    });
    expect(items(await call(publicAnn, { headers: { 'x-forwarded-for': '198.51.100.34' } }))).toEqual([]);
    // startsAt geçmiş → görünür; updatedAt değişti (kapatma anahtarı yenilendi)
    const on = await call(patchAnn, {
      method: 'PATCH',
      body: { startsAt: new Date(Date.now() - 1000).toISOString() },
      params: { id: c.id },
    });
    expect((on.json as unknown as { live: boolean }).live).toBe(true);
    const visible = items(await call(publicAnn, { headers: { 'x-forwarded-for': '198.51.100.35' } }));
    expect(visible).toHaveLength(1);
    expect(visible[0]?.updatedAt).not.toBe(c.updatedAt);

    // Admin listesi tümünü gösterir
    const all = await call(listAdmin);
    expect(all.status).toBe(200);
    expect(items(all)).toHaveLength(1);

    // Sil
    const del = await call(deleteAnn, { method: 'DELETE', params: { id: c.id } });
    expect(del.status).toBe(200);
    expect(await prisma.announcement.count()).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: 'admin.announcement_delete', targetId: c.id } })).toBe(1);
    expect((await call(deleteAnn, { method: 'DELETE', params: { id: c.id } })).status).toBe(404);
  });

  it('geçersiz gövde 400 ve kayıt yok: boş metin, ton, yerleşim, javascript: href, bitiş < başlangıç', async () => {
    const { user } = await createTenant({ superAdmin: true });
    await loginAs(user);
    const bad = [
      { text: '' },
      { text: 'x', tone: 'LOUD' },
      { text: 'x', placement: 'FOOTER' },
      { text: 'x', href: 'javascript:alert(1)' },
      { text: 'x', href: 'http://insecure.example' },
      { text: 'x', startsAt: '2026-09-22T00:00:00Z', endsAt: '2026-09-21T00:00:00Z' },
      { text: 'x'.repeat(301) },
      { text: 'x', enabled: 'yes' },
    ];
    for (const body of bad) expect((await call(createAnn, { method: 'POST', body })).status).toBe(400);
    expect(await prisma.announcement.count()).toBe(0);
    expect(
      (
        await call(publicAnn, {
          url: '/api/public/announcements?placement=NOPE',
          headers: { 'x-forwarded-for': '198.51.100.36' },
        })
      ).status,
    ).toBe(400);
  });

  it('public GET: IP başına 60/dk; 61. istek 429 + Retry-After', async () => {
    const headers = { 'x-forwarded-for': '198.51.100.37' };
    for (let i = 0; i < 60; i += 1) expect((await call(publicAnn, { headers })).status).toBe(200);
    const r = await call(publicAnn, { headers });
    expect(r.status).toBe(429);
    expect(r.headers.get('retry-after')).toBeTruthy();
  });
});
