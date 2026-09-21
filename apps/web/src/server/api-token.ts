/**
 * Programatik API erişimi — token üretimi, hash'leme, doğrulama, scope, iptal.
 *  - Token yalnızca oluşturulurken bir kez gösterilir; DB'de sha256 hash saklanır.
 *  - Biçim: iai_live_<32 byte base64url>. Prefix sadece gösterim içindir.
 *  - lastUsedAt en fazla 5 dakikada bir güncellenir (her istekte yazma yok).
 *  - Revoke/expire edilen tokenlar 401 döner. Scope: read:visibility (tek scope, genişletilebilir).
 */
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from './prisma';
import { UnauthorizedError } from './errors';

const PREFIX = 'iai_live_';
export const API_SCOPES = ['read:visibility'] as const;
export type ApiScope = (typeof API_SCOPES)[number];
const LAST_USED_THROTTLE_MS = 5 * 60_000;

export function generateToken(): { token: string; hash: string; prefix: string } {
  const secret = randomBytes(32).toString('base64url');
  const token = `${PREFIX}${secret}`;
  return { token, hash: hashToken(token), prefix: `${PREFIX}${secret.slice(0, 4)}…` };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export type TokenActor = { tokenId: string; tenantId: string; scopes: string[] };

/** Authorization: Bearer <token> → tenant. Geçersiz/iptal/süresi dolmuş → UnauthorizedError. */
export async function authenticateToken(
  authHeader: string | null,
  requiredScope: ApiScope = 'read:visibility',
): Promise<TokenActor> {
  if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError('Geçersiz veya eksik API token');
  const token = authHeader.slice(7).trim();
  if (!token.startsWith(PREFIX) || token.length < PREFIX.length + 20 || token.length > 200)
    throw new UnauthorizedError('Geçersiz veya eksik API token');
  const rec = await prisma.apiToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!rec || rec.revokedAt || (rec.expiresAt && rec.expiresAt < new Date()))
    throw new UnauthorizedError('Geçersiz veya eksik API token');
  if (!rec.scopes.includes(requiredScope)) throw new UnauthorizedError(`Token "${requiredScope}" iznine sahip değil`);
  if (!rec.lastUsedAt || Date.now() - rec.lastUsedAt.getTime() > LAST_USED_THROTTLE_MS) {
    prisma.apiToken.update({ where: { id: rec.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  }
  return { tokenId: rec.id, tenantId: rec.tenantId, scopes: rec.scopes };
}
