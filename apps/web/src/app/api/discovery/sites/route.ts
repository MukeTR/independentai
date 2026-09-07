import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { siteUrl } from '@/server/env';
import { createSite, listSites } from '@/server/discovery/sites';

/** Sensör SDK'sının herkese açık adresi (snippet kutusunda gösterilir). */
function sensorScriptUrl(): string {
  return `${siteUrl()}/sensor/v1.js`;
}

/**
 * GET /api/discovery/sites — izlenen siteler + plan sınırı ve kullanım.
 *
 * Yanıt `toView` görünümünü taşır: `publicKeyHash` / `ingestSecretEnc` gibi sır alanları ASLA çıkmaz.
 * Public key yalnızca oluşturma (POST) ve rotasyon yanıtında **bir kez** görünür.
 */
export const GET = route('discovery.sites.list', async () => {
  const actor = await requireActor({ brandContext: true });
  const sites = await listSites(actor.tenantId);
  return NextResponse.json({
    sites,
    scriptUrl: sensorScriptUrl(),
    limits: {
      trackedSites: actor.entitlement.limits.trackedSites,
      sensorEventsPerMonth: actor.entitlement.limits.sensorEventsPerMonth,
      used: sites.length,
    },
    canWrite: actor.role !== 'VIEWER' && actor.entitlement.active,
  });
});

/**
 * POST /api/discovery/sites — yeni site ekler.
 * Dönen `publicKey` bir daha gösterilmez; kullanıcı snippet'i kopyalamazsa anahtarı yeniden üretmelidir.
 */
export const POST = route('discovery.sites.create', async (req) => {
  const actor = await requireActor({ write: true, brandContext: true });
  const body = await readJson<{
    domain: unknown;
    siteKind?: unknown;
    installMethod?: unknown;
    allowedOrigins?: unknown;
  }>(req);
  const { site, publicKey } = await createSite(actor, body, req);
  return NextResponse.json({ site, publicKey, scriptUrl: sensorScriptUrl() }, { status: 201 });
});
