import { PrismaClient } from '@independentai/db';

/**
 * Lazy Prisma singleton — `new PrismaClient()`'i import-time'da değil,
 * ilk kullanımda yaratır. Next.js'in route handler'larını build sırasında
 * "page data collection" için eval etmesi bu yüzden Prisma engine'i
 * aramaz, deploy temiz olur.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function init(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client;
  return client;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(init(), prop, receiver);
  },
}) as PrismaClient;
