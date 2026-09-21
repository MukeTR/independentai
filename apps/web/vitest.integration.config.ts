import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Entegrasyon testleri — izole test Postgres'i (TEST_DATABASE_URL) üzerinde, gerçek Prisma.
 * Production DB'ye ASLA bağlanmaz: URL "supabase.com" içeriyorsa setup dosyası testi durdurur.
 */
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['tests/integration/setup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      JWT_SECRET: 'test-secret-test-secret-test-secret-32chars!!',
      CRON_SECRET: 'test-cron-secret-1234567890',
      IAI_TEST_MODE: '1',
      IAI_LOG_SILENT: '1',
      IAI_ALLOW_MOCK: '1',
      NODE_ENV: 'test',
      REALTIME_PUBLISH: '1',
      REPORT_TOKEN_SECRET: 'test-report-token-secret-32chars-long!!',
      VISITOR_SALT: 'test-visitor-salt-16plus',
      SALES_EMAIL: 'satis@test.local',
      E2E_PORT: process.env.E2E_PORT ?? '',
      NIGHT_INTEGRATE: process.env.NIGHT_INTEGRATE ?? '',
    },
  },
});
