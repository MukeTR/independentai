import './globals.css';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'Independent AI — Yapay zekalarda markanız nasıl konumlanıyor?',
  description:
    "ChatGPT, Claude ve Gemini'nin alanınızla ilgili sorulara verdiği cevaplarda markanız geçiyor mu, hangi sırada, hangi rakiplerinizle birlikte? Bağımsız bir üçüncü taraf gözüyle ölçer.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://independentai.space'),
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  alternates: {
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
  verification: {
    google: 'ImjLNUrWJkApbuMOEU3U4g90MqhDu2UFiAa6tTbReVs',
    other: {
      'msvalidate.01': 'F440311F8BC957B6B3A54D13B82CFAC8',
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
