import { SignJWT, jwtVerify } from 'jose';
import { jwtSecret } from './env';

export type SessionPayload = {
  userId: string;
  tenantId: string;
  email: string;
  /** sessionVersion — kullanıcı tablosundaki değerle eşleşmezse oturum geçersizdir. */
  sv: number;
};

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 gün
const ISSUER = 'independentai.space';
const AUDIENCE = 'iai-web';

function getSecret(): Uint8Array {
  return new TextEncoder().encode(jwtSecret());
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, getSecret(), {
    algorithms: ['HS256'],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (typeof payload.userId !== 'string' || typeof payload.tenantId !== 'string') {
    throw new Error('Geçersiz oturum yükü');
  }
  return {
    userId: payload.userId,
    tenantId: payload.tenantId,
    email: typeof payload.email === 'string' ? payload.email : '',
    sv: typeof payload.sv === 'number' ? payload.sv : 0,
  };
}
