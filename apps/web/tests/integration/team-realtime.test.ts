/**
 * Ekip ürünleştirme + Realtime yayınları.
 *  - Davet yeniden gönderme / iptal, sahiplik devri, son sahip koruması.
 *  - Aktivite akışı (tenant izolasyonu, imleç, e-posta/IP sızmaz).
 *  - `realtime.messages` stub'unda team.changed / run.completed / batch.completed / notification.delivered.
 *  - Kuyruk: PAUSED/ARCHIVED çalışma alanı promptları kuyruğa girmez; kira (lease) karşılaştırması saat
 *    dilimine bağımlı değildir.
 */
import { describe, expect, it } from 'vitest';
import { addMember, call, createTenant, loginAs, prisma, uniq } from './helpers';
import { POST as invite, GET as previewInvite, DELETE as cancelInvite } from '@/app/api/team/invites/route';
import { POST as resendInvite } from '@/app/api/team/invites/[id]/resend/route';
import { POST as transfer } from '@/app/api/team/transfer/route';
import { GET as getTeam } from '@/app/api/team/route';
import { PATCH as changeRole, DELETE as removeMember } from '@/app/api/team/members/[id]/route';
import { GET as activity } from '@/app/api/activity/route';
import { drainOutbox, sendEmail, sendSlack } from '@/server/mailer';
import { enqueueDailyRuns, processQueue, runDuePrompts, runPromptOnce } from '@/server/run-prompt';
import { hashPassword } from '@/server/password';

type Msg = { topic: string; event: string | null; payload: Record<string, unknown> };
async function messages(topic: string, event?: string): Promise<Msg[]> {
  const rows = await prisma.$queryRawUnsafe<Msg[]>(
    'select topic, event, payload from realtime.messages where topic = $1 order by id asc',
    topic,
  );
  return event ? rows.filter((r) => r.event === event) : rows;
}
function tokenFromOutbox(): string {
  const mail = drainOutbox().find((m) => m.kind === 'invite');
  expect(mail).toBeTruthy();
  return mail!.body.match(/token=([A-Za-z0-9_-]+)/)![1]!;
}

async function seedBrand() {
  const { user, tenant } = await createTenant();
  await prisma.brand.create({ data: { tenantId: tenant.id, name: 'KarPanel', isOwn: true } });
  await prisma.competitor.create({ data: { tenantId: tenant.id, name: 'Adisyo' } });
  const prompt = await prisma.prompt.create({ data: { tenantId: tenant.id, text: 'En iyi POS yazılımı hangisi?' } });
  return { user, tenant, prompt };
}

/** Ajans ev tenant'ı + üyelik + verilen durumda bir müşteri çalışma alanı (kendi promptuyla). */
async function seedAgencyClient(status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED') {
  const home = await prisma.tenant.create({
    data: {
      name: `Ajans-${uniq('ag')}`,
      kind: 'AGENCY',
      trialEndsAt: new Date(Date.now() + 90 * 86_400_000),
      onboardingCompletedAt: new Date(),
    },
  });
  const owner = await prisma.user.create({
    data: {
      tenantId: home.id,
      email: `${uniq('agowner')}@test.local`,
      passwordHash: hashPassword('sifre1234'),
      role: 'OWNER',
      emailVerifiedAt: new Date(),
    },
  });
  const agency = await prisma.agencyAccount.create({ data: { tenantId: home.id, name: home.name } });
  await prisma.agencyMembership.create({
    data: { agencyId: agency.id, userId: owner.id, role: 'OWNER', allClients: true },
  });
  const client = await createTenant();
  await prisma.brand.create({ data: { tenantId: client.tenant.id, name: 'Müşteri', isOwn: true } });
  const prompt = await prisma.prompt.create({
    data: { tenantId: client.tenant.id, text: `Müşteri sorusu ${uniq('q')} burada` },
  });
  const ws = await prisma.agencyWorkspace.create({ data: { agencyId: agency.id, tenantId: client.tenant.id, status } });
  return { home, owner, agency, client, prompt, ws };
}

describe('davetler: yeniden gönder / iptal', () => {
  it('yeniden gönderim yeni token üretir, eski link geçersiz olur; team.changed yayını e-postasız; audit yazılır', async () => {
    const host = await createTenant();
    const other = await createTenant();
    await loginAs(host.user);
    const created = await call(invite, { method: 'POST', body: { email: 'davetli-gizli@test.local', role: 'VIEWER' } });
    expect(created.status).toBe(201);
    const token1 = tokenFromOutbox();

    const resent = await call(resendInvite, { method: 'POST', params: { id: String(created.json.inviteId) } });
    expect(resent.status).toBe(200);
    expect(resent.json.delivery).toBe('email');
    const token2 = tokenFromOutbox();
    expect(token2).not.toBe(token1);

    expect((await call(previewInvite, { url: `/api/team/invites?token=${token1}` })).status).toBe(400);
    const ok = await call(previewInvite, { url: `/api/team/invites?token=${token2}` });
    expect(ok.status).toBe(200);
    expect(ok.json.role).toBe('VIEWER');

    // Süre 7 güne uzatıldı, satır aynı
    const row = await prisma.teamInvite.findUniqueOrThrow({ where: { id: String(created.json.inviteId) } });
    expect(row.expiresAt.getTime()).toBeGreaterThan(Date.now() + 6.9 * 86_400_000);

    // Realtime: doğru tenant topic'i, statüler, payload'da e-posta yok
    const evs = await messages(`tenant:${host.tenant.id}`, 'team.changed');
    const statuses = evs.map((e) => e.payload.status);
    expect(statuses).toContain('invite_sent');
    expect(statuses).toContain('invite_resent');
    for (const e of evs) {
      expect(JSON.stringify(e.payload)).not.toMatch(/@|davetli-gizli/);
      expect(e.payload.entityId).toBe(String(created.json.inviteId));
      expect(typeof e.payload.eventId).toBe('string');
    }
    expect(await messages(`tenant:${other.tenant.id}`)).toHaveLength(0);

    // Audit
    expect(await prisma.auditLog.count({ where: { tenantId: host.tenant.id, action: 'member.invite' } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { tenantId: host.tenant.id, action: 'member.invite_resend' } })).toBe(
      1,
    );

    // İptal → link geçersiz, audit + yayın
    const del = await call(cancelInvite, { method: 'DELETE', url: `/api/team/invites?id=${created.json.inviteId}` });
    expect(del.status).toBe(200);
    expect((await call(previewInvite, { url: `/api/team/invites?token=${token2}` })).status).toBe(400);
    expect(await prisma.auditLog.count({ where: { tenantId: host.tenant.id, action: 'member.invite_cancel' } })).toBe(
      1,
    );
    expect((await messages(`tenant:${host.tenant.id}`, 'team.changed')).map((e) => e.payload.status)).toContain(
      'invite_cancelled',
    );
    // Silinen davet yeniden gönderilemez
    expect((await call(resendInvite, { method: 'POST', params: { id: String(created.json.inviteId) } })).status).toBe(
      404,
    );
  });

  it('süresi dolmuş davet listede "expired" görünür ve yeniden gönderilebilir; başka tenant\'ın daveti 404', async () => {
    const host = await createTenant();
    const other = await createTenant();
    await loginAs(host.user);
    const created = await call(invite, { method: 'POST', body: { email: 'eski@test.local', role: 'ADMIN' } });
    drainOutbox();
    await prisma.teamInvite.update({
      where: { id: String(created.json.inviteId) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const list = await call(getTeam);
    const inv = (list.json.invites as unknown as { id: string; status: string }[]).find(
      (i) => i.id === created.json.inviteId,
    );
    expect(inv?.status).toBe('expired');
    expect(list.json.realtime).toBe(false);
    expect((list.json.me as unknown as { tenantId: string }).tenantId).toBe(host.tenant.id);

    await loginAs(other.user);
    expect((await call(resendInvite, { method: 'POST', params: { id: String(created.json.inviteId) } })).status).toBe(
      404,
    );

    await loginAs(host.user);
    expect((await call(resendInvite, { method: 'POST', params: { id: String(created.json.inviteId) } })).status).toBe(
      200,
    );
    const after = await call(getTeam);
    const inv2 = (after.json.invites as unknown as { id: string; status: string }[]).find(
      (i) => i.id === created.json.inviteId,
    );
    expect(inv2?.status).toBe('pending');
  });
});

describe('sahiplik devri', () => {
  it('roller değişir, iki sessionVersion artar, eski çerez 401, yeni çerez yanıtla verilir; yayın + audit', async () => {
    const { user: owner, tenant } = await createTenant();
    const admin = await addMember(tenant.id, 'ADMIN');
    await loginAs(owner);

    const r = await call(transfer, { method: 'POST', body: { userId: admin.id } });
    expect(r.status).toBe(200);
    expect(r.json.newOwnerId).toBe(admin.id);
    expect(r.json.role).toBe('ADMIN');
    expect(r.headers.get('set-cookie') ?? '').toContain('iai_token=');

    const [o2, a2] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: owner.id } }),
      prisma.user.findUniqueOrThrow({ where: { id: admin.id } }),
    ]);
    expect(o2.role).toBe('ADMIN');
    expect(a2.role).toBe('OWNER');
    expect(o2.sessionVersion).toBe(owner.sessionVersion + 1);
    expect(a2.sessionVersion).toBe(admin.sessionVersion + 1);

    // Eski çerez (eski sv) artık geçersiz
    expect((await call(getTeam)).status).toBe(401);
    await loginAs(owner);
    const me = await call(getTeam);
    expect(me.status).toBe(200);
    expect((me.json.me as unknown as { role: string }).role).toBe('ADMIN');

    const evs = await messages(`tenant:${tenant.id}`, 'team.changed');
    const ev = evs.find((e) => e.payload.status === 'ownership_transferred');
    expect(ev?.payload.entityId).toBe(admin.id);
    expect(JSON.stringify(ev?.payload)).not.toContain('@');
    expect(await prisma.auditLog.count({ where: { tenantId: tenant.id, action: 'owner.transfer' } })).toBe(1);
  });

  it('VIEWER ve ADMIN 403; kendine devir 400; zaten sahip 409; başka tenant üyesi 404; doğrulanmamış e-posta 409', async () => {
    const { user: owner, tenant } = await createTenant();
    const admin = await addMember(tenant.id, 'ADMIN');
    const viewer = await addMember(tenant.id, 'VIEWER');
    const stranger = await createTenant();
    const unverified = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `${uniq('nv')}@test.local`,
        passwordHash: hashPassword('sifre1234'),
        role: 'VIEWER',
      },
    });

    await loginAs(viewer);
    expect((await call(transfer, { method: 'POST', body: { userId: admin.id } })).status).toBe(403);
    await loginAs(admin);
    expect((await call(transfer, { method: 'POST', body: { userId: viewer.id } })).status).toBe(403);

    await loginAs(owner);
    expect((await call(transfer, { method: 'POST', body: { userId: owner.id } })).status).toBe(400);
    expect((await call(transfer, { method: 'POST', body: {} })).status).toBe(400);
    expect((await call(transfer, { method: 'POST', body: { userId: stranger.user.id } })).status).toBe(404);
    expect((await call(transfer, { method: 'POST', body: { userId: unverified.id } })).status).toBe(409);
    // ikinci sahip yap, ona devretmeye çalış → zaten sahip
    expect(
      (await call(changeRole, { method: 'PATCH', body: { role: 'OWNER' }, params: { id: admin.id } })).status,
    ).toBe(200);
    expect((await call(transfer, { method: 'POST', body: { userId: admin.id } })).status).toBe(409);
    // Roller dokunulmadı
    expect((await prisma.user.findUniqueOrThrow({ where: { id: owner.id } })).role).toBe('OWNER');
  });
});

describe('son sahip koruması', () => {
  it('OWNER kendi rolünü düşüremez (iki sahip olsa da), tek OWNER çıkarılamaz; rol değişimi yayın + audit', async () => {
    const { user: owner, tenant } = await createTenant();
    const admin = await addMember(tenant.id, 'ADMIN');
    await loginAs(owner);
    expect(
      (await call(changeRole, { method: 'PATCH', body: { role: 'ADMIN' }, params: { id: owner.id } })).status,
    ).toBe(409);
    expect((await call(removeMember, { method: 'DELETE', params: { id: owner.id } })).status).toBe(400);

    // Admin'i de sahip yap → hâlâ kendi rolünü düşüremez (sahipliği devretmeli)
    expect(
      (await call(changeRole, { method: 'PATCH', body: { role: 'OWNER' }, params: { id: admin.id } })).status,
    ).toBe(200);
    expect(
      (await call(changeRole, { method: 'PATCH', body: { role: 'VIEWER' }, params: { id: owner.id } })).status,
    ).toBe(409);
    // Ama diğer sahibi düşürebilir (iki sahip var)
    expect(
      (await call(changeRole, { method: 'PATCH', body: { role: 'ADMIN' }, params: { id: admin.id } })).status,
    ).toBe(200);

    const evs = await messages(`tenant:${tenant.id}`, 'team.changed');
    expect(evs.filter((e) => e.payload.status === 'role_changed')).toHaveLength(2);
    const audits = await prisma.auditLog.findMany({ where: { tenantId: tenant.id, action: 'member.role_change' } });
    expect(audits).toHaveLength(2);
    expect(audits.every((a) => a.targetId === admin.id)).toBe(true);

    // Çıkarma → yayın + audit
    expect((await call(removeMember, { method: 'DELETE', params: { id: admin.id } })).status).toBe(200);
    expect(
      (await messages(`tenant:${tenant.id}`, 'team.changed')).some((e) => e.payload.status === 'member_removed'),
    ).toBe(true);
    expect(await prisma.auditLog.count({ where: { tenantId: tenant.id, action: 'member.remove' } })).toBe(1);
  });
});

describe('aktivite akışı', () => {
  it("tenant izolasyonu: başka tenant'ın olayı görünmez; imleçli sayfalama; e-posta/IP sızmaz", async () => {
    const a = await createTenant();
    const b = await createTenant();
    await loginAs(a.user);
    await call(invite, { method: 'POST', body: { email: 'gizli-adres@test.local', role: 'VIEWER' } });
    await call(invite, { method: 'POST', body: { email: 'ikinci-adres@test.local', role: 'ADMIN' } });
    drainOutbox();
    // Meta içinde kasıtlı hassas alanlar — dışa çıkmamalı
    await prisma.auditLog.create({
      data: {
        tenantId: a.tenant.id,
        actorUserId: a.user.id,
        action: 'brand.update',
        targetType: 'brand',
        targetId: 'b1',
        meta: { email: 'sizinti@test.local', ip: '10.9.8.7', token: 'iai_live_x', fields: ['name'] },
        ip: '203.0.113.99',
      },
    });

    await loginAs(b.user);
    const forB = await call(activity);
    expect(forB.status).toBe(200);
    expect((forB.json.items as unknown as unknown[]).length).toBe(0);

    await loginAs(a.user);
    const p1 = await call(activity, { url: '/api/activity?limit=2' });
    expect(p1.status).toBe(200);
    type ActivityItem = {
      id: string;
      action: string;
      actor: { id: string; name: string } | null;
      meta: Record<string, unknown> | null;
    };
    const items1 = p1.json.items as unknown as ActivityItem[];
    expect(items1).toHaveLength(2);
    expect(p1.json.nextCursor).toBeTruthy();
    const p2 = await call(activity, { url: `/api/activity?limit=2&cursor=${p1.json.nextCursor}` });
    const items2 = p2.json.items as unknown as ActivityItem[];
    expect(items2.length).toBeGreaterThanOrEqual(1);
    expect(new Set([...items1, ...items2].map((i) => i.id)).size).toBe(items1.length + items2.length);

    const text = p1.text + p2.text;
    expect(text).not.toContain(a.email);
    expect(text).not.toMatch(/gizli-adres|ikinci-adres|sizinti@|10\.9\.8\.7|203\.0\.113\.99|iai_live_x/);
    const brandEv = [...items1, ...items2].find((i) => i.action === 'brand.update');
    expect(brandEv?.meta).toEqual({ fields: ['name'] });
    expect(brandEv?.actor?.name).toMatch(/\*\*\*@/); // ad yok → maskelenmiş e-posta

    expect((await call(activity, { url: '/api/activity?cursor=%3C%3E' })).status).toBe(400);
    expect((await call(activity, { url: '/api/activity?limit=abc' })).status).toBe(200);
  });

  it('oturumsuz 401', async () => {
    expect((await call(activity)).status).toBe(401);
  });
});

describe('ölçüm yayınları', () => {
  it("runPromptOnce (mock) → her provider için run.completed; payload'da yanıt metni yok; yalnızca kendi tenant topic'i", async () => {
    const { tenant, prompt } = await seedBrand();
    const other = await createTenant();
    const r = await runPromptOnce(tenant.id, prompt.id, { origin: 'MANUAL' });
    expect((r as { runs?: unknown[] }).runs?.length).toBe(3);

    const evs = await messages(`tenant:${tenant.id}`, 'run.completed');
    expect(evs).toHaveLength(3);
    const providers = new Set(evs.map((e) => e.payload.provider));
    expect(providers.size).toBe(3);
    for (const e of evs) {
      expect(e.payload.entityId).toBe(prompt.id);
      expect(e.payload.status).toBe('SUCCESS');
      expect(typeof e.payload.jobId).toBe('string');
      expect(e.payload.origin).toBe('MANUAL');
      expect(e.payload).not.toHaveProperty('responseText');
      expect(JSON.stringify(e.payload)).not.toMatch(/KarPanel|Adisyo|En iyi POS/);
    }
    expect(await messages(`tenant:${other.tenant.id}`)).toHaveLength(0);
  });

  it("runDuePrompts → işlenen tenant'a batch.completed; PAUSED/ARCHIVED çalışma alanı promptları kuyruğa girmez", async () => {
    const brand = await seedBrand();
    const paused = await seedAgencyClient('PAUSED');
    const archived = await seedAgencyClient('ARCHIVED');
    const active = await seedAgencyClient('ACTIVE');

    const q = await enqueueDailyRuns();
    expect(q.enqueued).toBe(6); // brand (3) + aktif müşteri (3)
    expect(q.skippedTenants).toBe(2);
    expect(await prisma.modelRun.count({ where: { promptId: paused.prompt.id } })).toBe(0);
    expect(await prisma.modelRun.count({ where: { promptId: archived.prompt.id } })).toBe(0);
    expect(await prisma.modelRun.count({ where: { promptId: active.prompt.id } })).toBe(3);

    const res = await runDuePrompts({ deadlineAt: Date.now() + 60_000, triggeredBy: 'test' });
    expect(res.processed).toBe(6);
    expect(res.remaining).toBe(0);

    const b = await messages(`tenant:${brand.tenant.id}`, 'batch.completed');
    expect(b).toHaveLength(1);
    expect(b[0]!.payload.entityId).toBe(res.batchId);
    expect(b[0]!.payload.status).toBe('SUCCESS');
    expect(b[0]!.payload.processed).toBe(3);
    expect(b[0]!.payload.failed).toBe(0);
    // Ajans müşterisi: hem tenant hem ajans topic'ine (tenantId ile) düşer
    expect(await messages(`tenant:${active.client.tenant.id}`, 'batch.completed')).toHaveLength(1);
    const ag = await messages(`agency:${active.agency.id}`, 'batch.completed');
    expect(ag).toHaveLength(1);
    expect(ag[0]!.payload.tenantId).toBe(active.client.tenant.id);
    expect(await messages(`agency:${active.agency.id}`, 'run.completed')).toHaveLength(3);
    // Duraklatılmış müşteriye hiçbir yayın yok
    expect(await messages(`tenant:${paused.client.tenant.id}`)).toHaveLength(0);
    expect(await messages(`tenant:${archived.client.tenant.id}`)).toHaveLength(0);
  });

  it('claimRuns: kirası gelecekte olan RUNNING satır alınmaz, kirası geçmiş olan alınır (saat diliminden bağımsız)', async () => {
    const { prompt } = await seedBrand();
    await enqueueDailyRuns();
    await prisma.modelRun.updateMany({
      where: { promptId: prompt.id },
      data: { status: 'RUNNING', leaseExpiresAt: new Date(Date.now() + 90_000) },
    });
    const s1 = await processQueue({ deadlineAt: Date.now() + 60_000 });
    expect(s1.processed).toBe(0);
    expect(await prisma.modelRun.count({ where: { promptId: prompt.id, status: 'RUNNING' } })).toBe(3);

    await prisma.modelRun.updateMany({
      where: { promptId: prompt.id },
      data: { leaseExpiresAt: new Date(Date.now() - 1000) },
    });
    const s2 = await processQueue({ deadlineAt: Date.now() + 60_000 });
    expect(s2.processed).toBe(3);
    const rows = await prisma.modelRun.findMany({ where: { promptId: prompt.id } });
    expect(rows.every((r) => r.status === 'SUCCESS')).toBe(true);
    // Yeni kira / runDate UTC olarak "şimdi" civarında yazıldı (saat dilimi kayması yok)
    for (const r of rows) expect(Math.abs(r.runDate.getTime() - Date.now())).toBeLessThan(60_000);
  });
});

describe('bildirim yayınları', () => {
  it("sendEmail (outbox) → NotificationLog id ile notification.delivered; alıcı/e-posta payload'da yok", async () => {
    const { tenant } = await createTenant();
    const ok = await sendEmail({
      to: 'alici-kisi@test.local',
      subject: 'Test',
      html: '<p>x</p>',
      text: 'x',
      kind: 'weekly_report',
      tenantId: tenant.id,
    });
    expect(ok).toBe(true);
    const logRow = await prisma.notificationLog.findFirstOrThrow({
      where: { tenantId: tenant.id, kind: 'weekly_report' },
    });
    const evs = await messages(`tenant:${tenant.id}`, 'notification.delivered');
    expect(evs).toHaveLength(1);
    expect(evs[0]!.payload).toMatchObject({
      entityId: logRow.id,
      channel: 'email',
      status: 'sent',
      kind: 'weekly_report',
    });
    expect(JSON.stringify(evs[0]!.payload)).not.toMatch(/alici-kisi|@|recipient/);
    drainOutbox();
  });

  it("sendSlack (outbox) → channel slack; webhook adresi payload'da yok; geçersiz webhook → status failed yayını", async () => {
    const { tenant } = await createTenant();
    const hook = 'https://hooks.slack.com/services/T000/B000/gizlideger';
    expect(await sendSlack(hook, 'merhaba', { kind: 'drop_alert', tenantId: tenant.id })).toBe(true);
    expect(await sendSlack('https://evil.example.com/x', 'merhaba', { kind: 'drop_alert', tenantId: tenant.id })).toBe(
      false,
    );
    const evs = await messages(`tenant:${tenant.id}`, 'notification.delivered');
    expect(evs.map((e) => e.payload.status).sort()).toEqual(['failed', 'sent']);
    expect(evs.every((e) => e.payload.channel === 'slack')).toBe(true);
    expect(JSON.stringify(evs)).not.toMatch(/hooks\.slack|gizlideger|evil\.example/);
    drainOutbox();
  });
});
