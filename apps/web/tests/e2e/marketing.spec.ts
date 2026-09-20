/**
 * E2E — pazarlama sayfaları ve landing dürüstlük etiketleri (W7). Yazılır, gece programında KOŞULMAZ;
 * INTEGRATE `E2E_PORT=3201 pnpm test:e2e` ile çalıştırır. DB gerektirmez; yalnızca herkese açık sayfalar.
 *
 * Kapsam: /yanit-agency, /bot, /solutions/agencies (#on-analiz, #ortaklik), /features anchor'ları,
 * /use-cases sektör kartları, /about, /docs#skorlar, rank checker FAQ JSON-LD, landing "temsili" ve
 * "Yapılacaklar · yakında" etiketleri, mailto yokluğu, 375 px taşma.
 */
import { test, expect, type Page } from '@playwright/test';
import { testIp } from './ip';

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }, testInfo) => {
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': testIp(testInfo) });
});

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function jsonLdTypes(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => {
      try {
        const j = JSON.parse(s.textContent ?? '{}') as { '@type'?: string };
        return j['@type'] ?? '';
      } catch {
        return 'INVALID';
      }
    }),
  );
}

test('landing: temsili etiketler, Yapılacaklar · yakında rozeti, Yanıt Agency yolu', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sizi mi öneriyor');
  // Temsili etiketleri görünür (hero, CEO ekranı, vaka)
  await expect(page.getByText('Temsili senaryo — gerçek vaka değil')).toBeVisible();
  await expect(page.getByText('Yapılacaklar · yakında').first()).toBeVisible();
  // Uydurma alan adı yok; .example kullanılır
  const html = await page.content();
  expect(html).not.toContain('acme.com');
  expect(html).toContain('acme.example');
  expect(html).not.toMatch(/mailto:/);
  // Agency bağlantıları /yanit-agency'e gider
  const agencyLinks = await page.locator('a[href="/yanit-agency"]').count();
  expect(agencyLinks).toBeGreaterThanOrEqual(2);
  // Kapanış CTA teklif satırı (OFFER)
  await expect(page.getByText(/gün deneme, kart yok/)).toBeVisible();
});

test('/yanit-agency: beta rozeti, teklifle, fiyat OFFER, garanti yok, Service + FAQ JSON-LD', async ({ page }) => {
  await page.goto('/yanit-agency');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Uygulamayı da biz yapalım');
  await expect(page.getByText('beta', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('teklifle', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/₺[\d.]+\/ay’dan/).first()).toBeVisible();
  const text = (await page.locator('main').innerText()).toLocaleLowerCase('tr');
  expect(text).not.toMatch(/garantili|garanti ederiz|garanti veriyoruz/);
  expect(text).not.toMatch(/\bpr\b/);
  const types = await jsonLdTypes(page);
  expect(types).toContain('Service');
  expect(types).toContain('FAQPage');
  expect(types).not.toContain('INVALID');
  await expect(page.locator('a[href="/contact?src=agency"]').first()).toBeVisible();
});

test('/bot: UA dizesi ve robots.txt engelleme örneği', async ({ page }) => {
  await page.goto('/bot');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('YanitBot');
  await expect(page.getByText(/YanitBot\/1\.0 \(\+https:\/\//).first()).toBeVisible();
  await expect(page.getByText('User-agent: YanitBot')).toBeVisible();
  await expect(page.locator('#engelleme')).toBeVisible();
});

test('/solutions/agencies: ortaklık programı, #on-analiz ve #ortaklik, Ben ajansım CTA', async ({ page }) => {
  await page.goto('/solutions/agencies#ortaklik');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('portföy');
  await expect(page.locator('#on-analiz')).toBeVisible();
  await expect(page.locator('#ortaklik')).toBeVisible();
  await expect(page.locator('a[href="/register?src=partner"]').first()).toContainText('Ben ajansım');
  await expect(page.locator('a[href="/yanit-agency"]').first()).toBeVisible();
});

test('/features: Ölç/Anla/Düzelt anchor id’leri ve yetenek matrisi', async ({ page }) => {
  await page.goto('/features');
  for (const id of ['tracking', 'analytics', 'detection', 'tools', 'reports', 'capabilities']) {
    await expect(page.locator(`#${id}`), `#${id}`).toHaveCount(1);
  }
  await expect(page.getByText('Yapılacaklar listesi')).toBeVisible();
  const yakinda = await page.getByText('yakında', { exact: true }).count();
  expect(yakinda).toBeGreaterThanOrEqual(3);
});

test('/use-cases: 9 sektör kartı görselli, #saas #enterprise id’leri', async ({ page }) => {
  await page.goto('/use-cases');
  await expect(page.locator('a[href^="/sektor/"]')).toHaveCount(9);
  await expect(page.locator('#saas')).toHaveCount(1);
  await expect(page.locator('#enterprise')).toHaveCount(1);
  const alts = await page
    .locator('a[href^="/sektor/"] img')
    .evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).alt));
  expect(alts.length).toBe(9);
  for (const alt of alts) expect(alt.length).toBeGreaterThan(5);
});

test('/about: #mission #team, eski ad yalnız "eski adıyla" cümlesinde, TÜİK yılları doğru', async ({ page }) => {
  await page.goto('/about');
  await expect(page.locator('#mission')).toHaveCount(1);
  await expect(page.locator('#team')).toHaveCount(1);
  const text = await page.locator('main').innerText();
  const oldBrand = text.match(/Independent AI/g) ?? [];
  expect(oldBrand.length).toBe(1);
  expect(text).toContain('eski adıyla Independent AI');
  expect(text).toMatch(/%92,3[\s\S]{0,160}2026/);
  expect(text).toMatch(/%19,2[\s\S]{0,160}2025/);
});

test('/docs#skorlar ve /docs/api#tools mevcut', async ({ page }) => {
  await page.goto('/docs#skorlar');
  await expect(page.locator('#skorlar')).toBeVisible();
  await expect(page.getByText('/api/tools/geo-audit').first()).toBeVisible();
  await page.goto('/docs/api#tools');
  await expect(page.locator('#tools')).toBeVisible();
});

test('rank checker: FAQPage JSON-LD ve görünür SSS', async ({ page }) => {
  await page.goto('/arac/chatgpt-rank-checker');
  const types = await jsonLdTypes(page);
  expect(types).toContain('FAQPage');
  expect(types).toContain('BreadcrumbList');
  await expect(page.getByRole('heading', { name: 'Sık sorulanlar' })).toBeVisible();
});

test('mobil 375 px: taşma ≤ 1 px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const path of ['/', '/yanit-agency', '/bot', '/solutions/agencies', '/features', '/use-cases', '/about']) {
    await page.goto(path);
    await noHorizontalOverflow(page);
  }
});
