/**
 * Admin lead paneli API'si: 401/403, süper admin pozitif, cursor sayfalama, aksiyon → activity sırası,
 * geçersiz durum 400, DELETE audit satırı, e-posta maskeleme + reveal audit, CSV (yalnız consentAt'lı e-posta),
 * yanıtta sır sızıntısı yok.
 */
import { describe, expect, it } from 'vitest';
import { call, createTenant, loginAs, logout, prisma } from './helpers';
import { GET as listLeads } from '@/app/api/admin/leads/route';
import { GET as getLead, PATCH as patchLead, DELETE as deleteLead } from '@/app/api/admin/leads/[id]/route';
import { GET as exportLeads } from '@/app/api/admin/leads/export/route';
import { leadsToCsv } from '@/server/lead-admin';

const SECRET_RE = /passwordHash|secret|sk-|visitorHash/i;

async function seedLeads() {
  const a = await prisma.lead.create({
    data: { hostname: 'alpha.example', scanCount: 3, lastScore: 41, bestScore: 55, kinds: ['CRAWLER'], source: 'TOOL' },
  });
  const b = await prisma.lead.create({
    data: {
      hostname: 'beta.example',
      source: 'CONTACT',
      contactName: 'Ayşe Yılmaz',
      contactEmail: 'ayse@beta.example',
      contactPhone: '+905321112233',
      company: 'Beta Ltd',
      message: 'Merhaba',
      consentAt: new Date(),
      lastSeenAt: new Date(Date.now() + 1000),
    },
  });
  const c = await prisma.lead.create({
    data: {
      hostname: null,
      source: 'CONTACT',
      contactName: 'Rızasız Kişi',
      contactEmail: 'gizli@no-consent.example',
      message: 'x',
      consentAt: null,
      lastSeenAt: new Date(Date.now() + 2000),
    },
  });
  return { a, b, c };
}

describe('admin › lead paneli', () => {
  it('oturum yoksa 401; sıradan OWNER için 403 (liste, detay, PATCH, DELETE, export)', async () => {
    const { a } = await seedLeads();
    logout();
    expect((await call(listLeads)).status).toBe(401);
    const { user } = await createTenant();
    await loginAs(user);
    expect((await call(listLeads)).status).toBe(403);
    expect((await call(getLead, { params: { id: a.id } })).status).toBe(403);
    expect((await call(patchLead, { method: 'PATCH', body: { action: 'called' }, params: { id: a.id } })).status).toBe(
      403,
    );
    expect((await call(deleteLead, { method: 'DELETE', params: { id: a.id } })).status).toBe(403);
    expect((await call(exportLeads)).status).toBe(403);
    expect((await prisma.lead.findUnique({ where: { id: a.id } }))?.status).toBe('NEW');
  });

  it('süper admin: liste maskeli e-posta + sayımlar; cursor ile 2 sayfa, kesişim yok; sır sızıntısı yok', async () => {
    await seedLeads();
    const { user } = await createTenant({ superAdmin: true });
    await loginAs(user);
    const p1 = await call(listLeads, { url: '/api/admin/leads?take=2' });
    expect(p1.status).toBe(200);
    const j1 = p1.json as unknown as {
      items: { id: string; contactEmail: string | null }[];
      nextCursor: string | null;
      counts: { bySource: Record<string, number>; byStatus: Record<string, number> };
    };
    expect(j1.items).toHaveLength(2);
    expect(j1.nextCursor).toBeTruthy();
    expect(j1.counts.bySource.CONTACT).toBe(2);
    expect(j1.counts.bySource.TOOL).toBe(1);
    expect(j1.counts.byStatus.NEW).toBe(3);
    // maskeli: a***@beta.example; ham e-posta yok
    expect(p1.text).not.toContain('ayse@beta.example');
    expect(p1.text).toContain('a***@beta.example');
    expect(p1.text).not.toMatch(SECRET_RE);

    const p2 = await call(listLeads, { url: `/api/admin/leads?take=2&cursor=${j1.nextCursor}` });
    const j2 = p2.json as unknown as { items: { id: string }[]; nextCursor: string | null };
    expect(j2.items).toHaveLength(1);
    expect(j2.nextCursor).toBeNull();
    const ids = new Set([...j1.items, ...j2.items].map((x) => x.id));
    expect(ids.size).toBe(3);

    // filtreler
    const onlyTool = await call(listLeads, { url: '/api/admin/leads?source=TOOL' });
    expect((onlyTool.json as unknown as { items: unknown[] }).items).toHaveLength(1);
    const byQ = await call(listLeads, { url: '/api/admin/leads?q=BETA' });
    expect((byQ.json as unknown as { items: unknown[] }).items).toHaveLength(1);
    expect((await call(listLeads, { url: '/api/admin/leads?status=NOPE' })).status).toBe(400);
  });

  it('PATCH: aksiyon → durum + activity sırası korunur; geçersiz durum/aksiyon 400; audit satırı', async () => {
    const { a } = await seedLeads();
    const { user } = await createTenant({ superAdmin: true });
    await loginAs(user);

    const r1 = await call(patchLead, {
      method: 'PATCH',
      body: { action: 'called', note: 'Ahmet Bey aradı' },
      params: { id: a.id },
    });
    expect(r1.status).toBe(200);
    expect((r1.json as unknown as { status: string }).status).toBe('CONTACTED');

    const r2 = await call(patchLead, {
      method: 'PATCH',
      body: { action: 'note', note: 'Fiyat istedi' },
      params: { id: a.id },
    });
    expect(r2.status).toBe(200);
    const r3 = await call(patchLead, { method: 'PATCH', body: { status: 'WON' }, params: { id: a.id } });
    expect(r3.status).toBe(200);
    const r4 = await call(patchLead, { method: 'PATCH', body: { ownerUserId: user.id }, params: { id: a.id } });
    expect(r4.status).toBe(200);

    const row = await prisma.lead.findUniqueOrThrow({ where: { id: a.id } });
    expect(row.status).toBe('WON');
    expect(row.ownerUserId).toBe(user.id);
    const activity = row.activity as { action: string; status?: string; note?: string; byUserId?: string }[];
    expect(activity.map((x) => x.action)).toEqual(['called', 'note', 'status:WON', 'owner']);
    // Durum değişen satırlarda `status` alanı; not/sahip satırlarında yok
    expect(activity.map((x) => x.status)).toEqual(['CONTACTED', undefined, 'WON', undefined]);
    expect(activity[0]?.note).toBe('Ahmet Bey aradı');
    expect(activity.every((x) => x.byUserId === user.id)).toBe(true);

    expect((await call(patchLead, { method: 'PATCH', body: { status: 'MAYBE' }, params: { id: a.id } })).status).toBe(
      400,
    );
    expect((await call(patchLead, { method: 'PATCH', body: { action: 'dance' }, params: { id: a.id } })).status).toBe(
      400,
    );
    expect((await call(patchLead, { method: 'PATCH', body: {}, params: { id: a.id } })).status).toBe(400);
    expect(
      (await call(patchLead, { method: 'PATCH', body: { ownerUserId: 'nope-nope-nope' }, params: { id: a.id } }))
        .status,
    ).toBe(400);
    expect(
      (await call(patchLead, { method: 'PATCH', body: { action: 'won' }, params: { id: 'yok-yok-yok' } })).status,
    ).toBe(404);

    expect(
      await prisma.auditLog.count({ where: { action: 'admin.lead_update', targetId: a.id, actorUserId: user.id } }),
    ).toBe(4);
  });

  it('detay maskeli; ?reveal=1 tam e-posta/telefon + admin.lead_reveal_email audit; DELETE → satır yok + audit', async () => {
    const { b } = await seedLeads();
    const { user } = await createTenant({ superAdmin: true });
    await loginAs(user);

    const masked = await call(getLead, { params: { id: b.id } });
    expect(masked.status).toBe(200);
    const mj = masked.json as unknown as { contactEmail: string; contactPhone: string; masked: boolean };
    expect(mj.masked).toBe(true);
    expect(mj.contactEmail).toBe('a***@beta.example');
    expect(mj.contactPhone).toMatch(/^\*+33$/);
    expect(await prisma.auditLog.count({ where: { action: 'admin.lead_reveal_email' } })).toBe(0);

    const full = await call(getLead, { url: `/api/admin/leads/${b.id}?reveal=1`, params: { id: b.id } });
    const fj = full.json as unknown as { contactEmail: string; contactPhone: string; masked: boolean };
    expect(fj.masked).toBe(false);
    expect(fj.contactEmail).toBe('ayse@beta.example');
    expect(fj.contactPhone).toBe('+905321112233');
    expect(await prisma.auditLog.count({ where: { action: 'admin.lead_reveal_email', targetId: b.id } })).toBe(1);
    expect(full.text).not.toMatch(SECRET_RE);

    const del = await call(deleteLead, { method: 'DELETE', params: { id: b.id } });
    expect(del.status).toBe(200);
    expect(await prisma.lead.count({ where: { id: b.id } })).toBe(0);
    const log = await prisma.auditLog.findFirst({ where: { action: 'admin.lead_delete', targetId: b.id } });
    expect(log?.actorUserId).toBe(user.id);
    expect(JSON.stringify(log?.meta)).not.toContain('ayse@');
    expect((await call(deleteLead, { method: 'DELETE', params: { id: b.id } })).status).toBe(404);
  });

  it('CSV: BOM + başlık; e-posta yalnız consentAt dolu satırda; telefon/mesaj yok; audit admin.lead_export', async () => {
    await seedLeads();
    const { user } = await createTenant({ superAdmin: true });
    await loginAs(user);
    const r = await call(exportLeads, { url: '/api/admin/leads/export' });
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('text/csv');
    expect(r.headers.get('content-disposition')).toMatch(/attachment; filename="leads-\d{4}-\d{2}-\d{2}\.csv"/);
    // Response.text() BOM'u soyar; BOM üreticide doğrulanır.
    expect(leadsToCsv([]).charCodeAt(0)).toBe(0xfeff);
    const lines = r.text.trim().split('\r\n');
    expect(lines[0]).toMatch(/^id,hostname,status/);
    expect(lines).toHaveLength(4);
    expect(r.text).toContain('ayse@beta.example');
    expect(r.text).not.toContain('gizli@no-consent.example');
    expect(r.text).not.toContain('Rızasız Kişi');
    expect(r.text).not.toContain('905321112233');
    expect(r.text).not.toContain('Merhaba');
    expect(await prisma.auditLog.count({ where: { action: 'admin.lead_export', actorUserId: user.id } })).toBe(1);

    const filtered = await call(exportLeads, { url: '/api/admin/leads/export?source=TOOL' });
    expect(filtered.text.trim().split('\r\n')).toHaveLength(2);
    expect((await call(exportLeads, { url: '/api/admin/leads/export?source=X' })).status).toBe(400);
  });
});
