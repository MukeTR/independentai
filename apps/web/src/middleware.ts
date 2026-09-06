import { NextResponse, type NextRequest } from 'next/server';

/**
 * Güvenlik başlıkları + nonce tabanlı CSP.
 *  - Nonce her istekte üretilir; Next.js CSP başlığındaki 'nonce-…' değerini kendi script'lerine uygular.
 *  - Dev'de React hata ayıklama için 'unsafe-eval' gerekir; production'da yoktur.
 *  - style-src: Tailwind/inline style'lar ve Google Fonts stylesheet'i için 'unsafe-inline' (nonce'lu
 *    stil desteği Next tarafında kısmi; script tarafı sıkı tutulur).
 *  - Vercel Analytics: va.vercel-scripts.com (script) + vitals.vercel-insights.com (connect).
 *  - API rotaları ve statik dosyalar matcher dışıdır; API başlıkları next.config headers() ile gelir.
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://va.vercel-scripts.com${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    `img-src 'self' blob: data: https:`,
    `connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com${isDev ? ' ws: wss:' : ''}`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  );
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  return response;
}

export const config = {
  matcher: [
    {
      source:
        '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|feed.xml|llms.txt|opengraph-image|BingSiteAuth.xml|.*\\.txt$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
