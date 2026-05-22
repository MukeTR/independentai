/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@independentai/shared', '@independentai/db', '@independentai/ai'],
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://independentai.space',
  },
};
export default nextConfig;
