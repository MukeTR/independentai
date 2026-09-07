/**
 * GET /api/realtime/token — Supabase Realtime JWT'si.
 *  - Env yokken { enabled:false }; oturumsuz 401; rate limit 429.
 *  - Env varken: HS256 doğrulanır; claim'ler (user_id, tenant_id, session_version, topics, iss/aud/exp ≤ 10 dk).
 *  - Cross-tenant: A'nın topics listesinde B yok. Ajans üyesi: agency topic + erişebildiği (ARCHIVED olmayan)
 *    çalışma alanları; allClients=false ise WorkspaceAccess şart; ajans ev tenant'ı için tenant topic'i yok.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { jwtVerify } from 'jose';
import { call, createTenant, loginAs, prisma, uniq } from './helpers';
import { GET as tokenRoute } from '@/app/api/realtime/token/route';
import { hashPassword } from '@/server/password';

const ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghij.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_0000000000',
  SUPABASE_JWT_SECRET: 'realtime-test-secret-realtime-test-secret-64chars-long-000000',
} as const;

function setEnv(on: boolean) {
  for (const [k, v] of Object.entries(ENV)) {
    if (on) process.env[k] = v;
    else delete process.env[k];
  }
}
afterEach(() => setEnv(false));

async function verify(token: string) {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(ENV.SUPABASE_JWT_SECRET), {
    algorithms: ['HS256'],
    issuer: `${ENV.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`,
    audience: 'authenticated',
  });
  return payload as typeof payload & {
    user_id: string;
    tenant_id: string;
    session_version: number;
    topics: string[];
    role: string;
    app_role: string;
    agency_id: string | null;
  };
}

/** Ajans ev tenant'ı + ADMIN üyelik (allClients=false) + 3 çalışma alanı: erişimli ACTIVE, erişimsiz ACTIVE, erişimli ARCHIVED */
async function seedAgency() {
  const home = await prisma.tenant.create({
    data: {
      name: `Ajans-${uniq('a')}`,
      kind: 'AGENCY',
      trialEndsAt: new Date(Date.now() + 90 * 86_400_000),
      onboardingCompletedAt: new Date(),
    },
  });
  const member = await prisma.user.create({
    data: {
      tenantId: home.id,
      email: `${uniq('agm')}@test.local`,
      passwordHash: hashPassword('sifre1234'),
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
    },
  });
  const agency = await prisma.agencyAccount.create({ data: { tenantId: home.id, name: home.name } });
  const membership = await prisma.agencyMembership.create({
    data: { agencyId: agency.id, userId: member.id, role: 'ADMIN', allClients: false },
  });
  const mk = async (status: 'ACTIVE' | 'ARCHIVED', access: boolean) => {
    const client = await createTenant();
    const ws = await prisma.agencyWorkspace.create({
      data: { agencyId: agency.id, tenantId: client.tenant.id, status },
    });
    if (access) await prisma.workspaceAccess.create({ data: { membershipId: membership.id, workspaceId: ws.id } });
    return client.tenant.id;
  };
  const withAccess = await mk('ACTIVE', true);
  const noAccess = await mk('ACTIVE', false);
  const archived = await mk('ARCHIVED', true);
  return { home, member, agency, membership, withAccess, noAccess, archived };
}

describe('GET /api/realtime/token', () => {
  it('Realtime env yokken { enabled:false, reason:not_configured }', async () => {
    const { user } = await createTenant();
    await loginAs(user);
    const r = await call(tokenRoute);
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ enabled: false, reason: 'not_configured' });
  });

  it('oturumsuz 401 (env varken de)', async () => {
    setEnv(true);
    expect((await call(tokenRoute)).status).toBe(401);
  });

  it("env ayarlıyken: HS256 token; claim'ler; iss/aud; exp ≤ 10 dk; topics yalnızca kendi tenant'ı", async () => {
    setEnv(true);
    const a = await createTenant();
    const b = await createTenant();
    await loginAs(a.user);
    const r = await call(tokenRoute);
    expect(r.status).toBe(200);
    expect(r.json.enabled).toBe(true);
    expect(r.json.url).toBe(ENV.NEXT_PUBLIC_SUPABASE_URL);
    expect(r.json.anonKey).toBe(ENV.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    expect(r.json.ttlSec).toBe(600);
    expect(r.json.tenantId).toBe(a.tenant.id);
    expect(r.json.topics).toEqual([`tenant:${a.tenant.id}`]);
    // Yanıtta imzalama sırrı yok
    expect(r.text).not.toContain(ENV.SUPABASE_JWT_SECRET);

    const p = await verify(String(r.json.token));
    expect(p.sub).toBe(a.user.id);
    expect(p.user_id).toBe(a.user.id);
    expect(p.tenant_id).toBe(a.tenant.id);
    expect(p.session_version).toBe(1);
    expect(p.role).toBe('authenticated');
    expect(p.app_role).toBe('OWNER');
    expect(p.agency_id).toBeNull();
    expect(p.topics).toEqual([`tenant:${a.tenant.id}`]);
    expect(p.topics).not.toContain(`tenant:${b.tenant.id}`);
    expect(p.exp! - p.iat!).toBeLessThanOrEqual(600);
    expect(p.exp! - p.iat!).toBeGreaterThan(540);
    expect(Number(r.json.expiresAt)).toBe(p.exp! * 1000);

    // sessionVersion değişince yeni token yeni sürümü taşır
    await prisma.user.update({ where: { id: a.user.id }, data: { sessionVersion: { increment: 1 } } });
    await loginAs(a.user);
    const r2 = await call(tokenRoute);
    expect((await verify(String(r2.json.token))).session_version).toBe(2);
  });

  it('yanlış sırla imza doğrulanmaz', async () => {
    setEnv(true);
    const { user } = await createTenant();
    await loginAs(user);
    const r = await call(tokenRoute);
    await expect(
      jwtVerify(String(r.json.token), new TextEncoder().encode('baska-bir-sir-baska-bir-sir-baska-bir-sir-00'), {
        algorithms: ['HS256'],
      }),
    ).rejects.toThrow();
  });

  it("ajans üyesi: agency topic + erişimli ACTIVE çalışma alanı; erişimsiz ve ARCHIVED yok; ev tenant'ı için tenant topic'i yok", async () => {
    setEnv(true);
    const ag = await seedAgency();
    await loginAs(ag.member);
    const r = await call(tokenRoute);
    expect(r.status).toBe(200);
    const topics = r.json.topics as unknown as string[];
    expect(topics).toContain(`agency:${ag.agency.id}`);
    expect(topics).toContain(`tenant:${ag.withAccess}`);
    expect(topics).not.toContain(`tenant:${ag.noAccess}`);
    expect(topics).not.toContain(`tenant:${ag.archived}`);
    expect(topics).not.toContain(`tenant:${ag.home.id}`);
    const p = await verify(String(r.json.token));
    expect(p.agency_id).toBe(ag.agency.id);
    expect(p.topics).toEqual(topics);

    // allClients=true → erişim satırı olmayan aktif alan da girer, ARCHIVED yine girmez
    await prisma.agencyMembership.update({ where: { id: ag.membership.id }, data: { allClients: true } });
    const r2 = await call(tokenRoute);
    const t2 = r2.json.topics as unknown as string[];
    expect(t2).toContain(`tenant:${ag.noAccess}`);
    expect(t2).not.toContain(`tenant:${ag.archived}`);
  });

  it('rate limit: kullanıcı başına 30/dk, 31. istek 429 + Retry-After', async () => {
    const { user } = await createTenant();
    await loginAs(user);
    let last = 0;
    let headers: Headers | null = null;
    for (let i = 0; i < 31; i++) {
      const r = await call(tokenRoute);
      last = r.status;
      headers = r.headers;
    }
    expect(last).toBe(429);
    expect(headers!.get('retry-after')).toBeTruthy();
  });
});
