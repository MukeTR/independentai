import { describe, expect, it } from 'vitest';
import { detectPlatform, PLATFORM_LABELS } from '@/server/commerce/platform-detect';

const SHOPIFY_HTML = `<!doctype html><html><head>
<link rel="preconnect" href="https://cdn.shopify.com" crossorigin>
<script>window.Shopify = window.Shopify || {}; Shopify.theme = {"name":"Dawn","id":1};</script>
</head><body><div id="shopify-section-header" class="shopify-section"></div></body></html>`;

const IKAS_HTML = `<!doctype html><html><head>
<link rel="preload" href="https://cdn.myikas.com/sf/assets/app.js" as="script">
<script>window.__ikas = {"storeId":"abc"};</script>
</head><body><div data-ikas="storefront"></div></body></html>`;

const TICIMAX_HTML = `<!doctype html><html><head><title>Mağaza</title>
<script src="/Scripts/ticimax/core.js"></script>
</head><body>
<img src="/Uploads/UrunResimleri/thumb/urun-1.jpg" alt="ürün">
<script>TicimaxFunctions.init(); tmx_sepet = [];</script>
</body></html>`;

const WOO_HTML = `<!doctype html><html><body class="woocommerce woocommerce-page">
<link rel="stylesheet" href="https://example.com/wp-content/plugins/woocommerce/assets/css/woocommerce.css">
</body></html>`;

describe('detectPlatform', () => {
  it('Shopify: CDN + tema + section sınıfları → SHOPIFY, bağlayıcı var', () => {
    const d = detectPlatform(SHOPIFY_HTML);
    expect(d.platform).toBe('SHOPIFY');
    expect(d.connectorAvailable).toBe(true);
    expect(d.confidence).toBeGreaterThanOrEqual(0.9);
    expect(d.evidence).toContain('cdn.shopify.com varlıkları');
  });

  it('Shopify: yalnızca x-shopid başlığı da yeter', () => {
    const d = detectPlatform('<html><body>merhaba</body></html>', new Headers({ 'x-shopid': '12345' }));
    expect(d.platform).toBe('SHOPIFY');
    expect(d.evidence).toEqual(['x-shopid / x-shopify-stage başlığı']);
  });

  it('myshopify.com alan adı puanı artırır ve güven 1 ile sınırlanır', () => {
    const d = detectPlatform(SHOPIFY_HTML, new Headers(), 'https://magaza.myshopify.com/');
    expect(d.platform).toBe('SHOPIFY');
    expect(d.confidence).toBe(1);
    expect(d.evidence).toContain('myshopify.com alan adı');
  });

  it('ikas → IKAS, bağlayıcı var', () => {
    const d = detectPlatform(IKAS_HTML);
    expect(d.platform).toBe('IKAS');
    expect(d.connectorAvailable).toBe(true);
    expect(d.evidence.length).toBeGreaterThanOrEqual(2);
  });

  it('Ticimax → TICIMAX, bağlayıcı var', () => {
    const d = detectPlatform(TICIMAX_HTML);
    expect(d.platform).toBe('TICIMAX');
    expect(d.connectorAvailable).toBe(true);
  });

  it('WooCommerce → WOOCOMMERCE, bağlayıcı YOK', () => {
    const d = detectPlatform(WOO_HTML);
    expect(d.platform).toBe('WOOCOMMERCE');
    expect(d.connectorAvailable).toBe(false);
    expect(PLATFORM_LABELS[d.platform]).toBe('WooCommerce');
  });

  it('boş / sinyalsiz HTML → UNKNOWN, güven 0, kanıt yok', () => {
    const d = detectPlatform('');
    expect(d).toEqual({ platform: 'UNKNOWN', confidence: 0, evidence: [], connectorAvailable: false });
    const plain = detectPlatform('<html><body><h1>Sadece bir blog</h1></body></html>');
    expect(plain.platform).toBe('UNKNOWN');
  });

  it('tek zayıf sinyal (ör. yalnızca shopify-section sınıfı, 0.3) eşiği geçmez → UNKNOWN ama düşük güvenle kanıt taşır', () => {
    const d = detectPlatform('<div class="shopify-section"></div>');
    expect(d.platform).toBe('UNKNOWN');
    expect(d.confidence).toBeCloseTo(0.3, 5);
    expect(d.evidence).toEqual(['shopify-section sınıfları']);
    expect(d.connectorAvailable).toBe(false);
  });

  it('çok büyük HTML kesilir ve yine çalışır', () => {
    const big = 'x'.repeat(500_000) + SHOPIFY_HTML;
    const d = detectPlatform(big);
    // İlk 400 KB örneklenir: sinyaller sonda kaldığı için görülmez → UNKNOWN (dürüst düşük güven)
    expect(d.platform).toBe('UNKNOWN');
    const front = SHOPIFY_HTML + 'x'.repeat(500_000);
    expect(detectPlatform(front).platform).toBe('SHOPIFY');
  });
});
