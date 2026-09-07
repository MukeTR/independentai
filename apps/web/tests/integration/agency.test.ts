/**
 * Ajans modeli (Faz A0) — dönüştürme, müşteri çalışma alanı, çerezle erişim çözümleme, roller,
 * davet/koltuk, bağlama isteği, sahiplik devri, unlink sonrası veri, Realtime yayın güvenliği,
 * cross-tenant izolasyon ve rapor paylaşım linkleri.
 */
import { describe, expect, it } from 'vitest';
import { addMember, call, createTenant, loginAs, logout, setWorkspace, prisma, flushAfter } from './helpers';
import { getActor } from '@/server/authz';
import { drainOutbox } from '@/server/mailer';
import { POST as convertAgency, GET as agencySummary, PATCH as patchAgency } from '@/app/api/agency/route';
import { POST as setWorkspaceRoute } from '@/app/api/agency/workspace/route';
import { GET as listWorkspaces } from '@/app/api/agency/workspaces/route';
import { GET as listClients, POST as createClient } from '@/app/api/agency/clients/route';
import { PATCH as patchClient, DELETE as unlinkClient } from '@/app/api/agency/clients/[id]/route';
import { GET as listMembers } from '@/app/api/agency/members/route';
import { PATCH as patchMember } from '@/app/api/agency/members/[id]/route';
import { PUT as putAssignments } from '@/app/api/agency/members/[id]/assignments/route';
import { POST as transferOwnership } from '@/app/api/agency/members/[id]/transfer/route';
import { POST as createInvite } from '@/app/api/agency/invites/route';
import { GET as previewInvite } from '@/app/api/agency/invites/preview/route';
import { POST as acceptInvite } from '@/app/api/agency/invites/accept/route';
import { POST as createLink } from '@/app/api/agency/link/route';
import { POST as acceptLink } from '@/app/api/agency/link/accept/route';
import { GET as listShares, POST as createShare } from '@/app/api/agency/shares/route';
import { DELETE as revokeShare } from '@/app/api/agency/shares/[id]/route';
import { GET as publicShare } from '@/app/api/share/[token]/route';
import { POST as createPrompt } from '@/app/api/prompts/route';

type J = Record<string, unknown>;

/** Yeni ajans: verisiz OWNER tenant'ı dönüştürülür; aynı oturum ajans bağlamı kazanır. */
async function createAgency(name = 'Test Ajans') {
  const t = await createTenant({ onboarded: false });
  await loginAs(t.user);
  const r = await call(convertAgency, { method: 'POST', body: { name, website: 'ajans.example' } });
  expect(r.status).toBe(201);
  const agencyId = String((r.json as J).agencyId);
  return { ...t, agencyId };
}

async function createClientWs(name: string) {
  const r = await call(createClient, { method: 'POST', body: { name } });
  expect(r.status).toBe(201);
  return { workspaceId: String((r.json as J).workspaceId), tenantId: String((r.json as J).tenantId) };
}

/** Ajans ev tenant'ında doğrudan üyelik (davet akışını atlayarak) */
async function addAgencyMember(
  agency: { agencyId: string; tenant: { id: string } },
  role: 'ADMIN' | 'STRATEGIST' | 'ANALYST',
  allClients = false,
) {
  const user = await addMember(agency.tenant.id, role === 'ANALYST' ? 'VIEWER' : 'ADMIN');
  const membership = await prisma.agencyMembership.create({
    data: { agencyId: agency.agencyId, userId: user.id, role, allClients },
  });
  return { user, membership };
}

async function realtimeMessages(topic: string, event?: string) {
  const rows = await prisma.$queryRawUnsafe<{ topic: string; event: string; payload: unknown }[]>(
    `select topic, event, payload from realtime.messages where topic = $1 ${event ? 'and event = $2' : ''} order by id`,
    ...(event ? [topic, event] : [topic]),
  );
  return rows;
}

describe('ajansa dönüştürme', () => {
  it('verisiz OWNER dönüştürür (201); tenant.kind AGENCY, OWNER üyeliği; tekrar çağrı 200 alreadyAgency', async () => {
    const a = await createAgency('Dipixel');
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: a.tenant.id } });
    expect(tenant.kind).toBe('AGENCY');
    expect(tenant.name).toBe('Dipixel');
    expect(tenant.onboardingCompletedAt).not.toBeNull();
    const m = await prisma.agencyMembership.findFirstOrThrow({ where: { agencyId: a.agencyId, userId: a.user.id } });
    expect(m.role).toBe('OWNER');
    expect(m.allClients).toBe(true);
    const again = await call(convertAgency, { method: 'POST', body: { name: 'X' } });
    expect(again.status).toBe(200);
    expect((again.json as J).alreadyAgency).toBe(true);
    const sum = await call(agencySummary);
    expect(sum.status).toBe(200);
    expect((sum.json as J).members).toBe(1);
    expect(((sum.json as J).entitlement as J).plan).toBe('LAUNCH');
  });

  it('VIEWER/ADMIN dönüştüremez (403); marka verisi olan hesap 409; ajans olmayan için GET 403', async () => {
    const { tenant, user } = await createTenant();
    const viewer = await addMember(tenant.id, 'VIEWER');
    await loginAs(viewer);
    expect((await call(convertAgency, { method: 'POST', body: { name: 'X' } })).status).toBe(403);
    expect((await call(agencySummary)).status).toBe(403);
    await prisma.brand.create({ data: { tenantId: tenant.id, name: 'Marka', isOwn: true } });
    await loginAs(user);
    // Başka üye var + marka verisi var → 409 (agency.ts)
    expect((await call(convertAgency, { method: 'POST', body: { name: 'X' } })).status).toBe(409);
  });
});

describe('müşteri çalışma alanları ve plan limiti', () => {
  it('ADMIN+ müşteri oluşturur; 11. müşteri plan_limit; liste ve özet döner; ANALYST oluşturamaz', async () => {
    const a = await createAgency();
    for (let i = 0; i < 10; i++) await createClientWs(`Müşteri ${i + 1}`);
    const over = await call(createClient, { method: 'POST', body: { name: 'Fazla' } });
    expect(over.status).toBe(403);
    expect((over.json as J).code).toBe('plan_limit');

    const list = await call(listClients);
    expect(list.status).toBe(200);
    expect(((list.json as J).cards as unknown[]).length).toBe(10);
    expect(((list.json as J).summary as J).clients).toBe(10);
    expect(((list.json as J).entitlement as J).clientsLeft).toBe(0);

    const analyst = await addAgencyMember(a, 'ANALYST');
    await loginAs(analyst.user);
    expect((await call(createClient, { method: 'POST', body: { name: 'Yasak' } })).status).toBe(403);
  });

  it('PATCH ile etiket/tag/durum; arşivlenen listeden düşer, includeArchived=1 ile gelir', async () => {
    await createAgency();
    const c = await createClientWs('Etiketli');
    const p = await call(patchClient, {
      method: 'PATCH',
      params: { id: c.workspaceId },
      body: { label: 'Retainer', tags: ['e-ticaret', 'e-ticaret', ' moda '] },
    });
    expect(p.status).toBe(200);
    const ws = (p.json as J).workspace as J;
    expect(ws.label).toBe('Retainer');
    expect(ws.tags).toEqual(['e-ticaret', 'moda']);
    expect(
      (await call(patchClient, { method: 'PATCH', params: { id: c.workspaceId }, body: { status: 'ARCHIVED' } }))
        .status,
    ).toBe(200);
    expect(((await call(listClients)).json as J).cards).toHaveLength(0);
    expect(
      (((await call(listClients, { url: '/api/agency/clients?includeArchived=1' })).json as J).cards as unknown[])
        .length,
    ).toBe(1);
    expect(
      (await call(patchClient, { method: 'PATCH', params: { id: c.workspaceId }, body: { status: 'BOZUK' } })).status,
    ).toBe(400);
  });
});

describe('çalışma alanı çerezi ile erişim çözümleme', () => {
  it('OWNER: çerez → efektif tenant müşteri; yazma çalışır; null → ev tenant', async () => {
    const a = await createAgency();
    const c = await createClientWs('Müşteri A');

    const ws = await call(setWorkspaceRoute, { method: 'POST', body: { tenantId: c.tenantId } });
    expect(ws.status).toBe(200);
    expect(ws.headers.get('set-cookie')).toContain(`iai_ws=${c.tenantId}`);
    expect(ws.headers.get('set-cookie')).toMatch(/HttpOnly/i);

    setWorkspace(c.tenantId);
    const actor = await getActor();
    expect(actor?.tenantId).toBe(c.tenantId);
    expect(actor?.viaAgency).toBe(true);
    expect(actor?.role).toBe('OWNER');
    expect(actor?.agency?.workspace?.tenantId).toBe(c.tenantId);

    const pr = await call(createPrompt, { method: 'POST', body: { text: 'Müşteri A için en iyi ürün hangisi?' } });
    expect(pr.status).toBe(201);
    await flushAfter();
    expect(await prisma.prompt.count({ where: { tenantId: c.tenantId } })).toBe(1);
    expect(await prisma.prompt.count({ where: { tenantId: a.tenant.id } })).toBe(0);

    const clear = await call(setWorkspaceRoute, { method: 'POST', body: { tenantId: null } });
    expect(clear.status).toBe(200);
    expect(clear.headers.get('set-cookie')).toMatch(/iai_ws=;/);
    setWorkspace(null);
    expect((await getActor())?.tenantId).toBe(a.tenant.id);

    const wl = await call(listWorkspaces);
    expect(((wl.json as J).workspaces as unknown[]).length).toBe(1);
  });

  it('atanmamış üye: çerez yok sayılır (ev tenant); POST /workspace 404; atama sonrası erişir; ANALYST yazamaz (403)', async () => {
    const a = await createAgency();
    const c = await createClientWs('Müşteri B');
    const analyst = await addAgencyMember(a, 'ANALYST', false);

    await loginAs(analyst.user);
    setWorkspace(c.tenantId);
    expect((await getActor())?.tenantId).toBe(a.tenant.id);
    expect((await call(setWorkspaceRoute, { method: 'POST', body: { tenantId: c.tenantId } })).status).toBe(404);
    expect(((await call(listWorkspaces)).json as J).workspaces).toHaveLength(0);

    // OWNER atar → analistin sessionVersion artar (yeniden giriş) → erişir ama yazamaz
    await loginAs(a.user);
    setWorkspace(null);
    const as = await call(putAssignments, {
      method: 'PUT',
      params: { id: analyst.membership.id },
      body: { workspaceIds: [c.workspaceId] },
    });
    expect(as.status).toBe(200);
    // ANALYST ekip listesini görebilir ama müşteri listesi (atama düzenleyicisi) yalnızca ADMIN+
    await loginAs(analyst.user);
    setWorkspace(c.tenantId);
    const actor = await getActor();
    expect(actor?.tenantId).toBe(c.tenantId);
    expect(actor?.role).toBe('VIEWER');
    const w = await call(createPrompt, { method: 'POST', body: { text: 'Analist yazmayı dener' } });
    expect(w.status).toBe(403);
    const members = await call(listMembers);
    expect(members.status).toBe(200);
    expect((members.json as J).workspaces).toHaveLength(0);
    // ANALYST için de e-posta maskesi yok (ekip içi)
    expect(JSON.stringify(members.json)).toContain(a.email);
  });

  it('roleOverride ANALYST: STRATEGIST atandığı müşteride salt-okunur olur', async () => {
    const a = await createAgency();
    const c = await createClientWs('Müşteri C');
    const strat = await addAgencyMember(a, 'STRATEGIST', false);
    await loginAs(a.user);
    expect(
      (
        await call(putAssignments, {
          method: 'PUT',
          params: { id: strat.membership.id },
          body: { workspaceIds: [c.workspaceId], roleOverride: 'ANALYST' },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await call(putAssignments, {
          method: 'PUT',
          params: { id: strat.membership.id },
          body: { workspaceIds: [c.workspaceId], roleOverride: 'OWNER' },
        })
      ).status,
    ).toBe(400);
    await loginAs(strat.user);
    setWorkspace(c.tenantId);
    const actor = await getActor();
    expect(actor?.role).toBe('VIEWER');
    expect(actor?.agency?.workspace?.roleOverride).toBe('ANALYST');
  });

  it('PAUSED çalışma alanında yazma 403 (workspace_paused), okuma serbest; ACTIVE olunca açılır', async () => {
    const a = await createAgency();
    const c = await createClientWs('Duraklat');
    expect(
      (await call(patchClient, { method: 'PATCH', params: { id: c.workspaceId }, body: { status: 'PAUSED' } })).status,
    ).toBe(200);
    setWorkspace(c.tenantId);
    const actor = await getActor();
    expect(actor?.entitlement.active).toBe(false);
    expect(actor?.entitlement.reason).toBe('workspace_paused');
    const w = await call(createPrompt, { method: 'POST', body: { text: 'Duraklatılmışa yazma' } });
    expect(w.status).toBe(403);
    expect(String((w.json as J).message)).toContain('duraklatılmış');
    setWorkspace(null);
    expect(
      (await call(patchClient, { method: 'PATCH', params: { id: c.workspaceId }, body: { status: 'ACTIVE' } })).status,
    ).toBe(200);
    setWorkspace(c.tenantId);
    expect((await call(createPrompt, { method: 'POST', body: { text: 'Artık yazılabilir soru' } })).status).toBe(201);
    await flushAfter();
    void a;
  });
});

describe('davet ve koltuk', () => {
  it("davet → e-posta (test outbox) → önizleme → yanlış kullanıcı 403 → kabul: kullanıcı ajans ev tenant'ına taşınır, atamalar oluşur", async () => {
    const a = await createAgency('Davetçi');
    const c = await createClientWs('Atanacak');
    const guest = await createTenant();
    const inv = await call(createInvite, {
      method: 'POST',
      body: { email: guest.email.toUpperCase(), role: 'STRATEGIST', workspaceIds: [c.workspaceId] },
    });
    expect(inv.status).toBe(201);
    expect((inv.json as J).delivery).toBe('email');
    const mail = drainOutbox().find((m) => m.kind === 'agency_invite')!;
    const token = mail.body.match(/\/agency\/invite\/([A-Za-z0-9_-]+)/)![1]!;
    expect(JSON.stringify(inv.json)).not.toContain(token);
    const preview = await call(previewInvite, { url: `/api/agency/invites/preview?token=${token}` });
    expect(preview.status).toBe(200);
    expect((preview.json as J).role).toBe('STRATEGIST');
    expect((preview.json as J).agencyName).toBe('Davetçi');

    const other = await createTenant();
    await loginAs(other.user);
    expect((await call(acceptInvite, { method: 'POST', body: { token } })).status).toBe(403);

    await loginAs(guest.user);
    const acc = await call(acceptInvite, { method: 'POST', body: { token } });
    expect(acc.status).toBe(200);
    expect(acc.headers.get('set-cookie')).toContain('iai_token=');
    const moved = await prisma.user.findUniqueOrThrow({ where: { id: guest.user.id } });
    expect(moved.tenantId).toBe(a.tenant.id);
    expect(await prisma.tenant.count({ where: { id: guest.tenant.id } })).toBe(0);
    const m = await prisma.agencyMembership.findFirstOrThrow({
      where: { agencyId: a.agencyId, userId: guest.user.id },
      include: { access: true },
    });
    expect(m.role).toBe('STRATEGIST');
    expect(m.allClients).toBe(false);
    expect(m.access.map((x) => x.workspaceId)).toEqual([c.workspaceId]);
    // Tek kullanımlık
    await loginAs(guest.user);
    expect((await call(acceptInvite, { method: 'POST', body: { token } })).status).toBe(404);
    // Ajans üyesi olarak çerez ile müşteriye erişir ve yazabilir (STRATEGIST → ADMIN)
    setWorkspace(c.tenantId);
    const actor = await getActor();
    expect(actor?.tenantId).toBe(c.tenantId);
    expect(actor?.role).toBe('ADMIN');
  });

  it('koltuk sınırı (LAUNCH 5): 5 aktif üyede davet 403 plan_limit; ANALYST davet edemez', async () => {
    const a = await createAgency();
    for (let i = 0; i < 4; i++) await addAgencyMember(a, 'ANALYST');
    await loginAs(a.user);
    const r = await call(createInvite, { method: 'POST', body: { email: 'yeni@test.local', role: 'ANALYST' } });
    expect(r.status).toBe(403);
    expect((r.json as J).code).toBe('plan_limit');
    const analyst = await prisma.agencyMembership.findFirstOrThrow({
      where: { agencyId: a.agencyId, role: 'ANALYST' },
      include: { user: true },
    });
    await loginAs(analyst.user);
    expect(
      (await call(createInvite, { method: 'POST', body: { email: 'x@test.local', role: 'ANALYST' } })).status,
    ).toBe(403);
  });
});

describe('mevcut marka hesabını bağlama', () => {
  it("marka OWNER kabul → workspace; VIEWER 403; ajans ev tenant'ı 403; tekrar kullanım 404", async () => {
    const a = await createAgency('Bağlayan');
    const lr = await call(createLink, { method: 'POST', body: {} });
    expect(lr.status).toBe(201);
    const token = String((lr.json as J).link).match(/\/agency\/link\/([A-Za-z0-9_-]+)/)![1]!;

    // Ajans ev tenant'ı (kind AGENCY) kabul edemez
    expect((await call(acceptLink, { method: 'POST', body: { token } })).status).toBe(403);

    const brand = await createTenant();
    const viewer = await addMember(brand.tenant.id, 'VIEWER');
    await loginAs(viewer);
    expect((await call(acceptLink, { method: 'POST', body: { token } })).status).toBe(403);

    await loginAs(brand.user);
    const ok = await call(acceptLink, { method: 'POST', body: { token } });
    expect(ok.status).toBe(200);
    const ws = await prisma.agencyWorkspace.findUniqueOrThrow({ where: { tenantId: brand.tenant.id } });
    expect(ws.agencyId).toBe(a.agencyId);
    expect((await call(acceptLink, { method: 'POST', body: { token } })).status).toBe(404);

    // Ajans, bağlanan hesabı çerezle açabilir; marka OWNER'ına özel işlem (directOnly) ajans üzerinden yasak
    await loginAs(a.user);
    setWorkspace(brand.tenant.id);
    const actor = await getActor();
    expect(actor?.tenantId).toBe(brand.tenant.id);
    expect(actor?.viaAgency).toBe(true);
    expect((await call(convertAgency, { method: 'POST', body: { name: 'X' } })).status).toBe(403);
  });
});

describe('sahiplik ve üyelik', () => {
  it('sahiplik devri: hedef OWNER, eski sahip ADMIN, çerez yenilenir; son sahip düşürülemez; ADMIN devredemez', async () => {
    const a = await createAgency();
    const admin = await addAgencyMember(a, 'ADMIN', true);
    // Son sahip korunur
    const owner = await prisma.agencyMembership.findFirstOrThrow({
      where: { agencyId: a.agencyId, userId: a.user.id },
    });
    expect(
      (await call(patchMember, { method: 'PATCH', params: { id: owner.id }, body: { role: 'ANALYST' } })).status,
    ).toBe(409);
    // ADMIN devredemez
    await loginAs(admin.user);
    expect((await call(transferOwnership, { method: 'POST', params: { id: owner.id } })).status).toBe(403);
    // OWNER devreder
    await loginAs(a.user);
    const tr = await call(transferOwnership, { method: 'POST', params: { id: admin.membership.id } });
    expect(tr.status).toBe(200);
    expect(tr.headers.get('set-cookie')).toContain('iai_token=');
    expect((await prisma.agencyMembership.findUniqueOrThrow({ where: { id: admin.membership.id } })).role).toBe(
      'OWNER',
    );
    expect((await prisma.agencyMembership.findUniqueOrThrow({ where: { id: owner.id } })).role).toBe('ADMIN');
    // Eski oturum (eski sv) geçersiz; yeniden giriş sonrası ADMIN olarak ajansı görür
    expect((await call(agencySummary)).status).toBe(401);
    await loginAs(a.user);
    expect((((await call(agencySummary)).json as J).me as J).role).toBe('ADMIN');
    expect(await prisma.auditLog.count({ where: { action: 'agency.ownership_transfer' } })).toBe(1);
  });

  it('PATCH /api/agency profil günceller (ADMIN+); ANALYST 403', async () => {
    const a = await createAgency('Eski Ad');
    const r = await call(patchAgency, { method: 'PATCH', body: { name: 'Yeni Ad', website: 'yeni.example' } });
    expect(r.status).toBe(200);
    expect((await prisma.tenant.findUniqueOrThrow({ where: { id: a.tenant.id } })).name).toBe('Yeni Ad');
    const analyst = await addAgencyMember(a, 'ANALYST');
    await loginAs(analyst.user);
    expect((await call(patchAgency, { method: 'PATCH', body: { name: 'Hack' } })).status).toBe(403);
  });
});

describe('unlink ve Realtime güvenliği', () => {
  it('bağlantı kesildikten sonra tenant verisi durur; ADMIN unlink yapamaz (OWNER şart)', async () => {
    const a = await createAgency();
    const c = await createClientWs('Kesilecek');
    setWorkspace(c.tenantId);
    expect((await call(createPrompt, { method: 'POST', body: { text: 'Kalıcı soru burada' } })).status).toBe(201);
    await flushAfter();
    setWorkspace(null);
    const admin = await addAgencyMember(a, 'ADMIN', true);
    await loginAs(admin.user);
    expect((await call(unlinkClient, { method: 'DELETE', params: { id: c.workspaceId } })).status).toBe(403);
    await loginAs(a.user);
    const r = await call(unlinkClient, { method: 'DELETE', params: { id: c.workspaceId } });
    expect(r.status).toBe(200);
    expect((r.json as J).orphan).toBe(true);
    expect(await prisma.agencyWorkspace.count({ where: { id: c.workspaceId } })).toBe(0);
    expect(await prisma.tenant.count({ where: { id: c.tenantId } })).toBe(1);
    expect(await prisma.prompt.count({ where: { tenantId: c.tenantId } })).toBe(1);
    // Çerez artık geçersiz → ev tenant'ına düşer
    setWorkspace(c.tenantId);
    expect((await getActor())?.tenantId).toBe(a.tenant.id);
  });

  it("agency:<id> topic'ine agency.changed yayını var; payload'da e-posta/token yok", async () => {
    const a = await createAgency();
    const c = await createClientWs('Yayın');
    await call(patchClient, { method: 'PATCH', params: { id: c.workspaceId }, body: { status: 'PAUSED' } });
    const rows = await realtimeMessages(`agency:${a.agencyId}`, 'agency.changed');
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const statuses = rows.map((r) => (r.payload as J).status);
    expect(statuses).toContain('client_created');
    expect(statuses).toContain('workspace_paused');
    const all = JSON.stringify(rows.map((r) => r.payload));
    expect(all).not.toContain('@');
    expect(all).not.toMatch(/token|email|secret/i);
    // Başka ajansın topic'ine hiçbir şey yazılmadı
    const b = await createAgency('Diğer');
    expect(await realtimeMessages(`agency:${b.agencyId}`, 'agency.changed')).toHaveLength(0);
  });
});

describe('cross-tenant izolasyon', () => {
  it("ajans A üyesi, ajans B müşterisinin tenantId'sini çerezle verse de erişemez; müşteri işlemleri 404", async () => {
    const b = await createAgency('B');
    const cb = await createClientWs('B Müşterisi');
    logout();
    const a = await createAgency('A');
    setWorkspace(cb.tenantId);
    const actor = await getActor();
    expect(actor?.tenantId).toBe(a.tenant.id);
    expect(actor?.agency?.workspace).toBeNull();
    expect((await call(setWorkspaceRoute, { method: 'POST', body: { tenantId: cb.tenantId } })).status).toBe(404);
    setWorkspace(null);
    expect(
      (await call(patchClient, { method: 'PATCH', params: { id: cb.workspaceId }, body: { status: 'PAUSED' } })).status,
    ).toBe(404);
    expect((await call(unlinkClient, { method: 'DELETE', params: { id: cb.workspaceId } })).status).toBe(404);
    expect(((await call(listClients)).json as J).cards).toHaveLength(0);
    // B'nin verisi dokunulmadı
    expect((await prisma.agencyWorkspace.findUniqueOrThrow({ where: { id: cb.workspaceId } })).status).toBe('ACTIVE');
    void b;
  });
});

describe('rapor paylaşım linkleri', () => {
  it('oluştur (link bir kez) → public GET 200 (PII yok) → görüntülenme sayılır → iptal 410 → süresi dolmuş 410 → yok 404', async () => {
    const brand = await createTenant();
    await prisma.brand.create({ data: { tenantId: brand.tenant.id, name: 'Paylaşılan Marka', isOwn: true } });
    await loginAs(brand.user);
    const created = await call(createShare, {
      method: 'POST',
      body: { rangeDays: 30, label: 'Eylül', expiresInDays: 30 },
    });
    expect(created.status).toBe(201);
    const link = String((created.json as J).link);
    const token = link.match(/\/share\/([A-Za-z0-9_-]+)$/)![1]!;
    expect(token.length).toBeGreaterThanOrEqual(40);
    const shareId = String(((created.json as J).share as J).id);
    const row = await prisma.reportShare.findUniqueOrThrow({ where: { id: shareId } });
    expect(row.tokenHash).toHaveLength(64);
    expect(row.tokenHash).not.toContain(token.slice(0, 12));

    // Liste token içermez
    const list = await call(listShares);
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.json)).not.toContain(token);
    expect((list.json as J).limit).toBe(10);

    logout();
    const pub = await call(publicShare, { params: { token } });
    expect(pub.status).toBe(200);
    expect((pub.json as J).brandName).toBe('Paylaşılan Marka');
    expect((pub.json as J).poweredBy).toBe('Independent AI');
    expect(pub.headers.get('x-robots-tag')).toContain('noindex');
    const body = JSON.stringify(pub.json);
    expect(body).not.toContain(brand.email);
    expect(body).not.toMatch(/responseText|email|token/i);
    expect((await prisma.reportShare.findUniqueOrThrow({ where: { id: shareId } })).views).toBe(1);

    await loginAs(brand.user);
    expect((await call(revokeShare, { method: 'DELETE', params: { id: shareId } })).status).toBe(200);
    logout();
    expect((await call(publicShare, { params: { token } })).status).toBe(410);

    await loginAs(brand.user);
    const c2 = await call(createShare, { method: 'POST', body: { rangeDays: 7 } });
    const token2 = String((c2.json as J).link).match(/\/share\/([A-Za-z0-9_-]+)$/)![1]!;
    await prisma.reportShare.update({
      where: { id: String(((c2.json as J).share as J).id) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    logout();
    expect((await call(publicShare, { params: { token: token2 } })).status).toBe(410);
    expect((await call(publicShare, { params: { token: 'a'.repeat(43) } })).status).toBe(404);
  });

  it("doğrulama: aralık 7|30|90, süre ≤90 gün; VIEWER 403; ajans ev tenant'ında 403; ajans üyesi müşteri bağlamında oluşturur (ajans limiti)", async () => {
    const brand = await createTenant();
    await loginAs(brand.user);
    expect((await call(createShare, { method: 'POST', body: { rangeDays: 15 } })).status).toBe(400);
    expect((await call(createShare, { method: 'POST', body: { rangeDays: 30, expiresInDays: 120 } })).status).toBe(400);
    expect(
      (
        await call(createShare, {
          method: 'POST',
          body: { rangeDays: 30, expiresAt: new Date(Date.now() + 120 * 86_400_000).toISOString() },
        })
      ).status,
    ).toBe(400);
    const viewer = await addMember(brand.tenant.id, 'VIEWER');
    await loginAs(viewer);
    expect((await call(createShare, { method: 'POST', body: { rangeDays: 30 } })).status).toBe(403);
    expect((await call(listShares)).status).toBe(200);

    logout();
    const a = await createAgency();
    expect((await call(createShare, { method: 'POST', body: { rangeDays: 30 } })).status).toBe(403);
    expect((await call(listShares)).status).toBe(403);
    const c = await createClientWs('Rapor Müşterisi');
    setWorkspace(c.tenantId);
    const r = await call(createShare, { method: 'POST', body: { rangeDays: 90, label: 'Ajans raporu' } });
    expect(r.status).toBe(201);
    expect(((await call(listShares)).json as J).limit).toBe(20);
    void a;
  });
});
