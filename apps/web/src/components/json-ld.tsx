/**
 * JSON-LD bileşenleri ve saf veri üreticileri (`*JsonLd()` fonksiyonları). Bileşenler yalnız üreticinin çıktısını
 * `<script type="application/ld+json">` içine yazar; üreticiler DOM'suz birim testte doğrulanır (tests/unit/seo.test.ts).
 * Kurallar (docs/SEO_GEO.md): Organization `@id` tek (ORG_ID), `name: BRAND_NAME`, `alternateName: 'Independent AI'`;
 * hiçbir node'da uydurma `aggregateRating` yok.
 */
import { SITE_URL, BRAND_NAME, ORG_ID, WEBSITE_ID, absoluteUrl } from '@/lib/seo';

type Json = Record<string, unknown> | unknown[];

export const ORG_ALTERNATE_NAME = 'Independent AI';

export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: BRAND_NAME,
    alternateName: ORG_ALTERNATE_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/icon.svg`,
      width: 512,
      height: 512,
    },
    // Gerçek profiller oluşturuldukça doldurulacak (LinkedIn, X, GitHub, Crunchbase).
    sameAs: [],
    description:
      'Yanıt: markanızın yapay zekâ cevaplarındaki görünürlüğünü analiz eden, neden görünmediğinizi bulan ve yapılacak işleri çıkaran platform; isteyene Yanıt Agency uygulama hizmeti.',
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.question,
      acceptedAnswer: { '@type': 'Answer', text: i.answer },
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; href: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((i, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: i.name,
      item: absoluteUrl(i.href),
    })),
  };
}

/**
 * WebPage — sayfa düğümü; `isPartOf` WebSite, `about`/`publisher` Organization. Sektör sayfaları ve hub'lar için.
 * `image` verilirse `primaryImageOfPage` yazılır (hero görseli).
 */
export function webPageJsonLd(input: {
  path: string;
  name: string;
  description: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
}): Record<string, unknown> {
  const url = absoluteUrl(input.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: input.name,
    description: input.description,
    inLanguage: 'tr-TR',
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    ...(input.image ? { primaryImageOfPage: { '@type': 'ImageObject', url: absoluteUrl(input.image) } } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
  };
}

/**
 * Service — sektör sayfası ("{Sektör} siteleri için yapay zekâ görünürlük ölçümü") ve /yanit-agency.
 * `provider` Organization `@id`; ücretsiz araç için `offers` 0 TRY; `priceRange`/`aggregateRating` YOK.
 */
export function serviceJsonLd(input: {
  path: string;
  name: string;
  description: string;
  serviceType: string;
  /** Hedef kitle (ör. "Klinik web siteleri") */
  audience?: string;
  areaServed?: string;
  free?: boolean;
}): Record<string, unknown> {
  const url = absoluteUrl(input.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${url}#service`,
    url,
    name: input.name,
    description: input.description,
    serviceType: input.serviceType,
    provider: { '@id': ORG_ID },
    areaServed: input.areaServed ?? 'TR',
    inLanguage: 'tr-TR',
    ...(input.audience ? { audience: { '@type': 'BusinessAudience', name: input.audience } } : {}),
    ...(input.free
      ? {
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'TRY',
            availability: 'https://schema.org/InStock',
            description: 'Ücretsiz; hesap, e-posta veya kart gerekmez',
          },
        }
      : {}),
  };
}

/**
 * SoftwareApplication — araç varyantı (/arac/<slug>): `applicationCategory 'SEO'`, `offers price 0 TRY`,
 * `isPartOf` WebSite, `provider` Organization. Landing varyantı `softwareApplicationJsonLd()`.
 */
export function toolSoftwareApplicationJsonLd(input: {
  path: string;
  name: string;
  description: string;
}): Record<string, unknown> {
  const url = absoluteUrl(input.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${url}#tool`,
    url,
    name: input.name,
    description: input.description,
    applicationCategory: 'SEO',
    operatingSystem: 'Web',
    inLanguage: 'tr-TR',
    isAccessibleForFree: true,
    provider: { '@id': ORG_ID },
    isPartOf: { '@id': WEBSITE_ID },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'TRY',
      availability: 'https://schema.org/InStock',
      description: 'Ücretsiz; hesap, e-posta veya kart gerekmez',
    },
  };
}

/** Landing SoftwareApplication — fiyat getOffer()'dan gelir; uydurma aggregateRating yok. */
export function softwareApplicationJsonLd(input: { saasMonthlyTry: number; trialDays: number }): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: BRAND_NAME,
    operatingSystem: 'Web',
    applicationCategory: 'BusinessApplication',
    provider: { '@id': ORG_ID },
    description:
      'AI görünürlük analizi ve yapılacak işler platformu: ChatGPT, Gemini ve Claude cevaplarında marka takibi, neden analizi, görev listesi.',
    offers: [
      {
        '@type': 'Offer',
        name: 'Ücretsiz rapor ve araçlar',
        price: '0',
        priceCurrency: 'TRY',
        availability: 'https://schema.org/InStock',
        description: 'Şok raporu ve herkese açık araçlar; hesap gerekmez',
      },
      {
        '@type': 'Offer',
        name: 'Yanıt aylık abonelik',
        price: String(input.saasMonthlyTry),
        priceCurrency: 'TRY',
        availability: 'https://schema.org/InStock',
        description: `Aylık abonelik; ${input.trialDays} gün ücretsiz deneme, kart gerekmez, istediğiniz zaman iptal`,
      },
    ],
  };
}

export function JsonLd({ data }: { data: Json }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function OrganizationJsonLd() {
  return <JsonLd data={organizationJsonLd()} />;
}

/**
 * WebSite entity — homepage, Organization ve tüm BlogPosting node'larını tek bir
 * @id grafiğine bağlayan çapa. SearchAction EKLENMEDİ çünkü gerçek bir ?q= arama
 * endpoint'i yok (yalanlanabilir bir yapısal işaret olurdu).
 */
export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        name: BRAND_NAME,
        url: SITE_URL,
        inLanguage: 'tr-TR',
        publisher: { '@id': ORG_ID },
      }}
    />
  );
}

/**
 * SoftwareApplication — fiyat getOffer()'dan gelir (sayfa async okuyup geçer). Ücretsiz deneme ayrı Offer olarak
 * belirtilir; uydurma aggregateRating yok.
 */
export function SoftwareApplicationJsonLd({
  saasMonthlyTry,
  trialDays,
}: {
  saasMonthlyTry: number;
  trialDays: number;
}) {
  return <JsonLd data={softwareApplicationJsonLd({ saasMonthlyTry, trialDays })} />;
}

export function ToolSoftwareApplicationJsonLd(props: { path: string; name: string; description: string }) {
  return <JsonLd data={toolSoftwareApplicationJsonLd(props)} />;
}

export function WebPageJsonLd(props: Parameters<typeof webPageJsonLd>[0]) {
  return <JsonLd data={webPageJsonLd(props)} />;
}

export function ServiceJsonLd(props: Parameters<typeof serviceJsonLd>[0]) {
  return <JsonLd data={serviceJsonLd(props)} />;
}

export function FaqJsonLd({ items }: { items: { question: string; answer: string }[] }) {
  return <JsonLd data={faqJsonLd(items)} />;
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; href: string }[] }) {
  return <JsonLd data={breadcrumbJsonLd(items)} />;
}
