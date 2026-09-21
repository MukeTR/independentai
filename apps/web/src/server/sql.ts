/**
 * Ham SQL'de zaman parametreleri için tek kural.
 *
 * Prisma `DateTime` alanlarını Postgres'e **saat dilimsiz** `timestamp(3)` olarak, UTC değeriyle yazar.
 * Ham sorguda `${date}` ise `timestamptz` tipinde gider ve karşılaştırma oturumun saat dilimine göre
 * yorumlanır. İkisi karışınca (bir satır Prisma istemcisiyle, diğeri ham SQL'le yazılınca) karşılaştırmalar
 * saat dilimi farkı kadar kayar: UTC sunucuda görünmez, yerelde/başka bölgede sessizce yanlış çalışır.
 *
 * Bu yüzden ham SQL'de tarih parametreleri daima `utcTs()` ile sarılır: değer UTC'ye sabitlenir ve
 * Prisma'nın yazdığı naive-UTC sütunlarla aynı anlama gelir.
 */
import { Prisma } from '@independentai/db';

export function utcTs(d: Date): Prisma.Sql {
  return Prisma.sql`(${d}::timestamptz AT TIME ZONE 'UTC')`;
}

/** `NOW()` yerine: sunucu saat diliminden bağımsız, UTC "şimdi". */
export function utcNow(): Prisma.Sql {
  return Prisma.sql`(NOW() AT TIME ZONE 'UTC')`;
}
