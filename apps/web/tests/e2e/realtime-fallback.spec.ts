/**
 * E2E — Realtime env YOKKEN panel davranışı (polling fallback).
 *  - Canlı bağlantı rozeti ya hiç render edilmez (Realtime yapılandırılmamış → 'disabled') ya da
 *    bağlantı denenip düşmüşse "30 sn" rozeti görünür; "Canlı" asla görünmez.
 *  - Run-progress: soru eklenince ilk ölçüm başlar, polling ile tamamlanır ve MOCK sonuçlar görünür.
 *  - Ayarlar: Ekip tablosu ve Aktivite akışı polling notu ile yüklenir; çevrimiçi noktası gizlidir.
 * Koşturma koordinatörde (bkz. tests/e2e/README.md). Bu dosya yalnızca yazıldı, çalıştırılmadı.
 */
import { test, expect, type Page } from '@playwright/test';

// Giriş rate limiti (IP başına 10/15 dk) dosyalar arasında paylaşılmasın: her spec kendi sahte IP'sini gönderir.
test.use({ extraHTTPHeaders: { 'x-forwarded-for': '203.0.113.23' } });
import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.TEST_DATABASE_URL ?? 'postgresql://postgres@127.0.0.1:5499/independentai_test' },
  },
});
const stamp = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const PASSWORD = 'e2eSifre1234';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('E-posta').fill(email);
  await page.getByLabel('Şifre', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await page.waitForURL(/\/dashboard/);
}

async function seedOwner(name: string) {
  const email = `rt-${stamp()}@test.local`;
  const tenant = await prisma.tenant.create({
    data: { name, trialEndsAt: new Date(Date.now() + 90 * 86_400_000), onboardingCompletedAt: new Date() },
  });
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email,
      passwordHash: hashPassword(PASSWORD),
      role: 'OWNER',
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.brand.create({ data: { tenantId: tenant.id, name: `${name} Marka`, isOwn: true } });
  return { email, tenant };
}

test.describe.configure({ mode: 'serial' });

test.skip(
  !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  'Bu senaryo Realtime env YOKKEN çalışır (fallback davranışı); env varsa atlanır.',
);

test('Realtime yokken: "Canlı" rozeti yok (rozet yok veya "30 sn"); token ucu enabled:false', async ({
  page,
  request,
}) => {
  const { email } = await seedOwner('Fallback');
  await login(page, email);
  await expect(page).toHaveURL(/\/dashboard/);

  // Rozet: 'disabled' → hiç render edilmez; 'polling' → "30 sn". "Canlı" hiçbir koşulda olmamalı.
  await expect(page.locator('[role=status]', { hasText: /^Canlı$/ })).toHaveCount(0);
  const polling = page.locator('[role=status]', { hasText: /30 sn/ });
  const pollingCount = await polling.count();
  if (pollingCount > 0) await expect(polling.first()).toHaveAttribute('title', /30 saniyede bir/);

  // Token ucu (oturum çerezi tarayıcıda) → enabled:false
  const tok = await page.request.get('/api/realtime/token');
  expect(tok.status()).toBe(200);
  expect(await tok.json()).toMatchObject({ enabled: false });

  // Oturumsuz istek 401
  const anon = await request.get('/api/realtime/token');
  expect(anon.status()).toBe(401);
});

test('run-progress polling ile tamamlanır: soru ekle → "model ölçülüyor" → MOCK sonuçlar', async ({ page }) => {
  const { email } = await seedOwner('Polling');
  await login(page, email);
  await page.goto('/dashboard/prompts');
  await page.getByRole('textbox', { name: 'İzlenecek soru' }).fill('Realtime olmadan en iyi POS yazılımı hangisi?');
  await page.getByRole('button', { name: 'Ekle' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Soru eklendi' })).toBeVisible();
  // Liste, soru eklendikten sonra router.refresh ile yenilenir; tıklama yarışını önlemek için href ile git.
  const href = await page.getByRole('link', { name: /Realtime olmadan en iyi POS/ }).getAttribute('href');
  expect(href).toMatch(/\/dashboard\/prompts\//);
  await page.goto(href!);
  await expect(page).toHaveURL(/\/dashboard\/prompts\//);

  // İlk ölçüm sürüyorsa gösterge görünür; polling (3 sn) ile sayfa tazelenir ve MOCK sonuçlar gelir.
  const progress = page.getByRole('status').filter({ hasText: /model ölçülüyor|Sonuçlar yükleniyor/ });
  if ((await progress.count()) > 0) await expect(progress.first()).toBeVisible();
  await expect(page.getByText(/MOCK/).first()).toBeVisible({ timeout: 60_000 });
  await expect(progress).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Şimdi çalıştır' })).toBeEnabled({ timeout: 30_000 });
});

test('Ayarlar: ekip tablosu ve aktivite akışı polling notuyla yüklenir; çevrimiçi noktası gizli', async ({ page }) => {
  const { email } = await seedOwner('Ekip');
  await login(page, email);
  await page.goto('/dashboard/settings');
  await expect(page.getByRole('heading', { name: 'Üyeler ve davetler' })).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('cell', { name: /siz/ })).toBeVisible();
  // Realtime yok → presence yok → çevrimiçi/çevrimdışı noktası render edilmez
  await expect(page.getByLabel(/çevrimiçi|çevrimdışı/)).toHaveCount(0);
  await expect(page.getByText(/\/5 üye/)).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Hesap hareketleri' })).toBeVisible();
  await expect(page.getByText('Canlı bağlantı yok; 30 saniyede bir yenileniyor.')).toBeVisible();

  // Davet gönder (test modunda e-posta outbox'a gider) → davet satırı ve "Yeniden gönder" görünür
  await page.getByPlaceholder('ekip@sirket.com').fill(`davet-${stamp()}@test.local`);
  await page.getByRole('button', { name: 'Davet gönder' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: /davet e-postası gönderildi|Davet bağlantısını/ }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /davetini yeniden gönder/ })).toBeVisible();
  await expect(page.getByText(/1 bekleyen davet/)).toBeVisible();
});
