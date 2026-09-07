import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { requireActor } from '@/server/authz';
import { enforceRateLimit } from '@/server/rate-limit';
import { getOwnedSite, toView, verificationToken, verifyByMetaTag } from '@/server/discovery/sites';

/** Doğrulama sitenin kendi adresine dış istek yapar → tenant başına saatlik tavan. */
const VERIFY_LIMIT = { name: 'discovery-verify', limit: 20, windowMs: 3_600_000 };

/** `verifyByMetaTag` ile aynı etiket adı (sites.ts içindeki desenle eşleşir). */
const META_NAME = 'independentai-site-verification';

/** GET — doğrulama token'ı ve sayfaya eklenecek meta etiketi (kopyalanabilir snippet). */
export const GET = route('discovery.sites.verify_info', async (_req, ctx) => {
  const actor = await requireActor({ brandContext: true });
  const id = await requireParam(ctx, 'id');
  const site = await getOwnedSite(actor, id);
  const token = verificationToken(site);
  return NextResponse.json({
    token,
    metaTag: `<meta name="${META_NAME}" content="${token}" />`,
    verifiedAt: site.verifiedAt?.toISOString() ?? null,
    origin: site.normalizedOrigin,
  });
});

/** POST — sitenin ana sayfasını çekip meta etiketini arar (SSRF koruması `safeFetch` içinde). */
export const POST = route('discovery.sites.verify', async (req, ctx) => {
  const actor = await requireActor({ write: true, brandContext: true });
  const id = await requireParam(ctx, 'id');
  await enforceRateLimit(req, VERIFY_LIMIT, `tenant:${actor.tenantId}`);
  const result = await verifyByMetaTag(actor, id);
  const site = await getOwnedSite(actor, id);
  return NextResponse.json({ ...result, site: toView(site) });
});
