import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson } from '@/server/errors';
import { requireSuperAdmin } from '@/server/authz';
import { audit } from '@/server/audit';
import {
  createBlockedSite,
  listBlockedSites,
  parseBlockedSiteInput,
  testBlockedHost,
} from '@/server/blocked-sites-admin';

/**
 * Yasaklı siteler (süper admin).
 *  GET  → liste; `?host=` verilirse yalnız eşleşme testi (hits artmaz).
 *  POST {hostname, redirectUrl, note?} → 201; normalize + YouTube allowlist + kamu son eki reddi; çakışma 409.
 */
export const GET = route('admin.blocked_sites_list', async (req) => {
  await requireSuperAdmin();
  const host = new URL(req.url).searchParams.get('host');
  if (host !== null) return NextResponse.json(await testBlockedHost(host));
  return NextResponse.json({ items: await listBlockedSites() });
});

export const POST = route('admin.blocked_site_create', async (req) => {
  const actor = await requireSuperAdmin();
  const input = parseBlockedSiteInput(await readJson(req));
  const row = await createBlockedSite(input, actor.userId);
  await audit({
    action: 'admin.blocked_site_create',
    actorUserId: actor.userId,
    targetType: 'blocked_site',
    targetId: row.id,
    meta: { hostname: row.hostname, redirectUrl: row.redirectUrl },
    req,
  });
  return NextResponse.json(row, { status: 201 });
});
