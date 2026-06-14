import { NextRequest, NextResponse } from 'next/server';
import { setSessionCookie } from '@/server/session';
import {
  isOAuthProvider, exchangeAndFetchProfile, upsertOAuthUser, OAUTH_STATE_COOKIE,
} from '@/server/oauth';

/** Provider geri dönüşü: state doğrula → kod takası → kullanıcı eşle → oturum aç. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const origin = req.nextUrl.origin;
  const fail = (code: string) => NextResponse.redirect(new URL(`/login?error=${code}`, origin));

  if (!isOAuthProvider(provider)) return fail('oauth_unavailable');

  const sp = req.nextUrl.searchParams;
  if (sp.get('error')) return fail('oauth_denied');

  const code = sp.get('code');
  const state = sp.get('state');
  const cookieState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

  // CSRF: cookie'deki state, sorgudaki state ve provider eşleşmeli.
  if (!code || !state || !cookieState || cookieState !== `${provider}:${state}`) {
    return fail('oauth_state');
  }

  try {
    const profile = await exchangeAndFetchProfile(provider, code, origin);
    const { userId, tenantId, email, isNew } = await upsertOAuthUser(provider, profile);

    const res = NextResponse.redirect(new URL(isNew ? '/onboarding' : '/dashboard', origin));
    await setSessionCookie(res, { userId, tenantId, email });
    res.cookies.delete(OAUTH_STATE_COOKIE);
    return res;
  } catch (err) {
    console.error('[oauth callback]', err);
    return fail('oauth_failed');
  }
}
