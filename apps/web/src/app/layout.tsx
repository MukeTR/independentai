import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Independent AI — Yapay zekalarda markanız nasıl konumlanıyor?',
  description:
    'ChatGPT, Claude ve Gemini\'nin alanınızla ilgili sorulara verdiği cevaplarda markanız geçiyor mu, hangi sırada, hangi rakiplerinizle birlikte? Bağımsız bir üçüncü taraf gözüyle ölçer.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://independentai.space'),
  verification: {
    google: 'ImjLNUrWJkApbuMOEU3U4g90MqhDu2UFiAa6tTbReVs',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
