import type { Metadata } from 'next';

const SITE = 'https://independentai.space';
const BRAND = 'Yanıt';
const DEFAULT_DESCRIPTION =
  'Müşterileriniz satın almadan önce yapay zekâya soruyor. Yanıt, o sorularda sizi mi rakibinizi mi önerdiğini ölçer, nedenini gösterir ve yapılacakları verir.';

export type PageSeoInput = {
  title: string;
  description?: string;
  path?: string;
  ogTitle?: string;
  ogDescription?: string;
  noIndex?: boolean;
};

export function buildMetadata(input: PageSeoInput): Metadata {
  const desc = input.description ?? DEFAULT_DESCRIPTION;
  const url = input.path ? `${SITE}${input.path}` : SITE;
  const ogTitle = input.ogTitle ?? input.title;
  const ogDesc = input.ogDescription ?? desc;

  return {
    title: `${input.title} — ${BRAND}`,
    description: desc,
    metadataBase: new URL(SITE),
    alternates: { canonical: url, languages: { 'tr-TR': url, 'x-default': url } },
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      url,
      siteName: BRAND,
      locale: 'tr_TR',
      type: 'website',
      images: [{ url: `${SITE}/opengraph-image`, width: 1200, height: 630, alt: BRAND }],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDesc,
      images: [`${SITE}/opengraph-image`],
    },
    robots: input.noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
        },
  };
}

export const SITE_URL = SITE;
export const BRAND_NAME = BRAND;

/**
 * Kararlı entity @id'leri — Organization / WebSite / BlogPosting JSON-LD node'larını
 * tek bir knowledge graph'a bağlamak için. Google'ın siteyi izole sayfalar yerine
 * birbirine bağlı bir varlık olarak görmesini sağlar.
 */
export const ORG_ID = `${SITE}/#organization`;
export const WEBSITE_ID = `${SITE}/#website`;

/** IndexNow (Bing/Yandex anlık indeksleme) anahtarı — public/<key>.txt ile eşleşir. */
export const INDEXNOW_KEY = '392951a5a37d9cb5307632a96bcc596d';

/** Kök göreli → mutlak URL (JSON-LD `url`/`item` alanları, llms.txt). */
export function absoluteUrl(path: string): string {
  return path.startsWith('http') ? path : `${SITE}${path.startsWith('/') ? path : `/${path}`}`;
}

/** /sektor/<slug> — `absolute` ile tam URL. (data/sectors.ts aynı yolu üretir; SEO yardımcıları burada toplanır.) */
export function sectorPath(slug: string, absolute = false): string {
  const p = `/sektor/${slug}`;
  return absolute ? absoluteUrl(p) : p;
}

/** /arac/<slug> — `absolute` ile tam URL. (lib/tool-registry.ts aynı yolu üretir.) */
export function toolPath(slug: string, absolute = false): string {
  const p = `/arac/${slug}`;
  return absolute ? absoluteUrl(p) : p;
}
