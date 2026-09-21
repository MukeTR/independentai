/**
 * supabase/realtime-policies.sql → `public.iai_realtime_can_join(topic)` fonksiyonu yerel test DB'sinde.
 * Yalnızca fonksiyon bloğu yüklenir (policy satırları `realtime.messages` RLS'i ve `authenticated` rolü
 * Supabase'e özgüdür). JWT claim'leri `set_config('request.jwt.claims', ..., true)` ile transaction içinde
 * taklit edilir — Supabase Realtime de politikayı bu ayarla değerlendirir.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createTenant, prisma, uniq } from './helpers';
import { hashPassword } from '@/server/password';

const SQL_PATH = path.resolve(__dirname, '../../../../supabase/realtime-policies.sql');

function functionBlock(sql: string): string {
  const start = sql.indexOf('create or replace function public.iai_realtime_can_join');
  expect(start).toBeGreaterThanOrEqual(0);
  const end = sql.indexOf('$$;', start);
  expect(end).toBeGreaterThan(start);
  return sql.slice(start, end + 3);
}

beforeAll(async () => {
  await prisma.$executeRawUnsafe(functionBlock(readFileSync(SQL_PATH, 'utf8')));
});

type Claims = { user_id?: string; session_version?: number; topics?: string[] };
async function canJoin(claims: Claims, topic: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`select set_config('request.jwt.claims', $1, true)`, JSON.stringify(claims));
    const rows = await tx.$queryRaw<{ ok: boolean }[]>`select public.iai_realtime_can_join(${topic}) as ok`;
    return rows[0]?.ok === true;
  });
}

async function seedAgency(opts: { allClients: boolean; access: boolean; status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' }) {
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
    data: { agencyId: agency.id, userId: member.id, role: 'ADMIN', allClients: opts.allClients },
  });
  const client = await createTenant();
  const ws = await prisma.agencyWorkspace.create({
    data: { agencyId: agency.id, tenantId: client.tenant.id, status: opts.status },
  });
  if (opts.access) await prisma.workspaceAccess.create({ data: { membershipId: membership.id, workspaceId: ws.id } });
  return { home, member, agency, membership, client, ws };
}

describe('iai_realtime_can_join — tenant topic', () => {
  it("doğrudan üye: kendi tenant topic'i true; başka tenant false", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const claims = {
      user_id: a.user.id,
      session_version: a.user.sessionVersion,
      topics: [`tenant:${a.tenant.id}`, `tenant:${b.tenant.id}`],
    };
    expect(await canJoin(claims, `tenant:${a.tenant.id}`)).toBe(true);
    // Token listesinde olsa bile üyelik yoksa reddedilir (DB'deki güncel üyelik kazanır)
    expect(await canJoin(claims, `tenant:${b.tenant.id}`)).toBe(false);
  });

  it("token'ın topics listesinde olmayan topic false (üye olsa bile)", async () => {
    const a = await createTenant();
    expect(await canJoin({ user_id: a.user.id, session_version: 1, topics: [] }, `tenant:${a.tenant.id}`)).toBe(false);
    expect(
      await canJoin({ user_id: a.user.id, session_version: 1, topics: ['agency:x'] }, `tenant:${a.tenant.id}`),
    ).toBe(false);
  });

  it('sessionVersion eski (logout-all / rol değişimi) → false; claim yok → false', async () => {
    const a = await createTenant();
    await prisma.user.update({ where: { id: a.user.id }, data: { sessionVersion: 3 } });
    const topics = [`tenant:${a.tenant.id}`];
    expect(await canJoin({ user_id: a.user.id, session_version: 2, topics }, `tenant:${a.tenant.id}`)).toBe(false);
    expect(await canJoin({ user_id: a.user.id, session_version: 3, topics }, `tenant:${a.tenant.id}`)).toBe(true);
    expect(await canJoin({ user_id: a.user.id, topics }, `tenant:${a.tenant.id}`)).toBe(false);
    expect(await canJoin({ session_version: 3, topics }, `tenant:${a.tenant.id}`)).toBe(false);
    expect(await canJoin({}, `tenant:${a.tenant.id}`)).toBe(false);
  });

  it("presence alt kanalı ('tenant:<id>:presence') üyeye açık; başka son ek ve yabancı tenant false", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const claims = { user_id: a.user.id, session_version: 1, topics: [`tenant:${a.tenant.id}`] };
    expect(await canJoin(claims, `tenant:${a.tenant.id}:presence`)).toBe(true);
    expect(await canJoin(claims, `tenant:${a.tenant.id}:broadcast`)).toBe(false);
    expect(await canJoin(claims, `tenant:${b.tenant.id}:presence`)).toBe(false);
  });

  it('bozuk topic biçimleri false', async () => {
    const a = await createTenant();
    const claims = {
      user_id: a.user.id,
      session_version: 1,
      topics: ['tenant:', 'tenant', `bilinmeyen:${a.tenant.id}`],
    };
    expect(await canJoin(claims, 'tenant:')).toBe(false);
    expect(await canJoin(claims, 'tenant')).toBe(false);
    expect(await canJoin(claims, `bilinmeyen:${a.tenant.id}`)).toBe(false);
  });

  it("ajans üyesi allClients=true → müşteri tenant topic'i true (WorkspaceAccess gerekmez)", async () => {
    const ag = await seedAgency({ allClients: true, access: false, status: 'ACTIVE' });
    const topic = `tenant:${ag.client.tenant.id}`;
    expect(await canJoin({ user_id: ag.member.id, session_version: 1, topics: [topic] }, topic)).toBe(true);
  });

  it('ajans üyesi allClients=false ve WorkspaceAccess yok → false; erişim satırı eklenince true', async () => {
    const ag = await seedAgency({ allClients: false, access: false, status: 'ACTIVE' });
    const topic = `tenant:${ag.client.tenant.id}`;
    const claims = { user_id: ag.member.id, session_version: 1, topics: [topic] };
    expect(await canJoin(claims, topic)).toBe(false);
    await prisma.workspaceAccess.create({ data: { membershipId: ag.membership.id, workspaceId: ag.ws.id } });
    expect(await canJoin(claims, topic)).toBe(true);
  });

  it('ARCHIVED çalışma alanı → false (erişim satırı olsa da); PAUSED → true (salt-okunur izleme)', async () => {
    const archived = await seedAgency({ allClients: true, access: true, status: 'ARCHIVED' });
    const t1 = `tenant:${archived.client.tenant.id}`;
    expect(await canJoin({ user_id: archived.member.id, session_version: 1, topics: [t1] }, t1)).toBe(false);
    const paused = await seedAgency({ allClients: true, access: true, status: 'PAUSED' });
    const t2 = `tenant:${paused.client.tenant.id}`;
    expect(await canJoin({ user_id: paused.member.id, session_version: 1, topics: [t2] }, t2)).toBe(true);
  });

  it('üyeliği SUSPENDED olan ajans üyesi → false', async () => {
    const ag = await seedAgency({ allClients: true, access: true, status: 'ACTIVE' });
    await prisma.agencyMembership.update({ where: { id: ag.membership.id }, data: { status: 'SUSPENDED' } });
    const topic = `tenant:${ag.client.tenant.id}`;
    expect(await canJoin({ user_id: ag.member.id, session_version: 1, topics: [topic] }, topic)).toBe(false);
  });
});

describe('iai_realtime_can_join — agency topic', () => {
  it('aktif üye true; üye olmayan (başka ajansın üyesi / marka kullanıcısı) false', async () => {
    const ag = await seedAgency({ allClients: false, access: false, status: 'ACTIVE' });
    const other = await seedAgency({ allClients: false, access: false, status: 'ACTIVE' });
    const brand = await createTenant();
    const topic = `agency:${ag.agency.id}`;
    expect(await canJoin({ user_id: ag.member.id, session_version: 1, topics: [topic] }, topic)).toBe(true);
    expect(await canJoin({ user_id: other.member.id, session_version: 1, topics: [topic] }, topic)).toBe(false);
    expect(await canJoin({ user_id: brand.user.id, session_version: 1, topics: [topic] }, topic)).toBe(false);
    // Müşteri tenant'ının kendi sahibi ajans topic'ini dinleyemez
    expect(await canJoin({ user_id: ag.client.user.id, session_version: 1, topics: [topic] }, topic)).toBe(false);
  });
});
