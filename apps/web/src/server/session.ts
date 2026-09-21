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

// ───────────── Ajans çalışma alanı çerezi (iai_ws) ─────────────
// Değer yalnızca bir ipucu: her istekte `getActor()` DB'de (AgencyWorkspace + erişim) doğrular.

export const WORKSPACE_COOKIE_NAME = 'iai_ws';
const WORKSPACE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 gün

export function setWorkspaceCookie(response: NextResponse, tenantId: string) {
  response.cookies.set(WORKSPACE_COOKIE_NAME, tenantId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: WORKSPACE_TTL_SECONDS,
    path: '/',
  });
}

export function clearWorkspaceCookie(response: NextResponse) {
  response.cookies.set(WORKSPACE_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  });
}
