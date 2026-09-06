/** @type {import('next').NextConfig} */

// API ve statik uçlar middleware matcher'ı dışında kaldığı için temel başlıklar burada verilir.
const BASE_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@independentai/shared', '@independentai/db', '@independentai/ai'],
  serverExternalPackages: ['@prisma/client', '.prisma/client', 'undici'],
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://independentai.space',
  },
  async headers() {
    return [
      { source: '/:path*', headers: BASE_HEADERS },
      // API: CORS yalnızca /api/v1 (route kendi başlıklarını yazar); geri kalanı same-origin.
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
};
export default nextConfig;
