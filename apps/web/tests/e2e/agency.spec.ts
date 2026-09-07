/**
 * E2E — Ajans akışı: kayıt → onboarding "ajans" → boş portföy → müşteri oluştur → değiştirici ile
 * /dashboard'a geç → portföye geri. (Yazıldı; çalıştırma sahibi tarafından yapılır.)
 */
import { test, expect } from '@playwright/test';

// Giriş rate limiti (IP başına 10/15 dk) dosyalar arasında paylaşılmasın: her spec kendi sahte IP'sini gönderir.
test.use({ extraHTTPHeaders: { 'x-forwarded-for': '203.0.113.21' } });

const stamp = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const PASSWORD = 'e2eSifre1234';

test.describe.configure({ mode: 'serial' });

test('kayıt → ajans onboarding → boş portföy → müşteri oluştur → panele geç → portföye dön', async ({ page }) => {
  const email = `ajans-${stamp()}@test.local`;
  await page.goto('/register');
  await page.getByLabel('Şirket adı').fill('E2E Ajans');
  await page.getByLabel('E-posta').fill(email);
  await page.getByLabel('Şifre', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: '6 ay ücretsiz başlat' }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  // Varsayılan seçim marka; ajans kartını seç
  await expect(page.getByRole('radio', { name: /Kendi markam/ })).toBeChecked();
  await page.getByRole('radio', { name: /Ajans olarak müşterilerim için/ }).check();
  await expect(page.getByRole('heading', { name: 'Ajansınızı tanıtın' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Ajans adı' }).fill('E2E Ajans');
  const convert = page.waitForResponse((r) => r.url().includes('/api/agency') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Ajans hesabını oluştur' }).click();
  expect((await convert).status()).toBe(201);
  await expect(page).toHaveURL(/\/agency$/);

  // Boş durum
  await expect(page.getByRole('heading', { name: 'E2E Ajans' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Henüz müşteri yok' })).toBeVisible();

  // Onboarding'e dönülmez (ajans → /agency)
  await page.goto('/onboarding');
  await expect(page).toHaveURL(/\/agency/);

  // Müşteri oluştur (modal)
  await page.goto('/agency/clients?new=1');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('textbox', { name: 'Müşteri adı' }).fill('Müşteri Bir');
  const create = page.waitForResponse(
    (r) => r.url().includes('/api/agency/clients') && r.request().method() === 'POST',
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Müşteriyi oluştur' }).click();
  expect((await create).status()).toBe(201);
  await expect(page.getByRole('link', { name: 'Müşteri Bir' })).toBeVisible();

  // Portföyde kart görünür
  await page.goto('/agency');
  await expect(page.getByRole('article', { name: 'Müşteri Bir' })).toBeVisible();

  // Değiştirici ile panele geç
  await page.getByRole('button', { name: /Çalışma alanı: Ajans portföyü/ }).click();
  const ws = page.waitForResponse((r) => r.url().includes('/api/agency/workspace') && r.request().method() === 'POST');
  await page.getByRole('option', { name: /Müşteri Bir/ }).click();
  expect((await ws).status()).toBe(200);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('button', { name: /Çalışma alanı: Müşteri Bir/ })).toBeVisible();

  // Rapor paylaşım linkleri müşteri bağlamında görünür
  await page.goto('/dashboard/alerts');
  await expect(page.getByRole('heading', { name: 'Rapor paylaşım linkleri' })).toBeVisible();

  // Geri: portföy
  await page.getByRole('button', { name: /Çalışma alanı: Müşteri Bir/ }).click();
  await page.getByRole('option', { name: 'Ajans portföyü' }).click();
  await expect(page).toHaveURL(/\/agency$/);
  await expect(page.getByRole('button', { name: /Çalışma alanı: Ajans portföyü/ })).toBeVisible();
});
