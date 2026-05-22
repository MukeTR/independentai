import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { signSession, verifySession, type SessionPayload } from './jwt';

export const AUTH_COOKIE = 'iai_token';

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

export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) throw new UnauthorizedError();
  return s;
}

export async function setSessionCookie(response: NextResponse, payload: SessionPayload) {
  const token = await signSession(payload);
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
  }
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export function handleRouteError(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ message: 'Yetkisiz' }, { status: 401 });
  }
  if (err instanceof Error) {
    return NextResponse.json({ message: err.message }, { status: 400 });
  }
  return NextResponse.json({ message: 'Bilinmeyen hata' }, { status: 500 });
}
