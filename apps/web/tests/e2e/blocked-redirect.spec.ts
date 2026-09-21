/**
 * Yasaklı site yönlendirmesi (E2E) — dış ağ YOK: youtube.com istekleri page.route ile yerelde karşılanır.
 * Seed: BlockedSite (prisma). Akış: /arac/ai-crawler-testi?url=<yasaklı> otomatik tarama → sunucu 200 {blocked}
 * → istemci allowlist'i yeniden doğrular → window.location → youtube.com. Alt alan adı aynı.
 * Süper admin: /admin/blocked-sites ekle → Test et → sil (ConfirmDialog, alan adı yazılarak).
 * Not: spec'teki /arac/seo-karnesi W1 dalında; bu dalda mevcut ai-crawler-testi sayfası kullanılır (aynı UrlScanTool).
 */
import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';
import { testIp } from './ip';

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.TEST_DATABASE_URL ?? 'postgresql://postgres@127.0.0.1:5499/independentai_test' },
  },
});
const stamp = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const PASSWORD = 'e2eSifre1234';
const YT = 'https://www.youtube.com/watch?v=yanit-e2e';
const BLOCKED_HOST = `engelli-${stamp()}.example`;

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

async function routeYoutube(page: Page) {
  await page.route('**youtube.com**', (r) =>
    r.fulfill({ status: 200, contentType: 'text/html', body: '<html><body><h1>ok</h1></body></html>' }),
  );
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await prisma.blockedSite.create({ data: { hostname: BLOCKED_HOST, redirectUrl: YT, note: 'e2e' } });
});
test.afterAll(async () => {
  await prisma.blockedSite.deleteMany({ where: { hostname: { contains: 'engelli-' } } });
  await prisma.$disconnect();
});

test.beforeEach(async ({ page }, testInfo) => {
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': testIp(testInfo) });
  await routeYoutube(page);
});

test('araç sayfası ?url= ile yasaklı site → youtube.com (dış ağ yok)', async ({ page }) => {
  await page.goto(`/arac/ai-crawler-testi?url=${BLOCKED_HOST}`);
  await page.waitForURL(/youtube\.com/, { timeout: 30_000 });
  expect(page.url()).toContain('youtube.com/watch');
});

test('alt alan adı da yönlendirilir', async ({ page }) => {
  await page.goto(`/arac/ai-crawler-testi?url=https://shop.${BLOCKED_HOST}/urun`);
  await page.waitForURL(/youtube\.com/, { timeout: 30_000 });
});

test('public blocklist ucu: eşleşme JSON', async ({ request }) => {
  const r = await request.get(`/api/public/blocklist?host=www.${BLOCKED_HOST}`);
  expect(r.status()).toBe(200);
  expect(await r.json()).toEqual({ blocked: true, redirectUrl: YT });
  const ok = await request.get('/api/public/blocklist?host=temiz.example');
  expect(await ok.json()).toEqual({ blocked: false });
});

test('süper admin: ekle → Test et → sil; mobil taşma yok', async ({ page }, testInfo) => {
  const email = `admin-${stamp()}@test.local`;
  const tenant = await prisma.tenant.create({
    data: { name: 'E2E Admin', trialEndsAt: new Date(Date.now() + 30 * 86_400_000), onboardingCompletedAt: new Date() },
  });
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email,
      passwordHash: hashPassword(PASSWORD),
      role: 'OWNER',
      isSuperAdmin: true,
      emailVerifiedAt: new Date(),
    },
  });
  await page.goto('/login');
  await page.getByLabel('E-posta').fill(email);
  await page.getByLabel('Şifre', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await page.waitForURL(/\/dashboard/);

  const host = `yeni-${stamp()}.example`;
  await page.goto(`/admin/blocked-sites?hostname=${host}`);
  await expect(page.getByRole('heading', { name: 'Yasaklı siteler' })).toBeVisible();
  await expect(page.getByLabel('Alan adı')).toHaveValue(host);
  await page.getByLabel('Yönlendirme bağlantısı').fill('https://vimeo.com/1');
  await page.getByRole('button', { name: 'Listeye ekle' }).click();
  await expect(page.getByRole('alert')).toContainText('Yalnızca youtube.com / youtu.be');
  await page.getByLabel('Yönlendirme bağlantısı').fill('https://youtu.be/e2e');
  await page.getByRole('button', { name: 'Listeye ekle' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'listeye eklendi' })).toBeVisible();
  await expect(page.getByText(host, { exact: true }).first()).toBeVisible();

  await page.getByLabel('Test edilecek alan adı').fill(`shop.${host}`);
  await page.getByRole('button', { name: 'Test et' }).click();
  await expect(page.getByText(/engelli — kayıt/)).toBeVisible();

  await page
    .getByRole('button', { name: `${host} kaydını sil` })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/Onaylamak için/).fill(host);
  await dialog.getByRole('button', { name: 'Sil' }).click();
  await expect(page.getByText(host, { exact: true })).toHaveCount(0);

  if (testInfo.project.name.includes('mobile')) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
  await prisma.tenant.delete({ where: { id: tenant.id } });
});
