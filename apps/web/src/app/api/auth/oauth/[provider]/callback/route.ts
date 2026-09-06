import { type NextRequest, NextResponse } from 'next/server';
import { setSessionCookie } from '@/server/session';
import { isOAuthProvider, exchangeAndFetchProfile, upsertOAuthUser, OAUTH_STATE_COOKIE } from '@/server/oauth';
import { ClientError, ConflictError } from '@/server/errors';
import { log } from '@/server/logger';
import { audit } from '@/server/audit';

/** Provider geri dönüşü: state doğrula → kod takası → kullanıcı eşle → oturum aç. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const origin = req.nextUrl.origin;
  const fail = (code: string) => {
    const res = NextResponse.redirect(new URL(`/login?error=${code}`, origin));
    res.cookies.delete(OAUTH_STATE_COOKIE);
    return res;
  };

  if (!isOAuthProvider(provider)) return fail('oauth_unavailable');

  const sp = req.nextUrl.searchParams;
  if (sp.get('error')) return fail('oauth_denied');

  const code = sp.get('code');
  const state = sp.get('state');
  const cookieState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !cookieState || cookieState !== `${provider}:${state}`) return fail('oauth_state');

  try {
    const profile = await exchangeAndFetchProfile(provider, code, origin);
    const { userId, tenantId, email, sessionVersion, isNew } = await upsertOAuthUser(provider, profile);
    await audit({
      action: isNew ? 'auth.register_oauth' : 'auth.login_oauth',
      tenantId,
      actorUserId: userId,
      meta: { provider },
      req,
    });
    const res = NextResponse.redirect(new URL(isNew ? '/onboarding' : '/dashboard', origin));
    await setSessionCookie(res, { userId, tenantId, email, sv: sessionVersion });
    res.cookies.delete(OAUTH_STATE_COOKIE);
    return res;
  } catch (err) {
    if (err instanceof ClientError && err.message === 'oauth_email_unverified') return fail('oauth_email_unverified');
    if (err instanceof ConflictError) return fail('oauth_conflict');
    log.error('oauth.callback_failed', { provider, err });
    return fail('oauth_failed');
  }
}
