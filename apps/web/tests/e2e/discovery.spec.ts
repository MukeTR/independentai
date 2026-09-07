/**
 * E2E — AI Trafiği (Discovery) modülü: boş durum → site ekleme sihirbazı → snippet (anahtar bir kez)
 * → kurulum sağlığı "script bulunamadı" uyarısı → URL tabanlı hedef ekleme. Mobilde yatay taşma yok.
 * Gerçek Next sunucusu (3200) + izole test DB; dışarı ağ çağrısı yapılmaz (meta doğrulama tetiklenmez).
 */
import { test, expect, type Page } from '@playwright/test';

// Giriş rate limiti (IP başına 10/15 dk) dosyalar arasında paylaşılmasın: her spec kendi sahte IP'sini gönderir.
test.use({ extraHTTPHeaders: { 'x-forwarded-for': '203.0.113.31' } });
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
  const email = `discovery-${stamp()}@test.local`;
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Discovery Tenant',
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

test('boş durum → site ekle → snippet görünür → kurulum uyarısı → URL tabanlı hedef', async ({ page }) => {
  const { email, tenant } = await seedOwner();
  await login(page, email);

  await page.goto('/dashboard/discovery');
  await expect(page.getByRole('heading', { level: 1, name: 'AI Trafiği' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Henüz izlenen site yok' })).toBeVisible();
  // Üç kanalın ayrımı boş durumda da vaat edilir (aynı ifade birden çok yerde geçebilir)
  await expect(page.getByText(/AI crawler istekleri/).first()).toBeVisible();

  const openBtn = page.getByRole('button', { name: 'İlk siteni ekle' });
  await expect(openBtn).toBeEnabled();
  await openBtn.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Site ekle' })).toBeVisible();

  const domain = `sensor-${stamp()}.example.com`;
  await dialog.getByLabel('Alan adı').fill(domain);
  await dialog.getByLabel('Site türü').selectOption('saas');
  await dialog.getByRole('button', { name: 'Devam' }).click();

  // Snippet ekranı: anahtar bir kez gösterilir
  await expect(dialog.getByRole('heading', { name: /Snippet/ })).toBeVisible();
  await expect(dialog.getByText(/bir daha gösterilmez/)).toBeVisible();
  const snippet = dialog.locator('pre').first();
  await expect(snippet).toContainText('data-site="iais_');
  await expect(snippet).toContainText('/sensor/v1.js');
  await expect(snippet).toContainText('<script async');

  // Sunucuda gerçekten oluştu ve ham anahtar saklanmadı
  const row = await prisma.trackedSite.findFirstOrThrow({ where: { tenantId: tenant.id } });
  expect(row.domain).toBe(domain);
  expect(row.publicKeyHash).toHaveLength(64);
  const snippetText = (await snippet.textContent()) ?? '';
  const key = /data-site="(iais_[^"]+)"/.exec(snippetText)?.[1];
  expect(key).toBeTruthy();
  expect(row.publicKeyHash).not.toContain(key!);

  await dialog.getByRole('button', { name: 'Bitir' }).click();
  await expect(dialog).toBeHidden();

  // Kurulum sağlığı: tarayıcı olayı gelmediği için "script bulunamadı" uyarısı
  await expect(page.getByRole('heading', { name: domain })).toBeVisible();
  await expect(page.getByText(/Script sitede bulunamadı/)).toBeVisible();
  await expect(page.getByText(/Tarayıcı: bağlı değil/)).toBeVisible();
  await expect(page.getByText(/Crawler ölçümü için sunucu\/edge bağlantısı gerekir/)).toBeVisible();
  // Anahtar listede tekrar gösterilmez
  const sitesApi = await page.request.get('/api/discovery/sites');
  expect(sitesApi.status()).toBe(200);
  const body = await sitesApi.text();
  expect(body).not.toContain(key!);
  expect(body).not.toContain('publicKeyHash');
  expect(body).not.toContain('ingestSecretEnc');

  // Hedefler: URL tabanlı hedef ekle
  await page.getByRole('tab', { name: 'Hedefler' }).click();
  await expect(page.getByRole('heading', { name: 'Dönüşüm hedefleri' })).toBeVisible();
  await page.getByLabel('Hedef adı').fill('Teşekkür sayfası');
  await page.getByLabel('Eşleştirme yöntemi').selectOption('PATH');
  await page.getByLabel('URL yolu').fill('/tesekkurler');
  await page.getByRole('button', { name: 'Hedef ekle' }).click();

  await expect(page.getByText('Teşekkür sayfası')).toBeVisible();
  // Yol deseni hedef kartında gösterilir (form ipucu metni de yolu içerdiği için kesin eşleşme kullanılır)
  await expect(page.getByText('URL yolu: /tesekkurler')).toBeVisible();
  const goal = await prisma.siteGoal.findFirstOrThrow({ where: { trackedSiteId: row.id } });
  expect(goal.matchMethod).toBe('PATH');
  expect(goal.pathPattern).toBe('/tesekkurler');
  expect(goal.isActive).toBe(true);
});

test('ölçüm sekmesi üç kanalı ayrı gösterir; crawler isteği ziyaret sayılmaz', async ({ page }) => {
  const { email } = await seedOwner();
  await login(page, email);
  await page.goto('/dashboard/discovery');

  // Site ekle (API üzerinden — sihirbaz akışı ilk testte doğrulandı)
  const created = await page.request.post('/api/discovery/sites', {
    data: { domain: `kanal-${stamp()}.example.com`, siteKind: 'service' },
  });
  expect(created.status()).toBe(201);
  const createdBody = (await created.json()) as { publicKey: string; site: { id: string } };
  expect(createdBody.publicKey.startsWith('iais_')).toBe(true);

  await page.goto('/dashboard/discovery');
  await page.getByRole('tab', { name: 'Ölçüm' }).click();
  await expect(page.getByRole('heading', { name: 'AI kaynaklı ziyaret' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'AI crawler isteği' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sentetik görünürlük ölçümü' })).toBeVisible();
  await expect(page.getByText(/İnsan ziyareti, öneri veya satış anlamına gelmez/)).toBeVisible();
  await expect(page.getByText(/yalnızca user-agent iddiasıdır/)).toBeVisible();

  // Site türü hizmet: sepet/ürün/ciro kartı gösterilmez
  await expect(page.getByRole('heading', { name: 'E-ticaret sinyalleri' })).toHaveCount(0);
});

test('mobil 375 px: yatay taşma yok (panel ve sihirbaz)', async ({ page }) => {
  const { email } = await seedOwner();
  await login(page, email);
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto('/dashboard/discovery');
  await expect(page.getByRole('heading', { level: 1, name: 'AI Trafiği' })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, '/dashboard/discovery yatay taşma').toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: 'İlk siteni ekle' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const dialogOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(dialogOverflow, 'site ekleme sihirbazı yatay taşma').toBeLessThanOrEqual(1);
});
