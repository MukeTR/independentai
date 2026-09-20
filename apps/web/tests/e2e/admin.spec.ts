/**
 * E2E — admin çekirdeği (W4): KPI şeridi + tıklanabilir kutular, lead paneli (sekmeler, aşama hapları, arama,
 * aksiyon → durum, e-posta göster, CSV linki), duyuru oluştur → landing şeridi (role=status) → kapat → yeniden yüklemede
 * kapalı kalır, taramalar ekranı, kullanıcı araması + rozet, hediye süre diyaloğu, ekran rehberi, mobil taşma ≤1 px.
 * Yazılır, gece programında KOŞULMAZ (INTEGRATE `E2E_PORT=3201 pnpm test:e2e`).
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
const DAY = 86_400_000;

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

async function seedSuperAdmin() {
  const email = `admin-${stamp()}@test.local`;
  const tenant = await prisma.tenant.create({
    data: {
      name: `Admin Ş ${stamp()}`,
      trialEndsAt: new Date(Date.now() + 90 * DAY),
      onboardingCompletedAt: new Date(),
    },
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
  await prisma.alertConfig.create({ data: { tenantId: tenant.id } });
  return { email, tenantId: tenant.id };
}

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('E-posta').fill(email);
  await page.getByLabel('Şifre', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await page.waitForURL(/\/dashboard/);
}

async function expectNoHorizontalOverflow(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll - client).toBeLessThanOrEqual(1);
}

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }, testInfo) => {
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': testIp(testInfo) });
});

test('süper admin: genel bakış KPI şeridi ve kutu → filtreli sayfa', async ({ page }) => {
  const admin = await seedSuperAdmin();
  const host = `kpi-${stamp()}.example`;
  await prisma.publicScan.create({
    data: {
      kind: 'CRAWLER',
      urlHash: `h-${host}`,
      hostname: host,
      score: 42,
      result: {},
      expiresAt: new Date(Date.now() + 30 * DAY),
    },
  });
  await prisma.lead.create({
    data: { hostname: host, scanCount: 1, lastScore: 42, bestScore: 42, kinds: ['CRAWLER'] },
  });
  await login(page, admin.email);

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Genel bakış' })).toBeVisible();
  const scansTile = page.getByRole('link', { name: /^Bugün tarama:/ });
  await expect(scansTile).toBeVisible();
  await expect(page.getByRole('img', { name: /Son 14 gün günlük tarama/ })).toBeVisible();
  await page.getByRole('link', { name: /^Yeni lead:/ }).click();
  await expect(page).toHaveURL(/\/admin\/leads\?status=NEW/);
  await expect(page.getByRole('heading', { name: 'Lead’ler' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Aşama' }).getByRole('link', { name: /Yeni/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('lead paneli: sekme sayıları, arama, Arandı → İletişime geçildi, e-postayı göster, CSV linki', async ({
  page,
}) => {
  const admin = await seedSuperAdmin();
  const host = `lead-${stamp()}.example`;
  await prisma.lead.create({
    data: {
      hostname: host,
      source: 'CONTACT',
      contactName: 'Ayşe Yılmaz',
      contactEmail: `ayse-${stamp()}@musteri.example`,
      company: 'Müşteri A.Ş.',
      message: 'Teklif istiyoruz',
      consentAt: new Date(),
    },
  });
  await login(page, admin.email);

  await page.goto(`/admin/leads?q=${encodeURIComponent(host)}`);
  await expect(
    page.getByRole('navigation', { name: 'Kaynak' }).getByRole('link', { name: /İletişim formu/ }),
  ).toBeVisible();
  const card = page.getByRole('article', { name: host });
  await expect(card).toBeVisible();
  await expect(card.getByText(/a\*\*\*@musteri\.example/)).toBeVisible();
  await expect(card.getByText('Yeni', { exact: true })).toBeVisible();

  await card.getByRole('button', { name: 'Arandı' }).click();
  await expect(card.getByText('İletişime geçildi', { exact: true })).toBeVisible();
  await card.getByText(/aktivite/).click();
  await expect(card.getByText('Arandı', { exact: true }).last()).toBeVisible();

  await card.getByRole('button', { name: 'E-postayı göster' }).click();
  await expect(card.getByRole('status').getByRole('link', { name: /ayse-.*@musteri\.example/ })).toBeVisible();
  const reveal = await prisma.auditLog.count({ where: { action: 'admin.lead_reveal_email' } });
  expect(reveal).toBeGreaterThan(0);

  const csv = page.getByRole('link', { name: 'CSV indir' });
  await expect(csv).toHaveAttribute('href', /\/api\/admin\/leads\/export\?q=/);

  // Detay sayfası
  await card.getByRole('heading', { name: host }).getByRole('link').click();
  await expect(page).toHaveURL(/\/admin\/leads\/[a-z0-9]+/);
  await expect(page.getByRole('heading', { name: 'İletişim (KVKK)' })).toBeVisible();
  await expect(page.getByText('Teklif istiyoruz')).toBeVisible();
  await page.getByRole('button', { name: 'Bu ekran ne işe yarar?' }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: /Lead’ler ekranı/ })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Kapat' }).click();
});

test('duyuru: oluştur → landing şeridinde role=status → kapat → yeniden yüklemede gizli; metin değişince geri gelir', async ({
  page,
}) => {
  const admin = await seedSuperAdmin();
  const text = `Duyuru ${stamp()} — ücretsiz araçlar yayında`;
  await login(page, admin.email);

  await page.goto('/admin/announcements');
  await page.getByRole('button', { name: 'Yeni duyuru' }).click();
  await page.getByLabel(/^Metin/).fill(text);
  await page.getByLabel('Ton').selectOption('PROMO');
  await page.getByLabel('Yerleşim').selectOption('LANDING');
  await page.getByLabel('Bağlantı (isteğe bağlı)').fill('/arac');
  await page.getByLabel('Düğme etiketi').fill('İncele');
  await page.getByRole('button', { name: 'Yayınla' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Duyuru oluşturuldu.' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Duyuru listesi' }).getByText(text)).toBeVisible();

  // Landing (home layout) — INTEGRATE `<AnnouncementBanner placement="LANDING"/>` ekler
  await page.goto('/');
  const banner = page.getByRole('status').filter({ hasText: text });
  await expect(banner).toBeVisible();
  await expect(banner.getByRole('link', { name: /İncele/ })).toHaveAttribute('href', '/arac');
  await banner.getByRole('button', { name: 'Duyuruyu kapat' }).click();
  await expect(page.getByText(text)).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(text)).toHaveCount(0);

  // Metin güncellenince updatedAt değişir → şerit yeniden görünür
  const row = await prisma.announcement.findFirstOrThrow({ where: { text } });
  await prisma.announcement.update({ where: { id: row.id }, data: { text: `${text} (güncel)` } });
  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: `${text} (güncel)` })).toBeVisible();

  // Kapat → görünmez
  await page.goto('/admin/announcements');
  await page.getByRole('switch', { name: new RegExp(`^${text}`) }).click();
  await page.goto('/');
  await expect(page.getByText(`${text} (güncel)`)).toHaveCount(0);
});

test('taramalar: araç × gün, en çok taranan siteler, satır aksiyonları', async ({ page }) => {
  const admin = await seedSuperAdmin();
  const host = `scan-${stamp()}.example`;
  for (let i = 0; i < 2; i += 1) {
    await prisma.publicScan.create({
      data: {
        kind: i ? 'COMMERCE' : 'CRAWLER',
        urlHash: `h-${host}-${i}`,
        hostname: host,
        score: 60,
        result: {},
        partial: i === 1,
        expiresAt: new Date(Date.now() + 30 * DAY),
      },
    });
  }
  await login(page, admin.email);
  await page.goto('/admin/scans');
  await expect(page.getByRole('heading', { name: 'Taramalar' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Araç türüne göre günlük tarama sayısı' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /En çok taranan 20 site/ })).toBeVisible();
  const recent = page.getByRole('table', { name: 'Son taramalar' });
  await expect(recent.getByText(host).first()).toBeVisible();
  await expect(recent.getByText('yarım').first()).toBeVisible();
  const report = recent.getByRole('link', { name: 'Raporu aç' }).first();
  await expect(report).toHaveAttribute('href', /^\/rapor\/[A-Za-z0-9_-]+$/);
  await expect(recent.getByRole('link', { name: 'Yasakla' }).first()).toHaveAttribute(
    'href',
    `/admin/blocked-sites?hostname=${encodeURIComponent(host)}`,
  );
  await recent.getByRole('link', { name: 'Lead’e git' }).first().click();
  await expect(page).toHaveURL(new RegExp(`/admin/leads\\?q=${encodeURIComponent(host)}`));
});

test('kullanıcılar: arama + rozet; şirketler: 7 gün filtresi; hediye süre diyaloğu deneme bitişini uzatır', async ({
  page,
}) => {
  const admin = await seedSuperAdmin();
  const trialTenant = await prisma.tenant.create({
    data: {
      name: `Deneme Biten ${stamp()}`,
      trialEndsAt: new Date(Date.now() + 3 * DAY),
      onboardingCompletedAt: new Date(),
    },
  });
  const email = `biten-${stamp()}@test.local`;
  await prisma.user.create({
    data: {
      tenantId: trialTenant.id,
      email,
      passwordHash: hashPassword(PASSWORD),
      role: 'OWNER',
      emailVerifiedAt: new Date(),
    },
  });
  await login(page, admin.email);

  await page.goto('/admin/users');
  await page.getByRole('searchbox', { name: 'Ara' }).fill(email.toUpperCase());
  await page.getByRole('searchbox', { name: 'Ara' }).press('Enter');
  await expect(page).toHaveURL(/q=/);
  await expect(page.getByText(email).first()).toBeVisible();
  await expect(page.getByText('Deneme', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/passwordHash|scrypt/)).toHaveCount(0);

  await page.goto('/admin/tenants?trial=7d');
  await expect(page.getByRole('link', { name: trialTenant.name }).first()).toBeVisible();
  await page.getByRole('link', { name: trialTenant.name }).first().click();
  await expect(page).toHaveURL(new RegExp(`/admin/tenants/${trialTenant.id}`));
  await page.getByRole('button', { name: 'Hediye süre' }).click();
  const dialog = page.getByRole('dialog', { name: 'Hediye süre tanımla' });
  await dialog.getByLabel('90 gün').check();
  await dialog.getByRole('button', { name: '90 gün tanımla' }).click();
  await expect(page.getByRole('status').filter({ hasText: /90 gün tanımlandı/ })).toBeVisible();
  const after = await prisma.tenant.findUniqueOrThrow({ where: { id: trialTenant.id } });
  expect(after.trialEndsAt.getTime()).toBeGreaterThan(Date.now() + 92 * DAY);
  expect(await prisma.auditLog.count({ where: { action: 'admin.tenant_update', targetId: trialTenant.id } })).toBe(1);
});

test('sıradan OWNER /admin/* göremez; oturumsuz /login', async ({ page }) => {
  const tenant = await prisma.tenant.create({
    data: {
      name: `Sıradan ${stamp()}`,
      trialEndsAt: new Date(Date.now() + 90 * DAY),
      onboardingCompletedAt: new Date(),
    },
  });
  const email = `owner-${stamp()}@test.local`;
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email,
      passwordHash: hashPassword(PASSWORD),
      role: 'OWNER',
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.alertConfig.create({ data: { tenantId: tenant.id } });
  await page.goto('/admin/leads');
  await expect(page).toHaveURL(/\/login/);
  await login(page, email);
  await page.goto('/admin/leads');
  await expect(page).toHaveURL(/\/dashboard/);
  const res = await page.request.get('/api/admin/leads');
  expect(res.status()).toBe(403);
});

test('mobil: admin sayfalarında yatay taşma ≤ 1 px', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'yalnız mobil projede');
  const admin = await seedSuperAdmin();
  await login(page, admin.email);
  for (const path of [
    '/admin',
    '/admin/leads',
    '/admin/scans',
    '/admin/users',
    '/admin/tenants',
    '/admin/announcements',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});
