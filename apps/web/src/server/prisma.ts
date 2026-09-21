import { PrismaClient } from '@independentai/db';

/**
 * Lazy Prisma singleton — `new PrismaClient()` import-time'da değil, ilk kullanımda yaratılır
 * (Next.js build sırasındaki "page data collection" Prisma engine'i aramaz).
 *
 * ÖNEMLİ: Singleton HER ortamda (production dahil) tek instance'tır. Eski sürüm production'da her
 * property erişiminde yeni client üretiyordu; bu hem bağlantı sızdırıyor hem de interaktif
 * transaction'ları ("Transaction not found") bozuyordu.
 */
const globalForPrisma = globalThis as unknown as { __iaiPrisma?: PrismaClient };

function init(): PrismaClient {
  if (globalForPrisma.__iaiPrisma) return globalForPrisma.__iaiPrisma;
  const client = new PrismaClient({
    // Test modunda beklenen unique ihlalleri (409 senaryoları) log'u kirletmesin.
    log:
      process.env.IAI_TEST_MODE === '1' ? [] : process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
  globalForPrisma.__iaiPrisma = client;
  return client;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = init();
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
}) as PrismaClient;
