import { defineConfig } from 'vitest/config';
import path from 'node:path';

/** Birim testleri — DB yok, ağ yok, deterministik. */
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
    exclude: ['tests/integration/**', 'tests/e2e/**'],
    env: {
      JWT_SECRET: 'test-secret-test-secret-test-secret-32chars!!',
      IAI_TEST_MODE: '1',
      IAI_LOG_SILENT: '1',
      NODE_ENV: 'test',
      REPORT_TOKEN_SECRET: 'test-report-token-secret-32chars-long!!',
      VISITOR_SALT: 'test-visitor-salt-16plus',
      SALES_EMAIL: 'satis@test.local',
      E2E_PORT: process.env.E2E_PORT ?? '',
      NIGHT_INTEGRATE: process.env.NIGHT_INTEGRATE ?? '',
    },
  },
});
