import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { listConnections, createPendingConnection } from '@/server/commerce/connections';
import { isCommerceProvider } from '@/server/commerce/registry';
import { listProviderInfos } from '@/server/commerce/providers';
import { publicConnectionView } from '@/server/commerce/credentials';
import { normalizeShopDomain } from '@/server/commerce/shopify-oauth';

/** ikas mağaza alan adı: yalnızca `{store}.myikas.com` (SSRF: sağlayıcı host'u sabit desen). Yalnızca ad girildiyse son ek eklenir. */
const IKAS_DOMAIN_RE = /^[a-z0-9][a-z0-9-]*\.myikas\.com$/;
function normalizeIkasDomain(raw: unknown): string | null {
  let s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
  if (s && !s.includes('.')) s = `${s}.myikas.com`;
  return IKAS_DOMAIN_RE.test(s) && s.length <= 100 ? s : null;
}

/**
 * Mağaza bağlantıları — liste + sağlayıcı kataloğu + plan sınırı. Marka bağlamı zorunlu (ajans ev
 * tenant'ında çalışmaz). Yanıtlarda kimlik bilgisi alanı YOK (`publicConnectionView`).
 */
export const GET = route('integrations.list', async () => {
  const actor = await requireActor({ brandContext: true });
  const [connections, providers] = await Promise.all([listConnections(actor.tenantId), listProviderInfos()]);
  const used = connections.filter((c) => c.status !== 'DISCONNECTED').length;
  return NextResponse.json({
    connections,
    providers,
    limits: {
      storeConnections: actor.entitlement.limits.storeConnections,
      catalogProducts: actor.entitlement.limits.catalogProducts,
      used,
    },
    canWrite: actor.role !== 'VIEWER' && actor.entitlement.active,
  });
});

/**
 * PENDING bağlantı oluşturur (OAuth öncesi veya kimlik bilgisi formu öncesi).
 * Shopify → `next` ile yetkilendirme yönlendirmesi; ikas/Ticimax → sağlayıcı connect ucu çağrılır.
 */
export const POST = route('integrations.create', async (req) => {
  const actor = await requireActor({ write: true, brandContext: true });
  const body = await readJson<{ provider?: unknown; storeDomain?: unknown }>(req);
  if (!isCommerceProvider(body.provider)) throw new ClientError('Geçersiz sağlayıcı');
  let storeDomain: unknown = body.storeDomain;
  if (body.provider === 'SHOPIFY') {
    const shop = normalizeShopDomain(storeDomain);
    if (!shop) throw new ClientError('Shopify mağaza adresi "magaza.myshopify.com" biçiminde olmalı');
    storeDomain = shop;
  } else if (body.provider === 'IKAS') {
    const shop = normalizeIkasDomain(storeDomain);
    if (!shop) throw new ClientError('ikas mağaza adresi "magaza.myikas.com" biçiminde olmalı');
    storeDomain = shop;
  }
  const connection = await createPendingConnection(actor, body.provider, storeDomain);
  return NextResponse.json(
    {
      connection: publicConnectionView(connection),
      next:
        body.provider === 'SHOPIFY'
          ? `/api/integrations/shopify/install?connectionId=${encodeURIComponent(connection.id)}`
          : null,
    },
    { status: 201 },
  );
});
