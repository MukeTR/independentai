/**
 * E2E — sektör sayfaları (W8; INTEGRATE'te `E2E_PORT=3201 pnpm test:e2e` ile koşulur, W8 worktree'sinde KOŞULMAZ).
 * Kapsam: /sektor dizini 9 kart; /sektor/klinik hero görseli (priority) + h1 + 5 soru + gömülü araç sektör ön-seçili +
 * 3 kontrol + SSS + CTA çifti; /sektor/olmayan → 404; JSON-LD dörtlüsü; 375 px taşma ≤ 1 px.
 */
import { test, expect } from '@playwright/test';
import { testIp } from './ip';

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }, testInfo) => {
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': testIp(testInfo) });
});

test('/sektor dizini: 9 kart, her kart landing’e gider', async ({ page }) => {
  await page.goto('/sektor');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sektörünüzü seçin');
  const cards = page.getByRole('list', { name: 'Sektörler' }).getByRole('link');
  await expect(cards).toHaveCount(9);
  await expect(page.getByRole('link', { name: /Klinik/ }).first()).toHaveAttribute('href', '/sektor/klinik');
});

test('/sektor/klinik: hero, 5 soru, gömülü araç sektör ön-seçili, 3 kontrol, SSS, CTA', async ({ page }) => {
  const res = await page.goto('/sektor/klinik');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Klinik siteleri için yapay zekâ görünürlük testi');

  const hero = page.getByRole('img', { name: /klinik/i }).first();
  await expect(hero).toBeVisible();
  await expect(hero).toHaveAttribute('fetchpriority', 'high');

  await expect(page.getByRole('list', { name: /sorduğu sorular/ }).getByRole('listitem')).toHaveCount(5);

  // Gömülü araç: sektör seçici klinik ile dolu
  const sectorSelect = page.getByLabel(/Sektörünüz/);
  await expect(sectorSelect).toHaveValue('klinik');
  await expect(page.getByLabel('Site adresi')).toBeVisible();

  // 3 kontrol kartı araç linkli
  const checks = page.locator('#kontroller article');
  await expect(checks).toHaveCount(3);
  await expect(checks.first().getByRole('link')).toHaveAttribute('href', /^\/arac\//);

  // SSS 5 soru
  await expect(page.locator('#sss button[aria-expanded]')).toHaveCount(5);

  // CTA çifti
  await expect(page.getByRole('link', { name: 'Yanıt Agency ile konuş' }).first()).toHaveAttribute(
    'href',
    '/contact?src=sektor&sektor=klinik',
  );
  await expect(page.getByRole('link', { name: 'Sitemi tara' }).first()).toHaveAttribute('href', '#arac');

  // Regulated dil: "en iyi" / "garanti" / "sıralama" yok
  const text = (await page.locator('main').innerText()).toLocaleLowerCase('tr');
  for (const w of ['en iyi', 'garanti', 'sıralama', 'hasta garantisi']) expect(text).not.toContain(w);
});

test('/sektor/klinik: JSON-LD Breadcrumb + FAQ + WebPage + Service; aggregateRating yok', async ({ page }) => {
  await page.goto('/sektor/klinik');
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const types = scripts.map((s) => (JSON.parse(s) as { '@type': string })['@type']);
  for (const t of ['BreadcrumbList', 'FAQPage', 'WebPage', 'Service', 'Organization', 'WebSite']) expect(types).toContain(t);
  expect(scripts.join('')).not.toContain('aggregateRating');
  const faq = JSON.parse(scripts[types.indexOf('FAQPage')]!) as { mainEntity: unknown[] };
  expect(faq.mainEntity).toHaveLength(5);
});

test('/sektor/olmayan → 404', async ({ page }) => {
  const res = await page.goto('/sektor/olmayan');
  expect(res?.status()).toBe(404);
});

test('mobil 375 px: /sektor ve /sektor/klinik yatay taşma ≤ 1 px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const url of ['/sektor', '/sektor/klinik']) {
    await page.goto(url);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, url).toBeLessThanOrEqual(1);
  }
});
