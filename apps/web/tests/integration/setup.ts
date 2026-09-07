/**
 * Entegrasyon test kurulumu — izole test Postgres'i şart; production'a bağlanmayı REDDEDER.
 *  - DATABASE_URL/DIRECT_URL = TEST_DATABASE_URL (varsayılan yerel 5499).
 *  - Her test dosyasından önce migration'lar uygulanır; her testten önce tablolar boşaltılır.
 *  - next/headers (cookie) ve next/server.after mock'lanır; böylece route handler'lar doğrudan çağrılır.
 */
import { beforeAll, beforeEach, vi } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';

const TEST_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres@127.0.0.1:5499/independentai_test';
if (
  /supabase\.com|neon\.tech|pooler\./i.test(TEST_URL) ||
  !/localhost|127\.0\.0\.1|postgres:5432|\/\/db\b/.test(TEST_URL)
) {
  throw new Error(
    `Güvenlik: TEST_DATABASE_URL yerel/izole bir veritabanı olmalı (alınan: ${TEST_URL.replace(/:[^:@/]+@/, ':***@')})`,
  );
}
process.env.DATABASE_URL = TEST_URL;
process.env.DIRECT_URL = TEST_URL;

// ── Oturum çerezi mock'u ──
type CookieJar = { token: string | null; ws: string | null };
const jar: CookieJar = { token: null, ws: null };
(globalThis as unknown as { __iaiJar: CookieJar }).__iaiJar = jar;

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'iai_token' && jar.token
        ? { name, value: jar.token }
        : name === 'iai_ws' && jar.ws
          ? { name, value: jar.ws }
          : undefined,
    set: () => {},
    delete: () => {},
  }),
  headers: async () => new Headers(),
}));

// ── after(): üretimdeki gibi YANIT GÖNDERİLDİKTEN sonra çalışır; testte `flushAfter()` tetikler.
// (Eskiden mikrogörevde hemen koşuyordu; hızlı makinede iş, sonraki isteğe kadar bitip yarış üretiyordu.)
const pendingAfter: (() => unknown)[] = [];
(globalThis as unknown as { __iaiAfter: (() => unknown)[] }).__iaiAfter = pendingAfter;
vi.mock('next/server', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    after: (fn: () => unknown) => {
      pendingAfter.push(fn);
    },
  };
});

// React cache(): test ortamında React dispatcher yok → doğrudan fonksiyonu çağır.
vi.mock('react', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return { ...mod, cache: <T extends (...a: never[]) => unknown>(fn: T) => fn };
});

const TABLES = [
  'PublicScan',
  'IntegrationWebhookDelivery',
  'CatalogSync',
  'CatalogProduct',
  'StoreConnection',
  'ReportShare',
  'AgencyLinkRequest',
  'AgencyInvite',
  'WorkspaceAccess',
  'AgencyWorkspace',
  'AgencyMembership',
  'AgencyAccount',
  'BrandMention',
  'Citation',
  'ModelRun',
  'Prompt',
  'Competitor',
  'Brand',
  'TeamInvite',
  'AuthToken',
  'ApiToken',
  'BrandFact',
  'AlertConfig',
  'Audit',
  'PageEmbedding',
  'AuditLog',
  'NotificationLog',
  'RunBatch',
  'RateLimitBucket',
  'SystemConfig',
  'User',
  'Tenant',
];

beforeAll(async () => {
  const dbDir = path.resolve(__dirname, '../../../../packages/db');
  execSync('npx prisma migrate deploy', {
    cwd: dbDir,
    env: { ...process.env, DATABASE_URL: TEST_URL, DIRECT_URL: TEST_URL },
    stdio: 'pipe',
  });
  // Supabase realtime şeması yerelde yok: realtime.send() stub'ı (tests/integration/realtime-stub.sql)
  const { readFileSync } = await import('node:fs');
  const { prisma } = await import('@/server/prisma');
  const sql = readFileSync(path.resolve(__dirname, 'realtime-stub.sql'), 'utf8');
  for (const stmt of sql
    .split(/;\s*\n/)
    .map((x) =>
      x
        .split('\n')
        .filter((l) => !l.trim().startsWith('--'))
        .join('\n')
        .trim(),
    )
    .filter(Boolean)) {
    await prisma.$executeRawUnsafe(stmt);
  }
});

beforeEach(async () => {
  const { prisma } = await import('@/server/prisma');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
  jar.token = null;
  jar.ws = null;
  pendingAfter.length = 0;
  const { drainOutbox } = await import('@/server/mailer');
  drainOutbox();
});
