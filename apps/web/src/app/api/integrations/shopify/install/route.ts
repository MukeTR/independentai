import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { ClientError, ConflictError, NotFoundError, ProviderUnavailableError } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { enforceRateLimit } from '@/server/rate-limit';
import { CommerceError, USER_MESSAGES } from '@/server/commerce/errors';
import {
  installUrl,
  isValidShopDomain,
  makeState,
  makeStateCookie,
  shopifyEnv,
  shopifyRedirectUri,
  STATE_COOKIE,
  STATE_COOKIE_PATH,
  STATE_TTL_SEC,
} from '@/server/commerce/shopify-oauth';

/**
 * Shopify OAuth başlangıcı: PENDING/ERROR/DISCONNECTED bağlantı için state üretir, imzalı çerezle
 * bağlar ve mağazanın /admin/oauth/authorize ekranına yönlendirir.
 */
export const GET = route('integrations.shopify.install', async (req) => {
  const actor = await requireActor({ write: true, brandContext: true });
  await enforceRateLimit(req, { name: 'shopify-install', limit: 20, windowMs: 600_000 }, `user:${actor.userId}`);

  const connectionId = req.nextUrl.searchParams.get('connectionId') ?? '';
  if (!/^[A-Za-z0-9_-]{5,64}$/.test(connectionId)) throw new ClientError('connectionId gerekli');
  const conn = await prisma.storeConnection.findFirst({
    where: { id: connectionId, tenantId: actor.tenantId, provider: 'SHOPIFY' },
  });
  if (!conn) throw new NotFoundError('Bağlantı bulunamadı');
  if (conn.status === 'ACTIVE') throw new ConflictError('Bu mağaza zaten bağlı');
  if (!isValidShopDomain(conn.storeDomain))
    throw new ClientError('Shopify mağaza adresi "magaza.myshopify.com" biçiminde olmalı');

  try {
    shopifyEnv();
  } catch (err) {
    if (err instanceof CommerceError && err.code === 'CONFIG_MISSING')
      throw new ProviderUnavailableError(USER_MESSAGES.CONFIG_MISSING);
    throw err;
  }

  const state = makeState();
  const res = NextResponse.redirect(installUrl(conn.storeDomain, state, shopifyRedirectUri()), 302);
  res.cookies.set(STATE_COOKIE, makeStateCookie(state, conn.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: STATE_TTL_SEC,
    path: STATE_COOKIE_PATH,
  });
  return res;
});
