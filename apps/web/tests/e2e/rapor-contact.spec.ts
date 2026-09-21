/**
 * E2E — kalıcı rapor (/rapor/<token>), iletişim formu (/contact), araç hub'ı (/arac), demo turu (/demo).
 * Yazıldı, gece programında KOŞULMAZ (INTEGRATE sonrası `pnpm build && pnpm test:e2e`).
 * Rapor seed'i doğrudan Prisma ile; token sunucuyla aynı formülle (REPORT_TOKEN_SECRET ?? JWT_SECRET) üretilir.
 */
import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';
import { testIp } from './ip';

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.TEST_DATABASE_URL ?? 'postgresql://postgres@127.0.0.1:5499/independentai_test' },
  },
});
const stamp = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** server/report-token.ts ile aynı formül (test süreci sunucuyla aynı env'i görür). */
function signReportToken(scanId: string): string {
  const dedicated = process.env.REPORT_TOKEN_SECRET;
  const secret =
    dedicated && dedicated.length >= 16
      ? dedicated
      : (process.env.JWT_SECRET ?? 'test-secret-test-secret-test-secret-32chars!!');
  const sig = createHmac('sha256', secret).update(scanId).digest('hex').slice(0, 24);
  return Buffer.from(`${scanId}.${sig}`, 'utf8').toString('base64url');
}

const RESULT = {
  url: 'https://e2e-rapor.example/',
  finalUrl: 'https://e2e-rapor.example/',
  hostname: 'e2e-rapor.example',
  score: 41,
  breakdown: { access: 30, indexability: 60, discoverability: 40, content: 50 },
  axes: [
    { key: 'access', label: 'Bot erişimi', weight: 30, description: 'robots.txt matrisi' },
    { key: 'indexability', label: 'İndekslenebilirlik', weight: 25, description: 'meta robots, canonical' },
    { key: 'discoverability', label: 'Keşfedilebilirlik', weight: 20, description: 'sitemap, llms.txt' },
    { key: 'content', label: 'İçerik erişimi', weight: 25, description: 'metin oranı' },
  ],
  findings: [
    { category: 'access', status: 'fail', title: 'GPTBot engelli', detail: 'robots.txt Disallow', weight: 50 },
    { category: 'access', status: 'fail', title: 'ClaudeBot engelli', detail: 'robots.txt Disallow', weight: 30 },
    { category: 'access', status: 'fail', title: 'PerplexityBot engelli', detail: 'robots.txt Disallow', weight: 20 },
    { category: 'indexability', status: 'warn', title: 'Canonical yok', detail: 'rel=canonical eksik', weight: 20 },
    { category: 'discoverability', status: 'pass', title: 'sitemap.xml var', detail: 'Erişilebilir', weight: 30 },
  ],
  recommendations: [
    {
      title: 'AI botlarına izin verin',
      difficulty: 'Kolay',
      impact: 'Yüksek',
      detail: 'robots.txt içinde GPTBot, ClaudeBot ve PerplexityBot için Allow satırı ekleyin.',
      category: 'access',
    },
  ],
  fetchedAt: new Date().toISOString(),
  partial: false,
  waf: false,
};

async function seedScan(opts: { hostname: string; expiresInMs?: number }) {
  const scan = await prisma.publicScan.create({
    data: {
      kind: 'CRAWLER',
      urlHash: `e2e-${stamp()}`,
      hostname: opts.hostname,
      score: 41,
      result: { ...RESULT, url: `https://${opts.hostname}/`, hostname: opts.hostname },
      partial: false,
      expiresAt: new Date(Date.now() + (opts.expiresInMs ?? 30 * 86_400_000)),
    },
    select: { id: true },
  });
  return { id: scan.id, token: signReportToken(scan.id) };
}

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }, testInfo) => {
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': testIp(testInfo) });
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('rapor sayfası: hüküm, skor, öneriler, CTA satırı, noindex; JSON ucu 200', async ({ page }) => {
  const host = `e2e-rapor-${stamp()}.example`;
  const { token } = await seedScan({ hostname: host });

  await page.goto(`/rapor/${token}`);
  await expect(page.getByRole('heading', { level: 1, name: host })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: /3 kritik, 1 uyarı, 1 tamam/ })).toBeVisible();
  await expect(page.getByText('Yanıt ile hazırlandı')).toBeVisible();
  await expect(page.getByText(/5 kontrol/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Bunları biz düzeltelim' })).toHaveAttribute(
    'href',
    new RegExp(`/contact\\?src=rapor&site=${host}&token=`),
  );
  await expect(page.getByRole('link', { name: 'Kendim düzelteceğim' })).toHaveAttribute('href', '#oneriler');
  await expect(page.getByRole('link', { name: 'Yeniden tara' })).toHaveAttribute(
    'href',
    `/arac/ai-crawler-testi?url=${host}`,
  );
  await expect(page.getByRole('link', { name: 'WhatsApp’ta paylaş' })).toHaveAttribute('href', /wa\.me\/\?text=/);
  await expect(page.getByRole('button', { name: 'Bağlantıyı kopyala' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Skor nasıl hesaplanır?' })).toBeVisible();
  await expect(page.getByText('AI botlarına izin verin')).toBeVisible();
  await expect(page.getByText(/gün daha erişilebilir/)).toBeVisible();
  await expect(page.getByText(/kişisel verinizi yapay zekâ servislerine göndermiyoruz/).first()).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

  const res = await page.request.get(`/api/rapor/${token}`);
  expect(res.status()).toBe(200);
  const json = (await res.json()) as { hostname: string; score: number };
  expect(json.hostname).toBe(host);
  expect(json.score).toBe(41);
  expect(await res.text()).not.toMatch(/visitorHash|tenantId|urlHash/);

  const og = await page.request.get(`/rapor/${token}/opengraph-image`);
  expect(og.status()).toBe(200);
  expect(og.headers()['content-type']).toContain('image/png');
});

test('rapor: süresi dolmuş → 410 ekranı; bilinmeyen → 404', async ({ page }) => {
  const { token } = await seedScan({ hostname: `e2e-gone-${stamp()}.example`, expiresInMs: -1000 });
  await page.goto(`/rapor/${token}`);
  await expect(page.getByRole('heading', { level: 1, name: /Raporun süresi doldu/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Yeniden tara' })).toBeVisible();
  const gone = await page.request.get(`/api/rapor/${token}`);
  expect(gone.status()).toBe(410);

  const missing = await page.goto('/rapor/bilinmeyen-token-123');
  expect(missing?.status()).toBe(404);
});

test('rapor mobil (375 px): yatay taşma ≤ 1 px', async ({ page }) => {
  const { token } = await seedScan({ hostname: `e2e-mobil-cok-uzun-alan-adi-${stamp()}.example` });
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(`/rapor/${token}`);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('iletişim formu: ön-doldurma, KVKK zorunlu, gönderim → teşekkür (süre taahhüdü yok), Lead + rapor token', async ({
  page,
}) => {
  const host = `e2e-contact-${stamp()}.example`;
  const { token } = await seedScan({ hostname: host });
  await page.goto(`/contact?src=rapor&site=${host}&token=${token}&konu=ajans#form`);

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Bize yazın');
  await expect(page.getByLabel('Web sitesi', { exact: true })).toHaveValue(host);
  await expect(page.getByLabel('Konu', { exact: true })).toHaveValue('ajans');

  const email = `e2e-${stamp()}@test.local`;
  await page.getByLabel('Ad soyad').fill('E2E Kişi');
  await page.getByLabel('E-posta', { exact: true }).fill(email);
  await page.getByLabel('Mesajınız').fill('Raporu birlikte değerlendirmek istiyoruz.');

  // KVKK işaretsiz → hata (istemci), Lead yok
  await page.getByRole('button', { name: 'Mesajı gönder' }).click();
  await expect(page.getByRole('alert')).toContainText('KVKK');
  expect(await prisma.lead.count({ where: { contactEmail: email } })).toBe(0);

  await page.getByLabel(/KVKK aydınlatma metnini/).check();
  await page.getByRole('button', { name: 'Mesajı gönder' }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Mesajınız ulaştı');
  await expect(status).not.toContainText(/saat|gün içinde/);
  await expect(status.getByRole('link', { name: /kalıcı rapor bağlantısı/ })).toHaveAttribute(
    'href',
    `/rapor/${token}`,
  );

  const lead = await prisma.lead.findUnique({ where: { hostname: host } });
  expect(lead?.source).toBe('CONTACT');
  expect(lead?.contactEmail).toBe(email);
  expect(lead?.topic).toBe('ajans');
  expect(lead?.consentAt).not.toBeNull();
  expect(lead?.iysConsentAt).toBeNull();
  expect(lead?.lastReportToken).toBe(token);
  const logs = await prisma.notificationLog.findMany({
    where: { kind: 'contact' },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });
  expect(logs.length).toBe(1);
});

test('iletişim kartları anchor’ları ve form anchor’ı var', async ({ page }) => {
  await page.goto('/contact');
  for (const id of ['form', 'sales', 'press']) expect(await page.locator(`#${id}`).count()).toBe(1);
  await page.getByRole('link', { name: 'Satış görüşmesi iste' }).click();
  await expect(page).toHaveURL(/konu=satis#form/);
  await expect(page.getByLabel('Konu', { exact: true })).toHaveValue('satis');
  // Form zaten mount'luyken ikinci kart: Konu seçimi arama parametresiyle güncellenmeli
  await page.getByRole('link', { name: 'Basın talebi gönder' }).click();
  await expect(page).toHaveURL(/konu=basin#form/);
  await expect(page.getByLabel('Konu', { exact: true })).toHaveValue('basin');
});

test('araç hub’ı: URL kutusu tüm URL araçlarına ?url= taşır; mobil taşma yok', async ({ page }) => {
  await page.goto('/arac?url=firma.com');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('hazır mı');
  const links = page.locator('a[href^="/arac/"][href*="?url=firma.com"]');
  expect(await links.count()).toBeGreaterThanOrEqual(3);
  // Rank checker'lar URL almaz
  await expect(page.locator('a[href="/arac/chatgpt-rank-checker"]')).toHaveCount(1);
  await page.setViewportSize({ width: 375, height: 800 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('demo turu: dört adım, demo-login yok, satış CTA’sı forma gider', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('60 saniyede');
  await expect(page.getByRole('link', { name: /Panel demosu için satış görüşmesi/ })).toHaveAttribute(
    'href',
    '/contact?src=demo&konu=satis#form',
  );
  expect(await page.locator('a[href*="demo=1"]').count()).toBe(0);
  expect(await page.locator('a[href*="demo-login"]').count()).toBe(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index/);
});
