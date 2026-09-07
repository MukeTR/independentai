import { NextResponse, after } from 'next/server';
import { Prisma } from '@independentai/db';
import { route } from '@/server/route';
import { prisma } from '@/server/prisma';
import { log } from '@/server/logger';
import { enforceRateLimit } from '@/server/rate-limit';
import { refreshProduct } from '@/server/commerce/catalog-sync';
import { disconnectByProvider } from '@/server/commerce/connections';
import { isValidShopDomain, verifyWebhookHmac } from '@/server/commerce/shopify-oauth';

export const maxDuration = 60;

const MAX_BODY_BYTES = 4 * 1024 * 1024;
const PRODUCT_TOPICS = new Set(['products/create', 'products/update', 'products/delete']);
const COMPLIANCE_TOPICS = new Set(['customers/data_request', 'customers/redact', 'shop/redact']);

type Payload = { id?: unknown; admin_graphql_api_id?: unknown; shop_domain?: unknown };

function productGid(payload: Payload): string | null {
  if (
    typeof payload.admin_graphql_api_id === 'string' &&
    /^gid:\/\/shopify\/Product\/\d+$/.test(payload.admin_graphql_api_id)
  )
    return payload.admin_graphql_api_id;
  if (typeof payload.id === 'number' || (typeof payload.id === 'string' && /^\d+$/.test(payload.id)))
    return `gid://shopify/Product/${payload.id}`;
  return null;
}

async function finishDelivery(
  deliveryId: string,
  status: 'processed' | 'ignored' | 'failed',
  extra: { connectionId?: string | null; errorCode?: string | null } = {},
) {
  await prisma.integrationWebhookDelivery
    .update({
      where: { id: deliveryId },
      data: {
        status,
        processedAt: new Date(),
        errorCode: extra.errorCode ?? null,
        ...(extra.connectionId ? { connectionId: extra.connectionId } : {}),
      },
    })
    .catch((err) => log.warn('shopify.webhook_delivery_update_failed', { deliveryId, err }));
}

/** Yanıt gönderildikten sonra (after) çalışır: mağazaya bağlı tüm ACTIVE bağlantılar için işlenir. */
async function processDelivery(deliveryId: string, topic: string, shop: string, payload: Payload) {
  try {
    if (topic === 'app/uninstalled') {
      const ids = await disconnectByProvider('SHOPIFY', shop, { reason: 'app_uninstalled' });
      log.info('shopify.webhook_uninstalled', { shop, connections: ids.length });
      return finishDelivery(deliveryId, 'processed', { connectionId: ids[0] ?? null });
    }
    if (COMPLIANCE_TOPICS.has(topic)) {
      // PII saklamıyoruz (müşteri/sipariş verisi çekilmez). customers/* → verilecek/silinecek veri yok.
      // shop/redact → mağazanın katalog satırları kalıcı silinir, bağlantı (varsa) kesilir.
      if (topic === 'shop/redact')
        await disconnectByProvider('SHOPIFY', shop, { reason: 'shop_redact', purgeProducts: true });
      log.info('shopify.webhook_compliance', { topic, shop, personalData: 'none' });
      return finishDelivery(deliveryId, 'processed');
    }
    if (!PRODUCT_TOPICS.has(topic)) return finishDelivery(deliveryId, 'ignored', { errorCode: 'UNSUPPORTED' });

    const gid = productGid(payload);
    if (!gid) return finishDelivery(deliveryId, 'failed', { errorCode: 'BAD_PAYLOAD' });
    const conns = await prisma.storeConnection.findMany({
      where: { provider: 'SHOPIFY', storeDomain: shop, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!conns.length) return finishDelivery(deliveryId, 'ignored', { errorCode: 'NOT_FOUND' });
    let failed = 0;
    for (const c of conns) {
      try {
        await refreshProduct(c.id, gid, topic === 'products/delete' ? 'delete' : 'upsert');
      } catch (err) {
        failed += 1;
        log.warn('shopify.webhook_refresh_failed', { connectionId: c.id, topic, err });
      }
    }
    return finishDelivery(deliveryId, failed === conns.length ? 'failed' : 'processed', {
      connectionId: conns[0]!.id,
      errorCode: failed ? 'PARTIAL' : null,
    });
  } catch (err) {
    log.error('shopify.webhook_process_failed', { deliveryId, topic, err });
    return finishDelivery(deliveryId, 'failed', { errorCode: 'INTERNAL' });
  }
}

/**
 * Shopify webhook alıcısı. Ham gövde üzerinden HMAC doğrulanır (geçersiz → 401, kayıt yok),
 * `X-Shopify-Webhook-Id` ile tekilleştirilir ve 5 sn kuralı için işleme yanıttan sonraya bırakılır.
 */
export const POST = route('integrations.shopify.webhook', async (req) => {
  await enforceRateLimit(req, {
    name: 'shopify-webhook',
    limit: 600,
    windowMs: 60_000,
    global: { limit: 6_000, windowMs: 60_000 },
  });

  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) return NextResponse.json({ message: 'Gövde çok büyük' }, { status: 413 });
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ message: 'Gövde çok büyük' }, { status: 413 });

  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    log.error('shopify.webhook_config_missing', {});
    return NextResponse.json({ message: 'Webhook imzası doğrulanamadı', code: 'WEBHOOK_INVALID' }, { status: 401 });
  }
  if (!verifyWebhookHmac(raw, req.headers.get('x-shopify-hmac-sha256'), secret)) {
    log.warn('shopify.webhook_invalid_hmac', {
      topic: req.headers.get('x-shopify-topic'),
      shop: req.headers.get('x-shopify-shop-domain'),
    });
    return NextResponse.json({ message: 'Webhook imzası doğrulanamadı', code: 'WEBHOOK_INVALID' }, { status: 401 });
  }

  const topic = (req.headers.get('x-shopify-topic') ?? '').toLowerCase().slice(0, 100);
  const shop = (req.headers.get('x-shopify-shop-domain') ?? '').toLowerCase();
  const webhookId = (req.headers.get('x-shopify-webhook-id') ?? '').slice(0, 200);
  if (!topic || !isValidShopDomain(shop) || !webhookId) {
    return NextResponse.json({ message: 'Eksik Shopify başlıkları', code: 'WEBHOOK_INVALID' }, { status: 400 });
  }

  let payload: Payload = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === 'object') payload = parsed as Payload;
  } catch {
    payload = {};
  }

  let deliveryId: string;
  try {
    const d = await prisma.integrationWebhookDelivery.create({
      data: { provider: 'SHOPIFY', externalId: webhookId, topic, status: 'received' },
      select: { id: true },
    });
    deliveryId = d.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      await prisma.integrationWebhookDelivery.updateMany({
        where: { provider: 'SHOPIFY', externalId: webhookId },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw err;
  }

  after(() => processDelivery(deliveryId, topic, shop, payload));
  return NextResponse.json({ ok: true });
});
