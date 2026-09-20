import './globals.css';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';

/**
 * Nonce tabanlı CSP (middleware) yalnızca dinamik render ile çalışır: statik prerender edilen HTML'de
 * script'ler nonce taşımaz ve tarayıcı tüm script'leri engeller (hydration yok). Bu yüzden tüm sayfalar
 * istek anında render edilir; blog/pazarlama sayfaları için ISR yerine CDN/Vercel edge önbelleği kullanılmaz.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Yanıt — Yapay zekâ sizi öneriyor mu?',
  description:
    'Yanıt, markanızın ChatGPT, Gemini ve Claude cevaplarındaki görünürlüğünü analiz eder, neden görünmediğinizi bulur ve ne yapmanız gerektiğini söyler. Siz yapın veya bize bırakın.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yanit.io'),
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
