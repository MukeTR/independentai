/**
 * Mağaza platformu tespiti — yalnızca herkese açık HTML/başlık sinyalleri (crawl-only, kimlik yok).
 * Kanıt listesi kullanıcıya gösterilir; "emin değiliz" durumu dürüstçe 'UNKNOWN' + düşük güven.
 */
export type DetectedPlatform =
  | 'SHOPIFY'
  | 'IKAS'
  | 'TICIMAX'
  | 'WOOCOMMERCE'
  | 'MAGENTO'
  | 'PRESTASHOP'
  | 'OPENCART'
  | 'IDEASOFT'
  | 'TSOFT'
  | 'WIX'
  | 'SQUARESPACE'
  | 'BIGCOMMERCE'
  | 'UNKNOWN';

export type PlatformDetection = {
  platform: DetectedPlatform;
  /** 0-1 */
  confidence: number;
  evidence: string[];
  /** Independent AI'da doğrudan bağlayıcı var mı */
  connectorAvailable: boolean;
};

type Rule = {
  platform: DetectedPlatform;
  weight: number;
  label: string;
  test: (html: string, headers: Headers) => boolean;
};

const RULES: Rule[] = [
  { platform: 'SHOPIFY', weight: 0.6, label: 'cdn.shopify.com varlıkları', test: (h) => /cdn\.shopify\.com/i.test(h) },
  {
    platform: 'SHOPIFY',
    weight: 0.5,
    label: 'Shopify.theme / window.Shopify',
    test: (h) => /Shopify\.theme|window\.Shopify\b/i.test(h),
  },
  {
    platform: 'SHOPIFY',
    weight: 0.6,
    label: 'x-shopid / x-shopify-stage başlığı',
    test: (_h, hd) => !!(hd.get('x-shopid') || hd.get('x-shopify-stage') || hd.get('x-sorting-hat-shopid')),
  },
  {
    platform: 'SHOPIFY',
    weight: 0.3,
    label: 'shopify-section sınıfları',
    test: (h) => /class="[^"]*shopify-section/i.test(h),
  },
  {
    platform: 'IKAS',
    weight: 0.6,
    label: 'cdn.myikas.com varlıkları',
    test: (h) => /cdn\.myikas\.com|\.myikas\.com\//i.test(h),
  },
  {
    platform: 'IKAS',
    weight: 0.5,
    label: 'ikas storefront işaretleri',
    test: (h) => /__ikas|ikas-storefront|data-ikas/i.test(h),
  },
  {
    platform: 'TICIMAX',
    weight: 0.6,
    label: 'Ticimax varlık yolları',
    test: (h) => /ticimax|\/Data\/EditorFiles\/|\/Uploads\/UrunResimleri\//i.test(h),
  },
  {
    platform: 'TICIMAX',
    weight: 0.4,
    label: 'Ticimax sepet/JS imzası',
    test: (h) => /tmx_|TicimaxFunctions|\/Scripts\/ticimax/i.test(h),
  },
  {
    platform: 'WOOCOMMERCE',
    weight: 0.7,
    label: 'woocommerce sınıf/eklenti yolu',
    test: (h) => /woocommerce|wp-content\/plugins\/woocommerce/i.test(h),
  },
  {
    platform: 'MAGENTO',
    weight: 0.7,
    label: 'Magento işaretleri',
    test: (h) => /Magento_|mage\/cookies|\/static\/version\d+\/frontend/i.test(h),
  },
  {
    platform: 'PRESTASHOP',
    weight: 0.7,
    label: 'PrestaShop işaretleri',
    test: (h) => /prestashop|var prestashop/i.test(h),
  },
  {
    platform: 'OPENCART',
    weight: 0.6,
    label: 'OpenCart yolları',
    test: (h) => /route=product\/|catalog\/view\/theme/i.test(h),
  },
  { platform: 'IDEASOFT', weight: 0.7, label: 'IdeaSoft işaretleri', test: (h) => /ideasoft|idea-soft/i.test(h) },
  { platform: 'TSOFT', weight: 0.7, label: 'T-Soft işaretleri', test: (h) => /tsoft|t-soft/i.test(h) },
  {
    platform: 'WIX',
    weight: 0.7,
    label: 'Wix işaretleri',
    test: (h, hd) => /static\.wixstatic\.com|wix\.com/i.test(h) || !!hd.get('x-wix-request-id'),
  },
  {
    platform: 'SQUARESPACE',
    weight: 0.7,
    label: 'Squarespace işaretleri',
    test: (h) => /squarespace\.com|static1\.squarespace/i.test(h),
  },
  {
    platform: 'BIGCOMMERCE',
    weight: 0.7,
    label: 'BigCommerce işaretleri',
    test: (h) => /bigcommerce\.com|cdn11\.bigcommerce/i.test(h),
  },
];

const CONNECTORS: ReadonlySet<DetectedPlatform> = new Set(['SHOPIFY', 'IKAS', 'TICIMAX']);

export function detectPlatform(html: string, headers: Headers = new Headers(), url?: string): PlatformDetection {
  const scores = new Map<DetectedPlatform, { score: number; evidence: string[] }>();
  const sample = html.length > 400_000 ? html.slice(0, 400_000) : html;
  for (const r of RULES) {
    let hit = false;
    try {
      hit = r.test(sample, headers);
    } catch {
      hit = false;
    }
    if (!hit) continue;
    const cur = scores.get(r.platform) ?? { score: 0, evidence: [] };
    cur.score += r.weight;
    cur.evidence.push(r.label);
    scores.set(r.platform, cur);
  }
  if (url && /\.myshopify\.com/i.test(url)) {
    const cur = scores.get('SHOPIFY') ?? { score: 0, evidence: [] };
    cur.score += 0.8;
    cur.evidence.push('myshopify.com alan adı');
    scores.set('SHOPIFY', cur);
  }
  if (url && /\.myikas\.com/i.test(url)) {
    const cur = scores.get('IKAS') ?? { score: 0, evidence: [] };
    cur.score += 0.8;
    cur.evidence.push('myikas.com alan adı');
    scores.set('IKAS', cur);
  }
  let best: [DetectedPlatform, { score: number; evidence: string[] }] | null = null;
  for (const e of scores) if (!best || e[1].score > best[1].score) best = e;
  if (!best || best[1].score < 0.5)
    return {
      platform: 'UNKNOWN',
      confidence: best ? Math.min(0.4, best[1].score) : 0,
      evidence: best?.[1].evidence ?? [],
      connectorAvailable: false,
    };
  return {
    platform: best[0],
    confidence: Math.min(1, best[1].score),
    evidence: best[1].evidence,
    connectorAvailable: CONNECTORS.has(best[0]),
  };
}

export const PLATFORM_LABELS: Record<DetectedPlatform, string> = {
  SHOPIFY: 'Shopify',
  IKAS: 'ikas',
  TICIMAX: 'Ticimax',
  WOOCOMMERCE: 'WooCommerce',
  MAGENTO: 'Magento',
  PRESTASHOP: 'PrestaShop',
  OPENCART: 'OpenCart',
  IDEASOFT: 'IdeaSoft',
  TSOFT: 'T-Soft',
  WIX: 'Wix',
  SQUARESPACE: 'Squarespace',
  BIGCOMMERCE: 'BigCommerce',
  UNKNOWN: 'Tespit edilemedi',
};
