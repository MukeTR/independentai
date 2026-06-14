import { NextRequest, NextResponse } from 'next/server';
import {
  isOAuthProvider, enabledOAuthProviders, buildAuthorizeUrl, makeState, OAUTH_STATE_COOKIE,
} from '@/server/oauth';

/** OAuth akışını başlatır: state üretir, cookie'ye yazar, provider'a yönlendirir. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const origin = req.nextUrl.origin;

  if (!isOAuthProvider(provider) || !enabledOAuthProviders().some((p) => p.id === provider)) {
    return NextResponse.redirect(new URL('/login?error=oauth_unavailable', origin));
  }

  const state = makeState();
  const url = buildAuthorizeUrl(provider, origin, state);

  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_STATE_COOKIE, `${provider}:${state}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10, // 10 dk
    path: '/',
  });
  return res;
}
