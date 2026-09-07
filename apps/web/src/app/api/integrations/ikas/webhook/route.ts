import { createHash } from 'node:crypto';
import { NextResponse, after } from 'next/server';
import { Prisma } from '@independentai/db';
import { route } from '@/server/route';
import { prisma } from '@/server/prisma';
import { log } from '@/server/logger';
import { enforceRateLimit } from '@/server/rate-limit';
import { enqueueCatalogSync, refreshProduct } from '@/server/commerce/catalog-sync';
import { USER_MESSAGES } from '@/server/commerce/errors';
import { parseWebhookBody, verifyWebhookKey, type IkasWebhookEvent } from '@/server/commerce/connectors/ikas';

export const maxDuration = 60;

const MAX_BODY_BYTES = 2 * 1024 * 1024;

async function finishDelivery(
  deliveryId: string,
  status: 'processed' | 'ignored' | 'failed',
  errorCode: string | null = null,
) {
  await prisma.integrationWebhookDelivery
    .update({ where: { id: deliveryId }, data: { status, processedAt: new Date(), errorCode } })
    .catch((err) => log.warn('ikas.webhook_delivery_update_failed', { deliveryId, err }));
}

/**
 * Yanıttan sonra çalışır. Payload'a GÜVENİLMEZ: yalnızca ürün id'si alınır, içerik ikas API'den
 * yeniden çekilir (refreshProduct → getProduct). Ürün id'si çıkarılamazsa tam senkron kuyruğa alınır.
 */
async function processDelivery(deliveryId: string, connectionId: string, event: IkasWebhookEvent) {
  try {
    if (!event.productId) {
      await enqueueCatalogSync(connectionId, 'webhook');
      return finishDelivery(deliveryId, 'processed', 'FULL_SYNC');
    }
    const r = await refreshProduct(connectionId, event.productId, event.action);
    return finishDelivery(deliveryId, r === 'skipped' ? 'ignored' : 'processed');
  } catch (err) {
    log.warn('ikas.webhook_process_failed', { deliveryId, connectionId, scope: event.scope, err });
    return finishDelivery(deliveryId, 'failed', 'INTERNAL');
  }
}

/**
 * ikas webhook alıcısı: `?c=<connectionId>&k=<HMAC>` (ikas imza göndermez; anahtar URL'de, zamanlama-
 * sabit doğrulanır → geçersiz 401, kayıt yok). Aynı gövde (sha256) tekilleştirilir; 200 hemen döner,
 * işleme `after()` ile yapılır (ikas 200 dışı yanıtta 3 kez yeniden dener).
 */
export const POST = route('integrations.ikas.webhook', async (req) => {
  const url = new URL(req.url);
  const c = url.searchParams.get('c') ?? '';
  const k = url.searchParams.get('k') ?? '';
  if (!verifyWebhookKey(c, k)) {
    log.warn('ikas.webhook_invalid_key', { connectionId: c.slice(0, 40) || null });
    return NextResponse.json({ message: USER_MESSAGES.WEBHOOK_INVALID, code: 'WEBHOOK_INVALID' }, { status: 401 });
  }
  await enforceRateLimit(
    req,
    { name: 'ikas-webhook', limit: 600, windowMs: 60_000, global: { limit: 6_000, windowMs: 60_000 } },
    `conn:${c}`,
  );

  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) return NextResponse.json({ message: 'Gövde çok büyük' }, { status: 413 });
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ message: 'Gövde çok büyük' }, { status: 413 });

  const conn = await prisma.storeConnection.findUnique({
    where: { id: c },
    select: { id: true, provider: true, status: true },
  });
  if (!conn || conn.provider !== 'IKAS') {
    // Bağlantı silinmiş: 410 → ikas denemeyi bırakır.
    return NextResponse.json({ message: 'Bağlantı bulunamadı', code: 'not_found' }, { status: 410 });
  }

  const event = parseWebhookBody(raw);
  const externalId = `${conn.id}:${createHash('sha256').update(raw).digest('hex')}`;
  const topic = (event.scope ?? 'store/product/unknown').slice(0, 100);
  let deliveryId: string;
  try {
    const d = await prisma.integrationWebhookDelivery.create({
      data: {
        provider: 'IKAS',
        connectionId: conn.id,
        externalId,
        topic,
        status: conn.status === 'ACTIVE' ? 'received' : 'ignored',
        ...(conn.status === 'ACTIVE' ? {} : { processedAt: new Date(), errorCode: 'INACTIVE' }),
      },
      select: { id: true },
    });
    deliveryId = d.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      await prisma.integrationWebhookDelivery.updateMany({
        where: { provider: 'IKAS', externalId },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw err;
  }
  if (conn.status !== 'ACTIVE') return NextResponse.json({ ok: true, ignored: true });

  after(() => processDelivery(deliveryId, conn.id, event));
  return NextResponse.json({ ok: true });
});
