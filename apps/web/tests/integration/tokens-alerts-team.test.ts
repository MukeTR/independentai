import { describe, expect, it } from 'vitest';
import { addMember, call, createTenant, loginAs, prisma } from './helpers';
import { POST as createToken, DELETE as revokeToken } from '@/app/api/api-tokens/route';
import { GET as v1Visibility } from '@/app/api/v1/visibility/route';
import { GET as getAlerts, PUT as putAlerts } from '@/app/api/alerts/route';
import { POST as invite, GET as previewInvite } from '@/app/api/team/invites/route';
import { POST as accept } from '@/app/api/team/accept/route';
import { PATCH as changeRole, DELETE as removeMember } from '@/app/api/team/members/[id]/route';
import { POST as deleteAccount } from '@/app/api/account/delete/route';
import { GET as exportAccount } from '@/app/api/account/export/route';
import { drainOutbox } from '@/server/mailer';
import { consume, clientIp } from '@/server/rate-limit';
import { NextRequest } from 'next/server';

describe('API token yaşam döngüsü', () => {
  it('oluştur → kullan (rate limit başlıkları) → iptal → 401; süresi dolmuş → 401', async () => {
    const { user } = await createTenant();
    await loginAs(user);
    const created = await call(createToken, { method: 'POST', body: { name: 'Zapier', expiresInDays: 30 } });
    expect(created.status).toBe(201);
    const token = String(created.json.token);

    expect((await call(v1Visibility, { url: '/api/v1/visibility?days=7' })).status).toBe(401);
    expect(
      (await call(v1Visibility, { headers: { authorization: 'Bearer iai_live_yanlis_token_degeri_1234567' } })).status,
    ).toBe(401);
    const ok = await call(v1Visibility, {
      url: '/api/v1/visibility?days=7',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(ok.status).toBe(200);
    expect(ok.json.window_days).toBe(7);
    expect(ok.headers.get('x-ratelimit-limit')).toBe('60');
    expect(ok.headers.get('access-control-allow-origin')).toBe('*');
    expect(ok.json).toHaveProperty('errored_runs');

    const rev = await call(revokeToken, { method: 'DELETE', url: `/api/api-tokens?id=${created.json.id}` });
    expect(rev.status).toBe(200);
    expect((await call(v1Visibility, { headers: { authorization: `Bearer ${token}` } })).status).toBe(401);
    // audit izi
    expect(await prisma.auditLog.count({ where: { action: 'api_token.revoke' } })).toBe(1);

    const t2 = await call(createToken, { method: 'POST', body: { name: 'Eski' } });
    await prisma.apiToken.update({
      where: { id: String(t2.json.id) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await call(v1Visibility, { headers: { authorization: `Bearer ${t2.json.token}` } })).status).toBe(401);
  });

  it("token DB'de yalnızca hash olarak durur", async () => {
    const { user } = await createTenant();
    await loginAs(user);
    const created = await call(createToken, { method: 'POST', body: { name: 'x' } });
    const rec = await prisma.apiToken.findUniqueOrThrow({ where: { id: String(created.json.id) } });
    expect(rec.tokenHash).not.toContain(String(created.json.token).slice(9, 20));
    expect(rec.tokenHash).toHaveLength(64);
  });
});

describe('rate limit (DB tabanlı)', () => {
  it('limit+1. istek reddedilir; farklı anahtar bağımsız; pencere sıfırlanır', async () => {
    const key = `test:${Date.now()}`;
    for (let i = 0; i < 3; i++) expect((await consume(key, 3, 60_000)).allowed).toBe(true);
    expect((await consume(key, 3, 60_000)).allowed).toBe(false);
    expect((await consume(`${key}-other`, 3, 60_000)).allowed).toBe(true);
    await prisma.rateLimitBucket.update({ where: { key }, data: { resetAt: new Date(Date.now() - 1) } });
    const r = await consume(key, 3, 60_000);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(2);
  });
  it('clientIp önceliği: cf-connecting-ip > x-real-ip > x-forwarded-for > anonim parmak izi', () => {
    const mk = (h: Record<string, string>) => new NextRequest('http://x/', { headers: h });
    expect(clientIp(mk({ 'cf-connecting-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' }))).toBe('1.1.1.1');
    expect(clientIp(mk({ 'x-real-ip': '3.3.3.3', 'x-forwarded-for': '2.2.2.2, 9.9.9.9' }))).toBe('3.3.3.3');
    expect(clientIp(mk({ 'x-forwarded-for': '2.2.2.2, 9.9.9.9' }))).toBe('2.2.2.2');
    expect(clientIp(mk({ 'user-agent': 'ua' }))).toMatch(/^anon-/);
  });
});

describe('uyarı ayarları ve Slack webhook', () => {
  it('webhook şifreli saklanır, GET maskeli döner, geçersiz host 400, kaldırma çalışır', async () => {
    const { user, tenant } = await createTenant();
    await loginAs(user);
    const hook = 'https://hooks.slack.com/services/T000/B000/gizlisecretdeger';
    const put = await call(putAlerts, { method: 'PUT', body: { slackWebhookUrl: hook, visibilityDropThreshold: 20 } });
    expect(put.status).toBe(200);
    expect(put.json.slackConfigured).toBe(true);
    expect(JSON.stringify(put.json)).not.toContain('gizlisecretdeger');
    const row = await prisma.alertConfig.findUniqueOrThrow({ where: { tenantId: tenant.id } });
    expect(row.slackWebhookEncrypted).toBe(true);
    expect(row.slackWebhookUrl).not.toContain('hooks.slack.com');
    const get = await call(getAlerts);
    expect(get.json.visibilityDropThreshold).toBe(20);
    expect(get.json).not.toHaveProperty('slackWebhookUrl');
    expect(
      (await call(putAlerts, { method: 'PUT', body: { slackWebhookUrl: 'https://evil.example.com/hook' } })).status,
    ).toBe(400);
    expect((await call(putAlerts, { method: 'PUT', body: { visibilityDropThreshold: 0 } })).status).toBe(400);
    const test = await call(putAlerts, { method: 'PUT', body: { testSlack: true } });
    expect(test.json.testResult).toBe('sent');
    expect(drainOutbox().some((m) => m.channel === 'slack')).toBe(true);
    const clear = await call(putAlerts, { method: 'PUT', body: { slackWebhookUrl: null } });
    expect(clear.json.slackConfigured).toBe(false);
  });
});

describe('ekip', () => {
  it("davet → kabul: kullanıcı yeni tenant'a taşınır, eski tek-kişilik tenant silinir, rol atanır", async () => {
    const host = await createTenant();
    const guest = await createTenant();
    await loginAs(host.user);
    const inv = await call(invite, { method: 'POST', body: { email: guest.email.toUpperCase(), role: 'ADMIN' } });
    expect(inv.status).toBe(201);
    expect(inv.json.delivery).toBe('email');
    const mail = drainOutbox().find((m) => m.kind === 'invite')!;
    const token = mail.body.match(/token=([A-Za-z0-9_-]+)/)![1]!;
    const preview = await call(previewInvite, { url: `/api/team/invites?token=${token}` });
    expect(preview.json.role).toBe('ADMIN');

    // yanlış kullanıcı kabul edemez
    const other = await createTenant();
    await loginAs(other.user);
    expect((await call(accept, { method: 'POST', body: { token } })).status).toBe(403);

    await loginAs(guest.user);
    const acc = await call(accept, { method: 'POST', body: { token } });
    expect(acc.status).toBe(200);
    const moved = await prisma.user.findUniqueOrThrow({ where: { id: guest.user.id } });
    expect(moved.tenantId).toBe(host.tenant.id);
    expect(moved.role).toBe('ADMIN');
    expect(await prisma.tenant.count({ where: { id: guest.tenant.id } })).toBe(0);
    // eski çerez artık geçersiz (tenant + sessionVersion değişti) → 401; yeniden girişte token tek kullanımlık → 404
    expect((await call(accept, { method: 'POST', body: { token } })).status).toBe(401);
    await loginAs(guest.user);
    expect((await call(accept, { method: 'POST', body: { token } })).status).toBe(404);
  });

  it("son OWNER düşürülemez/çıkarılamaz; ADMIN OWNER'ı çıkaramaz; kendini çıkaramaz", async () => {
    const { user: owner, tenant } = await createTenant();
    const admin = await addMember(tenant.id, 'ADMIN');
    await loginAs(owner);
    expect(
      (await call(changeRole, { method: 'PATCH', body: { role: 'VIEWER' }, params: { id: owner.id } })).status,
    ).toBe(409);
    expect((await call(removeMember, { method: 'DELETE', params: { id: owner.id } })).status).toBe(400);
    await loginAs(admin);
    expect((await call(removeMember, { method: 'DELETE', params: { id: owner.id } })).status).toBe(403);
    expect(
      (await call(changeRole, { method: 'PATCH', body: { role: 'VIEWER' }, params: { id: owner.id } })).status,
    ).toBe(403);
    await loginAs(owner);
    expect((await call(removeMember, { method: 'DELETE', params: { id: admin.id } })).status).toBe(200);
    const moved = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
    expect(moved.tenantId).not.toBe(tenant.id);
  });

  it('üye sınırı aşılınca 403 plan_limit', async () => {
    const { user, tenant } = await createTenant();
    for (let i = 0; i < 4; i++) await addMember(tenant.id, 'VIEWER');
    await loginAs(user);
    const r = await call(invite, { method: 'POST', body: { email: 'yeni@test.local', role: 'VIEWER' } });
    expect(r.status).toBe(403);
    expect(r.json.code).toBe('plan_limit');
  });
});

describe('hesap silme ve dışa aktarma', () => {
  it('export JSON döner; silme onay ifadesi ister ve tüm veriyi kaldırır', async () => {
    const { user, tenant } = await createTenant();
    await prisma.prompt.create({ data: { tenantId: tenant.id, text: 'Silinecek soru burada' } });
    await prisma.apiToken.create({ data: { tenantId: tenant.id, name: 't', tokenHash: 'h'.repeat(64), prefix: 'p' } });
    await loginAs(user);
    const exp = await call(exportAccount);
    expect(exp.status).toBe(200);
    expect(exp.headers.get('content-disposition')).toContain('attachment');
    expect((exp.json as unknown as { prompts: unknown[] }).prompts).toHaveLength(1);
    expect((await call(deleteAccount, { method: 'POST', body: { confirm: 'hayır' } })).status).toBe(400);
    expect((await call(deleteAccount, { method: 'POST', body: { confirm: 'HESABIMI SİL' } })).status).toBe(200);
    expect(await prisma.tenant.count({ where: { id: tenant.id } })).toBe(0);
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(0);
    expect(await prisma.apiToken.count({ where: { tenantId: tenant.id } })).toBe(0);
  });
});
