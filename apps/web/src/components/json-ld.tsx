import { SITE_URL, BRAND_NAME, ORG_ID, WEBSITE_ID } from '@/lib/seo';

type Json = Record<string, unknown> | unknown[];

export function JsonLd({ data }: { data: Json }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': ORG_ID,
        name: BRAND_NAME,
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
      }}
    />
  );
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
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: BRAND_NAME,
        operatingSystem: 'Web',
        applicationCategory: 'BusinessApplication',
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
            price: String(saasMonthlyTry),
            priceCurrency: 'TRY',
            availability: 'https://schema.org/InStock',
            description: `Aylık abonelik; ${trialDays} gün ücretsiz deneme, kart gerekmez, istediğiniz zaman iptal`,
          },
        ],
        aggregateRating: undefined, // gerçek inceleme gelene kadar bırakıyoruz
      }}
    />
  );
}

export function FaqJsonLd({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((i) => ({
          '@type': 'Question',
          name: i.question,
          acceptedAnswer: { '@type': 'Answer', text: i.answer },
        })),
      }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; href: string }[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((i, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: i.name,
          item: `${SITE_URL}${i.href}`,
        })),
      }}
    />
  );
}
