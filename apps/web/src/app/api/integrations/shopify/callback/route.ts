import { NextResponse, type NextRequest } from 'next/server';
import { route } from '@/server/route';
import { AppError, UnauthorizedError } from '@/server/errors';
import { requireActor, type Actor } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { log } from '@/server/logger';
import { activateConnection } from '@/server/commerce/connections';
import { CommerceError } from '@/server/commerce/errors';
import {
  exchangeToken,
  isValidShopDomain,
  parseStateCookie,
  shopifyEnv,
  STATE_COOKIE,
  STATE_COOKIE_PATH,
  statesMatch,
  verifyCallbackHmac,
  type ShopifyEnv,
} from '@/server/commerce/shopify-oauth';

export const maxDuration = 60;

const DASHBOARD = '/dashboard/integrations';

function clearStateCookie(res: NextResponse) {
  res.cookies.set(STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: STATE_COOKIE_PATH,
  });
  return res;
}

/**
 * Shopify OAuth geri dönüşü. Sıra: state çerezi → shop biçimi → hmac → bağlantı sahipliği → token takası
 * → activateConnection (doğrula + şifrele + webhook + ilk senkron). Her hata panele kısa bir kodla döner;
 * token, kod veya sağlayıcı mesajı asla URL'ye/yanıta yazılmaz.
 */
export const GET = route('integrations.shopify.callback', async (req: NextRequest) => {
  const origin = req.nextUrl.origin;
  const fail = (code: string) =>
    clearStateCookie(NextResponse.redirect(new URL(`${DASHBOARD}?error=${encodeURIComponent(code)}`, origin), 302));

  const sp = req.nextUrl.searchParams;
  const cookie = parseStateCookie(req.cookies.get(STATE_COOKIE)?.value);
  if (!cookie || !statesMatch(cookie.state, sp.get('state'))) return fail('invalid_state');

  const shop = sp.get('shop') ?? '';
  if (!isValidShopDomain(shop)) return fail('INVALID_STORE');

  let env: ShopifyEnv;
  try {
    env = shopifyEnv();
  } catch {
    return fail('CONFIG_MISSING');
  }
  if (!verifyCallbackHmac(sp, env.apiSecret)) return fail('invalid_hmac');

  const code = sp.get('code');
  if (!code) return fail('oauth_failed');

  // Akışı başlatan oturum: bağlantı bu tenant'a ait olmalı.
  let actor: Actor;
  try {
    actor = await requireActor({ write: true, brandContext: true });
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return clearStateCookie(
        NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(DASHBOARD)}`, origin), 302),
      );
    return fail('forbidden');
  }
  const conn = await prisma.storeConnection.findFirst({
    where: { id: cookie.connectionId, tenantId: actor.tenantId, provider: 'SHOPIFY' },
  });
  if (!conn) return fail('not_found');
  if (conn.status === 'ACTIVE') return fail('already_connected');
  if (conn.storeDomain.toLowerCase() !== shop.toLowerCase()) return fail('shop_mismatch');

  try {
    const credentials = await exchangeToken(shop, code);
    await activateConnection(conn.id, credentials, { actorUserId: actor.userId, req });
  } catch (err) {
    if (err instanceof CommerceError) {
      log.warn('shopify.callback_failed', { connectionId: conn.id, code: err.code, status: err.status });
      return fail(err.code);
    }
    if (err instanceof AppError) return fail(err.code);
    log.error('shopify.callback_unhandled', { connectionId: conn.id, err });
    return fail('oauth_failed');
  }
  return clearStateCookie(NextResponse.redirect(new URL(`${DASHBOARD}?connected=shopify`, origin), 302));
});
