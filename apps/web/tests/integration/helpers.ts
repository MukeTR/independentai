import { NextRequest } from 'next/server';
import { prisma } from '@/server/prisma';
import { signSession } from '@/server/jwt';
import { hashPassword } from '@/server/password';

type Role = 'OWNER' | 'ADMIN' | 'VIEWER';
const jar = (globalThis as unknown as { __iaiJar: { token: string | null } }).__iaiJar;
const pendingAfter = (globalThis as unknown as { __iaiAfter: Promise<unknown>[] }).__iaiAfter;

let seq = 0;
export function uniq(prefix = 'u'): string {
  seq += 1;
  return `${prefix}${Date.now().toString(36)}${seq}`;
}

export async function createTenant(
  opts: {
    role?: Role;
    trialDaysLeft?: number;
    plan?: 'LAUNCH' | 'STARTER' | 'GROWTH';
    onboarded?: boolean;
    password?: string;
    email?: string;
    superAdmin?: boolean;
  } = {},
) {
  const trialEndsAt = new Date(Date.now() + (opts.trialDaysLeft ?? 90) * 86_400_000);
  const tenant = await prisma.tenant.create({
    data: {
      name: `T-${uniq('t')}`,
      trialEndsAt,
      plan: opts.plan ?? 'LAUNCH',
      onboardingCompletedAt: opts.onboarded === false ? null : new Date(),
    },
  });
  const email = opts.email ?? `${uniq('user')}@test.local`;
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email,
      passwordHash: hashPassword(opts.password ?? 'sifre1234'),
      role: opts.role ?? 'OWNER',
      isSuperAdmin: opts.superAdmin ?? false,
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.alertConfig.create({ data: { tenantId: tenant.id } });
  return { tenant, user, email, password: opts.password ?? 'sifre1234' };
}

export async function addMember(tenantId: string, role: Role) {
  const email = `${uniq('m')}@test.local`;
  return prisma.user.create({
    data: { tenantId, email, passwordHash: hashPassword('sifre1234'), role, emailVerifiedAt: new Date() },
  });
}

export async function loginAs(user: { id: string; tenantId: string; email: string; sessionVersion?: number }) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  jar.token = await signSession({ userId: u.id, tenantId: u.tenantId, email: u.email, sv: u.sessionVersion });
}
export function logout() {
  jar.token = null;
}

type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

export async function call(
  handler: Handler,
  opts: {
    method?: string;
    url?: string;
    body?: unknown;
    headers?: Record<string, string>;
    params?: Record<string, string>;
  } = {},
) {
  const method = opts.method ?? 'GET';
  const url = `http://localhost:3200${opts.url ?? '/'}`;
  const headers = new Headers({ 'x-forwarded-for': '203.0.113.10', ...(opts.headers ?? {}) });
  let body: string | undefined;
  if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers.set('content-type', 'application/json');
    headers.set('content-length', String(Buffer.byteLength(body)));
  }
  const req = new NextRequest(url, { method, headers, body });
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return {
    status: res.status,
    json: (json ?? {}) as Record<string, never>,
    headers: res.headers,
    text,
  };
}

export async function flushAfter() {
  await Promise.all(pendingAfter.splice(0, pendingAfter.length));
}

export { prisma };
