import { NextResponse } from 'next/server';
import type { Prisma } from '@independentai/db';
import { route, requireParam } from '@/server/route';
import { ClientError } from '@/server/errors';
import { prisma } from '@/server/prisma';
import { requireActor } from '@/server/authz';
import { getOwnedConnection } from '@/server/commerce/connections';

const MAX_LIMIT = 50;
const DESCRIPTION_CHARS = 200;

/**
 * Katalog önizlemesi — sayfalı (imleç = son ürün id'si), arama (`q`: başlık/marka/tür/handle),
 * yalnızca silinmemiş ürünler. Açıklama 200 karaktere kısaltılır; kimlik bilgisi alanı yoktur.
 */
export const GET = route('integrations.products', async (req, ctx) => {
  const actor = await requireActor({ brandContext: true });
  const id = await requireParam(ctx, 'id');
  const conn = await getOwnedConnection(actor, id);
  const sp = new URL(req.url).searchParams;
  const q = (sp.get('q') ?? '').trim().slice(0, 120);
  const cursor = sp.get('cursor');
  if (cursor && !/^[A-Za-z0-9_-]{5,64}$/.test(cursor)) throw new ClientError('Geçersiz imleç');
  const limitRaw = Number(sp.get('limit') ?? 20);
  const limit = Number.isInteger(limitRaw) && limitRaw >= 1 ? Math.min(limitRaw, MAX_LIMIT) : 20;

  const where: Prisma.CatalogProductWhereInput = {
    connectionId: conn.id,
    tenantId: actor.tenantId,
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { vendor: { contains: q, mode: 'insensitive' } },
            { productType: { contains: q, mode: 'insensitive' } },
            { handle: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.catalogProduct.count({ where }),
    prisma.catalogProduct.findMany({
      where,
      orderBy: { id: 'asc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        externalId: true,
        title: true,
        handle: true,
        url: true,
        vendor: true,
        productType: true,
        categories: true,
        description: true,
        priceMin: true,
        priceMax: true,
        currency: true,
        availability: true,
        imageUrl: true,
        imageAlt: true,
        seoTitle: true,
        seoDescription: true,
        status: true,
        syncedAt: true,
        sourceUpdatedAt: true,
      },
    }),
  ]);
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map((p) => ({
    id: p.id,
    externalId: p.externalId,
    title: p.title,
    handle: p.handle,
    url: p.url,
    vendor: p.vendor,
    productType: p.productType,
    categories: p.categories,
    description: p.description
      ? p.description.length > DESCRIPTION_CHARS
        ? `${p.description.slice(0, DESCRIPTION_CHARS)}…`
        : p.description
      : null,
    price: { min: p.priceMin == null ? null : Number(p.priceMin), max: p.priceMax == null ? null : Number(p.priceMax) },
    currency: p.currency,
    availability: p.availability,
    imageUrl: p.imageUrl,
    imageAlt: p.imageAlt,
    seoTitle: p.seoTitle,
    hasSeoTitle: !!p.seoTitle,
    hasSeoDescription: !!p.seoDescription,
    status: p.status,
    syncedAt: p.syncedAt,
    sourceUpdatedAt: p.sourceUpdatedAt,
  }));
  return NextResponse.json({
    items,
    total,
    nextCursor: hasMore ? items[items.length - 1]!.id : null,
    connectionStatus: conn.status,
  });
});
