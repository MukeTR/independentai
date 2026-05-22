import type { Metadata } from 'next';

const SITE = 'https://independentai.space';
const BRAND = 'Independent AI';
const DEFAULT_DESCRIPTION =
  'ChatGPT, Claude ve Gemini\'nin verdiği cevaplarda markanız ne sıklıkla, hangi sırada ve hangi tonla geçiyor? Independent AI bağımsız bir gözle ölçer.';

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
      : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' } },
  };
}

export const SITE_URL = SITE;
export const BRAND_NAME = BRAND;
