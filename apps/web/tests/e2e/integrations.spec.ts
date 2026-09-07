/**
 * E2E — Entegrasyonlar paneli: boş durum → sihirbaz (Ticimax) → SSRF/özel ağ servis adresi istemcide
 * reddedilir (sunucuya bağlantı isteği gitmez) → iptal. Mobilde yatay taşma yok.
 * Gerçek Next production sunucusu (3200) + izole test DB; sağlayıcıya ağ çağrısı yapılmaz.
 */
import { test, expect, type Page } from '@playwright/test';

// Giriş rate limiti (IP başına 10/15 dk) dosyalar arasında paylaşılmasın: her spec kendi sahte IP'sini gönderir.
test.use({ extraHTTPHeaders: { 'x-forwarded-for': '203.0.113.22' } });
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

async function seedOwner() {
  const email = `entegrasyon-${stamp()}@test.local`;
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Entegrasyon Tenant',
      trialEndsAt: new Date(Date.now() + 90 * 86_400_000),
      onboardingCompletedAt: new Date(),
    },
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
  return { email, tenant };
}

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('E-posta').fill(email);
  await page.getByLabel('Şifre', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe.configure({ mode: 'serial' });

test('boş durum → Ticimax sihirbazı → özel ağ servis adresi reddi → iptal; bağlantı oluşmaz', async ({ page }) => {
  const { email, tenant } = await seedOwner();
  await login(page, email);

  await page.goto('/dashboard/integrations');
  await expect(page.getByRole('heading', { level: 1, name: 'Mağaza bağlantıları' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Henüz mağaza bağlı değil' })).toBeVisible();
  await expect(page.getByText(/Ne çekmiyoruz/)).toBeVisible();

  // Sihirbazı aç (hydrate olunca buton etkin)
  const openBtn = page.getByRole('button', { name: 'Mağaza bağla' });
  await expect(openBtn).toBeEnabled();
  await openBtn.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Platformunuzu seçin' })).toBeVisible();

  // Ticimax kartı (sunucu env gerektirmez → etkin) ve açıklama
  const ticimax = dialog.getByRole('radio', { name: /Ticimax/ });
  await expect(ticimax).toBeEnabled();
  await ticimax.click();
  await expect(dialog.getByText(/Webhook yok: katalog günde bir kez/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Devam' }).click();

  // Adım 2: alan adı + servis adresi (özel ağ) + üye kodu
  await expect(dialog.getByRole('heading', { name: /Ticimax — mağaza adresi/ })).toBeVisible();
  await dialog.getByLabel('Mağaza alan adı').fill('magaza.example.com');
  await dialog.getByLabel('Servis adresi (https)').fill('http://127.0.0.1/servis');
  await dialog.getByLabel('Üye kodu').fill('test-uye-kodu');
  const createReq = page
    .waitForRequest((r) => r.url().includes('/api/integrations') && r.method() === 'POST', { timeout: 1500 })
    .catch(() => null);
  await dialog.getByRole('button', { name: 'Devam' }).click();

  // İstemci doğrulaması: herkese açık https şart; sunucuya istek gitmedi
  await expect(dialog.getByRole('alert')).toContainText(/herkese açık bir https adresi/);
  expect(await createReq).toBeNull();

  // https ama yerel alan adı da reddedilir
  await dialog.getByLabel('Servis adresi (https)').fill('https://magaza.local');
  await dialog.getByRole('button', { name: 'Devam' }).click();
  await expect(dialog.getByRole('alert')).toContainText(/herkese açık bir https adresi/);

  // İptal → sihirbaz kapanır, boş durum korunur, DB'de bağlantı yok
  await dialog.getByRole('button', { name: 'Vazgeç' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Henüz mağaza bağlı değil' })).toBeVisible();
  expect(await prisma.storeConnection.count({ where: { tenantId: tenant.id } })).toBe(0);
  const api = await page.request.get('/api/integrations');
  expect(api.status()).toBe(200);
  const body = (await api.json()) as { connections: unknown[]; providers: { provider: string }[] };
  expect(body.connections).toHaveLength(0);
  expect(body.providers.map((p) => p.provider).sort()).toEqual(['IKAS', 'SHOPIFY', 'TICIMAX']);
  expect(JSON.stringify(body)).not.toContain('credentialsEnc');
});

test('OAuth dönüş mesajları: ?error=access_denied okunabilir metin, URL temizlenir; mobilde yatay taşma yok', async ({
  page,
}) => {
  const { email } = await seedOwner();
  await login(page, email);
  await page.goto('/dashboard/integrations?error=access_denied');
  await expect(page.getByRole('alert').filter({ hasText: /yetkilendirmesi reddedildi/ })).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard\/integrations$/);

  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto('/dashboard/integrations');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, '/dashboard/integrations yatay taşma').toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Mağaza bağla' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const dialogOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(dialogOverflow).toBeLessThanOrEqual(1);
});

test('çözüm sayfaları ve gezinme: /solutions/* 200 + FAQPage JSON-LD; mobil menüde Çözümler grubu', async ({
  page,
  request,
}) => {
  for (const path of [
    '/solutions',
    '/solutions/ecommerce',
    '/solutions/shopify',
    '/solutions/ikas',
    '/solutions/ticimax',
  ]) {
    const r = await request.get(path);
    expect(r.status(), path).toBe(200);
    const html = await r.text();
    expect(html).not.toMatch(/noindex/);
    if (path !== '/solutions') expect(html).toContain('"@type":"FAQPage"');
  }
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto('/solutions/ecommerce');
  await page.getByRole('button', { name: 'Menüyü aç' }).click();
  const menu = page.getByRole('dialog', { name: 'Site menüsü' });
  await expect(menu).toBeVisible();
  await menu.getByText('Çözümler', { exact: true }).click();
  await expect(menu.getByRole('link', { name: /Ticimax/ })).toBeVisible();
  await menu.getByRole('link', { name: /^Shopify/ }).click();
  await expect(page).toHaveURL(/\/solutions\/shopify/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Shopify/);
});
