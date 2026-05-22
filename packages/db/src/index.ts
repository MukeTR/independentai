// Sadece tipleri ve PrismaClient class'ı export et.
// Singleton/instantiation tüketen tarafta (apps/web/src/server/prisma.ts) lazy yapılır,
// böylece Next.js build sırasında "Collecting page data" Prisma engine'ini tetiklemez.
export * from '@prisma/client';
