import { defineConfig, devices } from '@playwright/test';

/**
 * E2E — gerçek tarayıcı, gerçek Next sunucusu (port 3200), izole test DB.
 * `pnpm test:e2e` öncesi: TEST_DATABASE_URL tanımlı olmalı (bkz. tests/e2e/README.md).
 */
const PORT = 3200;
const baseURL = `http://localhost:${PORT}`;

// Güvenlik kilidi: TEST_DATABASE_URL yoksa apps/web/.env'deki (production) DATABASE_URL devreye girebilir.
const TEST_DB = process.env.TEST_DATABASE_URL;
if (!TEST_DB || /supabase\.com|neon\.tech|pooler\./i.test(TEST_DB)) {
  throw new Error(
    'E2E için izole bir TEST_DATABASE_URL zorunlu (yerel Postgres). Production/Supabase adresi kabul edilmez.',
  );
}

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } }, // Chromium tabanlı mobil (375×667 civarı, dokunma)
  ],
  webServer: {
    command: process.env.E2E_SERVER_COMMAND ?? 'pnpm start',
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: TEST_DB,
      DIRECT_URL: TEST_DB,
      JWT_SECRET: process.env.JWT_SECRET ?? 'test-secret-test-secret-test-secret-32chars!!',
      CRON_SECRET: process.env.CRON_SECRET ?? 'test-cron-secret-1234567890',
      IAI_TEST_MODE: '1',
      IAI_ALLOW_MOCK: '1',
      NEXT_PUBLIC_SITE_URL: baseURL,
    },
  },
});
