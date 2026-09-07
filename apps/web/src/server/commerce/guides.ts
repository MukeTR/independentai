/**
 * Platforma özel "nasıl düzeltilir" rehberleri.
 *
 * Kural: yalnızca var olduğundan emin olunan panel yolları yazılır; emin olunmayan yerlerde genel
 * ifade kullanılır ("Tema ayarları → ..."). Rehberler bulgu konusuna (topic) göre seçilir ve
 * commerce denetimlerinin öneri kartlarına `steps` olarak eklenir.
 */
import type { DetectedPlatform } from './platform-detect';
import type { Difficulty } from './scoring';

export type GuideTopic =
  | 'productSchema'
  | 'organizationSchema'
  | 'breadcrumb'
  | 'faq'
  | 'robots'
  | 'sitemap'
  | 'llmsTxt'
  | 'metaDescription'
  | 'title'
  | 'h1'
  | 'canonical'
  | 'imageAlt'
  | 'description'
  | 'specTable'
  | 'reviews'
  | 'performance'
  | 'jsRendering'
  | 'hreflang'
  | 'noindex'
  | 'productsJson'
  | 'identifiers'
  | 'pricing'
  | 'availability'
  | 'catalogStructure'
  | 'https'
  | 'redirects';

export type Guide = {
  topic: GuideTopic;
  platform: DetectedPlatform;
  title: string;
  steps: string[];
  difficulty: Difficulty;
};

type GuideDef = {
  title: string;
  difficulty: Difficulty;
  generic: string[];
  byPlatform?: Partial<Record<DetectedPlatform, string[]>>;
};

const SHOPIFY_THEME = 'Shopify yönetici paneli → Online Store → Themes → (aktif tema) … → Edit code';

const GUIDES: Record<GuideTopic, GuideDef> = {
  productSchema: {
    title: 'Ürün sayfasına eksiksiz Product JSON-LD ekleyin',
    difficulty: 'Orta',
    generic: [
      'Ürün şablonunun <head> veya gövde sonuna tek bir <script type="application/ld+json"> bloğu ekleyin.',
      '@type: Product; zorunlu alanlar: name, image, description, sku (veya gtin), brand, offers{price, priceCurrency, availability, url}.',
      'Varsa aggregateRating ve review alanlarını gerçek verilerle doldurun; uydurma puan eklemeyin.',
      'Google Rich Results Test ile doğrulayın.',
    ],
    byPlatform: {
      SHOPIFY: [
        `${SHOPIFY_THEME}; çoğu temada JSON-LD sections/main-product.liquid veya snippets içindeki bir "product-json-ld"/"schema" parçasında üretilir.`,
        'Eksik alan varsa (brand, sku, gtin) ürünün Vendor, SKU ve Barcode alanlarını Products → ürün → Variants bölümünden doldurun; tema bunları Liquid ile şemaya yazar.',
        'Tema desteklemiyorsa bir "SEO/JSON-LD" uygulaması kullanın veya snippet\'i temaya kendiniz ekleyin.',
      ],
      IKAS: [
        'ikas yönetim paneli → Ürünler → ilgili ürün: marka, barkod/SKU, fiyat ve stok alanlarını doldurun; vitrin Product şemasını bu alanlardan üretir.',
        'Özel tema kullanıyorsanız ürün şablonuna JSON-LD bloğu ekleyin (tema kod düzenleme).',
      ],
      TICIMAX: [
        'Ticimax yönetim paneli → Ürünler → ürün düzenle: marka, barkod, stok kodu ve fiyat alanlarını eksiksiz girin.',
        'Tema/şablon tarafında Product JSON-LD üretimi yoksa tema düzenleme veya Ticimax destek üzerinden ürün şablonuna ekletin.',
      ],
      WOOCOMMERCE: [
        'WooCommerce ürün sayfaları varsayılan olarak Product şeması üretir; Yoast SEO / Rank Math ile marka, GTIN ve değerlendirme alanlarını genişletin.',
        'wp-admin → Ürünler → ürün düzenle → Envanter: SKU/GTIN; Genel: fiyat ve stok durumu.',
      ],
    },
  },
  organizationSchema: {
    title: 'Ana sayfaya Organization + WebSite şeması ekleyin',
    difficulty: 'Kolay',
    generic: [
      'Ana sayfa <head> içine Organization JSON-LD ekleyin: name, url, logo, sameAs (sosyal profiller), contactPoint.',
      'Aynı blokta veya ayrı bir blokta WebSite şeması (name, url) ekleyin.',
      'Schema Generator aracımızla üretip yapıştırın.',
    ],
    byPlatform: {
      SHOPIFY: [
        `${SHOPIFY_THEME} → layout/theme.liquid <head> içine JSON-LD bloğunu ekleyin (veya tema ayarlarındaki "sosyal medya" alanlarını doldurun; bazı temalar sameAs'ı buradan üretir).`,
      ],
      IKAS: [
        'ikas yönetim paneli → Ayarlar → mağaza bilgileri ve sosyal medya bağlantılarını doldurun; özel tema kullanıyorsanız <head> bölümüne JSON-LD ekleyin.',
      ],
      TICIMAX: [
        'Ticimax yönetim paneli → Ayarlar → firma/iletişim bilgilerini doldurun; şablonun <head> bölümüne Organization JSON-LD ekleyin.',
      ],
      WOOCOMMERCE: [
        'Yoast SEO → Search Appearance → Organization bilgilerini (ad, logo, sosyal profiller) doldurun; eklenti şemayı üretir.',
      ],
    },
  },
  breadcrumb: {
    title: 'Breadcrumb (gezinti yolu) ve BreadcrumbList şeması ekleyin',
    difficulty: 'Kolay',
    generic: [
      'Ürün sayfalarında Ana sayfa → Kategori → Ürün yolunu görünür bir <nav aria-label="breadcrumb"> ile gösterin.',
      'Aynı yolu BreadcrumbList JSON-LD olarak ekleyin.',
    ],
    byPlatform: {
      SHOPIFY: [
        'Tema ayarlarında breadcrumb seçeneği varsa açın; yoksa sections/main-product.liquid içine breadcrumb snippet ve BreadcrumbList JSON-LD ekleyin.',
      ],
      WOOCOMMERCE: [
        'Tema veya Yoast SEO breadcrumb özelliğini etkinleştirin (Yoast → Search Appearance → Breadcrumbs).',
      ],
    },
  },
  faq: {
    title: 'Ürün/kategori sayfalarına SSS bölümü ekleyin',
    difficulty: 'Orta',
    generic: [
      'Müşterilerin gerçekten sorduğu 4-6 soruyu soru biçiminde başlık (H2/H3) + 1-3 cümlelik net cevapla yazın.',
      'FAQPage JSON-LD ile aynı soru-cevapları işaretleyin.',
      'Ürün Açıklama Yazıcı aracımız SSS taslağı üretir.',
    ],
    byPlatform: {
      SHOPIFY: ['Tema "Collapsible content"/akordeon bloğu ile SSS ekleyin; FAQPage JSON-LD için snippet ekleyin.'],
      WOOCOMMERCE: [
        'Ürün açıklaması altına SSS bloğu ekleyin; Rank Math/Yoast FAQ bloğu FAQPage şemasını otomatik üretir.',
      ],
    },
  },
  robots: {
    title: "robots.txt'te AI crawler'lara izin verin",
    difficulty: 'Kolay',
    generic: [
      'İzin vermek istediğiniz botlar için standart satırlar ekleyin: "User-agent: GPTBot" ve altında "Allow: /".',
      'Sepet, hesap ve arama sonuç sayfalarını Disallow ile kapatmaya devam edebilirsiniz.',
      'Sitemap satırını ekleyin: "Sitemap: https://alanadiniz.com/sitemap.xml".',
    ],
    byPlatform: {
      SHOPIFY: [
        `${SHOPIFY_THEME} → Templates → "Add a new template" → robots.txt (robots.txt.liquid) oluşturun ve kuralları Liquid bloklarıyla ekleyin.`,
      ],
      IKAS: [
        "ikas'ta robots.txt platform tarafından yönetilir; özel kural gerekiyorsa ikas destek ekibiyle veya panelin SEO ayarlarıyla ilerleyin.",
      ],
      TICIMAX: [
        'Ticimax yönetim paneli → Ayarlar bölümündeki robots.txt / SEO alanından düzenleyin; erişim yoksa Ticimax destek ile ilerleyin.',
      ],
      WOOCOMMERCE: [
        'Yoast SEO → Tools → File editor ile robots.txt düzenleyin veya kök dizindeki robots.txt dosyasını güncelleyin.',
      ],
    },
  },
  sitemap: {
    title: "XML site haritası yayınlayın ve robots.txt'te bildirin",
    difficulty: 'Kolay',
    generic: [
      "/sitemap.xml adresinde ürün ve kategori URL'lerini içeren bir site haritası sunun.",
      'robots.txt\'e "Sitemap: https://alanadiniz.com/sitemap.xml" satırı ekleyin.',
    ],
    byPlatform: {
      SHOPIFY: [
        'Shopify /sitemap.xml dosyasını otomatik üretir; şifre korumalı mağazalarda erişilemez — mağazanın yayında olduğundan emin olun.',
      ],
      WOOCOMMERCE: [
        "Yoast SEO / Rank Math site haritasını etkinleştirin (genellikle /sitemap_index.xml) ve robots.txt'e ekleyin.",
      ],
    },
  },
  llmsTxt: {
    title: 'llms.txt dosyası ekleyin',
    difficulty: 'Kolay',
    generic: [
      'Kök dizine /llms.txt ekleyin: mağaza adı, ne sattığınız, ana kategoriler ve önemli sayfa bağlantıları (Markdown).',
      'llms.txt Generator aracımızla üretebilirsiniz.',
    ],
    byPlatform: {
      SHOPIFY: [
        "Shopify kök dizine statik dosya koymaya izin vermez; llms.txt'i bir sayfa (/pages/llms) olarak yayınlayıp ana sayfadan bağlantı verin veya proxy/CDN üzerinden /llms.txt yolunu bu sayfaya yönlendirin.",
      ],
      WOOCOMMERCE: ['Dosyayı WordPress kök dizinine (public_html) yükleyin.'],
    },
  },
  metaDescription: {
    title: 'Anlamlı meta açıklama yazın (50-160 karakter)',
    difficulty: 'Kolay',
    generic: ['Sayfanın ne sattığını ve kimin için olduğunu tek cümlede özetleyin; anahtar ürün türünü geçirin.'],
    byPlatform: {
      SHOPIFY: [
        'Products → ürün → "Search engine listing" → Edit: Meta description alanını doldurun. Ana sayfa için Online Store → Preferences.',
      ],
      IKAS: ['ikas yönetim paneli → Ürünler → ürün → SEO alanları (meta başlık/açıklama).'],
      TICIMAX: ['Ticimax yönetim paneli → Ürünler → ürün düzenle → SEO sekmesi (sayfa başlığı, açıklama).'],
      WOOCOMMERCE: ['Ürün düzenleme ekranında Yoast/Rank Math kutusundan meta açıklamayı girin.'],
    },
  },
  title: {
    title: 'Sayfa başlığını (title) 30-60 karakter ve açıklayıcı yapın',
    difficulty: 'Kolay',
    generic: ['Ürün adı + ayırt edici özellik + marka biçimini kullanın; tüm sayfalarda aynı başlığı tekrarlamayın.'],
    byPlatform: {
      SHOPIFY: ['Products → ürün → Search engine listing → Page title.'],
      IKAS: ['ikas yönetim paneli → Ürünler → ürün → SEO alanları.'],
      TICIMAX: ['Ticimax yönetim paneli → Ürünler → ürün düzenle → SEO sekmesi.'],
    },
  },
  h1: {
    title: 'Sayfada tek ve anlamlı bir H1 kullanın',
    difficulty: 'Kolay',
    generic: ['Ürün adı H1 olmalı; logo veya sloganı H1 yapmayın; birden fazla H1 varsa diğerlerini H2 yapın.'],
    byPlatform: {
      SHOPIFY: [
        `${SHOPIFY_THEME}: tema bölümlerinde başlık etiketlerini kontrol edin (main-product.liquid → product title).`,
      ],
    },
  },
  canonical: {
    title: 'Kendine işaret eden canonical etiketi ekleyin',
    difficulty: 'Kolay',
    generic: [
      'Her ürün sayfasında <link rel="canonical" href="(sayfanın kendi URL\'si)"> bulunmalı; koleksiyon altındaki ürün URL\'leri ana ürün URL\'sine canonical vermeli.',
    ],
    byPlatform: {
      SHOPIFY: [
        "Shopify temaları canonical'ı otomatik üretir ({{ canonical_url }}); theme.liquid içinde silinmediğinden emin olun.",
      ],
    },
  },
  imageAlt: {
    title: 'Ürün görsellerine açıklayıcı alt metin ekleyin',
    difficulty: 'Kolay',
    generic: [
      'Her ürün görseline ürün adı + renk/varyant içeren kısa alt metin yazın; "resim1.jpg" gibi dosya adlarını alt olarak kullanmayın.',
    ],
    byPlatform: {
      SHOPIFY: ['Products → ürün → Media → görsele tıklayın → "Add alt text".'],
      IKAS: ['ikas yönetim paneli → Ürünler → ürün → görseller: alt metin alanı.'],
      TICIMAX: ['Ticimax yönetim paneli → Ürünler → ürün resimleri: açıklama/alt alanı.'],
      WOOCOMMERCE: ['Medya kitaplığında görselin "Alternatif metin" alanını doldurun.'],
    },
  },
  description: {
    title: 'Ürün açıklamasını özgün ve bilgi-yoğun yazın (en az 120 kelime)',
    difficulty: 'Orta',
    generic: [
      'Tedarikçi metnini kopyalamayın; kullanım senaryosu, malzeme/ölçü, kimin için olduğu ve bakım bilgisi ekleyin.',
      'Önemli özellikleri madde listesi olarak verin — AI motorları listeleri doğrudan alıntılar.',
      'Ürün Açıklama Yazıcı aracımız yalnızca girdiğiniz özelliklerle taslak üretir.',
    ],
  },
  specTable: {
    title: 'Teknik özellik tablosu ekleyin',
    difficulty: 'Kolay',
    generic: ['Özellik → değer çiftlerini <table> veya <dl> ile verin (malzeme, boyut, ağırlık, garanti, menşei).'],
  },
  reviews: {
    title: 'Gerçek müşteri yorumlarını ve puanı sayfada gösterin',
    difficulty: 'Orta',
    generic: [
      'Yorum uygulaması/eklentisi ile onaylı alışveriş yorumlarını toplayın; aggregateRating şemasını gerçek verilerle doldurun.',
    ],
    byPlatform: {
      SHOPIFY: [
        "Shopify App Store'dan bir yorum uygulaması kurun; uygulama aggregateRating şemasını genellikle otomatik ekler.",
      ],
      WOOCOMMERCE: ['WooCommerce → Ayarlar → Ürünler → "Değerlendirmeleri etkinleştir".'],
    },
  },
  performance: {
    title: 'Yanıt süresini ve sayfa ağırlığını düşürün',
    difficulty: 'Zor',
    generic: [
      'Sunucu yanıtını (TTFB) 1 sn altına indirin: önbellek/CDN, gereksiz uygulama betiklerini kaldırma, görselleri WebP/AVIF ve boyutlandırılmış sunma.',
    ],
    byPlatform: {
      SHOPIFY: [
        'Kullanılmayan uygulamaları kaldırın (uygulama betikleri tema hızını düşürür); tema Görsel/Video ayarlarında lazy-load kullanın.',
      ],
    },
  },
  jsRendering: {
    title: "Kritik içeriği HTML'de sunun (JS'e bağımlı kalmayın)",
    difficulty: 'Zor',
    generic: [
      'Ürün adı, fiyat, açıklama ve özellikler ilk HTML yanıtında bulunmalı (SSR/SSG). Yalnızca istemci tarafında render edilen içerik çoğu AI crawler tarafından görülmez.',
    ],
  },
  hreflang: {
    title: 'Çok dilli/çok pazarlı sayfalar için hreflang ekleyin',
    difficulty: 'Orta',
    generic: [
      'Her dil/ülke sürümü için <link rel="alternate" hreflang="tr-TR" href="..."> ve x-default ekleyin. Tek dilli mağazada gerekmez.',
    ],
    byPlatform: { SHOPIFY: ['Shopify Markets ile birden fazla pazar/dil açıldığında hreflang otomatik üretilir.'] },
  },
  noindex: {
    title: 'noindex işaretini kaldırın',
    difficulty: 'Kolay',
    generic: [
      'Sayfa arama motorlarına ve AI crawler\'lara kapalı işaretlenmiş. <meta name="robots"> ve X-Robots-Tag başlığındaki noindex değerini kaldırın (kasıtlı değilse).',
    ],
    byPlatform: {
      WOOCOMMERCE: [
        'wp-admin → Ayarlar → Okuma → "Arama motorlarının bu siteyi indekslemesini engelle" seçeneğinin kapalı olduğundan emin olun.',
      ],
    },
  },
  productsJson: {
    title: 'Herkese açık ürün akışını koruyun',
    difficulty: 'Kolay',
    generic: [
      'Shopify mağazalarında /products.json ürün verisini makine-okunur sunar; şifre korumalı veya kapalı mağazalarda erişilemez.',
    ],
  },
  identifiers: {
    title: 'SKU / GTIN (barkod) alanlarını doldurun',
    difficulty: 'Kolay',
    generic: [
      'Ürün ve varyantlarına SKU ve varsa GTIN/EAN barkodu girin; şema bu alanları taşımalı. Kimlik numaraları AI motorlarının ürünü diğer mağazalardaki aynı ürünle eşleştirmesini sağlar.',
    ],
    byPlatform: {
      SHOPIFY: ['Products → ürün → Variants → SKU ve Barcode (ISBN, UPC, GTIN, etc.).'],
      IKAS: ['ikas yönetim paneli → Ürünler → ürün → varyant: barkod ve SKU alanları.'],
      TICIMAX: ['Ticimax yönetim paneli → Ürünler → ürün düzenle: stok kodu ve barkod.'],
      WOOCOMMERCE: ['Ürün → Envanter → SKU; GTIN için Yoast WooCommerce SEO / Rank Math alanı.'],
    },
  },
  pricing: {
    title: 'Fiyat ve para birimini şemada belirtin',
    difficulty: 'Kolay',
    generic: [
      "offers.price sayısal, offers.priceCurrency ISO 4217 (TRY, USD, EUR) olmalı. Fiyat yalnızca görselde/JS'te değil HTML ve şemada da bulunmalı.",
    ],
  },
  availability: {
    title: 'Stok durumunu şemada belirtin',
    difficulty: 'Kolay',
    generic: [
      'offers.availability alanını https://schema.org/InStock veya OutOfStock gibi standart değerlerle doldurun.',
    ],
  },
  catalogStructure: {
    title: 'Ürün ve kategori sayfalarını ana sayfadan bağlayın',
    difficulty: 'Orta',
    generic: [
      "Ana sayfada ana kategorilere ve öne çıkan ürünlere doğrudan (JS gerektirmeyen) <a href> bağlantıları verin; menü yalnızca JS ile açılıyorsa HTML'de de yer alsın.",
    ],
  },
  https: {
    title: "HTTPS kullanın ve HTTP'yi yönlendirin",
    difficulty: 'Kolay',
    generic: ['Geçerli bir SSL sertifikası kurun; http:// isteklerini 301 ile https:// sürüme yönlendirin.'],
  },
  redirects: {
    title: 'Yönlendirme zincirini kısaltın',
    difficulty: 'Kolay',
    generic: [
      'Ana URL tek adımda (en fazla 1 yönlendirme) son sürüme ulaşmalı; www/non-www ve http/https zincirlerini tek 301 ile birleştirin.',
    ],
  },
};

export function guideFor(platform: DetectedPlatform, topic: GuideTopic | string | undefined): Guide | null {
  if (!topic || !(topic in GUIDES)) return null;
  const def = GUIDES[topic as GuideTopic];
  const specific = def.byPlatform?.[platform];
  return {
    topic: topic as GuideTopic,
    platform,
    title: def.title,
    steps: specific ? [...specific, ...def.generic] : def.generic,
    difficulty: def.difficulty,
  };
}

export const GUIDE_TOPICS = Object.keys(GUIDES) as GuideTopic[];
