import { describe, expect, it } from 'vitest';
import { call, createTenant, loginAs, logout, prisma, uniq } from './helpers';
import { POST as register } from '@/app/api/auth/register/route';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as me } from '@/app/api/auth/me/route';
import { POST as logoutAll } from '@/app/api/auth/logout-all/route';
import { POST as forgot } from '@/app/api/auth/forgot-password/route';
import { POST as reset } from '@/app/api/auth/reset-password/route';
import { PUT as verifyConfirm } from '@/app/api/auth/verify-email/route';
import { POST as changePassword } from '@/app/api/auth/change-password/route';
import { drainOutbox } from '@/server/mailer';
import { verifySession } from '@/server/jwt';

function cookieToken(headers: Headers): string | null {
  const raw = headers.get('set-cookie') ?? '';
  const m = raw.match(/iai_token=([^;]+)/);
  return m ? m[1]! : null;
}

describe('kayıt', () => {
  it('tenant + user + alertConfig tek transaction ile oluşur, doğrulama e-postası kuyruğa girer', async () => {
    const email = `${uniq('a')}@Test.Local`;
    const r = await call(register, {
      method: 'POST',
      body: { email, password: 'sifre1234', companyName: 'Acme', website: 'acme.com' },
    });
    expect(r.status).toBe(201);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, include: { tenant: true } });
    expect(user).not.toBeNull();
    expect(user!.role).toBe('OWNER');
    expect(user!.tenant.website).toBe('https://acme.com');
    expect(await prisma.alertConfig.count({ where: { tenantId: user!.tenantId } })).toBe(1);
    const tok = cookieToken(r.headers);
    expect(tok).toBeTruthy();
    expect((await verifySession(tok!)).sv).toBe(1);
    const mail = drainOutbox().find((m) => m.kind === 'email_verify');
    expect(mail?.to).toBe(email.toLowerCase());
  });

  it('aynı e-posta ikinci kez 409 döner ve YETİM TENANT kalmaz', async () => {
    const email = `${uniq('dup')}@test.local`;
    await call(register, { method: 'POST', body: { email, password: 'sifre1234', companyName: 'Bir' } });
    const before = await prisma.tenant.count();
    const r = await call(register, {
      method: 'POST',
      body: { email: email.toUpperCase(), password: 'sifre1234', companyName: 'İki' },
    });
    expect(r.status).toBe(409);
    expect(await prisma.tenant.count()).toBe(before);
  });

  it('zayıf şifre / geçersiz e-posta 400 ve hiçbir kayıt oluşmaz', async () => {
    const r = await call(register, {
      method: 'POST',
      body: { email: 'x@test.local', password: 'kisa', companyName: 'A' },
    });
    expect(r.status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.tenant.count()).toBe(0);
  });

  it('eşzamanlı aynı e-posta kayıtlarında yalnızca biri başarılı olur', async () => {
    const email = `${uniq('race')}@test.local`;
    const results = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        call(register, {
          method: 'POST',
          body: { email, password: 'sifre1234', companyName: `C${i}` },
          headers: { 'x-forwarded-for': `203.0.113.${20 + i}` },
        }),
      ),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
    expect(await prisma.tenant.count()).toBe(1);
  });
});

describe('giriş ve oturum', () => {
  it('yanlış şifre 401, doğru şifre çerez verir; /me entitlement döner', async () => {
    const { user, email, password } = await createTenant();
    expect((await call(login, { method: 'POST', body: { email, password: 'yanlis123' } })).status).toBe(401);
    const ok = await call(login, { method: 'POST', body: { email: email.toUpperCase(), password } });
    expect(ok.status).toBe(200);
    await loginAs(user);
    const m = await call(me);
    expect(m.status).toBe(200);
    expect(m.json.role).toBe('OWNER');
    expect((m.json.entitlement as unknown as { active: boolean }).active).toBe(true);
  });

  it('logout-all sonrası eski çerez geçersizdir (sessionVersion)', async () => {
    const { user } = await createTenant();
    await loginAs(user);
    expect((await call(me)).status).toBe(200);
    await call(logoutAll, { method: 'POST' });
    // helper jar hâlâ eski tokeni taşıyor → 401 beklenir
    expect((await call(me)).status).toBe(401);
  });

  it('giriş denemeleri IP başına sınırlı (11. deneme 429)', async () => {
    const { email } = await createTenant();
    let last = 0;
    for (let i = 0; i < 11; i++) {
      last = (
        await call(login, {
          method: 'POST',
          body: { email, password: 'yanlis123' },
          headers: { 'x-forwarded-for': '198.51.100.7' },
        })
      ).status;
    }
    expect(last).toBe(429);
  });
});

describe('şifre sıfırlama ve e-posta doğrulama', () => {
  it('forgot → outbox linki → reset → eski oturum düşer, yeni şifreyle giriş', async () => {
    const { user, email } = await createTenant();
    await loginAs(user);
    const f = await call(forgot, { method: 'POST', body: { email } });
    expect(f.status).toBe(200);
    expect(f.json.delivery).toBe('email');
    const mail = drainOutbox().find((m) => m.kind === 'password_reset');
    const token = mail!.body.match(/token=([A-Za-z0-9_-]+)/)![1]!;
    const r = await call(reset, { method: 'POST', body: { token, password: 'yeniSifre99' } });
    expect(r.status).toBe(200);
    expect((await call(me)).status).toBe(401);
    expect((await call(login, { method: 'POST', body: { email, password: 'yeniSifre99' } })).status).toBe(200);
    // token tek kullanımlık
    expect((await call(reset, { method: 'POST', body: { token, password: 'baskaSifre99' } })).status).toBe(400);
  });

  it('bilinmeyen e-posta için de aynı cevap (enumeration yok)', async () => {
    const r = await call(forgot, { method: 'POST', body: { email: 'yok@test.local' } });
    expect(r.status).toBe(200);
    expect(drainOutbox()).toHaveLength(0);
  });

  it('e-posta doğrulama tokeni emailVerifiedAt set eder', async () => {
    const { user } = await createTenant();
    await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: null } });
    const { issueAuthToken } = await import('@/server/auth-tokens');
    const token = await issueAuthToken(user.id, 'EMAIL_VERIFY');
    expect((await call(verifyConfirm, { method: 'PUT', body: { token } })).status).toBe(200);
    expect((await prisma.user.findUnique({ where: { id: user.id } }))!.emailVerifiedAt).not.toBeNull();
    expect((await call(verifyConfirm, { method: 'PUT', body: { token } })).status).toBe(400);
  });

  it('şifre değişimi mevcut şifreyi ister ve oturumu yeniler', async () => {
    const { user, password } = await createTenant();
    await loginAs(user);
    expect(
      (await call(changePassword, { method: 'POST', body: { currentPassword: 'yanlis', newPassword: 'yeniSifre99' } }))
        .status,
    ).toBe(400);
    const ok = await call(changePassword, {
      method: 'POST',
      body: { currentPassword: password, newPassword: 'yeniSifre99' },
    });
    expect(ok.status).toBe(200);
    expect(cookieToken(ok.headers)).toBeTruthy();
    logout();
  });
});
