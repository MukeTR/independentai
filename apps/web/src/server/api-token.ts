/**
 * Programatik API erişimi (Faz 9) — token üretimi, hash'leme, doğrulama.
 * Token sadece oluşturulurken bir kez gösterilir; DB'de sha256 hash saklanır.
 */
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from './prisma';

const PREFIX = 'iai_live_';

export function generateToken(): { token: string; hash: string; prefix: string } {
  const secret = randomBytes(24).toString('base64url');
  const token = `${PREFIX}${secret}`;
  return { token, hash: hashToken(token), prefix: `${PREFIX}${secret.slice(0, 4)}…` };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Authorization: Bearer <token> → tenantId (geçerliyse). lastUsedAt günceller. */
export async function authenticateToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token.startsWith(PREFIX)) return null;
  const rec = await prisma.apiToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!rec) return null;
  // Best-effort lastUsedAt
  prisma.apiToken.update({ where: { id: rec.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return rec.tenantId;
}
