import { createHash } from 'node:crypto';
import type { TestInfo } from '@playwright/test';

/**
 * Her E2E testine kendi sahte istemci IP'sini verir.
 *
 * Neden: giriş, kayıt ve public araç uçları IP başına sayaç tutar (`RateLimitBucket`). Tüm testler
 * aynı IP'yi kullanırsa sayaçlar testler arasında birikir ve süit büyüdükçe rastgele 429 alınır —
 * yavaş koşucularda (CI) önce mobil proje düşer. Test kimliğinden türetilen IP bunu tamamen kaldırır;
 * limitin kendisi ayrıca kendi testinde doğrulanır.
 *
 * Aralık: 198.18.0.0/15 — RFC 2544 ölçüm bloğu, gerçek trafikte kullanılmaz.
 */
export function testIp(testInfo: TestInfo): string {
  const seed = `${testInfo.project.name}:${testInfo.titlePath.join(' > ')}`;
  const h = createHash('sha256').update(seed).digest();
  return `198.18.${h[0]! % 256}.${(h[1]! % 254) + 1}`;
}
