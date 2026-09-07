import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson } from '@/server/errors';
import { getActor, requireActor } from '@/server/authz';
import { hydrateEnvFromConfig } from '@/server/system-config';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { PRODUCT_WRITER_LIMIT } from '@/server/commerce/public-scan';
import { ProductWriterInputSchema, writeProductContent } from '@/server/commerce/product-writer';

export const maxDuration = 60;

/**
 * Ürün Açıklama Yazıcı — POST. Giriş varsa aktif entitlement + tenant limiti; yoksa IP 5/saat +
 * küresel 100/saat. Sağlayıcı yoksa 503 (sahte çıktı yok).
 */
export const POST = route('tools.product_writer', async (req) => {
  const actor = await getActor();
  if (actor) {
    await requireActor({ active: true });
    await enforceRateLimit(req, LIMITS.tool, `tenant:${actor.tenantId}`);
  } else {
    await enforceRateLimit(req, PRODUCT_WRITER_LIMIT);
  }
  const body = await readJson<Record<string, unknown>>(req);
  // features: dizi veya satır-satır metin kabul edilir
  const rawFeatures = body.features;
  const features = Array.isArray(rawFeatures)
    ? rawFeatures
        .filter((f): f is string => typeof f === 'string')
        .map((f) => f.trim())
        .filter(Boolean)
    : typeof rawFeatures === 'string'
      ? rawFeatures
          .split(/\r?\n/)
          .map((f) => f.replace(/^[-•*]\s*/, '').trim())
          .filter(Boolean)
      : [];
  const input = ProductWriterInputSchema.parse({
    title: body.title,
    features,
    audience: typeof body.audience === 'string' && body.audience.trim() ? body.audience : undefined,
    tone: typeof body.tone === 'string' && body.tone ? body.tone : undefined,
    language: body.language === 'en' ? 'en' : 'tr',
    platform: typeof body.platform === 'string' && body.platform.trim() ? body.platform : undefined,
    brand: typeof body.brand === 'string' && body.brand.trim() ? body.brand : undefined,
    category: typeof body.category === 'string' && body.category.trim() ? body.category : undefined,
  });
  await hydrateEnvFromConfig();
  return NextResponse.json(await writeProductContent(input));
});
