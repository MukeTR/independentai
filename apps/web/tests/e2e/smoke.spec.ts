/**
 * E2E duman testleri — gerçek Next production sunucusu (port 3200) + izole test DB + mock AI.
 * Akışlar: kayıt → onboarding → panel; giriş/çıkış; soru ekle + çalıştır; rakip; Viewer yazma reddi;
 * API token oluştur/kullan/iptal; public araç limiti; mobil gezinme; 404; güvenlik başlıkları.
 */
import { test, expect, type Page } from '@playwright/test';
import { testIp } from './ip';

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

/** Giriş yapar; başarı bekleniyorsa panel URL'sine yönlenmeyi bekler (çerez yazılmadan sonraki sayfaya gidilmesin). */
async function login(page: Page, email: string, password = PASSWORD, expectSuccess = true) {
  await page.goto('/login');
  await page.getByLabel('E-posta').fill(email);
  await page.getByLabel('Şifre', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  if (expectSuccess) await page.waitForURL(/\/dashboard/);
}

test.describe.configure({ mode: 'serial' });

// Her teste kendi sahte IP'si: IP başına hız sınırı sayaçları testler arasında birikmesin.
test.beforeEach(async ({ page }, testInfo) => {
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': testIp(testInfo) });
});

test('kayıt → onboarding → panel; ayarlar; çıkış', async ({ page }) => {
  const email = `e2e-${stamp()}@test.local`;
  await page.goto('/register');
  await page.getByLabel('Şirket adı').fill('E2E Şirketi');
  await page.getByLabel('E-posta').fill(email);
  await page.getByLabel('Şifre', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: '6 ay ücretsiz başlat' }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  // Adım 1
  await page.getByRole('textbox', { name: 'Marka adı' }).fill('E2E Marka');
  await page.getByRole('textbox', { name: 'Alternatif yazımlar / domain' }).fill('e2emarka.com');
  await page.getByRole('button', { name: 'Alternatif yazımlar / domain ekle' }).click();
  await page.getByRole('button', { name: 'Devam' }).click();
  // Adım 2
  await page.getByRole('textbox', { name: 'Rakip marka adı' }).fill('Rakip A');
  await page.getByRole('button', { name: 'Rakip marka adı ekle' }).click();
  await page.getByRole('button', { name: 'Devam' }).click();
  // Adım 3
  await page.getByRole('textbox', { name: 'İzlenecek soru' }).fill('En iyi e2e test aracı hangisi?');
  await page.getByRole('button', { name: 'İzlenecek soru ekle' }).click();
  await page.getByRole('button', { name: 'Panele git' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /Merhaba, E2E Şirketi/ })).toBeVisible();

  // Onboarding'e geri dönülmez
  await page.goto('/onboarding');
  await expect(page).toHaveURL(/\/dashboard/);

  // Ayarlar: marka formu dolu, ekip ve hesap bölümleri var
  await page.goto('/dashboard/settings');
  await expect(page.getByLabel('Marka adı (ana)')).toHaveValue('E2E Marka');
  await expect(page.getByRole('heading', { name: 'Üyeler ve davetler' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hesabı sil' })).toBeVisible();

  // Çıkış
  await page.getByRole('button', { name: 'Çıkış yap' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});

test('giriş: yanlış şifre hata, doğru şifre panel; soru ekle ve çalıştır; rakip ekle/sil', async ({ page }) => {
  const email = `e2e-${stamp()}@test.local`;
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Giriş Tenant',
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
  await prisma.brand.create({ data: { tenantId: tenant.id, name: 'GirişMarka', isOwn: true } });

  await login(page, email, 'yanlis1234', false);
  await expect(page.getByText('E-posta veya şifre hatalı')).toBeVisible();
  await login(page, email);
  await expect(page).toHaveURL(/\/dashboard/);

  // Soru ekle
  await page.goto('/dashboard/prompts');
  await page.getByRole('textbox', { name: 'İzlenecek soru' }).fill('E2E için en iyi POS yazılımı hangisi?');
  await page.getByRole('button', { name: 'Ekle' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Soru eklendi' })).toBeVisible();
  await expect(page.getByRole('link', { name: /E2E için en iyi POS/ })).toBeVisible({ timeout: 20_000 });

  // Detay + şimdi çalıştır (mock). Liste, ekleme sonrası router.refresh ile yeniden render edilir;
  // tıklama o ana denk gelirse gezinme iptal olur → href'i okuyup doğrudan git (yarış yok).
  const detailHref = await page.getByRole('link', { name: /E2E için en iyi POS/ }).getAttribute('href');
  expect(detailHref).toMatch(/\/dashboard\/prompts\/.+/);
  await page.goto(detailHref!);
  await expect(page).toHaveURL(/\/dashboard\/prompts\//);
  // Soru eklenince ilk ölçüm otomatik başlar; sayfa kendini yeniler ve MOCK etiketli sonuçlar görünür.
  await expect(page.getByText(/MOCK/).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: 'Şimdi çalıştır' })).toBeEnabled({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Şimdi çalıştır' }).click();
  await expect(page.getByText(/Ölçüm tamamlandı|çalıştırma zaten devam ediyor|model hata verdi/)).toBeVisible({
    timeout: 60_000,
  });

  // Rakip ekle ve onaylı sil
  await page.goto('/dashboard/competitors');
  await page.getByRole('textbox', { name: 'Rakip adı' }).fill('Rakip Z');
  const addRes = page.waitForResponse((r) => r.url().includes('/api/competitors') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Rakip ekle' }).click();
  expect((await addRes).status()).toBe(201);
  await expect(page.getByText('Rakip Z', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Rakip Z rakibini sil' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const delRes = page.waitForResponse(
    (r) => r.url().includes('/api/competitors/') && r.request().method() === 'DELETE',
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Sil' }).click();
  expect((await delRes).status()).toBe(200);
  await expect(page.getByText('Rakip Z', { exact: true })).toHaveCount(0);
});

test('Viewer: yazma butonları kapalı ve API 403; API token oluştur → kullan → iptal', async ({ page, request }) => {
  const ownerEmail = `owner-${stamp()}@test.local`;
  const viewerEmail = `viewer-${stamp()}@test.local`;
  const tenant = await prisma.tenant.create({
    data: { name: 'Roller', trialEndsAt: new Date(Date.now() + 90 * 86_400_000), onboardingCompletedAt: new Date() },
  });
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: ownerEmail,
      passwordHash: hashPassword(PASSWORD),
      role: 'OWNER',
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: viewerEmail,
      passwordHash: hashPassword(PASSWORD),
      role: 'VIEWER',
      emailVerifiedAt: new Date(),
    },
  });

  await login(page, viewerEmail);
  await page.goto('/dashboard/prompts');
  await expect(page.getByText(/Görüntüleyici rolündesiniz/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ekle' })).toBeDisabled();
  const res = await page.request.post('/api/prompts', { data: { text: 'Viewer yazmayı dener' } });
  expect(res.status()).toBe(403);
  await page.goto('/dashboard/api');
  await expect(page.getByText(/yalnızca hesap sahibi/)).toBeVisible();
  await page.getByRole('button', { name: 'Çıkış yap' }).click();
  await page.waitForURL(/\/$/); // çıkış yönlendirmesi bitmeden yeni gezinme başlatma (ERR_ABORTED)

  await login(page, ownerEmail);
  await page.goto('/dashboard/api');
  await page.getByRole('textbox', { name: 'Yeni API token' }).fill('E2E Token');
  await page.getByRole('button', { name: 'Oluştur' }).click();
  const tokenEl = page.locator('code').filter({ hasText: /^iai_live_/ });
  await expect(tokenEl).toBeVisible();
  const token = (await tokenEl.textContent())!.trim();

  const api = await request.get('/api/v1/visibility?days=7', { headers: { authorization: `Bearer ${token}` } });
  expect(api.status()).toBe(200);
  expect(api.headers()['x-ratelimit-limit']).toBe('60');
  const body = await api.json();
  expect(body).toHaveProperty('visibility_score');

  await page.getByRole('button', { name: 'E2E Token tokenını iptal et' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'İptal et' }).click();
  await expect(page.getByText('E2E Token')).toHaveCount(0);
  const after = await request.get('/api/v1/visibility', { headers: { authorization: `Bearer ${token}` } });
  expect(after.status()).toBe(401);
});

test('public araçlar: rank-checker çalışır ve saatlik limit 429 döner; docs/api indekslenebilir', async ({
  page,
  request,
}) => {
  await page.goto('/arac/chatgpt-rank-checker');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const ip = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
  let last = 0;
  for (let i = 0; i < 9; i++) {
    const r = await request.post('/api/tools/rank-check', {
      data: { brand: 'Marka', prompt: 'En iyi araç?', provider: 'OPENAI' },
      headers: { 'x-forwarded-for': ip },
    });
    last = r.status();
  }
  expect(last).toBe(429);
  const docs = await request.get('/docs/api');
  expect(docs.status()).toBe(200);
  expect(await docs.text()).not.toMatch(/noindex/);
});

test('mobil (375px): panel gezinmesi, yatay taşma yok; 404 sayfası; güvenlik başlıkları', async ({
  page,
  request,
  isMobile,
}) => {
  const email = `mobil-${stamp()}@test.local`;
  const tenant = await prisma.tenant.create({
    data: { name: 'Mobil', trialEndsAt: new Date(Date.now() + 90 * 86_400_000), onboardingCompletedAt: new Date() },
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
  await login(page, email);
  await expect(page).toHaveURL(/\/dashboard/);
  for (const path of [
    '/dashboard',
    '/dashboard/prompts',
    '/dashboard/competitors',
    '/dashboard/settings',
    '/dashboard/api',
    '/dashboard/alerts',
  ]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${path} yatay taşma`).toBeLessThanOrEqual(1);
  }
  await page.getByRole('link', { name: 'Rakipler' }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/competitors/);
  void isMobile;

  const nf = await request.get('/olmayan-sayfa-xyz');
  expect(nf.status()).toBe(404);
  const home = await request.get('/');
  const h = home.headers();
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['access-control-allow-origin']).toBeUndefined();
  const health = await request.get('/api/health');
  expect(health.status()).toBe(200);
  const cron = await request.get('/api/cron/daily-run');
  expect(cron.status()).toBe(401);
});
