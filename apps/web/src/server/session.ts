import { cookies } from 'next/headers';
import { type NextResponse } from 'next/server';
import { signSession, verifySession, SESSION_TTL_SECONDS, type SessionPayload } from './jwt';

// Geriye dönük uyumluluk: eski import yolları bu modülden hata sınıflarını bekliyor.
export {
  ClientError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  handleRouteError,
  jsonError,
} from './errors';

export const AUTH_COOKIE = 'iai_token';

/** Çerezdeki JWT'yi doğrular (DB'ye gitmez). Yetki kararları için `getActor()` kullanın. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  try {
    return await verifySession(token);
  } catch {
    return null;
  }
}

export async function setSessionCookie(response: NextResponse, payload: SessionPayload) {
  const token = await signSession(payload);
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  });
}
