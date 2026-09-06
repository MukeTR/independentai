/**
 * Tek kullanımlık, süreli, hash'li tokenlar: şifre sıfırlama, e-posta doğrulama.
 * Düz metin token yalnızca linkte yaşar; DB'de sha256 hash tutulur.
 */
import { createHash, randomBytes } from 'node:crypto';
import type { AuthTokenKind } from '@independentai/db';
import { prisma } from './prisma';

const TTL: Record<AuthTokenKind, number> = {
  PASSWORD_RESET: 60 * 60 * 1000, // 1 saat
  EMAIL_VERIFY: 24 * 60 * 60 * 1000, // 24 saat
};

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Aynı türden önceki tokenlar iptal edilir (yalnızca en yeni link geçerli). */
export async function issueAuthToken(userId: string, kind: AuthTokenKind): Promise<string> {
  const token = randomToken();
  await prisma.$transaction([
    prisma.authToken.updateMany({ where: { userId, kind, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.authToken.create({
      data: { userId, kind, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + TTL[kind]) },
    }),
  ]);
  return token;
}

/** Geçerliyse kullanıcı id'sini döndürür ve tokeni tüketir; değilse null. */
export async function consumeAuthToken(token: string, kind: AuthTokenKind): Promise<string | null> {
  if (!token || token.length < 20 || token.length > 200) return null;
  const rec = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!rec || rec.kind !== kind || rec.usedAt || rec.expiresAt < new Date()) return null;
  // Yarış: iki paralel istek aynı tokeni tüketmesin — updateMany koşullu.
  const updated = await prisma.authToken.updateMany({
    where: { id: rec.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (updated.count !== 1) return null;
  return rec.userId;
}
