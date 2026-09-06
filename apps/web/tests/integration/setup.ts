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
type CookieJar = { token: string | null };
const jar: CookieJar = { token: null };
(globalThis as unknown as { __iaiJar: CookieJar }).__iaiJar = jar;

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name === 'iai_token' && jar.token ? { name, value: jar.token } : undefined),
    set: () => {},
    delete: () => {},
  }),
  headers: async () => new Headers(),
}));

// ── after(): testte hemen (ama asenkron) çalıştır; flushAfter ile beklenir ──
const pendingAfter: Promise<unknown>[] = [];
(globalThis as unknown as { __iaiAfter: Promise<unknown>[] }).__iaiAfter = pendingAfter;
vi.mock('next/server', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    after: (fn: () => unknown) => {
      pendingAfter.push(
        Promise.resolve()
          .then(fn)
          .catch(() => undefined),
      );
    },
  };
});

// React cache(): test ortamında React dispatcher yok → doğrudan fonksiyonu çağır.
vi.mock('react', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return { ...mod, cache: <T extends (...a: never[]) => unknown>(fn: T) => fn };
});

const TABLES = [
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

beforeAll(() => {
  const dbDir = path.resolve(__dirname, '../../../../packages/db');
  execSync('npx prisma migrate deploy', {
    cwd: dbDir,
    env: { ...process.env, DATABASE_URL: TEST_URL, DIRECT_URL: TEST_URL },
    stdio: 'pipe',
  });
});

beforeEach(async () => {
  const { prisma } = await import('@/server/prisma');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
  jar.token = null;
  pendingAfter.length = 0;
  const { drainOutbox } = await import('@/server/mailer');
  drainOutbox();
});
