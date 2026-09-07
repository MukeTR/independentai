import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { ClientError, readJson } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { deleteSite, updateSite } from '@/server/discovery/sites';

/**
 * PATCH /api/discovery/sites/:id — durum (ACTIVE/PAUSED/REVOKED), origin allowlist,
 * saklama süresi, site türü ve kurulum yöntemi. Sahiplik `getOwnedSite` ile doğrulanır (başka
 * tenant'ın id'si 404).
 */
export const PATCH = route('discovery.sites.update', async (req, ctx) => {
  const actor = await requireActor({ write: true, brandContext: true });
  const id = await requireParam(ctx, 'id');
  const body = await readJson<{
    status?: unknown;
    allowedOrigins?: unknown;
    retentionDays?: unknown;
    siteKind?: unknown;
    installMethod?: unknown;
  }>(req);
  const site = await updateSite(actor, id, body, req);
  return NextResponse.json({ site });
});

/**
 * DELETE /api/discovery/sites/:id?confirm=1 — site + tüm telemetri verisi (oturum, olay, crawler,
 * rollup) kalıcı silinir. Yanlışlıkla veri kaybını önlemek için açık onay parametresi zorunludur.
 */
export const DELETE = route('discovery.sites.delete', async (req, ctx) => {
  const actor = await requireActor({ write: true, brandContext: true });
  const id = await requireParam(ctx, 'id');
  if (new URL(req.url).searchParams.get('confirm') !== '1') {
    throw new ClientError('Silme işlemi için onay gerekli (confirm=1): tüm ölçüm verisi kalıcı silinir');
  }
  await deleteSite(actor, id, req);
  return NextResponse.json({ ok: true });
});
